import { NextRequest, NextResponse } from 'next/server';
import { verifySession, COOKIE } from '@/lib/session';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = request.cookies.get(COOKIE)?.value;

  if (!token) {
    return NextResponse.json(
      { success: false, error: 'No autenticado' },
      { status: 401 }
    );
  }

  const session = await verifySession(token);

  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Sesión inválida o expirada' },
      { status: 401 }
    );
  }

  return NextResponse.json({
    success: true,
    user: {
      id: session.id,
      full_name: session.full_name,
      role: session.role,
    },
  });
}
