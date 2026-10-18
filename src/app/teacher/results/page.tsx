"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Quiz = {
  id: string;
  title: string;
  created_at?: string;
};

type QuizResult = {
  submission_id: string;
  student_name: string;
  roll_number: string;
  quiz_title: string;
  marks_awarded: number | string;
  total_marks: number | string;
  percentage: number | string;
  published: boolean;
  submitted_at: string | null;
};

export default function TeacherResultsPage() {
  const router = useRouter();

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState("");
  const [results, setResults] = useState<QuizResult[]>([]);

  const [loading, setLoading] = useState(true);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const supabase = createClient();

  const loadResults = useCallback(
    async (quizId: string) => {
      if (!quizId) {
        setResults([]);
        return;
      }

      setResultsLoading(true);
      setError("");
      setMessage("");

      const { data, error: rpcError } = await supabase.rpc(
        "teacher_get_quiz_results",
        {
          p_quiz_id: quizId,
        }
      );

      if (rpcError) {
        console.error("Results loading error:", rpcError);
        setError(rpcError.message);
        setResults([]);
      } else {
        setResults((data as unknown as QuizResult[] | null) ?? []);
      }

      setResultsLoading(false);
    },
    [supabase]
  );

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (authError || !user) {
        router.replace("/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (cancelled) return;

      if (profileError || profile?.role !== "teacher") {
        router.replace("/student");
        return;
      }

      const { data: quizData, error: quizError } = await supabase
        .from("quizzes")
        .select("id, title, created_at")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (quizError) {
        setError(quizError.message);
        setLoading(false);
        return;
      }

      const quizList = (quizData ?? []) as Quiz[];

      setQuizzes(quizList);

      if (quizList.length > 0) {
        setSelectedQuiz(quizList[0].id);
        await loadResults(quizList[0].id);
      } else {
        setResults([]);
      }

      if (!cancelled) {
        setLoading(false);
      }
    }

    initialize();

    return () => {
      cancelled = true;
    };
  }, [router, supabase, loadResults]);

  async function handleQuizChange(quizId: string) {
    setSelectedQuiz(quizId);
    await loadResults(quizId);
  }

  async function handlePublishToggle(result: QuizResult) {
    const nextPublishedState = !result.published;

    const confirmation = window.confirm(
      nextPublishedState
        ? `Publish result for ${result.student_name}? The student will be able to see the result.`
        : `Unpublish result for ${result.student_name}? The student will no longer see the published result.`
    );

    if (!confirmation) return;

    setUpdatingId(result.submission_id);
    setError("");
    setMessage("");

    const { error: updateError } = await supabase.rpc(
      "teacher_set_result_published",
      {
        p_submission_id: result.submission_id,
        p_published: nextPublishedState,
      }
    );

    if (updateError) {
      console.error("Publish result error:", updateError);
      setError(updateError.message);
    } else {
      setMessage(
        nextPublishedState
          ? `Result published for ${result.student_name}.`
          : `Result unpublished for ${result.student_name}.`
      );

      await loadResults(selectedQuiz);
    }

    setUpdatingId(null);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <p className="text-lg font-semibold text-slate-700">
          Loading teacher results...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-800">
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-700">
              Physics Quiz System
            </p>

            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
              Student Results
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Check marks, percentages and publish student results.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => router.push("/teacher")}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold hover:bg-slate-50"
            >
              ← Dashboard
            </button>

            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {error && (
          <div
            role="alert"
            className="mb-5 break-words rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <strong>Error:</strong> {error}
          </div>
        )}

        {message && (
          <div
            role="status"
            className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800"
          >
            {message}
          </div>
        )}

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <label
            htmlFor="quiz-select"
            className="mb-2 block font-semibold text-slate-700"
          >
            Select Quiz
          </label>

          {quizzes.length > 0 ? (
            <select
              id="quiz-select"
              value={selectedQuiz}
              onChange={(event) => handleQuizChange(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:max-w-xl"
            >
              {quizzes.map((quiz) => (
                <option key={quiz.id} value={quiz.id}>
                  {quiz.title}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-slate-500">
              You have not created any quizzes yet.
            </p>
          )}
        </div>

        <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Submitted Quizzes
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {results.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Published Results
            </p>
            <p className="mt-2 text-3xl font-bold text-green-600">
              {results.filter((result) => result.published).length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Pending Publication
            </p>
            <p className="mt-2 text-3xl font-bold text-orange-600">
              {results.filter((result) => !result.published).length}
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-xl font-bold">Quiz Results</h2>
            <p className="mt-1 text-sm text-slate-500">
              Only submitted quizzes are included in this table.
            </p>
          </div>

          {resultsLoading ? (
            <div className="p-10 text-center text-slate-500">
              Loading results...
            </div>
          ) : results.length === 0 ? (
            <div className="p-10 text-center">
              <h3 className="text-lg font-semibold text-slate-700">
                No submitted quizzes yet
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                Student results will appear here after students submit this
                quiz.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop/tablet results table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="px-5 py-4">Student</th>
                      <th className="px-5 py-4">Roll Number</th>
                      <th className="px-5 py-4">Marks</th>
                      <th className="px-5 py-4">Percentage</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4">Action</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {results.map((result) => (
                      <tr
                        key={result.submission_id}
                        className="hover:bg-slate-50"
                      >
                        <td className="px-5 py-4 font-semibold">
                          {result.student_name}
                        </td>

                        <td className="px-5 py-4">{result.roll_number}</td>

                        <td className="px-5 py-4 font-semibold">
                          {Number(result.marks_awarded)} /{" "}
                          {Number(result.total_marks)}
                        </td>

                        <td className="px-5 py-4 font-semibold">
                          {Number(result.percentage).toFixed(2)}%
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                              result.published
                                ? "bg-green-100 text-green-700"
                                : "bg-orange-100 text-orange-700"
                            }`}
                          >
                            {result.published ? "Published" : "Unpublished"}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <button
                            type="button"
                            disabled={updatingId === result.submission_id}
                            onClick={() => handlePublishToggle(result)}
                            className={`rounded-lg px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 ${
                              result.published
                                ? "bg-orange-600 hover:bg-orange-700"
                                : "bg-green-600 hover:bg-green-700"
                            }`}
                          >
                            {updatingId === result.submission_id
                              ? "Please wait..."
                              : result.published
                                ? "Unpublish"
                                : "Publish Result"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile-friendly results cards */}
              <div className="space-y-4 p-4 md:hidden">
                {results.map((result) => (
                  <article
                    key={result.submission_id}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-slate-900">
                          {result.student_name}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          Roll No: {result.roll_number}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-2 py-1 text-xs font-bold ${
                          result.published
                            ? "bg-green-100 text-green-700"
                            : "bg-orange-100 text-orange-700"
                        }`}
                      >
                        {result.published ? "Published" : "Unpublished"}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">Marks</p>
                        <p className="mt-1 font-bold">
                          {Number(result.marks_awarded)} /{" "}
                          {Number(result.total_marks)}
                        </p>
                      </div>

                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">Percentage</p>
                        <p className="mt-1 font-bold">
                          {Number(result.percentage).toFixed(2)}%
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={updatingId === result.submission_id}
                      onClick={() => handlePublishToggle(result)}
                      className={`mt-4 w-full rounded-lg px-4 py-3 text-sm font-bold text-white disabled:opacity-50 ${
                        result.published
                          ? "bg-orange-600 hover:bg-orange-700"
                          : "bg-green-600 hover:bg-green-700"
                      }`}
                    >
                      {updatingId === result.submission_id
                        ? "Please wait..."
                        : result.published
                          ? "Unpublish Result"
                          : "Publish Result"}
                    </button>
                  </article>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}