import { Suspense } from "react";
import StudentQuizContent from "./StudentQuizContent";

export default function StudentQuizPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-50">
          <p>Quiz loading...</p>
        </main>
      }
    >
      <QuizRoute params={params} />
    </Suspense>
  );
}

async function QuizRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <StudentQuizContent id={id} />;
}