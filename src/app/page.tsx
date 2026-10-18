"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Section =
  | "Dashboard"
  | "Students"
  | "Chapters"
  | "Quizzes"
  | "Attendance"
  | "Results";

type Student = {
  id: string;
  name: string;
  roll: string;
};

type Quiz = {
  id: string;
  title: string;
  status: string;
  created_at?: string;
};

type Submission = {
  id: string;
  quiz_id: string;
  student_id: string;
  status: string;
  started_at: string | null;
  submitted_at: string | null;
};

type AttendanceRow = {
  key: string;
  quizId: string;
  quizTitle: string;
  studentId: string;
  studentName: string;
  roll: string;
  status: "Not Started" | "In Progress" | "Submitted";
  startedAt: string | null;
  submittedAt: string | null;
};

const navigation: { name: Section; icon: string; description: string }[] = [
  { name: "Dashboard", icon: "⌂", description: "Class overview" },
  { name: "Students", icon: "♙", description: "Manage students" },
  { name: "Chapters", icon: "▤", description: "Physics chapters" },
  { name: "Quizzes", icon: "☑", description: "Create and manage quizzes" },
  { name: "Attendance", icon: "◷", description: "Student participation" },
  { name: "Results", icon: "▥", description: "Check answers and marks" },
];

const chapters = [
  "Physical Quantities and Measurement",
  "Kinematics",
  "Dynamics",
  "Turning Effect of Forces",
  "Gravitation",
  "Work and Energy",
  "Properties of Matter",
  "Thermal Properties of Matter",
  "Transfer of Heat",
];

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function statusClasses(status: AttendanceRow["status"]) {
  if (status === "Submitted") return "bg-green-50 text-green-700";
  if (status === "In Progress") return "bg-blue-50 text-blue-700";
  return "bg-amber-50 text-amber-700";
}

