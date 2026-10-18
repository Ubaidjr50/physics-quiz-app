"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Quiz = {
  id: string;
  title: string;
  chapter_id: string;
  duration_minutes: number;
  created_at: string;
};

type QuizResult = {
  quiz_id: string;
  quiz_title: string;
  submission_status: string;
  published: boolean;
  marks_awarded: number | null;
  total_marks: number | null;
  percentage: number | null;
  submitted_at: string | null;
};

export default function StudentPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [message, setMessage] = useState("Loading your dashboard...");
  const [resultError, setResultError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      const supabase = createClient();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (!active) return;

      if (authError || !user) {
        router.replace("/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, roll_number, role")
        .eq("id", user.id)
        .single();

      if (!active) return;

      if (profileError || !profile) {
        setMessage("Your student profile could not be loaded.");
        setLoading(false);
        return;
      }

      if (profile.role !== "student") {
        router.replace(
          profile.role === "teacher" ? "/teacher" : "/login"
        );
        return;
      }

      setName(profile.full_name || "Student");
      setRollNumber(profile.roll_number || "Not assigned");

      const { data: quizData, error: quizError } = await supabase
        .from("quizzes")
        .select("id, title, chapter_id, duration_minutes, created_at")
        .eq("status", "published")
        .order("created_at", { ascending: false });

      if (!active) return;

      if (quizError) {
        setMessage("Published quizzes could not be loaded.");
        setLoading(false);
        return;
      }

      setQuizzes((quizData || []) as Quiz[]);

      // Fetch this student's submitted quiz statuses and published results.
      const { data: resultData, error: resultsRpcError } =
        await supabase.rpc("student_get_my_quiz_results");

      if (!active) return;

      if (resultsRpcError) {
        console.error("Could not load student results:", resultsRpcError);
        setResultError(
          "Results could not be loaded. Please refresh the page or contact your teacher."
        );
      } else {
        setResults((resultData || []) as QuizResult[]);
      }

      setMessage("");
      setLoading(false);
    }

    loadDashboard();

    return () => {
      active = false;
    };
  }, [router]);

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  // A submitted quiz must not be started again.
  const submittedQuizIds = new Set(
    results.map((result) => result.quiz_id)
  );

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <p className="text-slate-600">{message}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-5 sm:p-10">
      <div className="mx-auto max-w-5xl">
        {/* Student Header */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-blue-600">
              STUDENT WORKSPACE
            </p>

            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              Assalam-o-Alaikum, {name}
            </h1>

            <p className="mt-2 text-slate-500">
              Class 9 Physics · Sindh Board
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Roll Number: {rollNumber}
            </p>
          </div>

          <button
            type="button"
            onClick={logout}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-semibold hover:bg-slate-100"
          >
            Sign Out
          </button>
        </header>

        {/* My Results Section */}
        <section className="mt-8 rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
          <div>
            <p className="text-sm font-semibold text-emerald-700">
              YOUR PERFORMANCE
            </p>

            <h2 className="mt-2 text-2xl font-bold text-slate-900">
              My Results
            </h2>

            <p className="mt-2 text-slate-600">
              Yahan tumhare submitted quizzes ke results nazar aayenge.
              Marks sirf teacher ke publish karne ke baad show honge.
            </p>
          </div>

          {resultError && (
            <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
              {resultError}
            </p>
          )}

          {!resultError && results.length === 0 && (
            <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-6 text-center">
              <span className="text-4xl">📊</span>

              <h3 className="mt-3 font-bold text-slate-800">
                No Submitted Quizzes Yet
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Quiz submit karne aur teacher ke result publish karne ke
                baad tumhara result yahan nazar aayega.
              </p>
            </div>
          )}

          {!resultError && results.length > 0 && (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {results.map((result) => (
                <article
                  key={result.quiz_id}
                  className="rounded-xl border border-slate-200 p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-3xl">📋</span>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        result.published
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {result.published
                        ? "Result Published"
                        : "Result Pending"}
                    </span>
                  </div>

                  <h3 className="mt-4 text-xl font-bold text-slate-900">
                    {result.quiz_title}
                  </h3>

                  {result.published ? (
                    <>
                      <p className="mt-3 text-2xl font-bold text-emerald-700">
                        {result.marks_awarded ?? 0} / {result.total_marks ?? 0}
                      </p>

                      <p className="mt-1 text-sm text-slate-600">
                        Percentage: {result.percentage ?? 0}%
                      </p>
                    </>
                  ) : (
                    <p className="mt-3 text-sm text-slate-600">
                      Tumhara quiz submit ho gaya hai. Teacher ke result
                      publish karne ka intezar karo.
                    </p>
                  )}

                  {result.submitted_at && (
                    <p className="mt-3 text-xs text-slate-400">
                      Submitted:{" "}
                      {new Date(result.submitted_at).toLocaleString()}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Quiz Section */}
        <section className="mt-8 rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              My Physics Quizzes
            </h2>

            <p className="mt-2 text-slate-600">
              Yahan teacher ke publish kiye hue quizzes nazar aayenge.
            </p>
          </div>

          {message && (
            <p className="mt-5 rounded-xl bg-blue-50 p-4 text-sm text-blue-800">
              {message}
            </p>
          )}

          {!message && quizzes.length === 0 && (
            <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-8 text-center">
              <span className="text-4xl">📚</span>

              <h3 className="mt-3 font-bold text-slate-800">
                No Published Quizzes Yet
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Your teacher has not published a quiz yet. Please check again
                later.
              </p>
            </div>
          )}

          {!message && quizzes.length > 0 && (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {quizzes.map((quiz) => {
                const alreadySubmitted = submittedQuizIds.has(quiz.id);

                return (
                  <article
                    key={quiz.id}
                    className="rounded-xl border border-slate-200 p-5 transition hover:border-blue-300 hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-3xl">📝</span>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          alreadySubmitted
                            ? "bg-slate-100 text-slate-700"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {alreadySubmitted ? "Submitted" : "Published"}
                      </span>
                    </div>

                    <h3 className="mt-4 text-xl font-bold text-slate-900">
                      {quiz.title}
                    </h3>

                    <p className="mt-2 text-sm text-slate-500">
                      Duration: {quiz.duration_minutes} minutes
                    </p>

                    {alreadySubmitted ? (
                      <button
                        type="button"
                        disabled
                        className="mt-5 inline-flex w-full cursor-not-allowed items-center justify-center rounded-xl bg-slate-100 px-4 py-3 font-semibold text-slate-500"
                      >
                        Quiz Already Submitted ✓
                      </button>
                    ) : (
                      <Link
                        href={`/student/quiz/${quiz.id}`}
                        className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700"
                      >
                        Start Quiz →
                      </Link>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}