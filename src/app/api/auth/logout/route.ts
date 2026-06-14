import { NextResponse } from 'next/server';
import { COOKIE } from '@/lib/session';

export async function POST(): Promise<NextResponse> {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(COOKIE);
  return response;
}
