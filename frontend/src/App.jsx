import { useEffect, useState } from "react";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

const authInputStyle = {
  width: "100%",
  padding: "14px",
  marginBottom: "15px",
  borderRadius: "10px",
  border: "1px solid var(--auth-input-border)",
  background: "var(--auth-input-bg)",
  color: "var(--auth-input-text)",
  boxSizing: "border-box",
  fontSize: "16px",
};

const authLinkStyle = {
  background: "none",
  border: "none",
  color: "var(--auth-link)",
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: "inherit",
};

function App() {
  // =========================================================
  // THEME
  // =========================================================

  const [theme, setTheme] = useState(
    localStorage.getItem("interviewLabTheme") || "dark"
  );

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      theme
    );

    localStorage.setItem("interviewLabTheme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((currentTheme) =>
      currentTheme === "dark" ? "light" : "dark"
    );
  };

  // =========================================================
  // AUTH
  // =========================================================

  const [isLoggedIn, setIsLoggedIn] = useState(
    Boolean(localStorage.getItem("userId") && localStorage.getItem("token"))
  );

  const [authMode, setAuthMode] = useState("login");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authConfirmPassword, setAuthConfirmPassword] =
    useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // =========================================================
  // INTERVIEW STATE
  // =========================================================

  const [interviews, setInterviews] = useState([]);
  const [currentInterviewId, setCurrentInterviewId] =
    useState(null);

  // Practice questions = exactly 10
  const [questions, setQuestions] = useState([]);

  // Live interview questions = exactly 5
  const [interviewQuestions, setInterviewQuestions] =
    useState([]);

  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [viewingResults, setViewingResults] =
    useState(false);

  const [currentQuestionIndex, setCurrentQuestionIndex] =
    useState(0);

  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [scores, setScores] = useState([]);
  const [evaluations, setEvaluations] = useState([]);

  const [savedResults, setSavedResults] = useState([]);

  const [error, setError] = useState("");

  // =========================================================
  // THEME BUTTON
  // =========================================================

  const ThemeToggle = () => (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
    >
      {theme === "dark"
        ? "\u2600\uFE0F Light Mode"
        : "\u263D Dark Mode"}
    </button>
  );

  // =========================================================
  // LOGIN / REGISTER
  // =========================================================

  const handleAuth = async (event) => {
    event.preventDefault();

    setAuthError("");

    if (!authEmail.trim()) {
      setAuthError("Email is required.");
      return;
    }

    if (!authPassword.trim()) {
      setAuthError("Password is required.");
      return;
    }

    if (authMode === "register") {
      if (!authName.trim()) {
        setAuthError("Name is required.");
        return;
      }

      if (authPassword.length < 6) {
        setAuthError(
          "Password must be at least 6 characters."
        );
        return;
      }

      if (authPassword !== authConfirmPassword) {
        setAuthError("Passwords do not match.");
        return;
      }
    }

    try {
      setAuthLoading(true);

      const endpoint =
        authMode === "login"
          ? "/api/auth/login"
          : "/api/auth/register";

      const body =
        authMode === "login"
          ? {
              email: authEmail.trim(),
              password: authPassword,
            }
          : {
              name: authName.trim(),
              email: authEmail.trim(),
              password: authPassword,
            };

      const response = await apiFetch(
        `${API_URL}${endpoint}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      let data = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            data.error ||
            "Authentication failed."
        );
      }

      if (!data.userId) {
        throw new Error(
          "Login succeeded but user ID was not returned by the backend."
        );
      }

      if (!data.token) {
        throw new Error(
          "Authentication succeeded but JWT token was not returned by the backend."
        );
      }

      localStorage.setItem("token", data.token);

      localStorage.setItem(
        "userId",
        String(data.userId)
      );

      localStorage.setItem(
        "userName",
        data.name || authName
      );

      localStorage.setItem(
        "userEmail",
        data.email || authEmail
      );

      setIsLoggedIn(true);

      setAuthName("");
      setAuthEmail("");
      setAuthPassword("");
      setAuthConfirmPassword("");
      setAuthError("");
    } catch (err) {
      console.error(
        "Authentication error:",
        err
      );

      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  // =========================================================
  // LOGOUT
  // =========================================================

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");

    setIsLoggedIn(false);

    setAuthMode("login");
    setAuthName("");
    setAuthEmail("");
    setAuthPassword("");
    setAuthConfirmPassword("");
    setAuthError("");

    setInterviews([]);
    setQuestions([]);
    setInterviewQuestions([]);
    setCurrentInterviewId(null);
    setStarted(false);
    setCompleted(false);
    setViewingResults(false);
  };

  // =========================================================
  // FORMAT DATE + TIME
  // =========================================================

  const formatDateTime = (interview) => {
    const rawDate =
      interview?.createdAt ??
      interview?.created_at ??
      interview?.createdDate ??
      interview?.created_date;

    if (!rawDate) {
      return "Date unavailable";
    }

    const value = String(rawDate);

    /*
      Spring Boot LocalDateTime example:

      2026-09-02T22:32:08.801343

      Read it directly instead of new Date()
      so browser timezone conversion does not change it.
    */

    const match = value.match(
      /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/
    );

    if (!match) {
      return "Date unavailable";
    }

    const [, year, month, day, hour, minute] =
      match;

    const hours = Number(hour);
    const minutes = Number(minute);

    let displayHour = hours % 12;

    if (displayHour === 0) {
      displayHour = 12;
    }

    const amPm = hours >= 12 ? "PM" : "AM";

    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const monthName =
      monthNames[Number(month) - 1] || month;

    return `${day} ${monthName} ${year}, ${String(
      displayHour
    ).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )} ${amPm}`;
  };

  // =========================================================
  // LOAD INTERVIEWS + PRACTICE QUESTIONS
  // =========================================================

  useEffect(() => {
    if (!isLoggedIn) {
      setLoading(false);
      setInterviews([]);
      setQuestions([]);
      return;
    }

    const loadData = async () => {
      const userId = localStorage.getItem("userId");

      if (!userId) {
        setLoading(false);
        setInterviews([]);
        setQuestions([]);
        return;
      }

      try {
        setLoading(true);
        setError("");

        // =====================================================
        // LOAD ONLY THIS USER'S INTERVIEWS
        // =====================================================

        const response = await apiFetch(
          `${API_URL}/api/interviews?userId=${encodeURIComponent(
            userId
          )}`
        );

        if (!response.ok) {
          throw new Error(
            `Failed to load interviews. HTTP ${response.status}`
          );
        }

        const data = await response.json();

        console.log("Interviews:", data);

        const interviewList = Array.isArray(data)
          ? data
          : [];

        setInterviews(interviewList);

        // =====================================================
        // LOAD 10 PRACTICE QUESTIONS INDEPENDENTLY
        // =====================================================

        const questionResponse = await apiFetch(
          `${API_URL}/api/questions`
        );

        if (!questionResponse.ok) {
          throw new Error(
            `Failed to load practice questions. HTTP ${questionResponse.status}`
          );
        }

        const questionData =
          await questionResponse.json();

        console.log(
          "Practice questions from backend:",
          questionData
        );

        const allQuestions = Array.isArray(
          questionData
        )
          ? questionData
          : [];

        const practiceQuestions =
          allQuestions.slice(0, 10);

        setQuestions(practiceQuestions);

        console.log(
          "Practice questions (10):",
          practiceQuestions
        );
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

    loadData();
  }, [isLoggedIn]);

  // =========================================================
  // REFRESH INTERVIEWS
  // =========================================================

  const refreshInterviews = async () => {
    try {
      const userId = localStorage.getItem("userId");

      if (!userId) {
        return null;
      }

      const response = await apiFetch(
        `${API_URL}/api/interviews?userId=${encodeURIComponent(
          userId
        )}`
      );

      if (!response.ok) {
        throw new Error(
          `Failed to refresh interviews. HTTP ${response.status}`
        );
      }

      const data = await response.json();

      const interviewList = Array.isArray(data)
        ? data
        : [];

      console.log(
        "Refreshed interviews:",
        interviewList
      );

      setInterviews(interviewList);

      return interviewList;
    } catch (err) {
      console.error(
        "Could not refresh interviews:",
        err
      );

      return null;
    }
  };

  // =========================================================
  // AUTHENTICATED API REQUEST
  // =========================================================

  const apiFetch = (url, options = {}) => {
    const token = localStorage.getItem("token");

    const headers = {
      ...(options.headers || {}),
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return window.fetch(url, {
      ...options,
      headers,
    });
  };

  // =========================================================
  // START EXISTING INTERVIEW
  // =========================================================

  const startInterview = async (
    interviewId = null
  ) => {
    try {
      let id = interviewId;

      if (id === null) {
        if (interviews.length === 0) {
          alert("No interview available.");
          return;
        }

        id = interviews[0].id;
      }

      const response = await apiFetch(
        `${API_URL}/api/questions/interview/${id}`
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

      if (!Array.isArray(data) || data.length < 5) {
        alert(
          `This interview has ${
            Array.isArray(data) ? data.length : 0
          } questions. At least 5 questions are required.`
        );

        return;
      }

      const shuffledQuestions = [...data].sort(
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

      setCurrentInterviewId(id);
      setInterviewQuestions(selectedQuestions);

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
  // CREATE NEW INTERVIEW
  // =========================================================

  const createNewInterview = async () => {
    try {
      setLoading(true);

      const userId = localStorage.getItem("userId");

      if (!userId) {
        alert(
          "User ID not found. Please login again."
        );

        setIsLoggedIn(false);
        return;
      }

      console.log(
        "Creating new interview for user:",
        userId
      );

      const response = await apiFetch(
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
  // DELETE INTERVIEW
  // =========================================================

  const deleteInterview = async (
    interviewId
  ) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this interview?"
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await apiFetch(
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

      if (currentInterviewId === interviewId) {
        resetInterview();
      }

      alert(
        "Interview deleted successfully."
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
  // VIEW SAVED RESULTS
  // =========================================================

  const viewInterviewResults = async (
    interviewId
  ) => {
    try {
      setLoading(true);

      const refreshedInterviews =
        await refreshInterviews();

      const response = await apiFetch(
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

      setSavedResults(
        Array.isArray(data) ? data : []
      );

      setCurrentInterviewId(interviewId);

      setStarted(false);
      setCompleted(false);
      setViewingResults(true);

      if (refreshedInterviews) {
        const refreshedInterview =
          refreshedInterviews.find(
            (item) =>
              Number(item.id) ===
              Number(interviewId)
          );

        if (refreshedInterview) {
          console.log(
            "Latest saved score:",
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
      alert(
        "Please enter an answer first."
      );
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

      const response = await apiFetch(
        `${API_URL}/api/answers`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            answerText: answer,
            questionId: currentQuestion.id,
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

      const data =
        await response.json();

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
            (question) => question.id
          );

        if (
          selectedQuestionIds.length !== 5
        ) {
          throw new Error(
            "Exactly 5 question IDs are required."
          );
        }

        console.log(
          "EXACT 5 QUESTION IDs:",
          selectedQuestionIds
        );

        const completeResponse =
          await apiFetch(
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
                Number(interview.id) ===
                Number(currentInterviewId)
                  ? {
                      ...interview,
                      status: "COMPLETED",
                      finalScore:
                        completedInterview.finalScore,
                      createdAt:
                        completedInterview.createdAt ??
                        interview.createdAt,
                    }
                  : interview
            )
        );

        await refreshInterviews();

        setAnswer("");
        setStarted(false);
        setCompleted(true);
        setViewingResults(false);

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
  // FINAL SCORE
  // =========================================================

  const getFinalScore = () => {
    if (scores.length === 0) {
      return 0;
    }

    const total = scores.reduce(
      (sum, score) => sum + score,
      0
    );

    return Math.round(
      total / scores.length
    );
  };

  // =========================================================
  // PERFORMANCE
  // =========================================================

  const getPerformanceMessage = () => {
    const score = getFinalScore();

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

  const getScoreClass = (score) => {
    const numericScore = Number(score) || 0;

    if (numericScore >= 80) {
      return "score-excellent";
    }

    if (numericScore >= 60) {
      return "score-good";
    }

    if (numericScore >= 40) {
      return "score-needs-improvement";
    }

    return "score-significant-improvement";
  };

  const getScoreLabel = (score) => {
    const numericScore = Number(score) || 0;

    if (numericScore >= 80) {
      return `ðŸŸ¢ ${numericScore}/100 â€” Excellent`;
    }

    if (numericScore >= 60) {
      return `ðŸ”µ ${numericScore}/100 â€” Good`;
    }

    if (numericScore >= 40) {
      return `ðŸŸ  ${numericScore}/100 â€” Needs Improvement`;
    }

    return `ðŸ”´ Below 40 â€” Needs Significant Improvement`;
  };

  
  // =========================================================
  // TERMINATE ACTIVE INTERVIEW
  // =========================================================

  const terminateInterview = async (reason = "exit") => {
    if (!currentInterviewId) {
      setStarted(false);
      return;
    }

    const questionIds =
      interviewQuestions
        .slice(0, 5)
        .map((question) => question.id);

    try {
      console.log("TERMINATE REQUEST", {
        reason,
        interviewId: currentInterviewId,
        questionIds,
      });

      const response = await apiFetch(
        `${API_URL}/api/interviews/${currentInterviewId}/terminate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reason,
            questionIds,
          }),
        }
      );

      console.log(
        "TERMINATE RESPONSE",
        response.status
      );

      if (!response.ok) {
        const text = await response.text();

        throw new Error(
          `Termination failed. HTTP ${response.status}: ${text}`
        );
      }

      await refreshInterviews();

    } catch (err) {
      console.error(
        "Interview termination error:",
        err
      );
    }

    setStarted(false);
    setCompleted(false);
    setViewingResults(false);

    setCurrentInterviewId(null);
    setInterviewQuestions([]);
    setCurrentQuestionIndex(0);

    setAnswer("");
    setScores([]);
    setEvaluations([]);
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (
        document.hidden &&
        started &&
        currentInterviewId &&
        !completed
      ) {
        console.log(
          "INTERVIEW PAGE HIDDEN - TERMINATING"
        );

        terminateInterview(
          "tab-switch"
        );
      }
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, [
    started,
    currentInterviewId,
    completed,
    interviewQuestions,
  ]);
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
  // LOGIN / REGISTER SCREEN
  // =========================================================

  if (!isLoggedIn) {
    return (
      <div className="app auth-page">
        <div className="auth-theme-corner">
          <ThemeToggle />
        </div>

        <main className="auth-layout">
          <section className="auth-showcase" aria-label="InterviewLab introduction">
            <p className="eyebrow auth-showcase-eyebrow">
              TECHNICAL INTERVIEW PRACTICE
            </p>

            <h1 className="auth-showcase-title">
              <span>Practice smarter.</span>
              <span className="auth-showcase-muted">Interview with confidence.</span>
            </h1>

            <p className="auth-showcase-copy">
              Practice structured technical interviews, review your answers,
              and build confidence with every attempt.
            </p>

            <div className="auth-feature-grid">
              <div className="auth-feature-card">
                <strong>5</strong>
                <span>Questions</span>
              </div>
              <div className="auth-feature-card">
                <strong>AI</strong>
                <span>Feedback</span>
              </div>
              <div className="auth-feature-card">
                <strong>100</strong>
                <span>Score</span>
              </div>
            </div>

            <p className="auth-showcase-footer">
              PRACTICE {"\u2022"} REVIEW {"\u2022"} IMPROVE
            </p>
          </section>

          <section className="auth-card auth-workspace-card">
            <div className="auth-card-head">
              <div className="logo auth-logo">
                Interview<span>Lab</span>
              </div>

              <p className="eyebrow auth-workspace-eyebrow">
                TECHNICAL INTERVIEW WORKSPACE
              </p>

              <h2>
                {authMode === "login" ? "Welcome Back" : "Create Account"}
              </h2>

              <p className="auth-card-copy">
                {authMode === "login"
                  ? "Login to continue your interview practice."
                  : "Register to start your interview practice."}
              </p>
            </div>

            <form className="auth-form" onSubmit={handleAuth}>
              {authMode === "register" && (
                <input
                  className="auth-input"
                  type="text"
                  placeholder="Name"
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  required
                />
              )}

              <input
                className="auth-input"
                type="email"
                placeholder="Email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                required
              />

              <input
                className="auth-input"
                type="password"
                placeholder="Password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                required
              />

              {authMode === "register" && (
                <input
                  className="auth-input"
                  type="password"
                  placeholder="Confirm Password"
                  value={authConfirmPassword}
                  onChange={(e) => setAuthConfirmPassword(e.target.value)}
                  required
                />
              )}

              {authError && <p className="auth-error">{authError}</p>}

              <button
                type="submit"
                className="primary-button auth-submit"
                disabled={authLoading}
              >
                {authLoading
                  ? "Please wait..."
                  : authMode === "login"
                  ? "Login"
                  : "Register"}
              </button>
            </form>

            <div className="auth-switch-row">
              {authMode === "login" ? (
                <p>
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("register");
                      setAuthError("");
                    }}
                    className="auth-switch-button"
                  >
                    Register
                  </button>
                </p>
              ) : (
                <p>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("login");
                      setAuthError("");
                    }}
                    className="auth-switch-button"
                  >
                    Login
                  </button>
                </p>
              )}
            </div>
          </section>
        </main>
      </div>
    );
  }

  // =========================================================
  // COMPLETED SCREEN
  // =========================================================

  if (completed) {
    return (
      <div className="app">
        <header className="navbar">
          <div className="logo">
            Interview<span>Lab</span>
          </div>

          <div className="navbar-actions">
            <ThemeToggle />

            <button
              className="profile"
              onClick={resetInterview}
            >
              Dashboard
            </button>
          </div>
        </header>

        <main>
          <section className="section">
            <p className="eyebrow">
              INTERVIEW COMPLETE
            </p>

            <h1>
              Great job! ðŸŽ‰
            </h1>

            <p className="hero-text">
              You have completed the
              interview.
            </p>

            <div className="feedback-box">
              <h2>Final Score</h2>

              <h1>
                {getFinalScore()} / 100
              </h1>

              <div
                className={`score-badge ${getScoreClass(
                  getFinalScore()
                )}`}
              >
                {getScoreLabel(getFinalScore())}
              </div>

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
              <h2>Question Results</h2>

              {evaluations.length === 0 ? (
                <p>
                  No evaluations available.
                </p>
              ) : (
                evaluations.map(
                  (evaluation, index) => (
                    <div
                      key={index}
                      className="saved-result-card"
                    >
                      <div className="result-label">
                        Question {index + 1}
                      </div>

                      <h3 className="saved-question">
                        {evaluation.question}
                      </h3>

                      <div className="result-divider"></div>

                      <p className="result-label">
                        YOUR ANSWER
                      </p>

                      <p className="result-answer">
                        {evaluation.answer}
                      </p>

                      <div className="result-score-row">
                        <span className="result-label">
                          SCORE
                        </span>

                        <strong>
                          {evaluation.score} / 100
                        </strong>

                        <span
                          className={`score-badge score-badge-small ${getScoreClass(
                            evaluation.score
                          )}`}
                        >
                          {getScoreLabel(evaluation.score)}
                        </span>
                      </div>

                      <div className="result-feedback">
                        <p className="result-label">
                          AI FEEDBACK
                        </p>

                        <p>
                          {evaluation.feedback ||
                            "No feedback available."}
                        </p>
                      </div>
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
  // SAVED RESULTS SCREEN
  // =========================================================

  if (viewingResults) {
    const interview =
      interviews.find(
        (item) =>
          Number(item.id) ===
          Number(currentInterviewId)
      );

    const finalScore =
      interview?.finalScore ?? 0;

    return (
      <div className="app results-page">
        <header className="navbar">
          <div className="logo">
            Interview<span>Lab</span>
          </div>

          <div className="navbar-actions">
            <ThemeToggle />

            <button
              className="profile"
              onClick={resetInterview}
            >
              Back to Dashboard
            </button>
          </div>
        </header>

        <main>
          <section className="section results-section">
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

            <div className="results-date">
              ðŸ•{" "}
              {formatDateTime(interview)}
            </div>

            <div className="feedback-box result-summary-card">
              <h2>Final Score</h2>

              <h1 className="final-score">
                {finalScore} / 100
              </h1>

              <div
                className={`score-badge ${getScoreClass(
                  finalScore
                )}`}
              >
                {getScoreLabel(finalScore)}
              </div>

              <p className="result-status">
                Status:{" "}
                <strong>
                  {interview?.status ||
                    "COMPLETED"}
                </strong>
              </p>
            </div>

            <div className="saved-results-container">
              <h2 className="results-section-heading">
                Question Results
              </h2>

              {savedResults.length === 0 ? (
                <div className="feedback-box">
                  <p>
                    No saved answers found.
                  </p>
                </div>
              ) : (
                savedResults
                  .slice(0, 5)
                  .map((result, index) => (
                    <div
                      key={
                        result.questionId ||
                        result.id ||
                        index
                      }
                      className="saved-result-card"
                    >
                      <div className="result-label">
                        Question {index + 1}
                      </div>

                      <h3 className="saved-question">
                        {result.question
                          ?.questionText ||
                          result.questionText ||
                          result.question ||
                          "Question"}
                      </h3>

                      <div className="result-divider"></div>

                      <div>
                        <p className="result-label">
                          YOUR ANSWER
                        </p>

                        <p className="result-answer">
                          {result.answerText ||
                            result.answer ||
                            "No answer available."}
                        </p>
                      </div>

                      <div className="result-score-row">
                        <span className="result-label">
                          SCORE
                        </span>

                        <strong>
                          {result.score ?? 0} / 100
                        </strong>

                        <span
                          className={`score-badge score-badge-small ${getScoreClass(
                            result.score ?? 0
                          )}`}
                        >
                          {getScoreLabel(result.score ?? 0)}
                        </span>
                      </div>

                      <div className="result-feedback">
                        <p className="result-label">
                          AI FEEDBACK
                        </p>

                        <p>
                          {result.feedback ||
                            "No feedback available."}
                        </p>
                      </div>
                    </div>
                  ))
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
                onClick={resetInterview}
              >
              Exit Interview
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
            Interview<span>Lab</span>
          </div>

          <div className="navbar-actions">
            <ThemeToggle />

            <button
              className="profile"
              onClick={() => terminateInterview("exit")}
            >
              Exit Interview
            </button>
          </div>
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
              Answer the question below as
              you would in a real interview.
            </p>

            <div className="interview-rules">
              <strong>Interview rules:</strong>
              <p>
                Answer in your own words {"\u2022"} Paste disabled {"\u2022"} Leaving this tab ends the interview
              </p>
            </div>            <div className="question-card">
              <div className="question-number">
                {currentQuestionIndex + 1}
              </div>

              <div className="question-content">
                <p>
                  Question{" "}
                  {currentQuestionIndex + 1} of 5
                </p>

                <h2>
                  {currentQuestion.questionText}
                </h2>

                <textarea
                  value={answer}
                  onChange={(event) =>
                    setAnswer(
                      event.target.value
                    )
                  }
                  placeholder="Type your answer here..."
                  rows="8"
                  disabled={submitting}
                  onPaste={(event) => {
                    event.preventDefault();

                    alert(
                      "Pasting is not allowed during the interview. Please answer in your own words."
                    );
                  }}
                />

                <br />

                <button
                  className="primary-button"
                  onClick={submitAnswer}
                  disabled={submitting}
                >
                  {submitting
                    ? "Submitting..."
                    : currentQuestionIndex + 1 >= 5
                    ? "Submit Final Answer"
                    : "Submit Answer â†’"}
                </button>
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  // =========================================================
  // DASHBOARD DATA
  // =========================================================

  const sortedInterviews = [...interviews].sort(
    (a, b) => {
      const dateB =
        String(
          b.createdAt ??
            b.created_at ??
            b.createdDate ??
            b.created_date ??
            ""
        );

      const dateA =
        String(
          a.createdAt ??
            a.created_at ??
            a.createdDate ??
            a.created_date ??
            ""
        );

      return dateB.localeCompare(dateA);
    }
  );

  const completedInterviews =
    sortedInterviews.filter(
      (interview) =>
        interview.status === "COMPLETED" &&
        interview.finalScore !== null &&
        interview.finalScore !== undefined
    );

  const lastCompletedInterview =
    completedInterviews.length > 0
      ? completedInterviews[0]
      : null;

  const averageCompletedScore =
    completedInterviews.length > 0
      ? Math.round(
          completedInterviews.reduce(
            (sum, interview) => sum + (Number(interview.finalScore) || 0),
            0
          ) / completedInterviews.length
        )
      : null;
  const totalInterviews = sortedInterviews.length;

  const completedInterviewCount =
    completedInterviews.length;

  const averageScore =
    completedInterviews.length > 0
      ? Math.round(
          completedInterviews.reduce(
            (sum, interview) =>
              sum + (Number(interview.finalScore) || 0),
            0
          ) / completedInterviews.length
        )
      : 0;
  // =========================================================
  // DASHBOARD
  // =========================================================

  return (
    <div className="app">
      <header className="navbar">
        <div className="logo">
          Interview<span>Lab</span>
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

        <div className="navbar-actions">
          <ThemeToggle />

          <button
            className="profile"
            onClick={handleLogout}
          >
            {localStorage.getItem("userName") ||
              "User"}{" "}
            Â· Logout
          </button>
        </div>
      </header>

      <main>
        {/* =====================================================
            HERO
        ===================================================== */}

        <section
          className="hero"
          id="dashboard"
        >
          <div>
            <p className="eyebrow">
              TECHNICAL INTERVIEW PRACTICE
            </p>

            <h1>
              Build interview
              <br />
              <span>
                confidence.
              </span>
            </h1>

            <p className="hero-text">
              Practice structured technical
              interviews, review your answers,
              and track your progress across
              every attempt.
            </p>

            <button
              className="primary-button"
              onClick={createNewInterview}
              disabled={loading}
            >
              {loading
                ? "Preparing..."
                : "Start New Interview"}
            </button>
          </div>

          <div className="hero-card">
            <div className="status">
              <span></span>
              Ready for your next interview
            </div>

            <h3>Your Progress</h3>

            <p>
              A quick view of your interview
              practice history.
            </p>

            <div className="card-line">
              <span>Total Interviews</span>
              <strong>{totalInterviews}</strong>
            </div>

            <div className="card-line">
              <span>Completed</span>
              <strong>{completedInterviewCount}</strong>
            </div>

            <div className="card-line">
              <span>Average Score</span>
              <strong>
                {completedInterviewCount > 0
                  ? `${averageScore} / 100`
                  : "-"}
              </strong>
            </div>

            <div className="card-line">
              <span>Latest Score</span>
              <strong>
                {lastCompletedInterview
                  ? `${lastCompletedInterview.finalScore} / 100`
                  : "Ã¢â‚¬â€"}
              </strong>
            </div>

            {lastCompletedInterview && (
              <div className="card-line">
                <span>Last Completed</span>
                <strong>
                  {formatDateTime(lastCompletedInterview)}
                </strong>
              </div>
            )}
          </div>
        </section>        {/* =====================================================
            ERROR
        ===================================================== */}

        {error && (
          <section className="section">
            <div className="empty">
              <strong>
                Backend connection error
              </strong>

              <p>{error}</p>
            </div>
          </section>
        )}

        {/* =====================================================
            INTERVIEWS
        ===================================================== */}

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
          </div>

          {loading ? (
            <p>
              Loading interviews...
            </p>
          ) : interviews.length === 0 ? (
            <div className="empty">
              No interviews found.
            </div>
          ) : (
            <div className="interview-grid">
              {sortedInterviews.map(
                (interview) => (
                  <div
                    className="interview-card"
                    key={interview.id}
                  >
                    <div className="icon-box">
                      AI
                    </div>

                    <h3>
                      {interview.title}
                    </h3>

                    <p>
                      {interview.role}
                    </p>

                    <div className="interview-date">
                      ðŸ•{" "}
                      {formatDateTime(
                        interview
                      )}
                    </div>

                    <div className="interview-info">
                      <span>
                        Status
                      </span>

                      <strong>
                        {interview.status}
                      </strong>
                    </div>

                    {interview.finalScore !==
                      null &&
                      interview.finalScore !==
                        undefined && (
                        <div className="interview-info interview-score-info">
                          <span>Final Score</span>

                          <div className="interview-score-value">
                            <strong>
                              {interview.finalScore} / 100
                            </strong>

                            <span
                              className={`score-badge score-badge-small ${getScoreClass(
                                interview.finalScore
                              )}`}
                            >
                              {getScoreLabel(interview.finalScore)}
                            </span>
                          </div>
                        </div>
                      )}

                    <button
                      className="open-button"
                      onClick={() =>
                        (interview.status === "COMPLETED" || interview.status === "TERMINATED") ? viewInterviewResults(
                              interview.id
                            )
                          : startInterview(
                              interview.id
                            )
                      }
                    >
                      {(interview.status === "COMPLETED" || interview.status === "TERMINATED") ? "View Results â†’"
                        : "Open Interview â†’"}
                    </button>

                    <button
                      className="delete-button"
                      onClick={() =>
                        deleteInterview(
                          interview.id
                        )
                      }
                    >
                      ðŸ—‘ï¸ Delete
                    </button>
                  </div>
                )
              )}
            </div>
          )}
        </section>

        {/* =====================================================
            PRACTICE QUESTIONS
        ===================================================== */}

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
                (question, index) => (
                  <div
                    className="question-card"
                    key={question.id}
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

                      <details
                        style={{ marginTop: "10px" }}
                      >
                        <summary
                          style={{
                            cursor: "pointer",
                            fontWeight: "700",
                          }}
                        >
                          View reference answer
                        </summary>

                        <p style={{ marginTop: "10px" }}>
                          {question.expectedAnswer}
                        </p>
                      </details>
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
          &copy; 2026 InterviewLab
        </p>

        <p>
          Built with React + Spring Boot
        </p>
      </footer>
    </div>
  );
}

export default App;