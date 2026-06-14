import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { signSession, COOKIE } from '@/lib/session';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json() as { pin?: unknown };
  const pin = body.pin;

  if (typeof pin !== 'string' || !/^\d{4}$/.test(pin)) {
    return NextResponse.json(
      { success: false, error: 'PIN debe ser exactamente 4 dígitos' },
      { status: 400 }
    );
  }

  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('pin', pin)
    .eq('is_active', true)
    .single();

  if (error || !profile) {
    return NextResponse.json(
      { success: false, error: 'Código incorrecto' },
      { status: 401 }
    );
  }

  // Verificar vencimiento (admins no tienen expires_at)
  if (profile.expires_at && new Date(profile.expires_at as string) < new Date()) {
    return NextResponse.json(
      { success: false, error: 'Tu acceso ha vencido. Contacta a tu instructor.' },
      { status: 401 }
    );
  }

  const token = await signSession({
    id: profile.id as string,
    full_name: profile.full_name as string,
    role: profile.role as 'admin' | 'student',
  });

  const response = NextResponse.json({
    success: true,
    role: profile.role as string,
  });

  response.cookies.set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });

  return response;
}
