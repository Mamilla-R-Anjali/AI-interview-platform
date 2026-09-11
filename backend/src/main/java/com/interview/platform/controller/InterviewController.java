package com.interview.platform.controller;

import com.interview.platform.model.Answer;
import com.interview.platform.model.Interview;
import com.interview.platform.model.Question;
import com.interview.platform.model.User;

import com.interview.platform.repository.AnswerRepository;
import com.interview.platform.repository.InterviewRepository;
import com.interview.platform.repository.QuestionRepository;
import com.interview.platform.repository.UserRepository;

import org.springframework.http.ResponseEntity;

import org.springframework.transaction.annotation.Transactional;

import org.springframework.web.bind.annotation.*;

import java.security.Principal;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import java.util.function.Function;

import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/interviews")
public class InterviewController {

    private final InterviewRepository interviewRepository;

    private final UserRepository userRepository;

    private final AnswerRepository answerRepository;

    private final QuestionRepository questionRepository;

    public InterviewController(
            InterviewRepository interviewRepository,
            UserRepository userRepository,
            AnswerRepository answerRepository,
            QuestionRepository questionRepository
    ) {

        this.interviewRepository =
                interviewRepository;

        this.userRepository =
                userRepository;

        this.answerRepository =
                answerRepository;

        this.questionRepository =
                questionRepository;
    }

    @PostMapping
    @Transactional
    public ResponseEntity<?> createInterview(
            @RequestBody InterviewRequest request,
            Principal principal
    ) {

        User user =
                authenticatedUser(
                        principal
                );

        if (user == null) {

            return ResponseEntity
                    .status(401)
                    .body(
                            "Authenticated user not found."
                    );
        }

        Interview interview =
                new Interview(
                        request.title() == null
                                ? "Java Developer Interview"
                                : request.title(),

                        request.role() == null
                                ? "Software Engineer"
                                : request.role(),

                        "IN_PROGRESS",

                        user
                );

        Interview savedInterview =
                interviewRepository.save(
                        interview
                );

        List<Question> sourceQuestions =
                questionRepository
                        .findAll()
                        .stream()
                        .limit(10)
                        .toList();

        for (Question source :
                sourceQuestions) {

            Question copy =
                    new Question(
                            source.getQuestionText(),
                            source.getExpectedAnswer(),
                            savedInterview
                    );

            questionRepository.save(
                    copy
            );
        }

        return ResponseEntity.ok(
                savedInterview
        );
    }

    @GetMapping
    public ResponseEntity<?> getInterviews(
            @RequestParam(required = false)
            Long userId,
            Principal principal
    ) {

        User user =
                authenticatedUser(
                        principal
                );

        if (user == null) {

            return ResponseEntity
                    .status(401)
                    .body(
                            "Authenticated user not found."
                    );
        }

        List<Interview> interviews =
                interviewRepository
                        .findAll()
                        .stream()
                        .filter(interview ->
                                interview.getUser() != null &&

                                Objects.equals(
                                        interview
                                                .getUser()
                                                .getId(),

                                        user.getId()
                                )
                        )
                        .sorted(
                                Comparator
                                        .comparing(
                                                Interview::getCreatedAt
                                        )
                                        .reversed()
                        )
                        .toList();

        return ResponseEntity.ok(
                interviews
        );
    }

    @GetMapping("/{interviewId}/results")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getInterviewResults(
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

        Map<Long, Answer> latest =
                latestAnswersByQuestion(
                        answerRepository
                                .findByQuestionInterviewId(
                                        interviewId
                                )
                );

        List<Answer> orderedAnswers =
                latest.values()
                        .stream()
                        .sorted(
                                Comparator.comparing(
                                        Answer::getId
                                )
                        )
                        .limit(5)
                        .toList();

        List<Map<String, Object>> results =
                new ArrayList<>();

        for (Answer answer :
                orderedAnswers) {

            Map<String, Object> result =
                    new LinkedHashMap<>();

            result.put(
                    "questionId",
                    answer.getQuestion()
                            .getId()
            );

            result.put(
                    "question",
                    answer.getQuestion()
                            .getQuestionText()
            );

            result.put(
                    "questionText",
                    answer.getQuestion()
                            .getQuestionText()
            );

            result.put(
                    "answer",
                    answer.getAnswerText() == null
                            ? ""
                            : answer.getAnswerText()
            );

            result.put(
                    "answerText",
                    answer.getAnswerText() == null
                            ? ""
                            : answer.getAnswerText()
            );

            result.put(
                    "score",
                    answer.getScore() == null
                            ? 0
                            : answer.getScore()
            );

            result.put(
                    "feedback",
                    answer.getFeedback() == null
                            ? "No feedback available."
                            : answer.getFeedback()
            );

            results.add(
                    result
            );
        }

        return ResponseEntity.ok(
                results
        );
    }

