'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { SessionMode } from '@/types/index';

type AnswerRecord = {
  questionId: string;
  selected: string;
  correct: boolean;
};

type ExamSummary = {
  mode: SessionMode;
  total: number;
  correct: number;
  incorrect: number;
  percentage: number;
  startedAt: string;
  completedAt: string;
  answers: AnswerRecord[];
  categoryErrors: Record<string, number>;
};

const PASSING_THRESHOLD = 70;

export default function ResultsPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<ExamSummary | null>(null);
  const [saved, setSaved] = useState(false);
  const saveAttempted = useRef(false);

  useEffect(() => {
    const raw = sessionStorage.getItem('exam_summary');
    if (!raw) {
      router.push('/');
      return;
    }
    const parsed: ExamSummary = JSON.parse(raw);
    setSummary(parsed);
  }, [router]);

  // Save to API route once — guarded with ref to prevent double insert
  useEffect(() => {
    if (!summary || saveAttempted.current) return;
    saveAttempted.current = true;

    async function saveSession() {
      if (!summary) return;
      try {
        const res = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: summary.mode,
            total_questions: summary.total,
            correct_count: summary.correct,
            incorrect_count: summary.incorrect,
            started_at: summary.startedAt,
            completed_at: summary.completedAt,
            answers: summary.answers,
          }),
        });
        if (res.ok) {
          setSaved(true);
          sessionStorage.removeItem('exam_summary');
        }
      } catch (err) {
        console.error('Error saving session:', err);
      }
    }

    saveSession();
  }, [summary]);

  if (!summary) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8 min-h-screen flex items-center justify-center">
        <p className="text-[#64748B]">Cargando resultados...</p>
      </div>
    );
  }

  const passing = summary.percentage >= PASSING_THRESHOLD;

  // Filter categories with more than 1 error
  const weakCategories = Object.entries(summary.categoryErrors)
    .filter(([, count]) => count > 1)
    .sort(([, a], [, b]) => b - a);

  const hasErrors = summary.incorrect > 0;

  return (
    <div className="max-w-lg mx-auto px-4 py-8 min-h-screen flex flex-col">
      {/* Score */}
      <div className="text-center mb-8">
        <p
          className="text-7xl font-bold leading-none mb-3"
          style={{ color: passing ? '#16A34A' : '#DC2626' }}
        >
          {summary.percentage}%
        </p>
        <p
          className="text-lg font-semibold"
          style={{ color: passing ? '#16A34A' : '#DC2626' }}
        >
          {passing ? 'Estás aprobando' : 'Sigue practicando'}
        </p>
        <p className="text-sm text-[#64748B] mt-1">
          Nota de corte: {PASSING_THRESHOLD}%
        </p>
      </div>

      {/* Stats row */}
      <div className="flex gap-3 mb-8">
        <div className="flex-1 p-4 rounded-2xl bg-green-50 border border-green-100 text-center">
          <p className="text-2xl font-bold text-[#16A34A]">{summary.correct}</p>
          <p className="text-sm text-[#64748B] mt-0.5">correctas</p>
        </div>
        <div className="flex-1 p-4 rounded-2xl bg-red-50 border border-red-100 text-center">
          <p className="text-2xl font-bold text-[#DC2626]">{summary.incorrect}</p>
          <p className="text-sm text-[#64748B] mt-0.5">incorrectas</p>
        </div>
      </div>

      {/* Weak categories */}
      {weakCategories.length > 0 && (
        <div className="mb-8">
          <p className="text-sm font-semibold text-[#0F172A] mb-3">
            Donde más fallaste:
          </p>
          <div className="flex flex-col gap-2">
            {weakCategories.map(([category, count]) => (
              <div
                key={category}
                className="flex items-center justify-between px-4 py-3 rounded-xl border border-[#E2E8F0] bg-white"
              >
                <span className="text-sm text-[#0F172A]">{category}</span>
                <span className="text-sm font-semibold text-[#DC2626]">
                  {count} errores
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Saved indicator */}
      {saved && (
        <p className="text-xs text-[#64748B] text-center mb-4">
          Resultado guardado
        </p>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3 mt-auto">
        <button
          onClick={() => router.push('/')}
          className="w-full py-4 rounded-2xl bg-[#2563EB] text-white font-semibold text-base hover:bg-blue-700 transition-all duration-150"
        >
          {hasErrors ? 'Nuevo simulacro' : 'Nuevo simulacro'}
        </button>
        <button
          onClick={() => router.push('/')}
          className="text-sm text-[#64748B] text-center hover:text-[#0F172A] transition-colors duration-150"
        >
          Volver al inicio
        </button>
      </div>
    </div>
  );
}
