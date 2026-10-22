
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function TeacherLoginPage() {
  const router = useRouter();

  const [isSignup, setIsSignup] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [resetMode, setResetMode] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  async function handleForgotPassword() {
    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setResetMessage("Pehle apna account email enter karo.");
      return;
    }

    setResetLoading(true);
    setResetMessage("");

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.resetPasswordForEmail(
        cleanEmail,
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      );

      if (error) {
        setResetMessage(error.message);
      } else {
        setResetMessage(
          "Agar is email par account hai, password reset link bhej diya gaya hai. Inbox aur spam folder check karo."
        );
      }
    } catch {
      setResetMessage("Kuch ghalat hua. Dobara koshish karo.");
    } finally {
      setResetLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    const supabase = createClient();

    try {
      if (isSignup) {
        if (password.length < 8) {
          setMessage("Password must be at least 8 characters.");
          return;
        }

        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              signup_request: "teacher",
            },
          },
        });

        if (error) {
          setMessage(error.message);
          return;
        }

        setMessage(
          "Signup submitted. Your teacher access must be approved by an administrator before you can use the Teacher Dashboard. If email confirmation is enabled, check your inbox."
        );

        setFullName("");
        setEmail("");
        setPassword("");
        return;
      }

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
          "Teacher access is not approved for this account. Please contact the administrator."
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
            Physics Quiz System —{" "}
            {isSignup ? "Teacher Signup" : "Teacher Login"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignup && (
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
          )}

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
              autoComplete="email"
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
              autoComplete={isSignup ? "new-password" : "current-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={
                isSignup ? "At least 8 characters" : "Enter your password"
              }
              minLength={isSignup ? 8 : undefined}
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
            {loading
              ? "Please wait..."
              : isSignup
                ? "Request Teacher Access"
                : "Teacher Log In"}
          </button>
        </form>

        {!isSignup && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setResetMode(!resetMode);
                setResetMessage("");
              }}
              className="text-sm font-medium text-blue-700 hover:underline"
            >
              {resetMode ? "Hide Password Reset" : "Forgot Password?"}
            </button>

            {resetMode && (
              <div className="mt-4 space-y-3 rounded-xl bg-blue-50 p-4 text-left">
                <p className="text-sm text-slate-700">
                  Apne account ka email upar enter karo, phir reset link bhejo.
                </p>

                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={resetLoading}
                  className="w-full rounded-xl bg-blue-700 px-4 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
                >
                  {resetLoading ? "Sending..." : "Send Reset Link"}
                </button>

                {resetMessage && (
                  <p
                    role="status"
                    className="break-words text-sm text-slate-700"
                  >
                    {resetMessage}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <p className="mt-5 text-center text-sm text-slate-600">
          {isSignup ? "Already have an account?" : "New teacher?"}{" "}
          <button
            type="button"
            onClick={() => {
              setIsSignup(!isSignup);
              setMessage("");
              setResetMode(false);
              setResetMessage("");
            }}
            className="font-semibold text-blue-700 hover:underline"
          >
            {isSignup ? "Teacher Log In" : "Create Teacher Account"}
          </button>
        </p>

        {isSignup && (
          <p className="mt-3 text-center text-xs text-slate-500">
            Teacher access requires administrator approval.
          </p>
        )}

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
