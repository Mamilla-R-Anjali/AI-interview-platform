package com.interview.platform.controller;

import com.interview.platform.model.Interview;
import com.interview.platform.model.Question;

import com.interview.platform.repository.InterviewRepository;
import com.interview.platform.repository.QuestionRepository;

import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.annotation.*;

import java.security.Principal;

import java.util.List;

@RestController
@RequestMapping("/api/questions")
public class QuestionController {

    private final QuestionRepository questionRepository;

    private final InterviewRepository interviewRepository;

    public QuestionController(
            QuestionRepository questionRepository,
            InterviewRepository interviewRepository
    ) {

        this.questionRepository =
                questionRepository;

        this.interviewRepository =
                interviewRepository;
    }

    @PostMapping
    public ResponseEntity<?> createQuestion(
            @RequestBody QuestionRequest request,
            Principal principal
    ) {

        Interview interview =
                interviewRepository
                        .findById(
                                request.interviewId()
                        )
                        .orElse(null);

        if (interview == null) {

            return ResponseEntity
                    .notFound()
                    .build();
        }

        if (!owns(
                interview,
                principal
        )) {

            return ResponseEntity
                    .status(403)
                    .body(
                            "Forbidden"
                    );
        }

        Question question =
                new Question(
                        request.questionText(),
                        request.expectedAnswer(),
                        interview
                );

        return ResponseEntity.ok(
                questionRepository.save(
                        question
                )
        );
    }

    @GetMapping
    public List<Question> getPracticeQuestions() {

        return questionRepository
                .findAll()
                .stream()
                .limit(10)
                .toList();
    }

    @GetMapping("/interview/{interviewId}")
    public ResponseEntity<?> getQuestionsByInterview(
            @PathVariable Long interviewId,
            Principal principal
    ) {

        Interview interview =
                interviewRepository
                        .findById(
                                interviewId
                        )
                        .orElse(null);

        if (interview == null) {

            return ResponseEntity
                    .notFound()
                    .build();
        }

        if (!owns(
                interview,
                principal
        )) {

            return ResponseEntity
                    .status(403)
                    .body(
                            "Forbidden"
                    );
        }

        return ResponseEntity.ok(
                questionRepository
                        .findByInterviewId(
                                interviewId
                        )
        );
    }

    @GetMapping("/interview/{interviewId}/random")
    public ResponseEntity<?> getRandomQuestions(
            @PathVariable Long interviewId,
            Principal principal
    ) {

        Interview interview =
                interviewRepository
                        .findById(
                                interviewId
                        )
                        .orElse(null);

        if (interview == null) {

            return ResponseEntity
                    .notFound()
                    .build();
        }

        if (!owns(
                interview,
                principal
        )) {

            return ResponseEntity
                    .status(403)
                    .body(
                            "Forbidden"
                    );
        }

        List<Question> questions =
                questionRepository
                        .findRandomQuestionsByInterviewId(
                                interviewId
                        );

        if (questions.size() > 5) {

            questions =
                    questions.subList(
                            0,
                            5
                    );
        }

        return ResponseEntity.ok(
                questions
        );
    }

    private boolean owns(
            Interview interview,
            Principal principal
    ) {

        return principal != null &&

                interview != null &&

                interview.getUser() != null &&

                interview.getUser()
                        .getEmail() != null &&

                interview.getUser()
                        .getEmail()
                        .equalsIgnoreCase(
                                principal.getName()
                        );
    }

    public record QuestionRequest(
            String questionText,
            String expectedAnswer,
            Long interviewId
    ) {}
}