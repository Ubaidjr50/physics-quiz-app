"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Student = {
  id: string;
  full_name: string | null;
  roll_number: string | null;
};

export default function ManageStudentsPage() {
  const router = useRouter();

  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const loadStudents = useCallback(async () => {
    const supabase = createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      router.replace("/login");
      return;
    }

    const { data: teacher, error: teacherError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (teacherError || teacher?.role !== "teacher") {
      setMessage("Teacher access required.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, roll_number")
      .eq("role", "student")
      .order("full_name", { ascending: true });

    if (error) {
      console.error("Students loading error:", error);
      setMessage(
        "Students load nahi ho sake. Supabase permissions aur database columns check karein."
      );
      setLoading(false);
      return;
    }

    setStudents(data ?? []);
    setMessage("");
    setLoading(false);
  }, [router]);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function refresh() {
      if (!active) return;
      await loadStudents();
    }

    void refresh();

    const channel = supabase
      .channel("teacher-students-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
        },
        () => {
          void refresh();
        }
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [loadStudents]);

  const filteredStudents = students.filter((student) => {
    const query = search.toLowerCase();

    return (
      (student.full_name ?? "").toLowerCase().includes(query) ||
      (student.roll_number ?? "").toLowerCase().includes(query)
    );
  });

  return (
    <main className="min-h-screen bg-slate-50 p-5 sm:p-10">
      <div className="mx-auto max-w-5xl">
        <button
          type="button"
          onClick={() => router.push("/teacher")}
          className="mb-6 rounded-lg border bg-white px-4 py-2 font-semibold"
        >
          ← Back to Dashboard
        </button>

        <header className="mb-8">
          <p className="text-sm font-bold text-blue-600">
            TEACHER WORKSPACE
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Manage Students
          </h1>

          <p className="mt-2 text-slate-600">
            Registered students from your database.
          </p>
        </header>

        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-slate-900">
              Registered Students ({filteredStudents.length})
            </h2>

            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or roll number..."
              className="w-full rounded-lg border px-4 py-3 sm:w-72"
            />
          </div>

          {loading ? (
            <p className="py-8 text-center text-slate-500">
              Loading registered students...
            </p>
          ) : message ? (
            <div className="rounded-lg bg-red-50 p-4 text-red-700">
              {message}
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="rounded-lg bg-slate-50 p-8 text-center">
              <p className="text-3xl">👨‍🎓</p>
              <p className="mt-3 font-semibold text-slate-700">
                No registered students found
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Students with the role student will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[450px] text-left">
                <thead>
                  <tr className="border-b text-sm text-slate-500">
                    <th className="px-3 py-3">Student Name</th>
                    <th className="px-3 py-3">Roll Number</th>
                    <th className="px-3 py-3">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="border-b last:border-0">
                      <td className="px-3 py-4 font-semibold text-slate-800">
                        {student.full_name || "Unnamed Student"}
                      </td>

                      <td className="px-3 py-4 text-slate-600">
                        {student.roll_number || "Not assigned"}
                      </td>

                      <td className="px-3 py-4">
                        <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
                          Registered
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}