    @DeleteMapping("/{interviewId}")
    @Transactional
    public ResponseEntity<?> deleteInterview(
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

        List<Answer> answers =
                answerRepository
                        .findByQuestionInterviewId(
                                interviewId
                        );

        if (!answers.isEmpty()) {

            answerRepository.deleteAll(
                    answers
            );
        }

        List<Question> questions =
                questionRepository
                        .findByInterviewId(
                                interviewId
                        );

        if (!questions.isEmpty()) {

            questionRepository.deleteAll(
                    questions
            );
        }

        interviewRepository.delete(
                interview
        );

        return ResponseEntity.ok(
                "Interview deleted successfully."
        );
    }

    @PostMapping("/{interviewId}/complete")
    @Transactional
    public ResponseEntity<?> completeInterview(
            @PathVariable Long interviewId,

            @RequestBody(required = false)
            CompleteInterviewRequest request,

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

        List<Long> questionIds =
                request == null
                        ? List.of()
                        : safeQuestionIds(
                                request.questionIds()
                        );

        if (questionIds.size() != 5) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "Exactly 5 question IDs are required."
                    );
        }

        Map<Long, Answer> latest =
                latestAnswersByQuestion(
                        answerRepository
                                .findByQuestionInterviewId(
                                        interviewId
                                )
                );

        int totalScore = 0;

        for (Long questionId :
                questionIds) {

            Answer answer =
                    latest.get(
                            questionId
                    );

            if (answer == null ||
                    answer.getScore() == null) {

                return ResponseEntity
                        .status(202)
                        .body(
                                "Some answers are still being evaluated."
                        );
            }

            totalScore +=
                    answer.getScore();
        }

        int finalScore =
                Math.round(
                        (float) totalScore / 5
                );

        interview.setFinalScore(
                finalScore
        );

        interview.setStatus(
                "COMPLETED"
        );

        Interview saved =
                interviewRepository.save(
                        interview
                );

        return ResponseEntity.ok(
                saved
        );
    }

    @PostMapping("/{interviewId}/terminate")
    @Transactional
    public ResponseEntity<?> terminateInterview(
            @PathVariable Long interviewId,

            @RequestBody(required = false)
            TerminateInterviewRequest request,

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

        if ("COMPLETED".equalsIgnoreCase(
                interview.getStatus()
        )) {

            return ResponseEntity.ok(
                    interview
            );
        }

        Map<Long, Answer> latest =
                latestAnswersByQuestion(
                        answerRepository
                                .findByQuestionInterviewId(
                                        interviewId
                                )
                );

        List<Long> questionIds =
                request == null
                        ? List.of()
                        : safeQuestionIds(
                                request.questionIds()
                        );

        int totalScore = 0;

        for (Long questionId :
                questionIds) {

            Answer answer =
                    latest.get(
                            questionId
                    );

            if (answer != null &&
                    answer.getScore() != null) {

                totalScore +=
                        answer.getScore();
            }
        }

        // Five-question model:
        // unanswered questions contribute zero.
        int finalScore =
                Math.round(
                        (float) totalScore / 5
                );

        interview.setFinalScore(
                finalScore
        );

        interview.setStatus(
                "TERMINATED"
        );

        Interview saved =
                interviewRepository.save(
                        interview
                );

        System.out.println(
                "INTERVIEW TERMINATED | ID="
                        + interviewId
                        + " | REASON="
                        + (
                            request == null
                                    ? "unknown"
                                    : request.reason()
                        )
                        + " | SCORE="
                        + finalScore
        );

        return ResponseEntity.ok(
                saved
        );
    }

    private Map<Long, Answer> latestAnswersByQuestion(
            List<Answer> answers
    ) {

        return answers
                .stream()
                .filter(
                        Objects::nonNull
                )
                .filter(answer ->
                        answer.getId() != null &&

                        answer.getQuestion() != null &&

                        answer.getQuestion()
                                .getId() != null
                )
                .collect(
                        Collectors.toMap(
                                answer ->
                                        answer.getQuestion()
                                                .getId(),

                                Function.identity(),

                                (first, second) ->
                                        first.getId() >
                                                second.getId()
                                                ? first
                                                : second
                        )
                );
    }

    private List<Long> safeQuestionIds(
            List<Long> questionIds
    ) {

        if (questionIds == null) {
            return List.of();
        }

        return questionIds
                .stream()
                .filter(
                        Objects::nonNull
                )
                .distinct()
                .limit(5)
                .toList();
    }

    private User authenticatedUser(
            Principal principal
    ) {

        if (principal == null ||
                principal.getName() == null) {

            return null;
        }

        return userRepository
                .findByEmail(
                        principal
                                .getName()
                                .trim()
                                .toLowerCase()
                )
                .orElse(null);
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

    public record InterviewRequest(
            String title,
            String role,
            String status,
            Long userId
    ) {}

    public record CompleteInterviewRequest(
            List<Long> questionIds
    ) {}

    public record TerminateInterviewRequest(
            String reason,
            List<Long> questionIds
    ) {}
}