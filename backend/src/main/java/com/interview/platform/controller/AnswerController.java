package com.interview.platform.controller;

import com.interview.platform.model.Answer;
import com.interview.platform.model.Question;

import com.interview.platform.repository.AnswerRepository;
import com.interview.platform.repository.QuestionRepository;

import com.interview.platform.service.AIService;

import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.annotation.*;

import java.security.Principal;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/answers")
public class AnswerController {

    private final AnswerRepository answerRepository;

    private final QuestionRepository questionRepository;

    private final AIService aiService;

    public AnswerController(
            AnswerRepository answerRepository,
            QuestionRepository questionRepository,
            AIService aiService
    ) {

        this.answerRepository =
                answerRepository;

        this.questionRepository =
                questionRepository;

        this.aiService =
                aiService;
    }

    @PostMapping
    public ResponseEntity<?> submitAnswer(
            @RequestBody Map<String, Object> request,
            Principal principal
    ) {

        try {

            Object rawQuestionId =
                    request.get(
                            "questionId"
                    );

            if (rawQuestionId == null) {

                return ResponseEntity
                        .badRequest()
                        .body(
                                Map.of(
                                        "error",
                                        "Question ID is required"
                                )
                        );
            }

            Long questionId =
                    Long.valueOf(
                            rawQuestionId.toString()
                    );

            String answerText =
                    request.get(
                            "answerText"
                    ) != null
                            ? request.get(
                                    "answerText"
                            ).toString()
                            : "";

            Question question =
                    questionRepository
                            .findById(
                                    questionId
                            )
                            .orElse(null);

            if (question == null) {

                return ResponseEntity
                        .badRequest()
                        .body(
                                Map.of(
                                        "error",
                                        "Question not found"
                                )
                        );
            }

            if (!ownsQuestion(
                    question,
                    principal
            )) {

                return ResponseEntity
                        .status(403)
                        .body(
                                Map.of(
                                        "error",
                                        "Forbidden"
                                )
                        );
            }

            AIService.EvaluationResult evaluation =
                    aiService.evaluateAnswer(
                            question,
                            answerText
                    );

            Answer answer =
                    new Answer();

            answer.setAnswerText(
                    answerText
            );

            answer.setScore(
                    evaluation.getScore()
            );

            answer.setFeedback(
                    evaluation.getFeedback()
            );

            answer.setQuestion(
                    question
            );

            Answer saved =
                    answerRepository.save(
                            answer
                    );

            return ResponseEntity.ok(
                    Map.of(
                            "id",
                            saved.getId(),

                            "questionId",
                            questionId,

                            "answerText",
                            answerText,

                            "score",
                            evaluation.getScore(),

                            "feedback",
                            evaluation.getFeedback()
                    )
            );

        } catch (Exception e) {

            e.printStackTrace();

            return ResponseEntity
                    .internalServerError()
                    .body(
                            Map.of(
                                    "error",
                                    e.getMessage() != null
                                            ? e.getMessage()
                                            : "Failed to submit answer"
                            )
                    );
        }
    }

    @GetMapping("/question/{questionId}")
    public ResponseEntity<?> getAnswersForQuestion(
            @PathVariable Long questionId,
            Principal principal
    ) {

        Question question =
                questionRepository
                        .findById(
                                questionId
                        )
                        .orElse(null);

        if (question == null) {

            return ResponseEntity
                    .notFound()
                    .build();
        }

        if (!ownsQuestion(
                question,
                principal
        )) {

            return ResponseEntity
                    .status(403)
                    .body(
                            "Forbidden"
                    );
        }

        List<Answer> answers =
                answerRepository
                        .findByQuestionId(
                                questionId
                        );

        return ResponseEntity.ok(
                answers
        );
    }

    private boolean ownsQuestion(
            Question question,
            Principal principal
    ) {

        return principal != null &&

                question != null &&

                question.getInterview() != null &&

                question.getInterview()
                        .getUser() != null &&

                question.getInterview()
                        .getUser()
                        .getEmail() != null &&

                question.getInterview()
                        .getUser()
                        .getEmail()
                        .equalsIgnoreCase(
                                principal.getName()
                        );
    }
}