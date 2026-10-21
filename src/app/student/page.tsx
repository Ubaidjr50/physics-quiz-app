
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
  const [studentId, setStudentId] = useState("");
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [attendanceIds, setAttendanceIds] = useState<string[]>([]);
  const [markingQuizId, setMarkingQuizId] = useState("");
  const [attendanceMessage, setAttendanceMessage] = useState("");
  const [attendanceError, setAttendanceError] = useState(false);
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

      setStudentId(user.id);
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

      // Load this student's existing attendance records.
      const { data: attendanceData, error: attendanceLoadError } =
        await supabase
          .from("attendance")
          .select("quiz_id")
          .eq("student_id", user.id);

      if (!active) return;

      if (attendanceLoadError) {
        console.error(
          "Could not load attendance:",
          attendanceLoadError
        );
        setAttendanceError(true);
        setAttendanceMessage(
          "Attendance status could not be loaded. Please refresh the page."
        );
      } else {
        setAttendanceIds(
          (attendanceData || []).map((record) => record.quiz_id)
        );
      }

      // Load this student's quiz results.
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

  async function markAttendance(quizId: string) {
    if (!studentId || markingQuizId) return;

    if (attendanceIds.includes(quizId)) {
      setAttendanceMessage("Attendance is already marked for this quiz.");
      setAttendanceError(false);
      return;
    }

    setMarkingQuizId(quizId);
    setAttendanceMessage("");
    setAttendanceError(false);

    const supabase = createClient();

    const { error } = await supabase.from("attendance").insert({
      student_id: studentId,
      quiz_id: quizId,
    });

    if (error) {
      console.error("Attendance error:", error);

      if (error.code === "23505") {
        setAttendanceIds((previous) =>
          previous.includes(quizId) ? previous : [...previous, quizId]
        );
        setAttendanceMessage("Your attendance is already marked.");
        setAttendanceError(false);
      } else {
        setAttendanceMessage(
          `Attendance could not be marked: ${error.message}`
        );
        setAttendanceError(true);
      }
    } else {
      setAttendanceIds((previous) => [...previous, quizId]);
      setAttendanceMessage("Attendance marked successfully!");
      setAttendanceError(false);
    }

    setMarkingQuizId("");
  }

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

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

        {/* Attendance Summary */}
        <section className="mt-8 rounded-2xl border border-green-100 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-green-700">
            YOUR ATTENDANCE
          </p>

          <h2 className="mt-2 text-2xl font-bold text-slate-900">
            Quiz Attendance
          </h2>

          <p className="mt-2 text-slate-600">
            Mark your attendance using the button on a published quiz below.
          </p>

          <p className="mt-4 text-lg font-semibold text-green-700">
            {attendanceIds.length} quiz attendance
            {attendanceIds.length === 1 ? "" : "s"} marked
          </p>

          {attendanceMessage && (
            <p
              className={`mt-4 rounded-xl p-4 text-sm ${
                attendanceError
                  ? "bg-red-50 text-red-700"
                  : "bg-green-50 text-green-800"
              }`}
            >
              {attendanceMessage}
            </p>
          )}
        </section>

        {/* My Results */}
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

        {/* Published Quizzes and Attendance */}
        <section className="mt-8 rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              My Physics Quizzes
            </h2>

            <p className="mt-2 text-slate-600">
              Published quizzes ki attendance yahan mark kar sakte ho.
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
                const attendanceMarked = attendanceIds.includes(quiz.id);
                const isMarking = markingQuizId === quiz.id;

                return (
                  <article
                    key={quiz.id}
                    className="rounded-xl border border-slate-200 p-5 transition hover:border-blue-300 hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-3xl">📝</span>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          attendanceMarked
                            ? "bg-green-100 text-green-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {attendanceMarked ? "Present ✓" : "Attendance Pending"}
                      </span>
                    </div>

                    <h3 className="mt-4 text-xl font-bold text-slate-900">
                      {quiz.title}
                    </h3>

                    <p className="mt-2 text-sm text-slate-500">
                      Duration: {quiz.duration_minutes} minutes
                    </p>

                    <button
                      type="button"
                      onClick={() => markAttendance(quiz.id)}
                      disabled={
                        attendanceMarked ||
                        Boolean(markingQuizId) ||
                        attendanceError
                      }
                      className={`mt-5 inline-flex w-full items-center justify-center rounded-xl px-4 py-3 font-semibold transition ${
                        attendanceMarked
                          ? "cursor-not-allowed bg-green-100 text-green-800"
                          : "bg-green-600 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                      }`}
                    >
                      {attendanceMarked
                        ? "Attendance Marked ✓"
                        : isMarking
                          ? "Marking Attendance..."
                          : "Mark Attendance"}
                    </button>

                    {alreadySubmitted ? (
                      <button
                        type="button"
                        disabled
                        className="mt-3 inline-flex w-full cursor-not-allowed items-center justify-center rounded-xl bg-slate-100 px-4 py-3 font-semibold text-slate-500"
                      >
                        Quiz Already Submitted ✓
                      </button>
                    ) : (
                      <Link
                        href={`/student/quiz/${quiz.id}`}
                        className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700"
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
