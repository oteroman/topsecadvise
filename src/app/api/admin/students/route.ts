import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

// ---------------------------------------------------------------------------
// GET /api/admin/students
// Lista todos los alumnos con estadísticas agregadas de sesiones.
// ---------------------------------------------------------------------------
export async function GET(): Promise<NextResponse> {
  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, pin, role, is_active, created_at, expires_at')
    .eq('role', 'student')
    .order('created_at', { ascending: false });

  if (profilesError) {
    return NextResponse.json(
      { success: false, error: profilesError.message },
      { status: 500 }
    );
  }

  const students = await Promise.all(
    (profiles ?? []).map(async (p) => {
      const { data: sessions } = await supabaseAdmin
        .from('sessions')
        .select('id, correct_count, total_questions, completed, completed_at, started_at, mode')
        .eq('profile_id', p.id);

      const sessionCount = sessions?.length ?? 0;
      const completed = sessions?.filter((s) => s.completed) ?? [];
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

      const completedAts = (sessions ?? [])
        .map((s) => s.completed_at as string | null)
        .filter((d): d is string => d !== null);

      const lastActive =
        completedAts.length > 0
          ? completedAts.sort((a, b) => b.localeCompare(a))[0]
          : null;

      return {
        id: p.id as string,
        full_name: p.full_name as string,
        pin: p.pin as string,
        role: p.role as string,
        is_active: p.is_active as boolean,
        created_at: p.created_at as string,
        expires_at: p.expires_at as string | null,
        session_count: sessionCount,
        avg_score: avgScore !== null ? Math.round(avgScore * 10) / 10 : null,
        last_active: lastActive,
      };
    })
  );

  return NextResponse.json({ success: true, data: { students } });
}

// ---------------------------------------------------------------------------
// POST /api/admin/students
// Crea un nuevo alumno con PIN único de 4 dígitos.
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Cuerpo de solicitud inválido' },
      { status: 400 }
    );
  }

  const { full_name } = body as { full_name?: unknown };

  if (typeof full_name !== 'string' || full_name.trim().length < 2) {
    return NextResponse.json(
      { success: false, error: 'El nombre debe tener al menos 2 caracteres' },
      { status: 400 }
    );
  }

  // Genera PIN único de 4 dígitos
  let pin: string | null = null;
  const MAX_ATTEMPTS = 10;

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const candidate = String(Math.floor(Math.random() * 9000) + 1000);

    const { count } = await supabaseAdmin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('pin', candidate);

    if ((count ?? 0) === 0) {
      pin = candidate;
      break;
    }
  }

  if (!pin) {
    return NextResponse.json(
      { success: false, error: 'No se pudo generar un código único. Intenta nuevamente.' },
      { status: 500 }
    );
  }

  const { data: student, error: insertError } = await supabaseAdmin
    .from('profiles')
    .insert({
      full_name: full_name.trim(),
      pin,
      role: 'student',
      is_active: true,
      expires_at: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select('id, full_name, pin')
    .single();

  if (insertError || !student) {
    return NextResponse.json(
      { success: false, error: insertError?.message ?? 'Error al crear alumno' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      student: {
        id: student.id as string,
        full_name: student.full_name as string,
        pin: student.pin as string,
      },
    },
  });
}
