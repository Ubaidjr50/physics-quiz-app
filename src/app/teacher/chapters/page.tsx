
"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Chapter = {
  id: string;
  chapter_number: number;
  title: string;
  description: string | null;
  created_at: string;
};

export default function ChaptersPage() {
  const router = useRouter();

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [title, setTitle] = useState("");
  const [chapterNumber, setChapterNumber] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const loadChapters = useCallback(async () => {
    const supabase = createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      router.replace("/login");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || profile?.role !== "teacher") {
      router.replace("/login");
      return;
    }

    const { data, error } = await supabase
      .from("chapters")
      .select("id, chapter_number, title, description, created_at")
      .order("chapter_number", { ascending: true });

    if (error) {
      setMessage("Chapters load nahi hue: " + error.message);
    } else {
      setChapters((data || []) as Chapter[]);
      setMessage("");
    }

    setLoading(false);
  }, [router]);

  useEffect(() => {
    void loadChapters();
  }, [loadChapters]);

  function resetForm() {
    setTitle("");
    setChapterNumber("");
    setDescription("");
    setEditingId(null);
  }

  async function saveChapter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const number = Number(chapterNumber);

    if (!Number.isInteger(number) || number < 1) {
      setMessage("Chapter number 1 ya us se zyada hona chahiye.");
      return;
    }

    if (!title.trim()) {
      setMessage("Chapter ka naam enter karo.");
      return;
    }

    setSaving(true);
    setMessage("");

    const supabase = createClient();

    const chapterData = {
      chapter_number: number,
      title: title.trim(),
      description: description.trim() || null,
    };

    const { error } = editingId
      ? await supabase
          .from("chapters")
          .update(chapterData)
          .eq("id", editingId)
      : await supabase.from("chapters").insert(chapterData);

    setSaving(false);

    if (error) {
      setMessage(
        error.code === "23505"
          ? "Yeh chapter number pehle se maujood hai."
          : "Chapter save nahi hua: " + error.message
      );
      return;
    }

    resetForm();
    setMessage(editingId ? "Chapter update ho gaya!" : "Naya chapter add ho gaya!");
    await loadChapters();
  }

  function startEditing(chapter: Chapter) {
    setEditingId(chapter.id);
    setChapterNumber(String(chapter.chapter_number));
    setTitle(chapter.title);
    setDescription(chapter.description || "");
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteChapter(chapter: Chapter) {
    const confirmed = window.confirm(
      `Kya tum Chapter ${chapter.chapter_number}: ${chapter.title} delete karna chahte ho? Is chapter se linked quizzes ki wajah se delete fail ho sakta hai.`
    );

    if (!confirmed) return;

    const supabase = createClient();
    setMessage("");

    const { error } = await supabase
      .from("chapters")
      .delete()
      .eq("id", chapter.id);

    if (error) {
      setMessage(
        "Chapter delete nahi hua. Mumkin hai is se quizzes linked hon. Pehle un quizzes ko manage karo. Details: " +
          error.message
      );
      return;
    }

    if (editingId === chapter.id) resetForm();

    setMessage("Chapter delete ho gaya.");
    await loadChapters();
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <p className="text-slate-600">Physics chapters load ho rahe hain...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-5 sm:p-10">
      <div className="mx-auto max-w-5xl">
        <button
          type="button"
          onClick={() => router.push("/teacher")}
          className="mb-6 rounded-lg border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 hover:bg-slate-100"
        >
          ← Teacher Dashboard
        </button>

        <header className="mb-8">
          <p className="text-sm font-semibold text-orange-600">
            CLASS 9 · PHYSICS
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Physics Chapters
          </h1>
          <p className="mt-2 text-slate-600">
            Chapters add karo aur unke titles aur descriptions manage karo.
          </p>
        </header>

        <section className="mb-8 rounded-2xl border border-orange-100 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-bold text-slate-900">
            {editingId ? "Edit Chapter" : "Add New Chapter"}
          </h2>

          <form onSubmit={saveChapter} className="space-y-4">
            <div>
              <label
                htmlFor="chapterNumber"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Chapter Number
              </label>
              <input
                id="chapterNumber"
                type="number"
                min="1"
                step="1"
                required
                value={chapterNumber}
                onChange={(event) => setChapterNumber(event.target.value)}
                placeholder="e.g. 10"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label
                htmlFor="chapterTitle"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Chapter Title
              </label>
              <input
                id="chapterTitle"
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Enter chapter name"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label
                htmlFor="chapterDescription"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Description (optional)
              </label>
              <textarea
                id="chapterDescription"
                rows={3}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Chapter ke bare mein thori information"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-orange-500"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-orange-600 px-5 py-3 font-semibold text-white hover:bg-orange-700 disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update Chapter"
                    : "Add Chapter"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        {message && (
          <div
            role="status"
            className="mb-6 break-words rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800"
          >
            {message}
          </div>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-slate-900">
              All Chapters
            </h2>
            <span className="rounded-full bg-orange-100 px-3 py-1 text-sm font-semibold text-orange-800">
              {chapters.length} Chapters
            </span>
          </div>

          {chapters.length === 0 ? (
            <p className="rounded-xl bg-slate-50 p-5 text-slate-600">
              Abhi koi chapter nahi mila. Upar se pehla chapter add karo.
            </p>
          ) : (
            <div className="space-y-4">
              {chapters.map((chapter) => (
                <article
                  key={chapter.id}
                  className="rounded-xl border border-slate-200 p-5"
                >
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-orange-600">
                        CHAPTER {chapter.chapter_number}
                      </p>
                      <h3 className="mt-1 text-lg font-bold text-slate-900">
                        {chapter.title}
                      </h3>
                      {chapter.description && (
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                          {chapter.description}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => startEditing(chapter)}
                        className="rounded-lg border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteChapter(chapter)}
                        className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
