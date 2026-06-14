import { NextRequest, NextResponse } from 'next/server';
import { verifySession, COOKIE } from '@/lib/session';

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const token = request.cookies.get(COOKIE)?.value;
  const path = request.nextUrl.pathname;

  // Rutas públicas: /login y /api/auth/*
  if (path.startsWith('/login') || path.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // Ruta admin: requiere role='admin'
  if (path.startsWith('/admin')) {
    if (!token) return NextResponse.redirect(new URL('/login', request.url));
    const session = await verifySession(token);
    if (!session || session.role !== 'admin') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  // Resto de rutas: requiere cualquier sesión válida
  if (!token) return NextResponse.redirect(new URL('/login', request.url));
  const session = await verifySession(token);
  if (!session) return NextResponse.redirect(new URL('/login', request.url));

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
