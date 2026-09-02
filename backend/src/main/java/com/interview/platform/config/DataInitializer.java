package com.interview.platform.config;

import com.interview.platform.model.Interview;
import com.interview.platform.model.Question;
import com.interview.platform.model.User;
import com.interview.platform.repository.InterviewRepository;
import com.interview.platform.repository.QuestionRepository;
import com.interview.platform.repository.UserRepository;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;
import java.util.Optional;

@Configuration
public class DataInitializer {

    @Bean
    CommandLineRunner initializeData(
            UserRepository userRepository,
            InterviewRepository interviewRepository,
            QuestionRepository questionRepository) {

        return args -> {

            // ==========================================
            // GET OR CREATE TEST USER
            // ==========================================

            User user;

            if (userRepository.count() == 0) {

                user = new User(
                        "Test User",
                        "test@example.com"
                );

                user = userRepository.save(user);

                System.out.println("Test user created.");

            } else {

                user = userRepository.findAll().get(0);
            }


            // ==========================================
            // FIND JAVA BACKEND INTERVIEW ONLY
            // ==========================================

            Optional<Interview> existingInterview =
                    interviewRepository.findAll()
                            .stream()
                            .filter(interview ->
                                    "Java Backend Interview"
                                            .equals(interview.getTitle())
                            )
                            .findFirst();

            Interview interview;

            if (existingInterview.isPresent()) {

                interview = existingInterview.get();

                System.out.println(
                        "Java Backend Interview already exists."
                );

            } else {

                interview = new Interview(
                        "Java Backend Interview",
                        "Software Engineer",
                        "CREATED",
                        user
                );

                interview = interviewRepository.save(interview);

                System.out.println(
                        "Java Backend Interview created."
                );
            }


            // ==========================================
            // CHECK QUESTIONS FOR THIS INTERVIEW ONLY
            // ==========================================

            List<Question> existingQuestions =
                    questionRepository.findByInterviewId(
                            interview.getId()
                    );

            if (existingQuestions.size() >= 10) {

                System.out.println(
                        "Java Backend Interview already has "
                                + existingQuestions.size()
                                + " questions."
                );

                return;
            }


            // ==========================================
            // CREATE DEFAULT 10 QUESTIONS
            // ==========================================

            List<Question> questions = List.of(

                    new Question(
                            "What is Java?",
                            "Java is a high-level, object-oriented, class-based and platform-independent programming language. Java code is compiled into bytecode that runs on the JVM.",
                            interview
                    ),

                    new Question(
                            "What is the difference between JDK, JRE, and JVM?",
                            "JDK is used to develop Java applications and contains development tools. JRE provides the environment required to run Java applications. JVM executes Java bytecode.",
                            interview
                    ),

                    new Question(
                            "What are the main features of Java?",
                            "The main features include object-oriented programming, platform independence, portability, security, robustness, multithreading, automatic memory management and high performance through JVM optimizations.",
                            interview
                    ),

                    new Question(
                            "What are the four pillars of Object-Oriented Programming?",
                            "The four pillars are encapsulation, inheritance, polymorphism and abstraction.",
                            interview
                    ),

                    new Question(
                            "What is the difference between == and equals() in Java?",
                            "The == operator compares primitive values or object references, while equals() is used to compare object content when the class properly overrides the equals method.",
                            interview
                    ),

                    new Question(
                            "What is inheritance in Java?",
                            "Inheritance allows one class to acquire properties and behavior from another class using extends. It promotes code reuse and represents an IS-A relationship.",
                            interview
                    ),

                    new Question(
                            "What is method overloading and method overriding?",
                            "Method overloading means having multiple methods with the same name but different parameters in the same class. Method overriding means a subclass provides its own implementation of a method inherited from its parent class.",
                            interview
                    ),

                    new Question(
                            "What is an exception in Java?",
                            "An exception is an event that disrupts the normal flow of program execution. Java provides try, catch, finally, throw and throws to handle exceptions.",
                            interview
                    ),

                    new Question(
                            "What is the difference between ArrayList and LinkedList?",
                            "ArrayList uses a dynamic array and provides fast random access. LinkedList uses linked nodes and is generally more efficient for frequent insertion and deletion in the middle of the list.",
                            interview
                    ),

                    new Question(
                            "What is Spring Boot?",
                            "Spring Boot is a framework built on Spring that simplifies the development of Java applications by providing auto-configuration, starter dependencies, embedded servers and production-ready features.",
                            interview
                    )
            );


            // ==========================================
            // ADD QUESTIONS ONLY IF MISSING
            // ==========================================

            int existingCount = existingQuestions.size();

            List<Question> newQuestions =
                    questions.subList(
                            existingCount,
                            10
                    );

            questionRepository.saveAll(newQuestions);

            System.out.println(
                    "Added "
                            + newQuestions.size()
                            + " questions to Java Backend Interview."
            );
        };
    }
}