'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------
interface StudentRow {
  id: string;
  full_name: string;
  pin: string;
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
  session_count: number;
  avg_score: number | null;
  last_active: string | null;
}

interface CreatedStudent {
  id: string;
  full_name: string;
  pin: string;
}

// ---------------------------------------------------------------------------
// Helpers de fecha
// ---------------------------------------------------------------------------
function relativeDate(iso: string | null): string {
  if (!iso) return '—';
  const now = new Date();
  const date = new Date(iso);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 30) return `Hace ${diffDays} días`;
  return date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ---------------------------------------------------------------------------
// Badge de promedio
// ---------------------------------------------------------------------------
function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-500">
        Sin sesiones
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
export default function AdminPage() {
  const router = useRouter();

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Ampliar acceso
  const [extendingId, setExtendingId] = useState<string | null>(null);

  // Modal agregar
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [createdStudent, setCreatedStudent] = useState<CreatedStudent | null>(null);
  const [copied, setCopied] = useState(false);

  // ---------------------------------------------------------------------------
  // Fetch alumnos
  // ---------------------------------------------------------------------------
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/students');
      const json = await res.json() as { success: boolean; data?: { students: StudentRow[] }; error?: string };
      if (json.success && json.data) {
        setStudents(json.data.students);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStudents();
  }, [fetchStudents]);

  // ---------------------------------------------------------------------------
  // Logout
  // ---------------------------------------------------------------------------
  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  // ---------------------------------------------------------------------------
  // Crear alumno
  // ---------------------------------------------------------------------------
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: newName }),
      });
      const json = await res.json() as { success: boolean; data?: { student: CreatedStudent }; error?: string };
      if (!json.success || !json.data) {
        setFormError(json.error ?? 'Error al crear alumno');
        return;
      }
      setCreatedStudent(json.data.student);
      setNewName('');
    } finally {
      setSubmitting(false);
    }
  }

  function handleCloseModal() {
    setShowModal(false);
    setCreatedStudent(null);
    setNewName('');
    setFormError('');
    setCopied(false);
    void fetchStudents();
  }

  async function handleExtend(id: string) {
    setExtendingId(id);
    try {
      await fetch(`/api/admin/students/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extra_days: 10 }),
      });
      await fetchStudents();
    } finally {
      setExtendingId(null);
    }
  }

  async function copyPin(pin: string) {
    await navigator.clipboard.writeText(pin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ---------------------------------------------------------------------------
  // Stats
  // ---------------------------------------------------------------------------
  const active = students.filter((s) => s.is_active);
  const withSessions = active.filter((s) => s.avg_score !== null);
  const generalAvg =
    withSessions.length > 0
      ? withSessions.reduce((acc, s) => acc + (s.avg_score ?? 0), 0) / withSessions.length
      : null;
  const readyCount = active.filter((s) => (s.avg_score ?? 0) >= 75).length;

  // Filtrado por nombre
  const filtered = students.filter((s) =>
    s.full_name.toLowerCase().includes(search.toLowerCase())
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8FAFC' }}>
      {/* Header */}
      <header
        className="border-b px-6 py-4 flex items-center justify-between"
        style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}
      >
        <h1 className="text-xl font-semibold" style={{ color: '#0F172A' }}>
          Panel de administración
        </h1>
        <button
          onClick={() => void handleLogout()}
          className="text-sm px-4 py-2 rounded-lg border transition-colors hover:bg-slate-50"
          style={{ color: '#64748B', borderColor: '#E2E8F0' }}
        >
          Cerrar sesión
        </button>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Total alumnos" value={active.length} />
          <StatCard
            label="Promedio general"
            value={generalAvg !== null ? `${generalAvg.toFixed(1)}%` : '—'}
          />
          <StatCard label="Alumnos listos (≥75%)" value={readyCount} />
        </div>

        {/* Barra de acciones */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#2563EB' }}
          >
            <span>+</span>
            <span>Agregar alumno</span>
          </button>
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-2 rounded-lg border text-sm outline-none focus:ring-2"
            style={{
              backgroundColor: '#FFFFFF',
              borderColor: '#E2E8F0',
              color: '#0F172A',
            }}
          />
        </div>

        {/* Tabla */}
        <div
          className="rounded-xl border overflow-hidden"
          style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}
        >
          {loading ? (
            <div className="py-16 text-center text-sm" style={{ color: '#64748B' }}>
              Cargando...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-sm" style={{ color: '#64748B' }}>
              {students.length === 0
                ? 'Aún no hay alumnos. Agrega el primero con el botón de arriba.'
                : 'No hay alumnos que coincidan con la búsqueda.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                    {['Nombre', 'Código', 'Sesiones', 'Promedio', 'Último acceso', 'Estado', 'Vence', 'Acciones'].map((h) => (
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
                  {filtered.map((s) => (
                    <tr
                      key={s.id}
                      className="transition-colors hover:bg-slate-50"
                      style={{ borderBottom: '1px solid #E2E8F0' }}
                    >
                      {/* Nombre */}
                      <td className="px-4 py-3 font-medium" style={{ color: '#0F172A' }}>
                        {s.full_name}
                      </td>

                      {/* Código */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <code
                            className="px-2 py-0.5 rounded text-xs font-mono font-bold"
                            style={{ backgroundColor: '#F1F5F9', color: '#0F172A' }}
                          >
                            {s.pin}
                          </code>
                          <CopyButton text={s.pin} />
                        </div>
                      </td>

                      {/* Sesiones */}
                      <td className="px-4 py-3" style={{ color: '#64748B' }}>
                        {s.session_count}
                      </td>

                      {/* Promedio */}
                      <td className="px-4 py-3">
                        <ScoreBadge score={s.avg_score} />
                      </td>

                      {/* Último acceso */}
                      <td className="px-4 py-3 text-xs" style={{ color: '#64748B' }}>
                        {relativeDate(s.last_active)}
                      </td>

                      {/* Estado */}
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                          style={
                            s.is_active
                              ? { backgroundColor: '#DCFCE7', color: '#16A34A' }
                              : { backgroundColor: '#FEE2E2', color: '#DC2626' }
                          }
                        >
                          {s.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>

                      {/* Vencimiento */}
                      <td className="px-4 py-3">
                        <ExpiryBadge expiresAt={s.expires_at} />
                      </td>

                      {/* Acciones */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => router.push(`/admin/students/${s.id}`)}
                            className="text-xs px-3 py-1.5 rounded-lg border transition-colors hover:bg-slate-50"
                            style={{ color: '#2563EB', borderColor: '#E2E8F0' }}
                          >
                            Ver
                          </button>
                          <button
                            onClick={() => void handleExtend(s.id)}
                            disabled={extendingId === s.id}
                            className="text-xs px-3 py-1.5 rounded-lg border transition-colors hover:bg-blue-50 disabled:opacity-50"
                            style={{ color: '#7C3AED', borderColor: '#E2E8F0' }}
                            title="Ampliar 10 días desde el vencimiento actual"
                          >
                            {extendingId === s.id ? '...' : '+10 días'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Modal agregar alumno */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div
            className="w-full max-w-md rounded-2xl p-6 shadow-xl"
            style={{ backgroundColor: '#FFFFFF' }}
          >
            {createdStudent ? (
              /* Vista post-creación: mostrar PIN */
              <div className="space-y-5">
                <div className="flex items-center gap-2">
                  <span className="text-green-600 text-xl">✓</span>
                  <h2 className="text-lg font-semibold" style={{ color: '#0F172A' }}>
                    Alumno creado
                  </h2>
                </div>

                <div className="space-y-1 text-sm" style={{ color: '#64748B' }}>
                  <p>
                    <span className="font-medium" style={{ color: '#0F172A' }}>Nombre: </span>
                    {createdStudent.full_name}
                  </p>
                </div>

                {/* PIN destacado */}
                <div
                  className="rounded-xl p-5 text-center space-y-3"
                  style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}
                >
                  <p className="text-xs font-medium uppercase tracking-wide" style={{ color: '#64748B' }}>
                    Código de acceso
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    {createdStudent.pin.split('').map((digit, i) => (
                      <span
                        key={i}
                        className="w-12 h-14 flex items-center justify-center rounded-lg text-2xl font-bold font-mono"
                        style={{
                          backgroundColor: '#FFFFFF',
                          border: '2px solid #E2E8F0',
                          color: '#0F172A',
                        }}
                      >
                        {digit}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={() => void copyPin(createdStudent.pin)}
                    className="flex items-center gap-2 mx-auto px-4 py-2 rounded-lg text-sm font-medium border transition-colors hover:bg-slate-50"
                    style={{
                      color: copied ? '#16A34A' : '#2563EB',
                      borderColor: '#E2E8F0',
                    }}
                  >
                    {copied ? '✓ Copiado' : '📋 Copiar'}
                  </button>
                  <p className="text-xs italic" style={{ color: '#64748B' }}>
                    Envía este código por WhatsApp
                  </p>
                </div>

                <button
                  onClick={handleCloseModal}
                  className="w-full py-2.5 rounded-lg text-sm font-medium text-white"
                  style={{ backgroundColor: '#2563EB' }}
                >
                  Listo
                </button>
              </div>
            ) : (
              /* Formulario */
              <div className="space-y-5">
                <h2 className="text-lg font-semibold" style={{ color: '#0F172A' }}>
                  Agregar alumno
                </h2>

                <form onSubmit={(e) => void handleCreate(e)} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium" style={{ color: '#0F172A' }}>
                      Nombre completo
                    </label>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Ej. Carlos Rodríguez"
                      className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderColor: '#E2E8F0',
                        color: '#0F172A',
                      }}
                      autoFocus
                    />
                    {formError && (
                      <p className="text-xs" style={{ color: '#DC2626' }}>
                        {formError}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors hover:bg-slate-50"
                      style={{ color: '#64748B', borderColor: '#E2E8F0' }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || newName.trim().length < 2}
                      className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-50"
                      style={{ backgroundColor: '#2563EB' }}
                    >
                      {submitting ? 'Creando...' : 'Crear alumno'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
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

function ExpiryBadge({ expiresAt }: { expiresAt: string | null }) {
  if (!expiresAt) return <span className="text-xs" style={{ color: '#64748B' }}>Sin límite</span>;

  const now = new Date();
  const exp = new Date(expiresAt);
  const diffMs = exp.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffMs < 0) {
    return (
      <span
        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
        style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}
      >
        Vencido
      </span>
    );
  }
  if (diffDays <= 3) {
    return (
      <span
        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
        style={{ backgroundColor: '#FEF3C7', color: '#D97706' }}
      >
        {diffDays}d
      </span>
    );
  }
  return (
    <span className="text-xs" style={{ color: '#64748B' }}>
      {diffDays}d
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={() => void handleCopy()}
      title="Copiar código"
      className="text-xs px-1.5 py-0.5 rounded transition-colors hover:bg-slate-100"
      style={{ color: copied ? '#16A34A' : '#64748B' }}
    >
      {copied ? '✓' : '📋'}
    </button>
  );
}
