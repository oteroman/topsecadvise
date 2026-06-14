import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

type RouteContext = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// GET /api/admin/students/[id]
// Detalle del alumno + historial de sesiones.
// ---------------------------------------------------------------------------
export async function GET(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { id } = await context.params;

  // Perfil del alumno
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, pin, is_active, created_at, expires_at, role')
    .eq('id', id)
    .eq('role', 'student')
    .single();

  if (profileError || !profile) {
    return NextResponse.json(
      { success: false, error: 'Alumno no encontrado' },
      { status: 404 }
    );
  }

  // Historial de sesiones
  const { data: sessions, error: sessionsError } = await supabaseAdmin
    .from('sessions')
    .select('id, correct_count, total_questions, completed, completed_at, started_at, mode')
    .eq('profile_id', id)
    .order('started_at', { ascending: false });

  if (sessionsError) {
    return NextResponse.json(
      { success: false, error: sessionsError.message },
      { status: 500 }
    );
  }

  const sessionList = sessions ?? [];
  const completed = sessionList.filter((s) => s.completed);

  const avgScore =
    completed.length > 0
      ? completed.reduce((acc, s) => {
          const pct =
            (s.total_questions as number) > 0
              ? ((s.correct_count as number) / (s.total_questions as number)) * 100
              : 0;
          return acc + pct;
        }, 0) / completed.length
      : null;

  const bestScore =
    completed.length > 0
      ? Math.max(
          ...completed.map((s) =>
            (s.total_questions as number) > 0
              ? ((s.correct_count as number) / (s.total_questions as number)) * 100
              : 0
          )
        )
      : null;

  return NextResponse.json({
    success: true,
    data: {
      student: {
        id: profile.id as string,
        full_name: profile.full_name as string,
        pin: profile.pin as string,
        is_active: profile.is_active as boolean,
        created_at: profile.created_at as string,
        expires_at: profile.expires_at as string | null,
      },
      stats: {
        session_count: sessionList.length,
        avg_score: avgScore !== null ? Math.round(avgScore * 10) / 10 : null,
        best_score: bestScore !== null ? Math.round(bestScore * 10) / 10 : null,
      },
      sessions: sessionList.map((s) => ({
        id: s.id as string,
        mode: s.mode as string,
        correct_count: s.correct_count as number,
        total_questions: s.total_questions as number,
        completed: s.completed as boolean,
        started_at: s.started_at as string,
        completed_at: s.completed_at as string | null,
      })),
    },
  });
}

// ---------------------------------------------------------------------------
// PATCH /api/admin/students/[id]
// Amplía la fecha de vencimiento. Body: { extra_days: number }
// ---------------------------------------------------------------------------
export async function PATCH(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { id } = await context.params;
  const body = (await request.json()) as { extra_days?: unknown };
  const days = typeof body.extra_days === 'number' && body.extra_days > 0 ? body.extra_days : 10;

  // Si ya venció, extiende desde hoy; si aún vigente, suma desde expires_at actual
  const { data: current } = await supabaseAdmin
    .from('profiles')
    .select('expires_at')
    .eq('id', id)
    .single();

  const base = current?.expires_at && new Date(current.expires_at as string) > new Date()
    ? new Date(current.expires_at as string)
    : new Date();

  const newExpiry = new Date(base.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ expires_at: newExpiry, is_active: true })
    .eq('id', id)
    .eq('role', 'student');

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: { expires_at: newExpiry } });
}

// ---------------------------------------------------------------------------
// DELETE /api/admin/students/[id]
// Desactiva un alumno (soft delete).
// ---------------------------------------------------------------------------
export async function DELETE(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { id } = await context.params;

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ is_active: false })
    .eq('id', id)
    .eq('role', 'student');

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
