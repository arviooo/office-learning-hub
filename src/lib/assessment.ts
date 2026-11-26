export interface QuizQuestion {
  id: string;
  type: "MCQ" | "TRUE_FALSE" | "CASE" | string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export function parseQuizQuestions(raw: string): QuizQuestion[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QuizQuestion[]) : [];
  } catch {
    return [];
  }
}

export function parseStringArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function formatIndoDate(date: Date | null | undefined): string {
  if (!date) return "Fleksibel";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}
