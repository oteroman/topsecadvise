'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------
interface StudentDetail {
  id: string;
  full_name: string;
  pin: string;
  is_active: boolean;
  created_at: string;
}

interface Stats {
  session_count: number;
  avg_score: number | null;
  best_score: number | null;
}

interface SessionRow {
  id: string;
  mode: string;
  correct_count: number;
  total_questions: number;
  completed: boolean;
  started_at: string;
  completed_at: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function modeLabel(mode: string): string {
  switch (mode) {
    case 'quick':
      return 'Rápida (15 preg)';
    case 'medium':
      return 'Simulacro (40 preg)';
    case 'full':
      return 'Completo';
    default:
      return mode;
  }
}

function duration(startedAt: string, completedAt: string | null): string {
  if (!completedAt) return '—';
  const diff = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  const mins = Math.floor(diff / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  return `${mins}m ${secs}s`;
}

// ---------------------------------------------------------------------------
// Badge de score
// ---------------------------------------------------------------------------
function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-500">
        —
      </span>
    );
  }
  const color =
    score >= 75
      ? 'bg-green-100 text-green-700'
      : score >= 50
      ? 'bg-yellow-100 text-yellow-700'
      : 'bg-red-100 text-red-700';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {score.toFixed(1)}%
    </span>
  );
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
export default function StudentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pinCopied, setPinCopied] = useState(false);

  // ---------------------------------------------------------------------------
  // Fetch
  // ---------------------------------------------------------------------------
  const fetchDetail = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/students/${id}`);
      const json = await res.json() as {
        success: boolean;
        data?: {
          student: StudentDetail;
          stats: Stats;
          sessions: SessionRow[];
        };
        error?: string;
      };

      if (!json.success || !json.data) {
        setError(json.error ?? 'Error al cargar alumno');
        return;
      }

      setStudent(json.data.student);
      setStats(json.data.stats);
      setSessions(json.data.sessions);
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchDetail();
  }, [fetchDetail]);

  // ---------------------------------------------------------------------------
  // Copy PIN
  // ---------------------------------------------------------------------------
  async function copyPin() {
    if (!student) return;
    await navigator.clipboard.writeText(student.pin);
    setPinCopied(true);
    setTimeout(() => setPinCopied(false), 2000);
  }

  // ---------------------------------------------------------------------------
  // Render — loading
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8FAFC' }}>
        <p className="text-sm" style={{ color: '#64748B' }}>Cargando...</p>
      </div>
    );
  }

  if (error || !student || !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8FAFC' }}>
        <div className="text-center space-y-3">
          <p className="text-sm" style={{ color: '#DC2626' }}>{error || 'Alumno no encontrado'}</p>
          <button
            onClick={() => router.push('/admin')}
            className="text-sm underline"
            style={{ color: '#2563EB' }}
          >
            Volver al panel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8FAFC' }}>
      {/* Header */}
      <header
        className="border-b px-6 py-4"
        style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}
      >
        <button
          onClick={() => router.push('/admin')}
          className="flex items-center gap-2 text-sm transition-colors hover:opacity-70"
          style={{ color: '#64748B' }}
        >
          <span>←</span>
          <span>Volver al panel</span>
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Perfil del alumno */}
        <div
          className="rounded-xl border p-6"
          style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}
        >
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: '#0F172A' }}>
                {student.full_name}
              </h1>
              <p className="text-sm mt-1" style={{ color: '#64748B' }}>
                Alumno activo desde:{' '}
                {new Date(student.created_at).toLocaleDateString('es-PE', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>

            {/* PIN */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium" style={{ color: '#64748B' }}>
                Código:
              </span>
              <code
                className="px-3 py-1 rounded-lg text-base font-mono font-bold"
                style={{ backgroundColor: '#F1F5F9', color: '#0F172A' }}
              >
                {student.pin}
              </code>
              <button
                onClick={() => void copyPin()}
                className="px-3 py-1 rounded-lg border text-xs font-medium transition-colors hover:bg-slate-50"
                style={{
                  color: pinCopied ? '#16A34A' : '#2563EB',
                  borderColor: '#E2E8F0',
                }}
              >
                {pinCopied ? '✓ Copiado' : '📋 Copiar'}
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Sesiones totales" value={stats.session_count} />
          <StatCard
            label="Promedio general"
            value={stats.avg_score !== null ? `${stats.avg_score.toFixed(1)}%` : '—'}
          />
          <StatCard
            label="Mejor resultado"
            value={stats.best_score !== null ? `${stats.best_score.toFixed(1)}%` : '—'}
          />
        </div>

        {/* Historial de sesiones */}
        <div
          className="rounded-xl border overflow-hidden"
          style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}
        >
          <div
            className="px-5 py-3 border-b"
            style={{ borderColor: '#E2E8F0' }}
          >
            <h2 className="text-sm font-semibold" style={{ color: '#0F172A' }}>
              Historial de sesiones
            </h2>
          </div>

          {sessions.length === 0 ? (
            <div className="py-16 text-center text-sm" style={{ color: '#64748B' }}>
              Este alumno aún no ha practicado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                    {['Fecha', 'Modo', 'Preguntas', 'Correctas', 'Score', 'Duración'].map((h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wide"
                        style={{ color: '#64748B' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => {
                    const score =
                      s.completed && s.total_questions > 0
                        ? (s.correct_count / s.total_questions) * 100
                        : null;

                    return (
                      <tr
                        key={s.id}
                        className="transition-colors hover:bg-slate-50"
                        style={{ borderBottom: '1px solid #E2E8F0' }}
                      >
                        <td className="px-4 py-3 text-xs" style={{ color: '#64748B' }}>
                          {formatDate(s.started_at)}
                        </td>
                        <td className="px-4 py-3" style={{ color: '#0F172A' }}>
                          {modeLabel(s.mode)}
                        </td>
                        <td className="px-4 py-3 text-center" style={{ color: '#64748B' }}>
                          {s.total_questions}
                        </td>
                        <td className="px-4 py-3 text-center" style={{ color: '#64748B' }}>
                          {s.completed ? s.correct_count : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <ScoreBadge score={score !== null ? Math.round(score * 10) / 10 : null} />
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: '#64748B' }}>
                          {duration(s.started_at, s.completed_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-componentes
// ---------------------------------------------------------------------------
function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      className="rounded-xl border p-5"
      style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}
    >
      <p className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: '#64748B' }}>
        {label}
      </p>
      <p className="text-3xl font-bold" style={{ color: '#0F172A' }}>
        {value}
      </p>
    </div>
  );
}
