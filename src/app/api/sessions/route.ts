import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { verifySession, COOKIE } from '@/lib/session';

interface AnswerRow {
  questionId: string;
  selected: string;
  correct: boolean;
}

interface SessionBody {
  mode: string;
  total_questions: number;
  correct_count: number;
  incorrect_count: number;
  started_at: string;
  completed_at: string;
  answers: AnswerRow[];
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get(COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  let body: SessionBody;
  try {
    body = (await request.json()) as SessionBody;
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid body' }, { status: 400 });
  }

  const { data: sessionData, error: sessionError } = await supabaseAdmin
    .from('sessions')
    .insert({
      mode: body.mode,
      total_questions: body.total_questions,
      correct_count: body.correct_count,
      incorrect_count: body.incorrect_count,
      completed: true,
      started_at: body.started_at,
      completed_at: body.completed_at,
      profile_id: session?.id ?? null,
    })
    .select('id')
    .single();

  if (sessionError || !sessionData) {
    return NextResponse.json({ success: false, error: 'Failed to save session' }, { status: 500 });
  }

  const sessionId = sessionData.id as string;

  if (body.answers.length > 0) {
    const answerRows = body.answers.map((ans) => ({
      session_id: sessionId,
      question_id: ans.questionId,
      selected_option: ans.selected as 'A' | 'B' | 'C' | 'D' | 'E',
      is_correct: ans.correct,
      answered_at: body.completed_at,
    }));

    await supabaseAdmin.from('session_answers').insert(answerRows);
  }

  return NextResponse.json({ success: true, data: { session_id: sessionId } });
}
