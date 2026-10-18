
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function TeacherPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [message, setMessage] = useState("Checking account...");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadTeacher() {
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

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .single();

      if (!active) return;

      if (error || profile?.role !== "teacher") {
        setMessage("Teacher access is required.");
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }

      setName(profile.full_name || "Teacher");
      setMessage("");
      setReady(true);
    }

    void loadTeacher();

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

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <p className="text-slate-600">{message || "Loading..."}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-5 sm:p-10">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-blue-600">
              TEACHER WORKSPACE
            </p>

            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              Assalam-o-Alaikum, {name}
            </h1>

            <p className="mt-2 text-slate-500">
              Class 9 Physics · Mirpurkhas Board
            </p>
          </div>

          <button
            type="button"
            onClick={logout}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-semibold transition hover:bg-slate-100"
          >
            Sign Out
          </button>
        </header>

        {/* Dashboard */}
        <section className="mt-8 rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">
            Teacher Dashboard
          </h2>

          <p className="mt-3 leading-7 text-slate-600">
            Welcome to your Physics Quiz System. Create quizzes, add MCQs,
            manage your quizzes, and prepare results from your teacher
            workspace.
          </p>

          {/* Dashboard Cards */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Create Quiz */}
            <button
              type="button"
              onClick={() => router.push("/teacher/create")}
              className="rounded-xl border border-blue-200 bg-blue-50 p-5 text-left transition hover:border-blue-400 hover:bg-blue-100"
            >
              <span className="text-3xl">➕</span>

              <h3 className="mt-3 font-bold text-blue-900">
                Create Quiz
              </h3>

              <p className="mt-2 text-sm font-normal leading-6 text-blue-800">
                Create a Physics quiz, add MCQs, set correct answers, and save
                your quiz as a draft.
              </p>

              <span className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
                Create Now →
              </span>
            </button>

            {/* Manage My Quizzes */}
            <button
              type="button"
              onClick={() => router.push("/teacher/quizzes")}
              className="rounded-xl border border-indigo-200 bg-indigo-50 p-5 text-left transition hover:border-indigo-400 hover:bg-indigo-100"
            >
              <span className="text-3xl">📋</span>

              <h3 className="mt-3 font-bold text-indigo-900">
                Manage My Quizzes
              </h3>

              <p className="mt-2 text-sm font-normal leading-6 text-indigo-800">
                View your saved quizzes, check their status, and publish draft
                quizzes for students.
              </p>

              <span className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">
                Manage Quizzes →
              </span>
            </button>

            {/* Manage Students */}
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <span className="text-3xl">👨‍🎓</span>

              <h3 className="mt-3 font-bold text-slate-900">
                Manage Students
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Student management will be added in the next stage.
              </p>
            </div>

            {/* Physics Chapters */}
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <span className="text-3xl">📚</span>

              <h3 className="mt-3 font-bold text-slate-900">
                Physics Chapters
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                View and manage Physics chapters in a future update.
              </p>
            </div>

            {/* Live Attendance */}
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <span className="text-3xl">🟢</span>

              <h3 className="mt-3 font-bold text-slate-900">
                Live Attendance
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Quiz attendance tracking will be added in the next stage.
              </p>
            </div>

            {/* Check Answers */}
            <button
              type="button"
              onClick={() => router.push("/teacher/results")}
              className="rounded-xl border border-purple-200 bg-purple-50 p-5 text-left transition hover:border-purple-400 hover:bg-purple-100"
            >
              <span className="text-3xl">📝</span>

              <h3 className="mt-3 font-bold text-purple-900">
                Check Answers
              </h3>

              <p className="mt-2 text-sm leading-6 text-purple-800">
                Open the results workspace to review submitted quizzes and
                student marks.
              </p>

              <span className="mt-4 inline-block rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white">
                Check Results →
              </span>
            </button>

            {/* Publish Results */}
            <button
              type="button"
              onClick={() => router.push("/teacher/results")}
              className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-left transition hover:border-amber-400 hover:bg-amber-100"
            >
              <span className="text-3xl">🏆</span>

              <h3 className="mt-3 font-bold text-amber-900">
                Publish Results
              </h3>

              <p className="mt-2 text-sm leading-6 text-amber-800">
                Open the results workspace to view marks and manage result
                publication.
              </p>

              <span className="mt-4 inline-block rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white">
                View Results →
              </span>
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
