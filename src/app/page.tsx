'use client';

import { useRouter } from 'next/navigation';

type Mode = {
  key: string;
  label: string;
  sublabel: string;
};

const MODES: Mode[] = [
  { key: 'quick', label: 'Práctica rápida', sublabel: '10 min · 15 preguntas' },
  { key: 'medium', label: 'Simulacro', sublabel: '30 min · 40 preguntas' },
  { key: 'full', label: 'Examen completo', sublabel: 'Todos los temas' },
];

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="max-w-lg mx-auto px-4 py-8 min-h-screen flex flex-col justify-center">
      <div className="mb-10 text-center">
        <p className="text-xs font-semibold tracking-widest text-[#64748B] uppercase mb-2">
          TopSec Advise
        </p>
        <h1 className="text-2xl font-bold text-[#0F172A] leading-snug">
          ¿Cuánto tiempo tienes?
        </h1>
      </div>

      <div className="flex flex-col gap-3">
        {MODES.map((mode) => (
          <button
            key={mode.key}
            onClick={() => router.push(`/exam?mode=${mode.key}`)}
            className="w-full p-5 rounded-2xl border-2 border-[#E2E8F0] bg-white text-left hover:border-[#2563EB] hover:bg-blue-50 transition-all duration-150 cursor-pointer"
          >
            <span className="block font-semibold text-lg text-[#0F172A]">
              {mode.label}
            </span>
            <span className="block text-sm text-[#64748B] mt-0.5">
              {mode.sublabel}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
