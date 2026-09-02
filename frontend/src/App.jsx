import { useEffect, useState } from "react";
import "./App.css";

const API_URL = "http://localhost:8080";

function App() {
  const [interviews, setInterviews] = useState([]);
  const [currentInterviewId, setCurrentInterviewId] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  const [questions, setQuestions] = useState([]);
  const [interviewQuestions, setInterviewQuestions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [viewingResults, setViewingResults] = useState(false);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [scores, setScores] = useState([]);
  const [evaluations, setEvaluations] = useState([]);

  const [savedResults, setSavedResults] = useState([]);

  const [error, setError] = useState("");

  // =========================================================
  // PAGINATION
  // =========================================================
  const [visibleInterviewCount, setVisibleInterviewCount] =
    useState(5);

  // =========================================================
  // LOAD INTERVIEWS
  // =========================================================
  useEffect(() => {
    const loadInterviews = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_URL}/api/interviews`
        );

        if (!response.ok) {
          throw new Error(
            `Failed to load interviews. HTTP ${response.status}`
          );
        }

        const data = await response.json();

        console.log("Interviews:", data);

        setInterviews(data);

        if (data.length > 0) {
          const userId =
            data[0]?.user?.id ??
            data[0]?.userId;

          setCurrentUserId(userId);

          const interviewId = data[0].id;

          const questionResponse = await fetch(
            `${API_URL}/api/questions/interview/${interviewId}`
          );

          if (!questionResponse.ok) {
            throw new Error(
              `Failed to load questions. HTTP ${questionResponse.status}`
            );
          }

          const questionData =
            await questionResponse.json();

          console.log(
            "All questions from backend:",
            questionData
          );

          const practiceQuestions =
            questionData.slice(0, 10);

          setQuestions(practiceQuestions);

          console.log(
            "Practice questions:",
            practiceQuestions
          );
        } else {
          setQuestions([]);
        }
      } catch (err) {
        console.error(
          "Backend connection error:",
          err
        );

        setError(err.message);
        setInterviews([]);
        setQuestions([]);
        setInterviewQuestions([]);
      } finally {
        setLoading(false);
      }
    };

    loadInterviews();
  }, []);

  // =========================================================
  // REFRESH INTERVIEWS
  // =========================================================
  const refreshInterviews = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/interviews`
      );

      if (!response.ok) {
        throw new Error(
          `Failed to refresh interviews. HTTP ${response.status}`
        );
      }

      const data = await response.json();

      console.log(
        "Refreshed interviews:",
        data
      );

      setInterviews(data);

      if (data.length > 0) {
        const userId =
          data[0]?.user?.id ??
          data[0]?.userId;

        if (userId) {
          setCurrentUserId(userId);
        }
      }

      return data;
    } catch (err) {
      console.error(
        "Could not refresh interviews:",
        err
      );

      return null;
    }
  };

  // =========================================================
  // DELETE INTERVIEW
  // =========================================================
  const deleteInterview = async (interviewId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this interview?"
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/interviews/${interviewId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorText =
          await response.text();

        throw new Error(
          `Failed to delete interview. HTTP ${response.status}: ${errorText}`
        );
      }

      setInterviews(
        (previousInterviews) =>
          previousInterviews.filter(
            (interview) =>
              interview.id !== interviewId
          )
      );

      console.log(
        "Interview deleted:",
        interviewId
      );
    } catch (err) {
      console.error(
        "Delete interview error:",
        err
      );

      alert(
        `Could not delete interview.\n\n${err.message}`
      );
    }
  };

  // =========================================================
  // START EXISTING INTERVIEW
  // =========================================================
  const startInterview = async (interviewId) => {
    try {
      if (!interviewId) {
        alert("Interview ID not found.");
        return;
      }

      const selectedInterview =
        interviews.find(
          (interview) =>
            interview.id === interviewId
        );

      if (
        selectedInterview &&
        selectedInterview.status === "COMPLETED"
      ) {
        alert(
          "This interview is already completed. Click + New Interview to start a fresh interview."
        );
        return;
      }

      const response = await fetch(
        `${API_URL}/api/questions/interview/${interviewId}`
      );

      if (!response.ok) {
        throw new Error(
          `Failed to load questions. HTTP ${response.status}`
        );
      }

      const data = await response.json();

      console.log(
        "All available interview questions:",
        data
      );

      if (data.length < 5) {
        alert(
          `This interview has only ${data.length} questions. At least 5 questions are required.`
        );
        return;
      }

      const shuffledQuestions =
        [...data].sort(
          () => Math.random() - 0.5
        );

      const selectedQuestions =
        shuffledQuestions.slice(0, 5);

      console.log(
        "Selected EXACTLY 5 interview questions:",
        selectedQuestions
      );

      if (selectedQuestions.length !== 5) {
        alert(
          "Could not create a 5-question interview."
        );
        return;
      }

      setCurrentInterviewId(interviewId);

      setInterviewQuestions(
        selectedQuestions
      );

      setCurrentQuestionIndex(0);
      setAnswer("");

      setScores([]);
      setEvaluations([]);
      setSavedResults([]);

      setCompleted(false);
      setViewingResults(false);
      setStarted(true);
    } catch (err) {
      console.error(
        "Error starting interview:",
        err
      );

      alert(
        `Could not load interview questions.\n\n${err.message}`
      );
    }
  };

  // =========================================================
  // START FRESH INTERVIEW
  // =========================================================
  const createNewInterview = async () => {
    try {
      setLoading(true);

      const userId =
        currentUserId ??
        interviews[0]?.user?.id ??
        interviews[0]?.userId;

      if (!userId) {
        alert(
          "User ID not found. Please refresh the page once."
        );
        return;
      }

      console.log(
        "Creating new interview for user:",
        userId
      );

      const response = await fetch(
        `${API_URL}/api/interviews`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: "Java Developer Interview",
            role: "Software Engineer",
            status: "IN_PROGRESS",
            userId: userId,
          }),
        }
      );

      if (!response.ok) {
        const errorText =
          await response.text();

        throw new Error(
          `Failed to create new interview. HTTP ${response.status}: ${errorText}`
        );
      }

      const newInterview =
        await response.json();

      console.log(
        "New interview created:",
        newInterview
      );

      setCurrentUserId(
        newInterview?.user?.id ??
          newInterview?.userId ??
          userId
      );

      await refreshInterviews();

      await startInterview(
        newInterview.id
      );
    } catch (err) {
      console.error(
        "New interview error:",
        err
      );

      alert(
        `Could not create new interview.\n\n${err.message}`
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // VIEW RESULTS
  // =========================================================
  const viewInterviewResults = async (
    interviewId
  ) => {
    try {
      setLoading(true);

      const refreshedInterviews =
        await refreshInterviews();

      const response = await fetch(
        `${API_URL}/api/interviews/${interviewId}/results`
      );

      if (!response.ok) {
        const errorText =
          await response.text();

        throw new Error(
          `Failed to load interview results. HTTP ${response.status}: ${errorText}`
        );
      }

      const data = await response.json();

      console.log(
        "Saved interview results:",
        data
      );

      setSavedResults(data);
      setCurrentInterviewId(interviewId);

      setStarted(false);
      setCompleted(false);
      setViewingResults(true);

      if (refreshedInterviews) {
        const refreshedInterview =
          refreshedInterviews.find(
            (item) =>
              item.id === interviewId
          );

        if (refreshedInterview) {
          console.log(
            "Selected interview saved score:",
            refreshedInterview.finalScore
          );
        }
      }
    } catch (err) {
      console.error(
        "Error loading interview results:",
        err
      );

      alert(
        `Could not load interview results.\n\n${err.message}`
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // SUBMIT ANSWER
  // =========================================================
  const submitAnswer = async () => {
    if (!answer.trim()) {
      alert("Please enter an answer first.");
      return;
    }

    if (interviewQuestions.length !== 5) {
      alert(
        "This interview must contain exactly 5 questions."
      );
      return;
    }

    const currentQuestion =
      interviewQuestions[
        currentQuestionIndex
      ];

    if (!currentQuestion) {
      alert("Question not found.");
      return;
    }

    try {
      setSubmitting(true);

      console.log(
        "Submitting question:",
        currentQuestion.id
      );

      const response = await fetch(
        `${API_URL}/api/answers`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            answerText: answer,
            questionId:
              currentQuestion.id,
          }),
        }
      );

      if (!response.ok) {
        const errorText =
          await response.text();

        throw new Error(
          `Failed to submit answer. HTTP ${response.status}: ${errorText}`
        );
      }

      const data = await response.json();

      console.log(
        "Answer submitted successfully:",
        data
      );

      const score =
        Number(data.score) || 0;

      setScores(
        (previousScores) => [
          ...previousScores,
          score,
        ]
      );

      setEvaluations(
        (previousEvaluations) => [
          ...previousEvaluations,
          {
            question:
              currentQuestion.questionText,
            answer: answer,
            score: score,
            feedback: data.feedback,
          },
        ]
      );

      const nextIndex =
        currentQuestionIndex + 1;

      // =====================================================
      // QUESTION 5 = COMPLETE
      // =====================================================
      if (nextIndex >= 5) {
        console.log(
          "All 5 questions answered."
        );

        const selectedQuestionIds =
          interviewQuestions.map(
            (question) =>
              question.id
          );

        console.log(
          "EXACT 5 QUESTION IDs:",
          selectedQuestionIds
        );

        if (
          selectedQuestionIds.length !==
          5
        ) {
          throw new Error(
            "Exactly 5 question IDs are required."
          );
        }

        const completeResponse =
          await fetch(
            `${API_URL}/api/interviews/${currentInterviewId}/complete`,
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                questionIds:
                  selectedQuestionIds,
              }),
            }
          );

        if (!completeResponse.ok) {
          const errorText =
            await completeResponse.text();

          throw new Error(
            `Failed to complete interview. HTTP ${completeResponse.status}: ${errorText}`
          );
        }

        const completedInterview =
          await completeResponse.json();

        console.log(
          "Interview completed:",
          completedInterview
        );

        setInterviews(
          (previousInterviews) =>
            previousInterviews.map(
              (interview) =>
                interview.id ===
                currentInterviewId
                  ? {
                      ...interview,
                      status:
                        "COMPLETED",
                      finalScore:
                        completedInterview.finalScore,
                    }
                  : interview
            )
        );

        await refreshInterviews();

        setAnswer("");

        setCompleted(true);
        setStarted(false);

        return;
      }

      // =====================================================
      // NEXT QUESTION
      // =====================================================
      setCurrentQuestionIndex(
        nextIndex
      );

      setAnswer("");
    } catch (err) {
      console.error(
        "Answer submission error:",
        err
      );

      alert(
        `Could not submit answer.\n\n${err.message}`
      );
    } finally {
      setSubmitting(false);
    }
  };

  // =========================================================
  // LOCAL FINAL SCORE
  // =========================================================
  const getFinalScore = () => {
    if (scores.length === 0) {
      return 0;
    }

    const total =
      scores.reduce(
        (sum, score) =>
          sum + score,
        0
      );

    return Math.round(
      total / scores.length
    );
  };

  // =========================================================
  // PERFORMANCE MESSAGE
  // =========================================================
  const getPerformanceMessage = () => {
    const score =
      getFinalScore();

    if (score >= 80) {
      return "Excellent Performance";
    }

    if (score >= 60) {
      return "Good Performance";
    }

    if (score >= 40) {
      return "Needs Improvement";
    }

    return "Needs Significant Improvement";
  };

  // =========================================================
  // RESET
  // =========================================================
  const resetInterview = () => {
    setCompleted(false);
    setStarted(false);
    setViewingResults(false);

    setCurrentInterviewId(null);
    setCurrentQuestionIndex(0);

    setAnswer("");

    setScores([]);
    setEvaluations([]);
    setSavedResults([]);

    setInterviewQuestions([]);
  };

  // =========================================================
  // COMPLETED SCREEN
  // =========================================================
  if (completed) {
    return (
      <div className="app">
        <header className="navbar">
          <div className="logo">
            AI<span>Interview</span>
          </div>

          <button
            className="profile"
            onClick={resetInterview}
          >
            Dashboard
          </button>
        </header>

        <main>
          <section className="section">
            <p className="eyebrow">
              INTERVIEW COMPLETE
            </p>

            <h1>
              Great job! 🎉
            </h1>

            <p className="hero-text">
              You have completed the
              interview.
            </p>

            <div className="feedback-box">
              <h2>
                Final Score
              </h2>

              <h1>
                {getFinalScore()} / 100
              </h1>

              <p>
                Questions answered:{" "}
                <strong>
                  {scores.length}
                </strong>
              </p>

              <p>
                Performance:{" "}
                <strong>
                  {getPerformanceMessage()}
                </strong>
              </p>
            </div>

            <div className="feedback-box">
              <h2>
                Question Results
              </h2>

              {evaluations.length ===
              0 ? (
                <p>
                  No evaluations
                  available.
                </p>
              ) : (
                evaluations.map(
                  (
                    evaluation,
                    index
                  ) => (
                    <div
                      key={index}
                      style={{
                        marginBottom:
                          "24px",
                      }}
                    >
                      <p>
                        <strong>
                          Question{" "}
                          {index + 1}
                        </strong>
                      </p>

                      <h3>
                        {
                          evaluation.question
                        }
                      </h3>

                      <p>
                        <strong>
                          Your Answer:
                        </strong>
                      </p>

                      <p>
                        {
                          evaluation.answer
                        }
                      </p>

                      <p>
                        <strong>
                          Score:
                        </strong>{" "}
                        {
                          evaluation.score
                        }{" "}
                        / 100
                      </p>

                      <p>
                        <strong>
                          AI Feedback:
                        </strong>{" "}
                        {
                          evaluation.feedback
                        }
                      </p>
                    </div>
                  )
                )
              )}
            </div>

            <br />

            <button
              className="primary-button"
              onClick={resetInterview}
            >
              Back to Dashboard
            </button>
          </section>
        </main>
      </div>
    );
  }

  // =========================================================
  // VIEW RESULTS SCREEN
  // =========================================================
  if (viewingResults) {
    const interview =
      interviews.find(
        (item) =>
          item.id ===
          currentInterviewId
      );

    const finalScore =
      interview?.finalScore ?? 0;

    return (
      <div className="app">
        <header className="navbar">
          <div className="logo">
            AI<span>Interview</span>
          </div>

          <button
            className="profile"
            onClick={resetInterview}
          >
            Back to Dashboard
          </button>
        </header>

        <main>
          <section className="section">
            <p className="eyebrow">
              INTERVIEW RESULTS
            </p>

            <h1>
              {interview?.title ||
                "Interview Results"}
            </h1>

            <p className="hero-text">
              Your saved AI interview
              evaluation.
            </p>

            <div className="feedback-box">
              <h2>
                Final Score
              </h2>

              <h1>
                {finalScore} / 100
              </h1>

              <p>
                Status:{" "}
                <strong>
                  {interview?.status ||
                    "COMPLETED"}
                </strong>
              </p>
            </div>

            <div className="feedback-box">
              <h2>
                Question Results
              </h2>

              {savedResults.length ===
              0 ? (
                <p>
                  No saved answers
                  found.
                </p>
              ) : (
                savedResults.map(
                  (
                    result,
                    index
                  ) => (
                    <div
                      key={
                        result.id ||
                        index
                      }
                      style={{
                        marginBottom:
                          "30px",
                      }}
                    >
                      <p>
                        <strong>
                          Question{" "}
                          {index + 1}
                        </strong>
                      </p>

                      <h3>
                        {result.question
                          ?.questionText ||
                          result.question ||
                          result.questionText ||
                          "Question"}
                      </h3>

                      <p>
                        <strong>
                          Your Answer:
                        </strong>
                      </p>

                      <p>
                        {result.answerText ||
                          result.answer ||
                          "No answer available."}
                      </p>

                      <p>
                        <strong>
                          Score:
                        </strong>{" "}
                        {result.score ??
                          0}{" "}
                        / 100
                      </p>

                      <p>
                        <strong>
                          AI Feedback:
                        </strong>{" "}
                        {result.feedback ||
                          "No feedback available."}
                      </p>
                    </div>
                  )
                )
              )}
            </div>
          </section>
        </main>
      </div>
    );
  }

  // =========================================================
  // LIVE INTERVIEW SCREEN
  // =========================================================
  if (started) {
    const currentQuestion =
      interviewQuestions[
        currentQuestionIndex
      ];

    if (!currentQuestion) {
      return (
        <div className="app">
          <main>
            <section className="section">
              <h1>
                No question available
              </h1>

              <button
                className="primary-button"
                onClick={
                  resetInterview
                }
              >
                Back to Dashboard
              </button>
            </section>
          </main>
        </div>
      );
    }

    return (
      <div className="app">
        <header className="navbar">
          <div className="logo">
            AI<span>Interview</span>
          </div>

          <button
            className="profile"
            onClick={() =>
              setStarted(false)
            }
          >
            Back to Dashboard
          </button>
        </header>

        <main>
          <section className="section">
            <p className="eyebrow">
              LIVE INTERVIEW
            </p>

            <h1>
              Java Backend Interview
            </h1>

            <p className="hero-text">
              Answer the question
              below as you would in
              a real interview.
            </p>

            <div className="question-card">
              <div className="question-number">
                {currentQuestionIndex +
                  1}
              </div>

              <div>
                <p>
                  Question{" "}
                  {currentQuestionIndex +
                    1}{" "}
                  of 5
                </p>

                <h2>
                  {
                    currentQuestion.questionText
                  }
                </h2>

                <textarea
                  value={answer}
                  onChange={(event) =>
                    setAnswer(
                      event.target
                        .value
                    )
                  }
                  placeholder="Type your answer here..."
                  rows="8"
                  disabled={
                    submitting
                  }
                />

                <br />

                <button
                  className="primary-button"
                  onClick={
                    submitAnswer
                  }
                  disabled={
                    submitting
                  }
                >
                  {submitting
                    ? "Submitting..."
                    : currentQuestionIndex +
                        1 >=
                      5
                    ? "Submit Final Answer"
                    : "Submit Answer →"}
                </button>
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  // =========================================================
  // LATEST COMPLETED INTERVIEW
  // =========================================================
  const completedInterviews =
    interviews.filter(
      (interview) =>
        interview.status ===
          "COMPLETED" &&
        interview.finalScore !==
          null &&
        interview.finalScore !==
          undefined
    );

  const lastCompletedInterview =
    completedInterviews.length > 0
      ? [...completedInterviews].sort(
          (a, b) =>
            Number(b.id) -
            Number(a.id)
        )[0]
      : null;

  // =========================================================
  // PAGINATION
  // =========================================================
  const visibleInterviews =
    interviews.slice(
      0,
      visibleInterviewCount
    );

  const hasMoreInterviews =
    visibleInterviewCount <
    interviews.length;

  // =========================================================
  // DASHBOARD
  // =========================================================
  return (
    <div className="app">
      <header className="navbar">
        <div className="logo">
          AI<span>Interview</span>
        </div>

        <nav>
          <a href="#dashboard">
            Dashboard
          </a>

          <a href="#interviews">
            Interviews
          </a>

          <a href="#questions">
            Questions
          </a>
        </nav>

        <button className="profile">
          Test User
        </button>
      </header>

      <main>
        {/* HERO */}
        <section
          className="hero"
          id="dashboard"
        >
          <div>
            <p className="eyebrow">
              AI-POWERED INTERVIEW
              PLATFORM
            </p>

            <h1>
              Practice interviews.
              <br />
              <span>
                Get job ready.
              </span>
            </h1>

            <p className="hero-text">
              Prepare for technical
              interviews with
              AI-generated questions,
              real-time practice and
              detailed feedback.
            </p>

            <button
              className="primary-button"
              onClick={
                createNewInterview
              }
              disabled={loading}
            >
              {loading
                ? "Loading..."
                : "Start Interview"}
            </button>
          </div>

          <div className="hero-card">
            <div className="status">
              <span></span>
              Interview Ready
            </div>

            <h3>
              Java Backend Interview
            </h3>

            <p>
              Software Engineer
            </p>

            <div className="card-line">
              <span>
                Questions
              </span>

              <strong>
                5
              </strong>
            </div>

            <div className="card-line">
              <span>
                Status
              </span>

              <strong>
                {lastCompletedInterview
                  ? lastCompletedInterview.status
                  : "—"}
              </strong>
            </div>

            {lastCompletedInterview && (
              <div className="card-line">
                <span>
                  Final Score
                </span>

                <strong>
                  {
                    lastCompletedInterview.finalScore
                  }{" "}
                  / 100
                </strong>
              </div>
            )}
          </div>
        </section>

        {/* ERROR */}
        {error && (
          <section className="section">
            <div className="empty">
              <strong>
                Backend connection error
              </strong>

              <p>
                {error}
              </p>
            </div>
          </section>
        )}

        {/* INTERVIEWS */}
        <section
          className="section"
          id="interviews"
        >
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                YOUR INTERVIEWS
              </p>

              <h2>
                Interview Dashboard
              </h2>
            </div>

            <button
              className="secondary-button"
              onClick={
                createNewInterview
              }
              disabled={loading}
            >
              {loading
                ? "Creating..."
                : "+ New Interview"}
            </button>
          </div>

          {loading ? (
            <p>
              Loading interviews...
            </p>
          ) : interviews.length ===
            0 ? (
            <div className="empty">
              No interviews found.
            </div>
          ) : (
            <>
              <div className="interview-grid">
                {visibleInterviews.map(
                  (interview) => (
                    <div
                      className="interview-card"
                      key={
                        interview.id
                      }
                    >
                      <div className="icon-box">
                        AI
                      </div>

                      <h3>
                        {
                          interview.title
                        }
                      </h3>

                      <p>
                        {
                          interview.role
                        }
                      </p>

                      <div className="interview-info">
                        <span>
                          Status
                        </span>

                        <strong>
                          {
                            interview.status
                          }
                        </strong>
                      </div>

                      {interview.finalScore !==
                        null &&
                        interview.finalScore !==
                          undefined && (
                          <div className="interview-info">
                            <span>
                              Final Score
                            </span>

                            <strong>
                              {
                                interview.finalScore
                              }{" "}
                              / 100
                            </strong>
                          </div>
                        )}

                      <button
                        className="open-button"
                        onClick={() =>
                          interview.status ===
                          "COMPLETED"
                            ? viewInterviewResults(
                                interview.id
                              )
                            : startInterview(
                                interview.id
                              )
                        }
                      >
                        {interview.status ===
                        "COMPLETED"
                          ? "View Results →"
                          : "Open Interview →"}
                      </button>

                      <button
                        className="secondary-button"
                        onClick={() =>
                          deleteInterview(
                            interview.id
                          )
                        }
                        style={{
                          marginTop: "10px",
                          width: "100%",
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  )
                )}
              </div>

              {/* LOAD MORE */}
              {hasMoreInterviews && (
                <div
                  style={{
                    textAlign: "center",
                    marginTop: "30px",
                  }}
                >
                  <button
                    className="secondary-button"
                    onClick={() =>
                      setVisibleInterviewCount(
                        (previousCount) =>
                          previousCount + 5
                      )
                    }
                  >
                    Load More Interviews
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {/* PRACTICE QUESTIONS */}
        <section
          className="section"
          id="questions"
        >
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                INTERVIEW QUESTIONS
              </p>

              <h2>
                Practice Questions
              </h2>

              <p className="hero-text">
                10 questions available
                for practice.
              </p>
            </div>
          </div>

          {questions.length === 0 ? (
            <div className="empty">
              No questions available.
            </div>
          ) : (
            <div className="question-list">
              {questions.map(
                (
                  question,
                  index
                ) => (
                  <div
                    className="question-card"
                    key={
                      question.id
                    }
                  >
                    <div className="question-number">
                      {index + 1}
                    </div>

                    <div>
                      <h3>
                        {
                          question.questionText
                        }
                      </h3>

                      <p>
                        Expected answer:{" "}
                        {
                          question.expectedAnswer
                        }
                      </p>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </section>
      </main>

      <footer>
        <p>
          © 2026 AI Interview Platform
        </p>

        <p>
          Built with React + Spring Boot
        </p>
      </footer>
    </div>
  );
}

export default App;