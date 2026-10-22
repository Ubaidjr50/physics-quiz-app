
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

  const pageBackground = {
    background:
      "linear-gradient(135deg, #eef2ff 0%, #e0e7ff 45%, #f3e8ff 100%)",
    minHeight: "100vh",
  } as const;

  const cards = [
    {
      icon: "✚",
      title: "Create Quiz",
      description:
        "Create Physics quizzes, add MCQs and save your work as a draft.",
      button: "Create Quiz",
      href: "/teacher/create",
      color: "#4f46e5",
      background: "linear-gradient(135deg, #eef2ff, #e0e7ff)",
    },
    {
      icon: "📋",
      title: "Manage My Quizzes",
      description:
        "View saved quizzes, check their status and publish drafts.",
      button: "Manage Quizzes",
      href: "/teacher/quizzes",
      color: "#7c3aed",
      background: "linear-gradient(135deg, #f3e8ff, #ede9fe)",
    },
    {
      icon: "🎓",
      title: "Manage Students",
      description:
        "View registered students and their roll numbers.",
      button: "View Students",
      href: "/teacher/students",
      color: "#0369a1",
      background: "linear-gradient(135deg, #e0f2fe, #dbeafe)",
    },
    {
      icon: "📚",
      title: "Physics Chapters",
      description:
        "Explore and manage Class 9 Physics chapters.",
      button: "Manage Chapters",
      href: "/teacher/chapters",
      color: "#c2410c",
      background: "linear-gradient(135deg, #ffedd5, #fef3c7)",
    },
    {
      icon: "🟢",
      title: "Live Attendance",
      description:
        "Review student attendance, quiz names and attendance times.",
      button: "View Attendance",
      href: "/teacher/attendance",
      color: "#047857",
      background: "linear-gradient(135deg, #d1fae5, #ccfbf1)",
    },
    {
      icon: "📝",
      title: "Check Answers",
      description:
        "Review submitted quizzes and student marks.",
      button: "Check Results",
      href: "/teacher/results",
      color: "#6d28d9",
      background: "linear-gradient(135deg, #ede9fe, #f3e8ff)",
    },
    {
      icon: "🏆",
      title: "Publish Results",
      description:
        "Open the results workspace to manage result publication.",
      button: "View Results",
      href: "/teacher/results",
      color: "#b45309",
      background: "linear-gradient(135deg, #fef3c7, #ffedd5)",
    },
  ];

  if (!ready) {
    return (
      <main
        style={{
          ...pageBackground,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
        }}
      >
        <div className="rounded-2xl border border-white/70 bg-white/80 p-6 shadow-lg">
          <p className="font-semibold text-indigo-900">
            {message || "Loading..."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main style={pageBackground} className="min-h-screen p-4 sm:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-gradient-to-r from-indigo-700 via-violet-700 to-purple-600 p-6 text-white shadow-xl sm:p-8">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-bold tracking-widest text-indigo-50">
              <span>✦</span>
              PHYSICS QUIZ SYSTEM
            </div>

            <p className="text-sm font-medium text-indigo-100">
              TEACHER WORKSPACE
            </p>

            <h1 className="mt-2 text-2xl font-extrabold sm:text-4xl">
              Assalam-o-Alaikum, {name}!
            </h1>

            <p className="mt-3 text-sm text-indigo-100 sm:text-base">
              Class 9 Physics · Mirpurkhas Board
            </p>
            <p className="mt-1 text-sm text-indigo-200">
              Your classroom, quizzes and results — all in one place.
            </p>
          </div>

          <button
            type="button"
            onClick={logout}
            className="rounded-xl border border-white/30 bg-white/10 px-5 py-3 font-semibold text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white"
          >
            Sign Out ↗
          </button>
        </header>

        {/* Welcome panel */}
        <section className="mt-7 rounded-3xl border border-white/80 bg-white/75 p-5 shadow-lg backdrop-blur-xl sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-indigo-600">
                Your workspace
              </p>
              <h2 className="mt-2 text-2xl font-extrabold text-slate-900 sm:text-3xl">
                Teacher Dashboard
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                Manage your quizzes, students, Physics chapters, attendance
                and results from your dashboard.
              </p>
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 p-4 text-4xl">
              👨‍🏫
            </div>
          </div>
        </section>

        {/* Feature cards */}
        <section className="mt-8">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
                Quick Access
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Select a section to get started.
              </p>
            </div>

            <span className="rounded-full border border-indigo-200 bg-white/80 px-3 py-1.5 text-xs font-bold text-indigo-700">
              7 WORKSPACE OPTIONS
            </span>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => (
              <button
                key={card.title}
                type="button"
                onClick={() => router.push(card.href)}
                className="group flex min-h-64 flex-col rounded-2xl border border-white/90 bg-white p-5 text-left shadow-md transition duration-300 hover:-translate-y-1 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:p-6"
              >
                <div className="flex w-full items-center justify-between gap-3">
                  <span
                    className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl"
                    style={{ background: card.background }}
                  >
                    {card.icon}
                  </span>

                  <span
                    className="text-xl transition-transform duration-300 group-hover:translate-x-1"
                    style={{ color: card.color }}
                  >
                    →
                  </span>
                </div>

                <h3 className="mt-5 text-lg font-extrabold text-slate-900">
                  {card.title}
                </h3>

                <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">
                  {card.description}
                </p>

                <span
                  className="mt-5 inline-flex w-fit items-center rounded-xl px-4 py-2.5 text-sm font-bold text-white transition group-hover:brightness-110"
                  style={{ backgroundColor: card.color }}
                >
                  {card.button} →
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-8 rounded-2xl border border-white/80 bg-white/60 px-5 py-4 text-center text-sm text-slate-600">
          <span className="font-semibold text-indigo-700">
            Physics Quiz System
          </span>
          {" "}· Teacher Workspace
        </footer>
      </div>
    </main>
  );
}
