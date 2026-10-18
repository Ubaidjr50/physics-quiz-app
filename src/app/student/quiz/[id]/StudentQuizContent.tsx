
"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Question = {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  marks: number;
  question_order: number;
};

type QuizSession = {
  submission_id: string;
  started_at: string;
  duration_minutes: number;
};

type QuizResult = {
  marks_awarded: number;
  total_marks: number;
};

export default function StudentQuizContent({
  id,
}: {
  id: string;
}) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submissionId, setSubmissionId] = useState("");
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<QuizResult | null>(null);

  useEffect(() => {
    let active = true;

    async function loadQuiz() {
      const supabase = createClient();

      try {
        // Start or resume the student's quiz.
        const { data: sessionData, error: sessionError } =
          await supabase.rpc("start_physics_quiz", {
            p_quiz_id: id,
          });

        if (sessionError) throw sessionError;

        const session = (
          Array.isArray(sessionData) ? sessionData[0] : sessionData
        ) as QuizSession | null;

        if (!session?.submission_id || !session.started_at) {
          throw new Error("Quiz session could not be started.");
        }

        if (!active) return;

        setSubmissionId(session.submission_id);

        const deadline =
          new Date(session.started_at).getTime() +
          session.duration_minutes * 60 * 1000;

        setTimeLeft(
          Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
        );

        // Load questions without loading the private answer key.
        const { data: questionData, error: questionError } =
          await supabase
            .from("questions")
            .select(
              "id, question_text, option_a, option_b, option_c, option_d, marks, question_order"
            )
            .eq("quiz_id", id)
            .order("question_order", { ascending: true });

        if (questionError) throw questionError;

        if (!active) return;

        setQuestions(questionData ?? []);

        // Restore previously saved answers if student read access permits it.
        const { data: savedAnswers } = await supabase
          .from("responses")
          .select("question_id, selected_option")
          .eq("submission_id", session.submission_id);

        if (!active) return;

        if (savedAnswers) {
          const restored: Record<string, string> = {};

          for (const answer of savedAnswers) {
            restored[answer.question_id] = answer.selected_option;
          }

          setAnswers(restored);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Quiz load nahi ho saka."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadQuiz();

    return () => {
      active = false;
    };
  }, [id]);

  const saveAnswer = useCallback(
    async (questionId: string, option: string) => {
      if (!submissionId || saving || submitted || submitting) return;

      const previousAnswer = answers[questionId];

      setSaving(true);
      setError("");
      setAnswers((previous) => ({
        ...previous,
        [questionId]: option,
      }));

      try {
        const supabase = createClient();

        const { error: saveError } = await supabase.rpc(
          "save_physics_quiz_answer",
          {
            p_submission_id: submissionId,
            p_question_id: questionId,
            p_selected_option: option,
          }
        );

        if (saveError) throw saveError;
      } catch (err) {
        setAnswers((previous) => {
          const updated = { ...previous };

          if (previous[questionId] !== option) return previous;

          if (previousAnswer === undefined) {
            delete updated[questionId];
          } else {
            updated[questionId] = previousAnswer;
          }

          return updated;
        });

        setError(
          err instanceof Error
            ? err.message
            : "Answer save nahi ho saka. Dobara try karo."
        );
      } finally {
        setSaving(false);
      }
    },
    [submissionId, saving, submitted, submitting, answers]
  );

  const handleSubmit = useCallback(async () => {
    if (!submissionId || submitted || submitting || saving) return;

    setSubmitting(true);
    setError("");

    try {
      const supabase = createClient();

      const { data, error: submitError } = await supabase.rpc(
        "submit_physics_quiz",
        {
          p_submission_id: submissionId,
        }
      );

      if (submitError) throw submitError;

      const submissionResult = (
        Array.isArray(data) ? data[0] : data
      ) as QuizResult | null;

      if (submissionResult) {
        setResult({
          marks_awarded: Number(submissionResult.marks_awarded),
          total_marks: Number(submissionResult.total_marks),
        });
      }

      setSubmitted(true);
      setTimeLeft(0);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Quiz submit nahi hua. Dobara try karo."
      );
    } finally {
      setSubmitting(false);
    }
  }, [submissionId, submitted, submitting, saving]);

  // Countdown timer.
  useEffect(() => {
    if (timeLeft === null || submitted || submitting || loading) return;

    if (timeLeft <= 0) {
      void handleSubmit();
      return;
    }

    const timeout = window.setTimeout(() => {
      setTimeLeft((previous) =>
        previous === null ? null : Math.max(0, previous - 1)
      );
    }, 1000);

    return () => window.clearTimeout(timeout);
  }, [timeLeft, submitted, submitting, loading, handleSubmit]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds
    ).padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <p className="text-lg font-semibold">Quiz loading...</p>
      </main>
    );
  }

  if (error && !submissionId) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <section className="mx-auto max-w-xl rounded-2xl bg-white p-6 shadow">
          <h1 className="text-xl font-bold text-red-600">
            Quiz open nahi hua
          </h1>
          <p className="mt-3 break-words">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-5 rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white"
          >
            Try Again
          </button>
        </section>
      </main>
    );
  }

  if (submitted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <section className="w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow-lg">
          <div className="text-5xl">🎉</div>

          <h1 className="mt-4 text-3xl font-bold text-slate-900">
            Quiz Submitted!
          </h1>

          <p className="mt-3 text-slate-600">
            Tumhare answers successfully submit ho gaye hain.
          </p>

          {result && (
            <div className="mt-6 rounded-xl bg-blue-50 p-5">
              <p className="text-sm text-blue-800">Your Score</p>
              <p className="mt-2 text-3xl font-bold text-blue-900">
                {result.marks_awarded} / {result.total_marks}
              </p>
            </div>
          )}

          <p className="mt-5 text-sm text-slate-500">
            Correct answers reveal nahi kiye jayenge.
          </p>
        </section>
      </main>
    );
  }

  if (questions.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <section className="rounded-xl bg-white p-8 text-center shadow">
          <h1 className="text-2xl font-bold">No Questions Found</h1>
          <p className="mt-3 text-slate-600">
            Is quiz mein questions nahi milay.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Physics Quiz
            </h1>
            <p className="mt-2 text-slate-600">
              Total Questions: {questions.length}
            </p>
          </div>

          <div
            className={`rounded-xl px-5 py-3 text-center ${
              timeLeft !== null && timeLeft <= 60
                ? "bg-red-100 text-red-700"
                : "bg-blue-100 text-blue-900"
            }`}
          >
            <p className="text-xs font-semibold uppercase">Time Left</p>
            <p className="text-2xl font-bold tabular-nums">
              {timeLeft === null ? "--:--" : formatTime(timeLeft)}
            </p>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700"
          >
            {error}
          </div>
        )}

        {saving && (
          <p className="mt-4 text-sm text-blue-700">
            Saving answer...
          </p>
        )}

        <div className="mt-6 space-y-5">
          {questions.map((question, index) => {
            const options = [
              { key: "A", text: question.option_a },
              { key: "B", text: question.option_b },
              { key: "C", text: question.option_c },
              { key: "D", text: question.option_d },
            ];

            return (
              <section
                key={question.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
              >
                <p className="font-semibold text-slate-900">
                  Question {index + 1} ({question.marks} marks)
                </p>

                <h2 className="mt-3 text-lg font-medium text-slate-800">
                  {question.question_text}
                </h2>

                <div className="mt-4 space-y-3">
                  {options.map((option) => (
                    <label
                      key={option.key}
                      className={`flex items-start gap-3 rounded-xl border p-3 ${
                        saving || submitting
                          ? "cursor-not-allowed opacity-70"
                          : "cursor-pointer"
                      } ${
                        answers[question.id] === option.key
                          ? "border-blue-600 bg-blue-50"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`question-${question.id}`}
                        value={option.key}
                        checked={answers[question.id] === option.key}
                        disabled={saving || submitting}
                        onChange={() => {
                          void saveAnswer(question.id, option.key);
                        }}
                        className="mt-1"
                      />

                      <span className="font-semibold">{option.key}.</span>

                      <span className="text-slate-700">
                        {option.text}
                      </span>
                    </label>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <div className="mt-6 rounded-xl bg-blue-50 p-4 text-blue-900">
          Answered: {Object.keys(answers).length} / {questions.length}
        </div>

        <button
          type="button"
          onClick={() => {
            if (
              window.confirm(
                "Kya tum waqai quiz submit karna chahte ho? Submit hone ke baad answers change nahi kar sakoge."
              )
            ) {
              void handleSubmit();
            }
          }}
          disabled={saving || submitting || !submissionId}
          className="mt-6 w-full rounded-xl bg-blue-700 px-6 py-4 font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting
            ? "Submitting Quiz..."
            : saving
              ? "Saving Answer..."
              : "Submit Quiz"}
        </button>

        <p className="mt-3 text-center text-sm text-slate-500">
          Submit karne se pehle apne answers check kar lo.
        </p>
      </div>
    </main>
  );
}
