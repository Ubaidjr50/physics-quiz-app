"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Chapter = {
  id: string;
  title?: string;
  name?: string;
  chapter_name?: string;
  chapter_number?: number;
};

type QuestionForm = {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  marks: number;
};

function newQuestion(): QuestionForm {
  return {
    question_text: "",
    option_a: "",
    option_b: "",
    option_c: "",
    option_d: "",
    correct_option: "A",
    marks: 1,
  };
}

export default function CreateQuizPage() {
  const router = useRouter();

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [title, setTitle] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [duration, setDuration] = useState(20);
  const [questions, setQuestions] = useState<QuestionForm[]>([
    newQuestion(),
  ]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadPage() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
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
        .select("*");

      if (error) {
        setMessage("Chapters load nahi hue: " + error.message);
        setLoading(false);
        return;
      }

      const chapterList = (data || []) as Chapter[];

      setChapters(chapterList);

      if (chapterList.length > 0) {
        setChapterId(chapterList[0].id);
      }

      setLoading(false);
    }

    loadPage();
  }, [router]);

  function updateQuestion(
    index: number,
    field: keyof QuestionForm,
    value: string | number
  ) {
    setQuestions((previous) =>
      previous.map((question, i) =>
        i === index ? { ...question, [field]: value } : question
      )
    );
  }

  function addQuestion() {
    setQuestions((previous) => [...previous, newQuestion()]);
  }

  function removeQuestion(index: number) {
    setQuestions((previous) =>
      previous.filter((_, i) => i !== index)
    );
  }

  async function saveQuiz(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!title.trim()) {
      setMessage("Jani, quiz ka title likho.");
      return;
    }

    if (!chapterId) {
      setMessage("Physics chapter select karo.");
      return;
    }

    if (!Number.isInteger(duration) || duration < 1) {
      setMessage("Duration kam az kam 1 minute hona chahiye.");
      return;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];

      if (
        !q.question_text.trim() ||
        !q.option_a.trim() ||
        !q.option_b.trim() ||
        !q.option_c.trim() ||
        !q.option_d.trim()
      ) {
        setMessage(
          `Question ${i + 1}: question aur chaaron options fill karo.`
        );
        return;
      }

      if (!["A", "B", "C", "D"].includes(q.correct_option)) {
        setMessage(`Question ${i + 1}: correct answer select karo.`);
        return;
      }

      if (!Number.isInteger(q.marks) || q.marks < 1) {
        setMessage(`Question ${i + 1}: marks kam az kam 1 hone chahiye.`);
        return;
      }
    }

    setSaving(true);

    const supabase = createClient();

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Session khatam ho gayi. Dobara login karo.");
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError || profile?.role !== "teacher") {
        throw new Error("Sirf teacher quiz create kar sakta hai.");
      }

      // Quiz draft ke taur par save hoga.
      const { data: quiz, error: quizError } = await supabase
        .from("quizzes")
        .insert({
          title: title.trim(),
          chapter_id: chapterId,
          created_by: user.id,
          duration_minutes: duration,
          status: "draft",
        })
        .select("id")
        .single();

      if (quizError) {
        throw new Error("Quiz save nahi hua: " + quizError.message);
      }

      // Questions save karo.
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];

        const { data: savedQuestion, error: questionError } =
          await supabase
            .from("questions")
            .insert({
              quiz_id: quiz.id,
              question_text: q.question_text.trim(),
              option_a: q.option_a.trim(),
              option_b: q.option_b.trim(),
              option_c: q.option_c.trim(),
              option_d: q.option_d.trim(),
              marks: q.marks,
              question_order: i + 1,
            })
            .select("id")
            .single();

        if (questionError || !savedQuestion) {
          throw new Error(
            `Question ${i + 1} save nahi hua: ${
              questionError?.message || "Unknown error"
            }. Quiz draft mein reh gaya hai.`
          );
        }

        // Correct answer secure database function ko bhejo.
        const { error: answerError } = await supabase.rpc(
          "save_teacher_answer_key",
          {
            p_question_id: savedQuestion.id,
            p_correct_option: q.correct_option,
            p_teacher_notes: null,
          }
        );

        if (answerError) {
          throw new Error(
            `Question ${i + 1} save hua, lekin answer key save nahi hui: ` +
              answerError.message +
              ". Quiz draft mein reh gaya hai."
          );
        }
      }

      setMessage(
        "Mubarak ho jani! Quiz aur tamam questions draft mein save ho gaye. Abhi students ke liye publish nahi hua."
      );

      setTimeout(() => {
        router.push("/teacher");
        router.refresh();
      }, 2000);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Koi unexpected error aa gaya."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <p className="text-slate-600">Loading teacher account...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <button
          type="button"
          onClick={() => router.push("/teacher")}
          className="mb-6 rounded-lg border bg-white px-4 py-2 font-semibold"
        >
          ← Back to Dashboard
        </button>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <p className="text-sm font-bold tracking-wide text-blue-600">
            CLASS 9 · SINDH BOARD
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Create Physics Quiz
          </h1>

          <p className="mt-2 text-slate-600">
            Quiz banao aur MCQs add karo. Quiz pehle draft mein save hoga.
          </p>

          <form onSubmit={saveQuiz} className="mt-8 space-y-8">
            <section className="space-y-4">
              <h2 className="text-xl font-bold">Quiz Details</h2>

              <div>
                <label className="mb-2 block font-semibold">
                  Quiz Title
                </label>

                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Example: Chapter 1 Physics Test"
                  className="w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block font-semibold">
                  Physics Chapter
                </label>

                <select
                  value={chapterId}
                  onChange={(e) => setChapterId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white p-3"
                  required
                >
                  <option value="">Select a chapter</option>

                  {chapters.map((chapter) => {
                    const label =
                      chapter.title ||
                      chapter.chapter_name ||
                      chapter.name ||
                      `Chapter ${chapter.chapter_number ?? ""}`;

                    return (
                      <option key={chapter.id} value={chapter.id}>
                        {label}
                      </option>
                    );
                  })}
                </select>

                {chapters.length === 0 && (
                  <p className="mt-2 text-sm text-amber-700">
                    Koi chapter available nahi. Chapters table check karo.
                  </p>
                )}
              </div>

              <div>
                <label className="mb-2 block font-semibold">
                  Duration (minutes)
                </label>

                <input
                  type="number"
                  min={1}
                  max={300}
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 p-3"
                  required
                />
              </div>
            </section>

            <section className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-bold">
                  Questions ({questions.length})
                </h2>

                <button
                  type="button"
                  onClick={addQuestion}
                  className="rounded-xl bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-700"
                >
                  + Add Question
                </button>
              </div>

              {questions.map((question, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5"
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h3 className="font-bold">
                      Question {index + 1}
                    </h3>

                    {questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeQuestion(index)}
                        className="text-sm font-semibold text-red-600"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <label className="mb-2 block font-semibold">
                    Question Text
                  </label>

                  <textarea
                    value={question.question_text}
                    onChange={(e) =>
                      updateQuestion(
                        index,
                        "question_text",
                        e.target.value
                      )
                    }
                    placeholder="Write your Physics MCQ here..."
                    rows={3}
                    className="mb-5 w-full rounded-xl border border-slate-300 bg-white p-3"
                    required
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    {(
                      [
                        ["option_a", "Option A"],
                        ["option_b", "Option B"],
                        ["option_c", "Option C"],
                        ["option_d", "Option D"],
                      ] as const
                    ).map(([field, label]) => (
                      <div key={field}>
                        <label className="mb-2 block font-semibold">
                          {label}
                        </label>

                        <input
                          value={question[field]}
                          onChange={(e) =>
                            updateQuestion(index, field, e.target.value)
                          }
                          placeholder={`${label} text`}
                          className="w-full rounded-xl border border-slate-300 bg-white p-3"
                          required
                        />
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block font-semibold">
                        Correct Answer
                      </label>

                      <select
                        value={question.correct_option}
                        onChange={(e) =>
                          updateQuestion(
                            index,
                            "correct_option",
                            e.target.value
                          )
                        }
                        className="w-full rounded-xl border border-slate-300 bg-white p-3"
                      >
                        <option value="A">Option A</option>
                        <option value="B">Option B</option>
                        <option value="C">Option C</option>
                        <option value="D">Option D</option>
                      </select>

                      <p className="mt-1 text-xs text-slate-500">
                        Correct answer students ko expose nahi hoga.
                      </p>
                    </div>

                    <div>
                      <label className="mb-2 block font-semibold">
                        Marks
                      </label>

                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={question.marks}
                        onChange={(e) =>
                          updateQuestion(
                            index,
                            "marks",
                            Number(e.target.value)
                          )
                        }
                        className="w-full rounded-xl border border-slate-300 bg-white p-3"
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}
            </section>

            {message && (
              <div
                aria-live="polite"
                className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900"
              >
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={saving || chapters.length === 0}
              className="w-full rounded-xl bg-emerald-600 px-5 py-3.5 font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving Quiz..." : "Save Quiz as Draft"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}