export default function HomePage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [section, setSection] = useState<Section>("Dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState("");

  const [attendanceRows, setAttendanceRows] = useState<AttendanceRow[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState("");
  const [selectedQuizId, setSelectedQuizId] = useState("all");
  const [attendanceSearch, setAttendanceSearch] = useState("");

  const loadStudents = useCallback(async () => {
    setStudentsLoading(true);
    setStudentsError("");

    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, roll_number")
      .eq("role", "student")
      .order("full_name", { ascending: true });

    if (error) {
      setStudentsError(error.message);
      setStudentsLoading(false);
      return;
    }

    setStudents(
      (data ?? []).map((profile) => ({
        id: profile.id,
        name: profile.full_name?.trim() || "Name not provided",
        roll:
          profile.roll_number == null
            ? "Not assigned"
            : String(profile.roll_number),
      }))
    );
    setStudentsLoading(false);
  }, [supabase]);

  const loadAttendance = useCallback(async () => {
    setAttendanceLoading(true);
    setAttendanceError("");

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      setAttendanceError(
        authError?.message || "Please sign in with your teacher account."
      );
      setAttendanceLoading(false);
      return;
    }

    const [
      { data: quizData, error: quizError },
      { data: studentData, error: studentError },
    ] = await Promise.all([
      supabase
        .from("quizzes")
        .select("id, title, status, created_at")
        .eq("created_by", user.id)
        .in("status", ["published", "closed"])
        .order("created_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("id, full_name, roll_number")
        .eq("role", "student")
        .order("full_name", { ascending: true }),
    ]);

    if (quizError || studentError) {
      const messages = [
        quizError ? `Quizzes: ${quizError.message}` : "",
        studentError ? `Students: ${studentError.message}` : "",
      ].filter(Boolean);
      setAttendanceError(messages.join(" | "));
      setAttendanceLoading(false);
      return;
    }

    const quizzes = (quizData ?? []) as Quiz[];
    let submissionData: Submission[] = [];

    // Only fetch submissions for quizzes owned by the signed-in teacher.
    if (quizzes.length > 0) {
      const { data, error } = await supabase
        .from("submissions")
        .select("id, quiz_id, student_id, status, started_at, submitted_at")
        .in(
          "quiz_id",
          quizzes.map((quiz) => quiz.id)
        );

      if (error) {
        setAttendanceError(`Submissions: ${error.message}`);
        setAttendanceLoading(false);
        return;
      }

      submissionData = (data ?? []) as Submission[];
    }
    const profiles = (studentData ?? []).map((profile) => ({
      id: profile.id as string,
      name: (profile.full_name as string | null)?.trim() || "Name not provided",
      roll:
        profile.roll_number == null
          ? "Not assigned"
          : String(profile.roll_number),
    }));
    const submissions = submissionData;

    const rows: AttendanceRow[] = [];
    for (const quiz of quizzes) {
      for (const student of profiles) {
        const submission = submissions.find(
          (item) =>
            item.quiz_id === quiz.id && item.student_id === student.id
        );

        let status: AttendanceRow["status"] = "Not Started";
        if (submission?.status === "submitted" || submission?.submitted_at) {
          status = "Submitted";
        } else if (submission) {
          status = "In Progress";
        }

        rows.push({
          key: `${quiz.id}-${student.id}`,
          quizId: quiz.id,
          quizTitle: quiz.title || "Untitled quiz",
          studentId: student.id,
          studentName: student.name,
          roll: student.roll,
          status,
          startedAt: submission?.started_at ?? null,
          submittedAt: submission?.submitted_at ?? null,
        });
      }
    }

    setAttendanceRows(rows);
    setAttendanceLoading(false);
  }, [supabase]);

  useEffect(() => {
    let active = true;

    async function initialLoad() {
      setStudentsLoading(true);
      setStudentsError("");

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, roll_number")
        .eq("role", "student")
        .order("full_name", { ascending: true });

      if (!active) return;

      if (error) {
        setStudentsError(error.message);
      } else {
        setStudents(
          (data ?? []).map((profile) => ({
            id: profile.id,
            name: profile.full_name?.trim() || "Name not provided",
            roll:
              profile.roll_number == null
                ? "Not assigned"
                : String(profile.roll_number),
          }))
        );
      }
      setStudentsLoading(false);
    }

    void initialLoad();

    const channel = supabase
      .channel("teacher-student-profiles")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => {
          if (active) void loadStudents();
        }
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [supabase, loadStudents]);

  useEffect(() => {
    if (section === "Attendance") void loadAttendance();
  }, [section, loadAttendance]);

  function navigate(name: Section) {
    setMenuOpen(false);
    setSearch("");

    switch (name) {
      case "Dashboard":
        router.push("/teacher");
        break;
      case "Students":
        setSection("Students");
        break;
      case "Quizzes":
        router.push("/teacher/quizzes");
        break;
      case "Results":
        router.push("/teacher/results");
        break;
      case "Chapters":
      case "Attendance":
        setSection(name);
        break;
    }
  }

  const filteredStudents = students.filter((student) => {
    const query = search.trim().toLowerCase();
    return (
      student.name.toLowerCase().includes(query) ||
      student.roll.toLowerCase().includes(query)
    );
  });

  const visibleAttendance = attendanceRows.filter((row) => {
    const matchesQuiz =
      selectedQuizId === "all" || row.quizId === selectedQuizId;
    const query = attendanceSearch.trim().toLowerCase();
    const matchesSearch =
      row.studentName.toLowerCase().includes(query) ||
      row.roll.toLowerCase().includes(query) ||
      row.quizTitle.toLowerCase().includes(query) ||
      row.status.toLowerCase().includes(query);
    return matchesQuiz && matchesSearch;
  });

  const attendanceQuizOptions = Array.from(
    new Map(
      attendanceRows.map((row) => [
        row.quizId,
        { id: row.quizId, title: row.quizTitle },
      ])
    ).values()
  );

  const submittedCount = visibleAttendance.filter(
    (row) => row.status === "Submitted"
  ).length;
  const inProgressCount = visibleAttendance.filter(
    (row) => row.status === "In Progress"
  ).length;
  const notStartedCount = visibleAttendance.filter(
    (row) => row.status === "Not Started"
  ).length;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-xl"
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
        >
          ☰
        </button>
        <div>
          <p className="font-bold text-blue-700">Physics Quiz</p>
          <p className="text-xs text-slate-500">Class 9 · Mirpurkhas Board</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
          T
        </div>
      </header>

      <div className="flex min-h-screen">
        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-slate-950 text-white transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
            menuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="border-b border-white/10 px-6 py-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-2xl">
                ⚛
              </div>
              <div>
                <h1 className="text-lg font-bold">Physics Quiz</h1>
                <p className="text-xs text-slate-400">Examination System</p>
              </div>
            </div>
            <div className="mt-5 rounded-xl bg-white/5 px-3 py-3">
              <p className="text-sm font-semibold">Class 9 Physics</p>
              <p className="mt-1 text-xs text-slate-400">
                Mirpurkhas Board · Academic Year
              </p>
            </div>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
            <p className="px-3 pb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
              Main Menu
            </p>
            {navigation.map((item) => (
              <button
                key={item.name}
                onClick={() => navigate(item.name)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${
                  section === item.name
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-lg">
                  {item.icon}
                </span>
                <span>
                  <span className="block text-sm font-semibold">
                    {item.name}
                  </span>
                  <span className="mt-0.5 block text-xs opacity-70">
                    {item.description}
                  </span>
                </span>
              </button>
            ))}
          </nav>

          <div className="border-t border-white/10 p-4">
            <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 font-bold">
                T
              </div>
              <div>
                <p className="text-sm font-semibold">Teacher Account</p>
                <p className="text-xs text-slate-400">Physics Quiz System</p>
              </div>
            </div>
          </div>
        </aside>

        {menuOpen && (
          <button
            className="fixed inset-0 z-30 bg-black/40 lg:hidden"
            onClick={() => setMenuOpen(false)}
            aria-label="Close navigation"
          />
        )}

        <main className="min-w-0 flex-1">
          <div className="hidden items-center justify-between border-b border-slate-200 bg-white px-8 py-4 lg:flex">
            <div>
              <p className="text-sm text-slate-500">Class 9 / {section}</p>
              <h2 className="mt-1 text-xl font-bold">{section}</h2>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-semibold">Teacher</p>
                <p className="text-xs text-slate-500">
                  Mirpurkhas Board Physics
                </p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
                T
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
            {section === "Dashboard" && (
              <>
                <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-sm font-medium text-blue-600">
                      TEACHER WORKSPACE
                    </p>
                    <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                      Welcome to Physics Quiz System
                    </h1>
                    <p className="mt-2 text-sm text-slate-500 sm:text-base">
                      Manage your Class 9 Physics quizzes in one place.
                    </p>
                  </div>
                  <button
                    onClick={() => navigate("Quizzes")}
                    className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                  >
                    + Manage Quizzes
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    {
                      label: "Registered Students",
                      value: studentsLoading
                        ? "…"
                        : studentsError
                          ? "—"
                          : String(students.length),
                      icon: "♙",
                      note: "From Supabase profiles",
                    },
                    {
                      label: "Physics Chapters",
                      value: "9",
                      icon: "▤",
                      note: "Initial chapter list",
                    },
                    {
                      label: "Active Quizzes",
                      value: "—",
                      icon: "☑",
                      note: "Open Quiz Management",
                    },
                    {
                      label: "Quiz Results",
                      value: "—",
                      icon: "✎",
                      note: "Open Results",
                    },
                  ].map((card) => (
                    <div
                      key={card.label}
                      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-500">
                          {card.label}
                        </p>
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-xl text-blue-700">
                          {card.icon}
                        </span>
                      </div>
                      <p className="mt-4 text-3xl font-bold">{card.value}</p>
                      <p className="mt-2 text-xs text-slate-400">{card.note}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-8">
                  <h2 className="text-lg font-bold">Quick Actions</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Select what you want to manage.
                  </p>
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {[
                      {
                        title: "Manage Students",
                        description: "View registered student profiles.",
                        icon: "♙",
                        target: "Students" as Section,
                      },
                      {
                        title: "Physics Chapters",
                        description: "Browse the initial chapter list.",
                        icon: "▤",
                        target: "Chapters" as Section,
                      },
                      {
                        title: "Create a Quiz",
                        description:
                          "Create and manage chapter-wise MCQ quizzes.",
                        icon: "☑",
                        target: "Quizzes" as Section,
                      },
                      {
                        title: "Quiz Attendance",
                        description: "Review participation categories.",
                        icon: "◷",
                        target: "Attendance" as Section,
                      },
                      {
                        title: "Check Results",
                        description:
                          "Open submitted quiz results and marks.",
                        icon: "✎",
                        target: "Results" as Section,
                      },
                      {
                        title: "Search Students",
                        description:
                          "Search registered students by name or roll number.",
                        icon: "⌕",
                        target: "Students" as Section,
                      },
                    ].map((action) => (
                      <button
                        key={action.title}
                        onClick={() => navigate(action.target)}
                        className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
                      >
                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-xl text-blue-700">
                          {action.icon}
                        </span>
                        <h3 className="mt-4 font-bold">{action.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                          {action.description}
                        </p>
                        <span className="mt-4 inline-block text-sm font-semibold text-blue-600">
                          Open section →
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-8 rounded-2xl border border-blue-200 bg-blue-50 p-5">
                  <h3 className="font-bold text-blue-900">
                    Physics Quiz System
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-blue-800">
                    Student profiles are loaded from Supabase. Quiz creation,
                    attempts and results use their dedicated pages.
                  </p>
                </div>
              </>
            )}

            {section === "Students" && (
              <section>
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <h1 className="text-2xl font-bold">Registered Students</h1>
                    <p className="mt-2 text-sm text-slate-500">
                      Student accounts with a profile role of student.
                    </p>
                  </div>
                  <button
                    onClick={() => void loadStudents()}
                    disabled={studentsLoading}
                    className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {studentsLoading ? "Refreshing…" : "Refresh list"}
                  </button>
                </div>

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search name or roll number..."
                  className="mt-6 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500 sm:max-w-md"
                />

                {studentsError && (
                  <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <p className="font-semibold">
                      Could not load students from Supabase.
                    </p>
                    <p className="mt-1 break-words">{studentsError}</p>
                    <p className="mt-2">
                      Check the profiles table permissions/RLS and make sure
                      the teacher is allowed to read student profiles.
                    </p>
                  </div>
                )}

                {studentsLoading && (
                  <p className="mt-5 text-sm text-blue-700">
                    Loading students…
                  </p>
                )}

                {!studentsLoading && !studentsError && (
                  <p className="mt-5 text-sm text-slate-500">
                    Total registered students: {students.length}
                  </p>
                )}

                <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                  <table className="w-full min-w-[500px] text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="px-5 py-4">Student Name</th>
                        <th className="px-5 py-4">Roll Number</th>
                        <th className="px-5 py-4">Account Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!studentsLoading &&
                        !studentsError &&
                        filteredStudents.map((student) => (
                          <tr key={student.id} className="border-t border-slate-100">
                            <td className="px-5 py-4 font-medium">
                              {student.name}
                            </td>
                            <td className="px-5 py-4">{student.roll}</td>
                            <td className="px-5 py-4">
                              <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                                Registered
                              </span>
                            </td>
                          </tr>
                        ))}
                      {!studentsLoading &&
                        !studentsError &&
                        filteredStudents.length === 0 && (
                          <tr>
                            <td
                              colSpan={3}
                              className="px-5 py-8 text-center text-slate-500"
                            >
                              {students.length === 0
                                ? "No student profiles found in the database."
                                : "No matching students found."}
                            </td>
                          </tr>
                        )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {section === "Chapters" && (
              <section>
                <h1 className="text-2xl font-bold">Physics Chapters</h1>
                <p className="mt-2 text-sm text-slate-500">
                  Initial chapter list. Verify names against your current Sindh
                  Board textbook.
                </p>
                <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {chapters.map((chapter, index) => (
                    <div
                      key={chapter}
                      className="rounded-2xl border border-slate-200 bg-white p-5"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 font-bold text-blue-700">
                        {index + 1}
                      </div>
                      <h2 className="mt-4 font-bold">{chapter}</h2>
                      <button
                        onClick={() => navigate("Quizzes")}
                        className="mt-4 text-sm font-semibold text-blue-600 hover:text-blue-800"
                      >
                        Manage Quizzes →
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {section === "Quizzes" && (
              <section className="rounded-2xl border border-slate-200 bg-white p-6">
                <h1 className="text-2xl font-bold">Quiz Management</h1>
                <p className="mt-2 text-sm text-slate-500">
                  Create, edit and publish quizzes using the connected teacher
                  page.
                </p>
                <button
                  onClick={() => router.push("/teacher/quizzes")}
                  className="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Open Quiz Management →
                </button>
              </section>
            )}

            {section === "Attendance" && (
              <section>
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <h1 className="text-2xl font-bold">Quiz Attendance</h1>
                    <p className="mt-2 text-sm text-slate-500">
                      Live participation from your published and closed quizzes.
                    </p>
                  </div>
                  <button
                    onClick={() => void loadAttendance()}
                    disabled={attendanceLoading}
                    className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {attendanceLoading ? "Refreshing…" : "Refresh attendance"}
                  </button>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  {[
                    {
                      label: "Not Started",
                      count: notStartedCount,
                      style: "border-amber-200 bg-amber-50 text-amber-800",
                    },
                    {
                      label: "In Progress",
                      count: inProgressCount,
                      style: "border-blue-200 bg-blue-50 text-blue-800",
                    },
                    {
                      label: "Submitted",
                      count: submittedCount,
                      style: "border-green-200 bg-green-50 text-green-800",
                    },
                  ].map((card) => (
                    <div
                      key={card.label}
                      className={`rounded-2xl border p-5 ${card.style}`}
                    >
                      <p className="text-sm font-medium">{card.label}</p>
                      <p className="mt-2 text-3xl font-bold">{card.count}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <select
                    value={selectedQuizId}
                    onChange={(event) => setSelectedQuizId(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 sm:max-w-sm"
                  >
                    <option value="all">All published/closed quizzes</option>
                    {attendanceQuizOptions.map((quiz) => (
                      <option key={quiz.id} value={quiz.id}>
                        {quiz.title}
                      </option>
                    ))}
                  </select>
                  <input
                    value={attendanceSearch}
                    onChange={(event) => setAttendanceSearch(event.target.value)}
                    placeholder="Search student, roll, quiz or status..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3"
                  />
                </div>

                {attendanceError && (
                  <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <p className="font-semibold">
                      Attendance could not be loaded from Supabase.
                    </p>
                    <p className="mt-1 break-words">{attendanceError}</p>
                    <p className="mt-2">
                      Check that the signed-in teacher can read their quizzes,
                      student profiles and submissions under the existing RLS
                      policies.
                    </p>
                  </div>
                )}

                {attendanceLoading && (
                  <p className="mt-5 text-sm text-blue-700">
                    Loading attendance records…
                  </p>
                )}

                {!attendanceLoading && !attendanceError && (
                  <p className="mt-5 text-sm text-slate-500">
                    Showing {visibleAttendance.length} attendance record(s).
                  </p>
                )}

                <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                  <table className="w-full min-w-[850px] text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="px-4 py-4">Student</th>
                        <th className="px-4 py-4">Roll No.</th>
                        <th className="px-4 py-4">Quiz</th>
                        <th className="px-4 py-4">Status</th>
                        <th className="px-4 py-4">Started At</th>
                        <th className="px-4 py-4">Submitted At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!attendanceLoading &&
                        !attendanceError &&
                        visibleAttendance.map((row) => (
                          <tr key={row.key} className="border-t border-slate-100">
                            <td className="px-4 py-4 font-medium">
                              {row.studentName}
                            </td>
                            <td className="px-4 py-4">{row.roll}</td>
                            <td className="px-4 py-4">{row.quizTitle}</td>
                            <td className="px-4 py-4">
                              <span
                                className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${statusClasses(
                                  row.status
                                )}`}
                              >
                                {row.status}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              {formatDate(row.startedAt)}
                            </td>
                            <td className="px-4 py-4">
                              {formatDate(row.submittedAt)}
                            </td>
                          </tr>
                        ))}
                      {!attendanceLoading &&
                        !attendanceError &&
                        visibleAttendance.length === 0 && (
                          <tr>
                            <td
                              colSpan={6}
                              className="px-5 py-10 text-center text-slate-500"
                            >
                              {attendanceRows.length === 0
                                ? "No published or closed quizzes with attendance records were found. Publish a quiz first."
                                : "No attendance records match your filters."}
                            </td>
                          </tr>
                        )}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 text-xs leading-5 text-slate-500">
                  Note: Not Started is calculated by comparing each registered
                  student with each published/closed quiz. This matches the
                  current app behavior where published quizzes are available to
                  all student profiles; no separate class-assignment table is
                  currently used.
                </p>
              </section>
            )}

            {section === "Results" && (
              <section className="rounded-2xl border border-slate-200 bg-white p-6">
                <h1 className="text-2xl font-bold">Answer Checking & Results</h1>
                <p className="mt-2 text-sm text-slate-500">
                  Review quiz submissions, marks and result publication.
                </p>
                <button
                  onClick={() => router.push("/teacher/results")}
                  className="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Open Quiz Results →
                </button>
              </section>
            )}

            <footer className="mt-12 border-t border-slate-200 py-6 text-center text-xs text-slate-400">
              Physics Quiz System · Class 9 · Mirpurkhas Board
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}
