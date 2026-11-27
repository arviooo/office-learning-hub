export interface SimulationOption {
  id: string;
  text: string;
  score: number;
  rating: "Sangat Tepat" | "Cukup" | "Kurang Tepat" | string;
  feedback: string;
}

export interface SimulationStep {
  id: string;
  situation: string;
  customerDialog: string;
  prompt: string;
  options: SimulationOption[];
}

export function parseSimulationSteps(stepsJson: string): SimulationStep[] {
  try {
    const parsed = JSON.parse(stepsJson);
    return Array.isArray(parsed) ? (parsed as SimulationStep[]) : [];
  } catch {
    return [];
  }
}

export function computeMaxScore(steps: SimulationStep[]): number {
  return steps.reduce((sum, step) => {
    const best = step.options.reduce((max, opt) => Math.max(max, opt.score), 0);
    return sum + best;
  }, 0);
}

export function getCompetencyPredicate(percent: number) {
  if (percent >= 90) {
    return {
      label: "Sangat Profesional (Pelayanan Tamu Unggul)",
      tone: "emerald" as const,
      summary:
        "Responmu mencerminkan prinsip 3S, etiket resepsionis & telepon kantor, serta ketepatan prosedur pelayanan tamu yang luar biasa.",
    };
  }
  if (percent >= 75) {
    return {
      label: "Kompeten & Siap Praktik",
      tone: "blue" as const,
      summary:
        "Sebagian besar tindakanmu sudah sesuai standar pelayanan tamu. Perhatikan detail kecil pada umpan balik agar semakin mantap.",
    };
  }
  return {
    label: "Perlu Latihan Lagi",
    tone: "amber" as const,
    summary:
      "Beberapa respons masih kurang ramah atau belum sesuai SOP kantor. Pelajari umpan balik tiap langkah lalu coba simulasi ulang.",
  };
}
