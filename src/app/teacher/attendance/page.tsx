
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type AttendanceRecord = {
  id: string;
  student_id: string;
  quiz_id: string;
  marked_at: string;
};

type StudentProfile = {
  id: string;
  full_name: string | null;
};

type Quiz = {
  id: string;
  title: string;
};

export default function TeacherAttendancePage() {
  const supabase = createClient();

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [filterQuiz, setFilterQuiz] = useState("all");

  useEffect(() => {
    async function loadAttendance() {
      setLoading(true);
      setMessage("");

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setMessage("Please log in to view attendance.");
        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError || profile?.role !== "teacher") {
        setMessage("Only teachers can view attendance.");
        setLoading(false);
        return;
      }

      const [
        { data: attendanceData, error: attendanceError },
        { data: studentData, error: studentError },
        { data: quizData, error: quizError },
      ] = await Promise.all([
        supabase
          .from("attendance")
          .select("id, student_id, quiz_id, marked_at")
          .order("marked_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("id, full_name")
          .eq("role", "student"),
        supabase.from("quizzes").select("id, title"),
      ]);

      if (attendanceError || studentError || quizError) {
        setMessage(
          attendanceError?.message ||
            studentError?.message ||
            quizError?.message ||
            "Could not load attendance."
        );
      } else {
        setRecords(attendanceData || []);
        setStudents(studentData || []);
        setQuizzes(quizData || []);
      }

      setLoading(false);
    }

    loadAttendance();
  }, []);

  const studentName = (id: string) =>
    students.find((student) => student.id === id)?.full_name || "Unknown student";

  const quizTitle = (id: string) =>
    quizzes.find((quiz) => quiz.id === id)?.title || "Unknown quiz";

  const visibleRecords =
    filterQuiz === "all"
      ? records
      : records.filter((record) => record.quiz_id === filterQuiz);

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-800 sm:p-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/teacher"
          className="text-sm font-semibold text-blue-700 hover:underline"
        >
          ← Back to Teacher Dashboard
        </Link>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                🟢 Live Attendance
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                View student attendance records.
              </p>
            </div>

            <div className="rounded-xl bg-blue-50 px-4 py-3 text-center">
              <p className="text-sm text-blue-700">Total records</p>
              <p className="text-2xl font-bold text-blue-900">
                {records.length}
              </p>
            </div>
          </div>

          <div className="mt-6">
            <label
              htmlFor="quiz-filter"
              className="mb-2 block text-sm font-semibold"
            >
              Filter by quiz
            </label>
            <select
              id="quiz-filter"
              value={filterQuiz}
              onChange={(event) => setFilterQuiz(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white p-3 sm:max-w-md"
            >
              <option value="all">All quizzes</option>
              {quizzes.map((quiz) => (
                <option key={quiz.id} value={quiz.id}>
                  {quiz.title}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <p className="mt-6 text-slate-500">Loading attendance...</p>
          ) : message ? (
            <p className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">
              {message}
            </p>
          ) : visibleRecords.length === 0 ? (
            <p className="mt-6 rounded-lg bg-slate-50 p-5 text-slate-600">
              No attendance records yet. Records will appear here when students
              mark their attendance.
            </p>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[600px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="p-3">Student</th>
                    <th className="p-3">Quiz</th>
                    <th className="p-3">Date and time</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRecords.map((record) => (
                    <tr key={record.id} className="border-b border-slate-100">
                      <td className="p-3 font-medium">
                        {studentName(record.student_id)}
                      </td>
                      <td className="p-3">{quizTitle(record.quiz_id)}</td>
                      <td className="p-3">
                        {new Date(record.marked_at).toLocaleString()}
                      </td>
                      <td className="p-3">
                        <span className="rounded-full bg-green-100 px-3 py-1 text-green-800">
                          Present
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
