
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type TeacherRequest = {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

export default function AdminTeachersPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [requests, setRequests] = useState<TeacherRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setMessage("");
    setIsAdmin(false);

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        setMessage(
          `Login session nahi mili: ${
            authError?.message ?? "Please login again."
          }`
        );
        setRequests([]);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("is_master_admin, role")
        .eq("id", authData.user.id)
        .maybeSingle();

      console.log("Admin profile verification:", {
        userId: authData.user.id,
        profile,
        profileError: profileError?.message ?? null,
      });

      if (profileError) {
        setMessage(
          `Profile check failed: ${profileError.message}`
        );
        setRequests([]);
        return;
      }

      if (!profile) {
        setMessage(
          "Is login account ka profile nahi mila. Supabase profiles table mein account check karna hoga."
        );
        setRequests([]);
        return;
      }

      if (profile.is_master_admin !== true) {
        setMessage(
          `Master Admin permission nahi mili. Current role: ${
            profile.role ?? "unknown"
          }; is_master_admin: ${String(profile.is_master_admin)}. Sahi Master Admin account se login karo.`
        );
        setRequests([]);
        return;
      }

      setIsAdmin(true);

      const { data, error } = await supabase
        .from("teacher_requests")
        .select(
          "id, user_id, full_name, email, status, created_at"
        )
        .order("created_at", { ascending: false });

      if (error) {
        setMessage(
          `Teacher requests load nahi huin: ${error.message}`
        );
        setRequests([]);
        return;
      }

      setRequests((data ?? []) as TeacherRequest[]);
    } catch (error) {
      setMessage(
        `Unexpected error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  async function reviewRequest(
    request: TeacherRequest,
    status: "approved" | "rejected"
  ) {
    const action = status === "approved" ? "approve" : "reject";

    if (
      !window.confirm(
        `Kya tum ${request.full_name} ki request ${action} karna chahte ho?`
      )
    ) {
      return;
    }

    setBusyId(request.id);
    setMessage("");

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        setMessage("Login session nahi mili. Dobara login karo.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("is_master_admin")
        .eq("id", authData.user.id)
        .maybeSingle();

      if (
        profileError ||
        !profile ||
        profile.is_master_admin !== true
      ) {
        setMessage(
          `Master Admin verification failed: ${
            profileError?.message ?? "Permission denied"
          }`
        );
        return;
      }

      const { data: updatedRows, error } = await supabase
        .from("teacher_requests")
        .update({
          status,
          reviewed_by: authData.user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", request.id)
        .eq("status", "pending")
        .select("id, status");

      if (error) {
        setMessage(`Request update failed: ${error.message}`);
        return;
      }

      if (!updatedRows || updatedRows.length === 0) {
        setMessage(
          "Request update nahi hui. RLS permission ya request ka current status check karna hoga."
        );
        return;
      }

      setMessage(
        status === "approved"
          ? `${request.full_name} approve ho gaya.`
          : `${request.full_name} ki request reject ho gayi.`
      );

      await loadRequests();
    } catch (error) {
      setMessage(
        `Review error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setBusyId(null);
    }
  }

  const pendingCount = requests.filter(
    (request) => request.status === "pending"
  ).length;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-violet-950 px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-300">
              Physics Quiz App
            </p>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
              Teacher Approvals
            </h1>
            <p className="mt-2 text-blue-100/70">
              Manage teacher signup requests.
            </p>
          </div>

          <button
            onClick={() => void loadRequests()}
            disabled={loading}
            className="rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 font-medium hover:bg-white/20 disabled:opacity-50"
          >
            {loading ? "Loading..." : "Refresh Requests"}
          </button>
        </header>

        {message && (
          <div
            role="status"
            className="mb-6 break-words rounded-xl border border-white/15 bg-white/10 p-4 text-sm"
          >
            {message}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
            Teacher requests load ho rahi hain...
          </div>
        ) : isAdmin ? (
          <>
            <div className="mb-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/10 p-5">
                <p className="text-sm text-blue-200">
                  Pending Requests
                </p>
                <p className="mt-2 text-3xl font-bold">
                  {pendingCount}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/10 p-5">
                <p className="text-sm text-blue-200">
                  Total Requests
                </p>
                <p className="mt-2 text-3xl font-bold">
                  {requests.length}
                </p>
              </div>
            </div>

            <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
              <div className="border-b border-white/10 px-5 py-4">
                <h2 className="text-lg font-semibold">
                  Teacher Signup Requests
                </h2>
              </div>

              {requests.length === 0 ? (
                <p className="p-8 text-center text-blue-100/70">
                  Abhi koi teacher request nahi mili.
                </p>
              ) : (
                <div className="divide-y divide-white/10">
                  {requests.map((request) => (
                    <article key={request.id} className="p-5">
                      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                        <div className="min-w-0">
                          <h3 className="break-words text-lg font-semibold">
                            {request.full_name}
                          </h3>
                          <p className="break-all text-sm text-blue-100/70">
                            {request.email}
                          </p>
                          <p className="mt-1 text-xs text-blue-200/60">
                            Submitted:{" "}
                            {new Date(
                              request.created_at
                            ).toLocaleString()}
                          </p>
                          <p className="mt-2 text-sm">
                            Status:{" "}
                            <span
                              className={
                                request.status === "pending"
                                  ? "font-semibold text-amber-300"
                                  : request.status === "approved"
                                    ? "font-semibold text-emerald-300"
                                    : "font-semibold text-rose-300"
                              }
                            >
                              {request.status.toUpperCase()}
                            </span>
                          </p>
                        </div>

                        {request.status === "pending" && (
                          <div className="flex flex-wrap gap-3">
                            <button
                              onClick={() =>
                                void reviewRequest(request, "approved")
                              }
                              disabled={busyId !== null}
                              className="rounded-xl bg-emerald-500 px-4 py-2.5 font-semibold text-white hover:bg-emerald-400 disabled:opacity-50"
                            >
                              {busyId === request.id
                                ? "Processing..."
                                : "Approve"}
                            </button>

                            <button
                              onClick={() =>
                                void reviewRequest(request, "rejected")
                              }
                              disabled={busyId !== null}
                              className="rounded-xl bg-rose-500/90 px-4 py-2.5 font-semibold text-white hover:bg-rose-400 disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : (
          <div className="rounded-2xl border border-rose-300/30 bg-rose-500/10 p-6">
            Yeh page sirf Master Admin ke liye hai.
          </div>
        )}
      </div>
    </main>
  );
}
