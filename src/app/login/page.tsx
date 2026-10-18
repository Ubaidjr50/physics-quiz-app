"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [fullName, setFullName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
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
      if (mode === "signup") {
        if (!fullName.trim() || !rollNumber.trim()) {
          setMessage("Please enter your full name and roll number.");
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              roll_number: rollNumber.trim(),
            },
          },
        });

        if (error) {
          setMessage(error.message);
          return;
        }

        if (!data.session) {
          setMessage(
            "Account created! Check your email to confirm your account, then log in."
          );
          setMode("login");
          return;
        }

        router.replace("/student");
        router.refresh();
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profileError) {
        setMessage("Could not load your profile: " + profileError.message);
        await supabase.auth.signOut();
        return;
      }

      if (!profile) {
        setMessage(
          "Your profile was not found. Please contact the system administrator."
        );
        await supabase.auth.signOut();
        return;
      }

      if (profile.role === "teacher") {
        router.replace("/teacher");
        router.refresh();
        return;
      }

      if (profile.role === "student") {
        router.replace("/student");
        router.refresh();
        return;
      }

      setMessage(
        "Your account role is not valid. Please contact the system administrator."
      );
      await supabase.auth.signOut();
    } catch {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl sm:p-8">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-2xl font-bold text-white">
            P
          </div>

          <h1 className="text-2xl font-bold text-slate-900">
            Physics Quiz System
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Class 9 — Sindh Board Physics
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setMessage("");
            }}
            className={`rounded-lg px-4 py-3 text-sm font-semibold ${
              mode === "login"
                ? "bg-white text-blue-700 shadow"
                : "text-slate-500"
            }`}
          >
            Log In
          </button>

          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setMessage("");
            }}
            className={`rounded-lg px-4 py-3 text-sm font-semibold ${
              mode === "signup"
                ? "bg-white text-blue-700 shadow"
                : "text-slate-500"
            }`}
          >
            Student Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <>
              <div>
                <label
                  htmlFor="fullName"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  Full Name
                </label>
                <input
                  id="fullName"
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Enter your full name"
                  required
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label
                  htmlFor="rollNumber"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  Roll Number
                </label>
                <input
                  id="rollNumber"
                  type="text"
                  value={rollNumber}
                  onChange={(event) => setRollNumber(event.target.value)}
                  placeholder="Enter your roll number"
                  required
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </>
          )}

          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
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
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              minLength={6}
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <p className="mt-1 text-xs text-slate-500">
              Password must be at least 6 characters.
            </p>
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
            className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "Please wait..."
              : mode === "login"
                ? "Log In"
                : "Create Student Account"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs leading-5 text-slate-500">
          Student accounts use email and password. Teacher accounts must be
          authorized by the system administrator.
        </p>
      </section>
    </main>
  );
}