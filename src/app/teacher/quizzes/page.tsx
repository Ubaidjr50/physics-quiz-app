"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Quiz = {
  id: string;
  title: string;
  chapter_id: string;
  duration_minutes: number;
  status: string;
  created_at: string;
};

type Question = {
  id: string;
  quiz_id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  marks: number;
  question_order: number;
};

type QuestionForm = {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  marks: number;
  correct_option: string;
};

const emptyQuestionForm: QuestionForm = {
  question_text: "",
  option_a: "",
  option_b: "",
  option_c: "",
  option_d: "",
  marks: 1,
  correct_option: "A",
};

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

export default function TeacherQuizzesPage() {
  const router = useRouter();

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const [expandedQuizId, setExpandedQuizId] = useState<string | null>(null);
  const [questionCache, setQuestionCache] = useState<Record<string, Question[]>>({});
  const [questionsLoadingId, setQuestionsLoadingId] = useState<string | null>(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
  const [editQuizTitle, setEditQuizTitle] = useState("");
  const [editQuizDuration, setEditQuizDuration] = useState(20);
  const [savingQuiz, setSavingQuiz] = useState(false);

  const [questionFormQuizId, setQuestionFormQuizId] = useState<string | null>(null);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [questionForm, setQuestionForm] = useState<QuestionForm>(emptyQuestionForm);
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [deletingQuestionId, setDeletingQuestionId] = useState<string | null>(null);

  const loadQuizzes = useCallback(async () => {
    setLoading(true);
    setError("");

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

    if (profileError || !profile) {
      setError("Your profile could not be loaded.");
      setLoading(false);
      return;
    }

    if (profile.role !== "teacher") {
      router.replace(profile.role === "student" ? "/student" : "/login");
      return;
    }

    const { data, error: quizError } = await supabase
      .from("quizzes")
      .select("id, title, chapter_id, duration_minutes, status, created_at")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false });

    if (quizError) {
      setError(`Could not load quizzes: ${quizError.message}`);
      setLoading(false);
      return;
    }

    setQuizzes((data || []) as Quiz[]);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    void loadQuizzes();
  }, [loadQuizzes]);

  async function loadQuestions(quiz: Quiz, forceReload = false) {
    if (expandedQuizId === quiz.id && !forceReload) {
      setExpandedQuizId(null);
      return;
    }

    setExpandedQuizId(quiz.id);
    setError("");

    if (questionCache[quiz.id] && !forceReload) return;

    setQuestionsLoadingId(quiz.id);
    const supabase = createClient();

    const { data, error: questionError } = await supabase
      .from("questions")
      .select(
        "id, quiz_id, question_text, option_a, option_b, option_c, option_d, marks, question_order"
      )
      .eq("quiz_id", quiz.id)
      .order("question_order", { ascending: true });

    if (questionError) {
      setError(`Could not load questions for "${quiz.title}": ${questionError.message}`);
      setQuestionsLoadingId(null);
      return;
    }

    setQuestionCache((previous) => ({ ...previous, [quiz.id]: (data || []) as Question[] }));
    setQuestionsLoadingId(null);
  }

  function startEditQuiz(quiz: Quiz) {
    setError("");
    setMessage("");
    setEditingQuizId(quiz.id);
    setEditQuizTitle(quiz.title);
    setEditQuizDuration(quiz.duration_minutes);
    setQuestionFormQuizId(null);
    setEditingQuestionId(null);
  }

  async function saveQuizDetails(quiz: Quiz) {
    if (!editQuizTitle.trim() || !Number.isInteger(Number(editQuizDuration)) || Number(editQuizDuration) <= 0) {
      setError("Quiz title aur duration (minutes) sahi enter karo.");
      return;
    }

    setSavingQuiz(true);
    setError("");
    setMessage("");

    const supabase = createClient();
    const { error: saveError } = await supabase.rpc("teacher_update_quiz_details", {
      p_quiz_id: quiz.id,
      p_title: editQuizTitle.trim(),
      p_duration_minutes: Number(editQuizDuration),
    });

    if (saveError) {
      setError(`Quiz update nahi hua: ${saveError.message}`);
    } else {
      setQuizzes((previous) =>
        previous.map((item) =>
          item.id === quiz.id
            ? { ...item, title: editQuizTitle.trim(), duration_minutes: Number(editQuizDuration) }
            : item
        )
      );
      setMessage("Quiz details successfully update ho gayi hain.");
      setEditingQuizId(null);
    }

    setSavingQuiz(false);
  }

  function startAddQuestion(quiz: Quiz) {
    setError("");
    setMessage("");
    setQuestionFormQuizId(quiz.id);
    setEditingQuestionId(null);
    setQuestionForm(emptyQuestionForm);
    setEditingQuizId(null);
    if (expandedQuizId !== quiz.id) setExpandedQuizId(quiz.id);
  }

  async function startEditQuestion(quiz: Quiz, question: Question) {
    setError("");
    setMessage("");
    setQuestionFormQuizId(quiz.id);
    setEditingQuestionId(question.id);
    setEditingQuizId(null);
    setQuestionForm({
      question_text: question.question_text,
      option_a: question.option_a,
      option_b: question.option_b,
      option_c: question.option_c,
      option_d: question.option_d,
      marks: Number(question.marks),
      correct_option: "A",
    });

    const supabase = createClient();
    const { data, error: answerError } = await supabase.rpc(
      "teacher_get_question_answer_key",
      { p_question_id: question.id }
    );

    if (answerError) {
      setError(`Correct answer load nahi hua: ${answerError.message}`);
      setQuestionFormQuizId(null);
      setEditingQuestionId(null);
      return;
    }

    setQuestionForm((previous) => ({
      ...previous,
      correct_option: String(data || "A").toUpperCase(),
    }));
  }

  function cancelQuestionForm() {
    setQuestionFormQuizId(null);
    setEditingQuestionId(null);
    setQuestionForm(emptyQuestionForm);
  }

  async function saveQuestion(quiz: Quiz) {
    const form = questionForm;

    if (
      !form.question_text.trim() ||
      !form.option_a.trim() ||
      !form.option_b.trim() ||
      !form.option_c.trim() ||
      !form.option_d.trim()
    ) {
      setError("Question aur chaaron options fill karna zaroori hai.");
      return;
    }

    if (!Number.isInteger(Number(form.marks)) || Number(form.marks) <= 0) {
      setError("Marks 0 se zyada whole number hone chahiye.");
      return;
    }

    if (!["A", "B", "C", "D"].includes(form.correct_option)) {
      setError("Correct option A, B, C, ya D select karo.");
      return;
    }

    setSavingQuestion(true);
    setError("");
    setMessage("");
    const supabase = createClient();

    if (editingQuestionId) {
      const { error: updateError } = await supabase.rpc("teacher_update_quiz_question", {
        p_question_id: editingQuestionId,
        p_question_text: form.question_text.trim(),
        p_option_a: form.option_a.trim(),
        p_option_b: form.option_b.trim(),
        p_option_c: form.option_c.trim(),
        p_option_d: form.option_d.trim(),
        p_marks: Number(form.marks),
        p_correct_option: form.correct_option,
      });

      if (updateError) {
        setError(`Question update nahi hua: ${updateError.message}`);
        setSavingQuestion(false);
        return;
      }

      setMessage("Question aur correct answer update ho gaye.");
    } else {
      const { error: addError } = await supabase.rpc("teacher_add_quiz_question", {
        p_quiz_id: quiz.id,
        p_question_text: form.question_text.trim(),
        p_option_a: form.option_a.trim(),
        p_option_b: form.option_b.trim(),
        p_option_c: form.option_c.trim(),
        p_option_d: form.option_d.trim(),
        p_marks: Number(form.marks),
        p_correct_option: form.correct_option,
      });

      if (addError) {
        setError(`Question add nahi hua: ${addError.message}`);
        setSavingQuestion(false);
        return;
      }

      setMessage("Naya question aur uska correct answer save ho gaya.");
    }

    setQuestionFormQuizId(null);
    setEditingQuestionId(null);
    setQuestionForm(emptyQuestionForm);
    await loadQuestions(quiz, true);
    setSavingQuestion(false);
  }

  async function deleteQuestion(quiz: Quiz, question: Question) {
    const confirmed = window.confirm(
      `Q${question.question_order}: "${question.question_text}" delete karna hai? Yeh action undo nahi hoga.`
    );
    if (!confirmed) return;

    setDeletingQuestionId(question.id);
    setError("");
    setMessage("");

    const supabase = createClient();
    const { error: deleteError } = await supabase.rpc("teacher_delete_quiz_question", {
      p_question_id: question.id,
    });

    if (deleteError) {
      setError(`Question delete nahi hua: ${deleteError.message}`);
    } else {
      setQuestionCache((previous) => ({
        ...previous,
        [quiz.id]: (previous[quiz.id] || []).filter((item) => item.id !== question.id),
      }));
      if (editingQuestionId === question.id) cancelQuestionForm();
      setMessage("Question successfully delete ho gaya.");
    }

    setDeletingQuestionId(null);
  }

  async function publishQuiz(quiz: Quiz) {
    if (quiz.status !== "draft") return;

    const confirmed = window.confirm(
      `Publish "${quiz.title}"?\n\nStudents may be able to see and attempt this quiz once it is published.`
    );
    if (!confirmed) return;

    setPublishingId(quiz.id);
    setError("");
    setMessage("");

    const supabase = createClient();
    const { data: questions, error: questionsError } = await supabase
      .from("questions")
      .select("id")
      .eq("quiz_id", quiz.id);

    if (questionsError) {
      setError(`Could not check quiz questions: ${questionsError.message}`);
      setPublishingId(null);
      return;
    }

    if (!questions || questions.length === 0) {
      setError("You cannot publish a quiz without questions.");
      setPublishingId(null);
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const { data: updatedQuiz, error: publishError } = await supabase
      .from("quizzes")
      .update({ status: "published" })
      .eq("id", quiz.id)
      .eq("created_by", userData.user?.id)
      .eq("status", "draft")
      .select("id")
      .maybeSingle();

    if (publishError) {
      setError(`Could not publish quiz: ${publishError.message}`);
      setPublishingId(null);
      return;
    }

    if (!updatedQuiz) {
      setError("The quiz was not published. It may already be published, or you may not have permission.");
      setPublishingId(null);
      return;
    }

    setQuizzes((previous) =>
      previous.map((item) => (item.id === quiz.id ? { ...item, status: "published" } : item))
    );
    setMessage(`"${quiz.title}" has been published successfully.`);
    setPublishingId(null);
  }

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  function renderQuestionForm(quiz: Quiz) {
    if (questionFormQuizId !== quiz.id) return null;

    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void saveQuestion(quiz);
        }}
        className="mb-5 rounded-xl border border-blue-200 bg-white p-4 sm:p-5"
      >
        <h4 className="text-lg font-bold text-slate-900">
          {editingQuestionId ? "Edit Question" : "Add New Question"}
        </h4>
        <label className="mt-4 block text-sm font-semibold text-slate-700">
          Question
          <textarea
            required
            rows={3}
            value={questionForm.question_text}
            onChange={(e) => setQuestionForm((p) => ({ ...p, question_text: e.target.value }))}
            className={inputClass}
            placeholder="MCQ question likho"
          />
        </label>

        {([
          ["option_a", "Option A"],
          ["option_b", "Option B"],
          ["option_c", "Option C"],
          ["option_d", "Option D"],
        ] as const).map(([key, label]) => (
          <label key={key} className="mt-3 block text-sm font-semibold text-slate-700">
            {label}
            <input
              required
              value={questionForm[key]}
              onChange={(e) => setQuestionForm((p) => ({ ...p, [key]: e.target.value }))}
              className={inputClass}
              placeholder={`${label} enter karo`}
            />
          </label>
        ))}

        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-slate-700">
            Marks
            <input
              required
              type="number"
              min={1}
              step={1}
              value={questionForm.marks}
              onChange={(e) => setQuestionForm((p) => ({ ...p, marks: Number(e.target.value) }))}
              className={inputClass}
            />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Correct Answer
            <select
              value={questionForm.correct_option}
              onChange={(e) => setQuestionForm((p) => ({ ...p, correct_option: e.target.value }))}
              className={inputClass}
            >
              <option value="A">Option A</option>
              <option value="B">Option B</option>
              <option value="C">Option C</option>
              <option value="D">Option D</option>
            </select>
          </label>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={savingQuestion}
            className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
          >
            {savingQuestion ? "Saving..." : editingQuestionId ? "Save Question Changes" : "Add Question"}
          </button>
          <button
            type="button"
            onClick={cancelQuestionForm}
            disabled={savingQuestion}
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-800">
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-700">Physics Quiz System</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">Manage My Quizzes</h1>
            <p className="mt-1 text-sm text-slate-500">View, edit, and manage your quizzes and questions.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/teacher" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-100">← Dashboard</Link>
            <Link href="/teacher/create" className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">+ Create Quiz</Link>
            <button onClick={logout} className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">Sign Out</button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {message && <div role="status" className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-800">{message}</div>}
        {error && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}

        {loading ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm"><p className="font-medium text-slate-600">Loading your quizzes...</p></div>
        ) : quizzes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center shadow-sm">
            <div className="text-4xl">📝</div>
            <h2 className="mt-4 text-xl font-bold text-slate-900">No quizzes created yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">Create your first Physics quiz. After adding questions, you can preview and publish it.</p>
            <Link href="/teacher/create" className="mt-6 inline-flex rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800">Create Your First Quiz</Link>
          </div>
        ) : (
          <>
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-medium text-slate-500">Total Quizzes</p><p className="mt-2 text-3xl font-bold text-slate-900">{quizzes.length}</p></div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-medium text-slate-500">Published</p><p className="mt-2 text-3xl font-bold text-green-700">{quizzes.filter((q) => q.status === "published").length}</p></div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-medium text-slate-500">Drafts</p><p className="mt-2 text-3xl font-bold text-amber-600">{quizzes.filter((q) => q.status === "draft").length}</p></div>
            </div>

            <div className="space-y-5">
              {quizzes.map((quiz) => {
                const isExpanded = expandedQuizId === quiz.id;
                const questions = questionCache[quiz.id] || [];
                const totalMarks = questions.reduce((total, q) => total + Number(q.marks || 0), 0);
                const canEdit = quiz.status === "draft";

                return (
                  <article key={quiz.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="p-5 sm:p-6">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full px-3 py-1 text-xs font-bold ${quiz.status === "published" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>{quiz.status === "published" ? "PUBLISHED" : quiz.status.toUpperCase()}</span>
                            <span className="text-xs text-slate-400">Created {new Date(quiz.created_at).toLocaleDateString()}</span>
                          </div>
                          <h2 className="mt-3 break-words text-xl font-bold text-slate-900">{quiz.title}</h2>
                          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
                            <span>📚 Chapter: {quiz.chapter_id}</span>
                            <span>⏱️ Duration: {quiz.duration_minutes} minutes</span>
                            {questionCache[quiz.id] && <><span>📝 Questions: {questions.length}</span><span>🎯 Total marks: {totalMarks}</span></>}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 lg:max-w-sm lg:justify-end">
                          <button onClick={() => void loadQuestions(quiz)} disabled={questionsLoadingId === quiz.id} className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-800 hover:bg-blue-100 disabled:opacity-60">{questionsLoadingId === quiz.id ? "Loading..." : isExpanded ? "Hide Questions ▲" : "View Questions ▼"}</button>
                          {canEdit && <button onClick={() => startEditQuiz(quiz)} className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800 hover:bg-amber-100">✏️ Edit Quiz</button>}
                          {canEdit && <button onClick={() => startAddQuestion(quiz)} className="rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm font-semibold text-green-800 hover:bg-green-100">+ Add Question</button>}
                          {canEdit && <button onClick={() => void publishQuiz(quiz)} disabled={publishingId === quiz.id} className="rounded-lg bg-green-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60">{publishingId === quiz.id ? "Publishing..." : "🚀 Publish Quiz"}</button>}
                        </div>
                      </div>

                      {editingQuizId === quiz.id && (
                        <form onSubmit={(e) => { e.preventDefault(); void saveQuizDetails(quiz); }} className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                          <h3 className="font-bold text-slate-900">Edit Quiz Details</h3>
                          <label className="mt-3 block text-sm font-semibold text-slate-700">Quiz title<input required value={editQuizTitle} onChange={(e) => setEditQuizTitle(e.target.value)} className={inputClass} /></label>
                          <label className="mt-3 block text-sm font-semibold text-slate-700">Duration (minutes)<input required type="number" min={1} step={1} value={editQuizDuration} onChange={(e) => setEditQuizDuration(Number(e.target.value))} className={inputClass} /></label>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <button type="submit" disabled={savingQuiz} className="rounded-lg bg-amber-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-60">{savingQuiz ? "Saving..." : "Save Quiz Changes"}</button>
                            <button type="button" onClick={() => setEditingQuizId(null)} className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold">Cancel</button>
                          </div>
                        </form>
                      )}
                    </div>

                    {isExpanded && (
                      <div className="border-t border-slate-200 bg-slate-50 p-4 sm:p-6">
                        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <h3 className="text-lg font-bold text-slate-900">Quiz Questions</h3>
                          {questionCache[quiz.id] && <div className="flex flex-wrap gap-3 text-sm font-semibold text-slate-600"><span>{questions.length} {questions.length === 1 ? "question" : "questions"}</span><span>Total: {totalMarks} marks</span></div>}
                        </div>

                        {canEdit && <button type="button" onClick={() => startAddQuestion(quiz)} className="mb-5 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800">+ Add Question</button>}
                        {renderQuestionForm(quiz)}

                        {questionsLoadingId === quiz.id ? (
                          <div className="rounded-xl bg-white p-6 text-center text-sm text-slate-500">Loading questions...</div>
                        ) : questionCache[quiz.id] && questions.length === 0 ? (
                          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">This quiz does not have any questions yet.</div>
                        ) : questionCache[quiz.id] ? (
                          <div className="space-y-4">
                            {questions.map((question, index) => (
                              <div key={question.id} className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                  <h4 className="font-bold leading-7 text-slate-900"><span className="mr-2 text-blue-700">Q{index + 1}.</span>{question.question_text}</h4>
                                  <span className="w-fit shrink-0 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">{question.marks} {Number(question.marks) === 1 ? "mark" : "marks"}</span>
                                </div>
                                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                  {[{ label: "A", value: question.option_a }, { label: "B", value: question.option_b }, { label: "C", value: question.option_c }, { label: "D", value: question.option_d }].map((option) => (
                                    <div key={option.label} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-slate-700 shadow-sm">{option.label}</span>
                                      <span className="break-words pt-1 text-sm leading-6 text-slate-700">{option.value || "No option text"}</span>
                                    </div>
                                  ))}
                                </div>
                                {canEdit && <div className="mt-4 flex flex-wrap gap-2">
                                  <button type="button" onClick={() => void startEditQuestion(quiz, question)} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-100">✏️ Edit Question</button>
                                  <button type="button" onClick={() => void deleteQuestion(quiz, question)} disabled={deletingQuestionId === question.id} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60">{deletingQuestionId === question.id ? "Deleting..." : "🗑️ Delete Question"}</button>
                                </div>}
                              </div>
                            ))}
                            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-bold text-blue-900">Total: {questions.length} questions · {totalMarks} marks</div>
                          </div>
                        ) : (
                          <div className="rounded-xl bg-white p-5 text-sm text-slate-500">Open this panel to load the questions.</div>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
