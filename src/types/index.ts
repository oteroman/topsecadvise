export interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  option_e: string | null;
  correct_option: 'A' | 'B' | 'C' | 'D' | 'E' | null;
  explanation: string | null;
  category: string | null;
  question_type: 'multiple_choice' | 'true_false';
  source_page: number | null;
  created_at: string;
}

export type SessionMode = 'quick' | 'medium' | 'full';

export interface Session {
  id: string;
  mode: SessionMode;
  total_questions: number;
  correct_count: number;
  incorrect_count: number;
  completed: boolean;
  started_at: string;
  completed_at: string | null;
  device_id: string | null;
}

export interface SessionAnswer {
  id: string;
  session_id: string;
  question_id: string;
  selected_option: 'A' | 'B' | 'C' | 'D' | 'E' | null;
  is_correct: boolean | null;
  answered_at: string;
}
