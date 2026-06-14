'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { shuffleArray } from '@/lib/shuffle';
import type { Question, SessionMode } from '@/types/index';

type AnswerRecord = {
  questionId: string;
  selected: string;
  correct: boolean;
};

const QUESTION_COUNTS: Record<SessionMode, number> = {
  quick: 15,
  medium: 40,
  full: 999,
};

const OPTION_KEYS = ['A', 'B', 'C', 'D', 'E'] as const;
type OptionKey = typeof OPTION_KEYS[number];

function getOptionText(question: Question, option: OptionKey): string | null {
  const map: Record<OptionKey, string | null> = {
    A: question.option_a || null,
    B: question.option_b || null,
    C: question.option_c || null,
    D: question.option_d || null,
    E: question.option_e || null,
  };
  return map[option];
}

function isValidMode(value: string | null): value is SessionMode {
  return value === 'quick' || value === 'medium' || value === 'full';
}

export default function ExamPage() {
  return (
    <Suspense fallback={
      <div className="max-w-lg mx-auto px-4 py-8 min-h-screen flex items-center justify-center">
        <p className="text-[#64748B] text-center">Cargando...</p>
      </div>
    }>
      <ExamContent />
    </Suspense>
  );
}

function ExamContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const rawMode = searchParams.get('mode');
  const mode: SessionMode = isValidMode(rawMode) ? rawMode : 'quick';

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<OptionKey | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [startedAt] = useState(() => new Date().toISOString());

  useEffect(() => {
    async function loadQuestions() {
      const limit = QUESTION_COUNTS[mode];
      const query = supabase.from('questions').select('*');

      const { data, error } = limit < 999
        ? await query.limit(limit * 3) // fetch extra to shuffle down to count
        : await query;

      if (error || !data) {
        setLoading(false);
        return;
      }

      const shuffled = shuffleArray(data as Question[]);
      const sliced = limit < 999 ? shuffled.slice(0, limit) : shuffled;
      setQuestions(sliced);
      setLoading(false);
    }

    loadQuestions();
  }, [mode]);

  const finishExam = useCallback(
    (finalAnswers: AnswerRecord[]) => {
      const correctCount = finalAnswers.filter((a) => a.correct).length;
      const incorrectCount = finalAnswers.filter((a) => !a.correct).length;
      const percentage = Math.round((correctCount / finalAnswers.length) * 100);

      // Build category error map
      const categoryErrors: Record<string, number> = {};
      finalAnswers.forEach((ans) => {
        if (!ans.correct) {
          const q = questions.find((q) => q.id === ans.questionId);
          const cat = q?.category ?? 'Sin categoría';
          categoryErrors[cat] = (categoryErrors[cat] ?? 0) + 1;
        }
      });

      const summary = {
        mode,
        total: finalAnswers.length,
        correct: correctCount,
        incorrect: incorrectCount,
        percentage,
        startedAt,
        completedAt: new Date().toISOString(),
        answers: finalAnswers,
        categoryErrors,
      };

      sessionStorage.setItem('exam_summary', JSON.stringify(summary));
      router.push('/results');
    },
    [questions, mode, startedAt, router]
  );

  const nextQuestion = useCallback(
    (currentAnswers: AnswerRecord[]) => {
      const nextIndex = currentIndex + 1;
      if (nextIndex >= questions.length) {
        finishExam(currentAnswers);
      } else {
        setCurrentIndex(nextIndex);
        setSelected(null);
        setShowFeedback(false);
      }
    },
    [currentIndex, questions.length, finishExam]
  );

  const handleSelect = useCallback(
    (option: OptionKey) => {
      if (showFeedback) return;

      const question = questions[currentIndex];
      const isCorrect = question.correct_option !== null && option === question.correct_option;

      setSelected(option);
      setShowFeedback(true);

      const newRecord: AnswerRecord = {
        questionId: question.id,
        selected: option,
        correct: isCorrect,
      };
      const updatedAnswers = [...answers, newRecord];
      setAnswers(updatedAnswers);

      if (isCorrect || question.correct_option === null) {
        setTimeout(() => nextQuestion(updatedAnswers), 1200);
      }
      // If incorrect, user must tap "Continuar"
    },
    [showFeedback, questions, currentIndex, answers, nextQuestion]
  );

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8 min-h-screen flex items-center justify-center">
        <p className="text-[#64748B] text-center">Cargando preguntas...</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8 min-h-screen flex flex-col items-center justify-center gap-4 text-center">
        <p className="text-[#0F172A] font-semibold">
          No hay preguntas disponibles todavía.
        </p>
        <p className="text-[#64748B] text-sm">
          El banco de preguntas está siendo cargado.
        </p>
        <button
          onClick={() => router.push('/')}
          className="mt-2 text-sm text-[#2563EB] underline underline-offset-2"
        >
          Volver al inicio
        </button>
      </div>
    );
  }

  const question = questions[currentIndex];
  const total = questions.length;
  const progressPct = Math.round(((currentIndex) / total) * 100);

  return (
    <div className="max-w-lg mx-auto px-4 py-8 min-h-screen flex flex-col">
      {/* Progress bar */}
      <div className="mb-2">
        <div className="w-full h-2 rounded-full bg-[#E2E8F0] overflow-hidden">
          <div
            className="h-2 rounded-full bg-[#2563EB] transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-[#64748B] text-right">
          Pregunta {currentIndex + 1} de {total}
        </p>
      </div>

      {/* Question */}
      <div className="mt-6 mb-8">
        <p className="text-xl font-semibold text-[#0F172A] leading-relaxed">
          {question.question_text}
        </p>
      </div>

      {/* Options */}
      <div className="flex flex-col gap-3 flex-1">
        {question.question_type === 'true_false' ? (
          // Verdadero / Falso — A=Verdadero, B=Falso
          (['A', 'B'] as OptionKey[]).map((option) => {
            const label = option === 'A' ? 'Verdadero' : 'Falso';
            const isSelected = selected === option;
            const hasAnswer = question.correct_option !== null;
            const isCorrectOption = hasAnswer && option === question.correct_option;

            let cls = 'border-2 border-[#E2E8F0] bg-white text-[#0F172A] p-5 rounded-xl w-full text-center font-semibold text-lg transition-all duration-150';
            if (showFeedback) {
              if (hasAnswer && isCorrectOption) cls = 'border-2 border-[#16A34A] bg-green-50 text-[#16A34A] p-5 rounded-xl w-full text-center font-semibold text-lg transition-all duration-150';
              else if (hasAnswer && isSelected && !isCorrectOption) cls = 'border-2 border-[#DC2626] bg-red-50 text-[#DC2626] p-5 rounded-xl w-full text-center font-semibold text-lg transition-all duration-150';
              else if (!hasAnswer && isSelected) cls = 'border-2 border-[#2563EB] bg-blue-50 text-[#2563EB] p-5 rounded-xl w-full text-center font-semibold text-lg transition-all duration-150';
            } else {
              cls += ' hover:border-[#60A5FA] hover:bg-blue-50 cursor-pointer';
            }

            return (
              <button key={option} disabled={showFeedback} onClick={() => handleSelect(option)} className={cls}>
                {label}
              </button>
            );
          })
        ) : (
          // Opción múltiple A-E
          OPTION_KEYS.filter((option) => getOptionText(question, option) !== null).map((option) => {
            const isSelected = selected === option;
            const hasAnswer = question.correct_option !== null;
            const isCorrectOption = hasAnswer && option === question.correct_option;

            let optionClass =
              'border-2 border-[#E2E8F0] bg-white text-[#0F172A] p-4 rounded-xl w-full text-left transition-all duration-150';
            if (showFeedback) {
              if (hasAnswer && isCorrectOption) optionClass = 'border-2 border-[#16A34A] bg-green-50 text-[#16A34A] font-medium p-4 rounded-xl w-full text-left transition-all duration-150';
              else if (hasAnswer && isSelected && !isCorrectOption) optionClass = 'border-2 border-[#DC2626] bg-red-50 text-[#DC2626] font-medium p-4 rounded-xl w-full text-left transition-all duration-150';
              else if (!hasAnswer && isSelected) optionClass = 'border-2 border-[#2563EB] bg-blue-50 text-[#2563EB] font-medium p-4 rounded-xl w-full text-left transition-all duration-150';
            } else {
              optionClass += ' hover:border-[#60A5FA] hover:bg-blue-50 cursor-pointer';
            }

            return (
              <button key={option} disabled={showFeedback} onClick={() => handleSelect(option)} className={optionClass}>
                <span className="font-semibold mr-2">{option}.</span>
                {getOptionText(question, option)}
              </button>
            );
          })
        )}
      </div>

      {/* Continue button — only when incorrect (and answer key exists) */}
      {showFeedback && question.correct_option !== null && selected !== question.correct_option && (
        <div className="mt-6">
          <button
            onClick={() => nextQuestion(answers)}
            className="w-full py-4 rounded-2xl bg-[#2563EB] text-white font-semibold text-base hover:bg-blue-700 transition-all duration-150"
          >
            Continuar →
          </button>
        </div>
      )}
    </div>
  );
}
