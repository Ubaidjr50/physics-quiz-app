
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function TeacherLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    const supabase = createClient();

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setMessage("Login failed. Please check your email and password.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        setMessage(
          "Teacher profile not found. Please contact the administrator."
        );
        return;
      }

      if (profile.role !== "teacher") {
        await supabase.auth.signOut();
        setMessage(
          "This login is only for teachers. Please use Student Login."
        );
        return;
      }

      router.replace("/teacher");
      router.refresh();
    } catch {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        background:
          "linear-gradient(135deg, aliceblue 0%, lavender 50%, lightblue 100%)",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 16px",
      }}
    >
      <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl sm:p-8">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-700 text-2xl font-bold text-white">
            T
          </div>

          <h1 className="text-2xl font-bold text-slate-900">
            Teacher Portal
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Physics Quiz System — Teacher Login
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Teacher Email
            </label>

            <input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="teacher@example.com"
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {message && (
            <div
              role="status"
              className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800"
            >
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-700 px-4 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60"
          >
            {loading ? "Please wait..." : "Teacher Log In"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Are you a student?{" "}
          <Link
            href="/login"
            className="font-semibold text-blue-700 hover:underline"
          >
            Student Login / Sign Up
          </Link>
        </p>
      </section>
    </main>
  );
}
