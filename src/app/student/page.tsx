
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

    void loadDashboard();

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

  const pageBackground = {
    background:
      "linear-gradient(135deg, #eef2ff 0%, #e0e7ff 45%, #f3e8ff 100%)",
    minHeight: "100vh",
  } as const;

  const sectionClass =
    "mt-7 rounded-3xl border border-white/80 bg-white/80 p-5 shadow-lg backdrop-blur-xl sm:p-7";

  if (loading) {
    return (
      <main
        style={pageBackground}
        className="flex items-center justify-center p-6"
      >
        <div className="rounded-2xl border border-white bg-white/80 p-6 shadow-xl">
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 animate-pulse rounded-full bg-indigo-600" />
            <p className="font-semibold text-indigo-900">
              {message}
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={pageBackground} className="p-4 sm:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl">

        {/* Gradient Header */}
        <header className="flex flex-wrap items-center justify-between gap-5 rounded-3xl bg-gradient-to-r from-indigo-700 via-violet-700 to-purple-600 p-6 text-white shadow-xl sm:p-8">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-bold tracking-widest text-indigo-50">
              <span>✦</span>
              PHYSICS QUIZ SYSTEM
            </div>

            <p className="text-sm font-semibold tracking-wider text-indigo-100">
              STUDENT WORKSPACE
            </p>

            <h1 className="mt-2 text-2xl font-extrabold sm:text-4xl">
              Assalam-o-Alaikum, {name}!
            </h1>

            <p className="mt-3 text-sm text-indigo-100 sm:text-base">
              Class 9 Physics · Mirpurkhas Board
            </p>

            <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white">
              <span>🎓</span>
              Roll Number: {rollNumber}
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            className="rounded-xl border border-white/30 bg-white/10 px-5 py-3 font-semibold text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white"
          >
            Sign Out ↗
          </button>
        </header>

        {/* Welcome and Overview */}
        <section className={sectionClass}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-indigo-600">
                Your learning space
              </p>

              <h2 className="mt-2 text-2xl font-extrabold text-slate-900 sm:text-3xl">
                Student Dashboard
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                Take your Physics quizzes, mark attendance and track
                your published results from one place.
              </p>
            </div>

            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-200 text-4xl">
              🎓
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-4">
              <p className="text-sm font-semibold text-indigo-700">
                Published Quizzes
              </p>
              <p className="mt-2 text-3xl font-extrabold text-indigo-900">
                {quizzes.length}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Available to attempt
              </p>
            </div>

            <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-white p-4">
              <p className="text-sm font-semibold text-violet-700">
                Attendance
              </p>
              <p className="mt-2 text-3xl font-extrabold text-violet-900">
                {attendanceIds.length}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Quiz attendances marked
              </p>
            </div>

            <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50 to-white p-4">
              <p className="text-sm font-semibold text-purple-700">
                Submitted Quizzes
              </p>
              <p className="mt-2 text-3xl font-extrabold text-purple-900">
                {submittedQuizIds.size}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Based on available results
              </p>
            </div>
          </div>
        </section>

        {/* Attendance */}
        <section className={sectionClass}>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-green-200 text-2xl">
              ✓
            </div>
            <div>
              <p className="text-xs font-bold tracking-wider text-emerald-700">
                YOUR ATTENDANCE
              </p>
              <h2 className="mt-1 text-xl font-extrabold text-slate-900 sm:text-2xl">
                Quiz Attendance
              </h2>
            </div>
          </div>

          <p className="mt-4 leading-6 text-slate-600">
            Mark your attendance using the button on a published quiz below.
          </p>

          <p className="mt-4 inline-flex rounded-xl bg-emerald-50 px-4 py-3 font-bold text-emerald-800">
            {attendanceIds.length} quiz attendance
            {attendanceIds.length === 1 ? "" : "s"} marked
          </p>

          {attendanceMessage && (
            <p
              role="status"
              className={`mt-4 rounded-xl p-4 text-sm ${
                attendanceError
                  ? "bg-red-50 text-red-700"
                  : "bg-emerald-50 text-emerald-800"
              }`}
            >
              {attendanceMessage}
            </p>
          )}
        </section>

        {/* Results */}
        <section className={sectionClass}>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-purple-200 text-2xl">
              🏆
            </div>
            <div>
              <p className="text-xs font-bold tracking-wider text-violet-700">
                YOUR PERFORMANCE
              </p>
              <h2 className="mt-1 text-xl font-extrabold text-slate-900 sm:text-2xl">
                My Results
              </h2>
            </div>
          </div>

          <p className="mt-4 leading-6 text-slate-600">
            Your quiz results will appear here.
Marks will be shown only after the teacher publishes them..
          </p>

          {resultError && (
            <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
              {resultError}
            </p>
          )}

          {!resultError && results.length === 0 && (
            <div className="mt-6 rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/60 p-7 text-center">
              <span className="text-4xl">📊</span>
              <h3 className="mt-3 font-bold text-slate-800">
                No Submitted Quizzes Yet
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Submit the quiz; once the teacher publishes the results,
                your result will appear like this.
.
              </p>
            </div>
          )}

          {!resultError && results.length > 0 && (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {results.map((result) => (
                <article
                  key={result.quiz_id}
                  className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-3xl">📋</span>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
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

                  <h3 className="mt-4 text-xl font-extrabold text-slate-900">
                    {result.quiz_title}
                  </h3>

                  {result.published ? (
                    <>
                      <p className="mt-4 text-3xl font-extrabold text-emerald-700">
                        {result.marks_awarded ?? 0} / {result.total_marks ?? 0}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-600">
                        Percentage: {result.percentage ?? 0}%
                      </p>
                    </>
                  ) : (
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                     Your quiz has been submitted. Wait for the teacher to publish the results..
                    </p>
                  )}

                  {result.submitted_at && (
                    <p className="mt-4 text-xs text-slate-400">
                      Submitted:{" "}
                      {new Date(result.submitted_at).toLocaleString()}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Published Quizzes */}
        <section className={sectionClass}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold tracking-wider text-indigo-600">
                TEST YOUR KNOWLEDGE
              </p>
              <h2 className="mt-2 text-2xl font-extrabold text-slate-900">
                My Physics Quizzes
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Published quizzes open karo, attendance mark karo aur
                apna quiz attempt karo.
              </p>
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 p-4 text-3xl">
              📚
            </div>
          </div>

          {message && (
            <p className="mt-5 rounded-xl bg-blue-50 p-4 text-sm text-blue-800">
              {message}
            </p>
          )}

          {!message && quizzes.length === 0 && (
            <div className="mt-6 rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/60 p-8 text-center">
              <span className="text-4xl">📚</span>
              <h3 className="mt-3 font-bold text-slate-800">
                No Published Quizzes Yet
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Your teacher has not published a quiz yet. Please check again
                later.
              </p>
            </div>
          )}

          {!message && quizzes.length > 0 && (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {quizzes.map((quiz) => {
                const alreadySubmitted = submittedQuizIds.has(quiz.id);
                const attendanceMarked = attendanceIds.includes(quiz.id);
                const isMarking = markingQuizId === quiz.id;

                return (
                  <article
                    key={quiz.id}
                    className="flex flex-col rounded-2xl border border-indigo-100 bg-white p-5 shadow-md transition duration-300 hover:-translate-y-1 hover:border-indigo-300 hover:shadow-xl"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 text-2xl">
                        📝
                      </span>

                      <span
                        className={`rounded-full px-3 py-1 text-center text-xs font-bold ${
                          attendanceMarked
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-indigo-100 text-indigo-800"
                        }`}
                      >
                        {attendanceMarked
                          ? "Present ✓"
                          : "Attendance Pending"}
                      </span>
                    </div>

                    <h3 className="mt-5 text-lg font-extrabold text-slate-900">
                      {quiz.title}
                    </h3>

                    <p className="mt-2 text-sm text-slate-500">
                      ⏱ Duration: {quiz.duration_minutes} minutes
                    </p>

                    <button
                      type="button"
                      onClick={() => markAttendance(quiz.id)}
                      disabled={
                        attendanceMarked ||
                        Boolean(markingQuizId) ||
                        attendanceError
                      }
                      className={`mt-5 inline-flex w-full items-center justify-center rounded-xl px-4 py-3 font-bold transition ${
                        attendanceMarked
                          ? "cursor-not-allowed bg-emerald-100 text-emerald-800"
                          : "bg-emerald-600 text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
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
                        className="mt-3 inline-flex w-full cursor-not-allowed items-center justify-center rounded-xl bg-slate-100 px-4 py-3 font-bold text-slate-500"
                      >
                        Quiz Already Submitted ✓
                      </button>
                    ) : (
                      <Link
                        href={`/student/quiz/${quiz.id}`}
                        className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 font-bold text-white shadow-sm transition hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
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

        {/* Footer */}
        <footer className="mt-8 rounded-2xl border border-white/80 bg-white/60 px-5 py-4 text-center text-sm text-slate-600">
          <span className="font-bold text-indigo-700">
            Physics Quiz System
          </span>
          {" "}· Student Workspace
        </footer>
      </div>
    </main>
  );
}
