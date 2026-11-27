export interface QuizQuestion {
  id: string;
  type: "MCQ" | "TRUE_FALSE" | "CASE" | string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface LkpdQuestion {
  id: string;
  text: string;
}

export interface LkpdCase {
  id: string;
  title: string;
  description: string;
  questions: LkpdQuestion[];
}

export interface FlattenedLkpdQuestion {
  globalIndex: number;
  caseIndex: number;
  caseTitle: string;
  questionNumberInCase: number;
  id: string;
  text: string;
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

/**
 * Mem-parse data LKPD terstruktur per kasus (`{ version: 2, cases: [...] }`)
 * sekaligus otomatis memigrasikan LKPD format lama (`questionsJson: string[]` + `caseSummary`)
 * sehingga data LKPD lama tetap bisa dibuka dan diedit tanpa kehilangan data.
 */
export function parseLkpdCases(
  questionsJson: string | null | undefined,
  legacyCaseSummary?: string | null
): LkpdCase[] {
  if (questionsJson) {
    try {
      const parsed = JSON.parse(questionsJson) as unknown;

      // Format baru terstruktur: { version: 2, cases: [...] }
      if (
        parsed &&
        typeof parsed === "object" &&
        !Array.isArray(parsed) &&
        Array.isArray((parsed as { cases?: unknown }).cases)
      ) {
        const rawCases = (parsed as { cases: unknown[] }).cases;
        return rawCases
          .map((item, cIdx): LkpdCase | null => {
            if (!item || typeof item !== "object") return null;
            const rec = item as {
              id?: unknown;
              title?: unknown;
              description?: unknown;
              questions?: unknown;
            };
            const rawQs = Array.isArray(rec.questions) ? rec.questions : [];
            const questions: LkpdQuestion[] = rawQs
              .map((q, qIdx): LkpdQuestion | null => {
                if (typeof q === "string") {
                  const text = q.trim();
                  return text ? { id: `c${cIdx + 1}-q${qIdx + 1}`, text } : null;
                }
                if (q && typeof q === "object") {
                  const qObj = q as { id?: unknown; text?: unknown };
                  const text = String(qObj.text ?? "").trim();
                  return text
                    ? { id: String(qObj.id || `c${cIdx + 1}-q${qIdx + 1}`), text }
                    : null;
                }
                return null;
              })
              .filter((q): q is LkpdQuestion => q !== null);

            return {
              id: String(rec.id || `case-${cIdx + 1}`),
              title: String(rec.title ?? "").trim() || `Kasus ${cIdx + 1}`,
              description: String(rec.description ?? "").trim(),
              questions,
            };
          })
          .filter((c): c is LkpdCase => c !== null);
      }

      // Format lama: string[]
      if (Array.isArray(parsed)) {
        const legacyQs = parsed.map((item) => String(item).trim()).filter(Boolean);
        if (legacyQs.length > 0 || (legacyCaseSummary && legacyCaseSummary.trim())) {
          return [
            {
              id: "legacy-case-1",
              title: "Kasus 1. Studi Kasus Analisis",
              description: (legacyCaseSummary || "").trim(),
              questions: legacyQs.map((text, idx) => ({
                id: `legacy-q-${idx + 1}`,
                text,
              })),
            },
          ];
        }
      }
    } catch {
      // Abaikan JSON tidak valid, fallback ke legacyCaseSummary jika ada
    }
  }

  if (legacyCaseSummary && legacyCaseSummary.trim()) {
    return [
      {
        id: "legacy-case-1",
        title: "Kasus 1. Studi Kasus Analisis",
        description: legacyCaseSummary.trim(),
        questions: [],
      },
    ];
  }

  return [];
}

export function serializeLkpdCases(cases: LkpdCase[]): string | null {
  const cleaned = cases
    .map((c, cIdx) => ({
      id: c.id || `case-${cIdx + 1}`,
      title: c.title.trim(),
      description: c.description.trim(),
      questions: c.questions
        .map((q, qIdx) => ({
          id: q.id || `c${cIdx + 1}-q${qIdx + 1}`,
          text: q.text.trim(),
        }))
        .filter((q) => q.text.length > 0),
    }))
    .filter((c) => c.title.length > 0 || c.description.length > 0 || c.questions.length > 0)
    .map((c, idx) => ({
      ...c,
      title: c.title || `Kasus ${idx + 1}`,
    }));

  if (cleaned.length === 0) return null;
  return JSON.stringify({ version: 2, cases: cleaned });
}

export function flattenLkpdQuestions(cases: LkpdCase[]): FlattenedLkpdQuestion[] {
  const result: FlattenedLkpdQuestion[] = [];
  let globalIndex = 0;
  cases.forEach((c, caseIndex) => {
    c.questions.forEach((q, qIdx) => {
      result.push({
        globalIndex,
        caseIndex,
        caseTitle: c.title,
        questionNumberInCase: qIdx + 1,
        id: q.id,
        text: q.text,
      });
      globalIndex += 1;
    });
  });
  return result;
}

export function countLkpdQuestions(
  questionsJson: string | null | undefined,
  legacyCaseSummary?: string | null
): number {
  return flattenLkpdQuestions(parseLkpdCases(questionsJson, legacyCaseSummary)).length;
}

export function formatIndoDate(date: Date | null | undefined): string {
  if (!date) return "Fleksibel";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}
