"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  ExternalLink,
  FileText,
  HelpCircle,
  Loader2,
  MessageSquareText,
  MonitorPlay,
  Pencil,
  Plus,
  Save,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import type { QuizQuestion } from "@/lib/assessment";
import type { SimulationStep } from "@/lib/simulation";
import { toEmbedVideoUrl } from "@/lib/video";
import { ConfirmDialog } from "./ConfirmDialog";

export interface TeacherStudentRow {
  id: string;
  name: string;
  email: string;
  className: string | null;
  points: number;
  materialsDone: number;
  totalMaterials: number;
  simulationsDone: number;
  totalSimulations: number;
  avgQuiz: number | null;
  submissionsCount: number;
}

export interface TeacherMaterialItem {
  id: string;
  order: number;
  slug: string;
  title: string;
  subtitle: string;
  summary: string;
  content: string;
  videoUrl: string | null;
  pdfUrl: string | null;
  pdfName: string | null;
  durationMinutes: number;
  activityPrompt: string | null;
}

export interface TeacherSimulationItem {
  id: string;
  order: number;
  slug: string;
  title: string;
  subtitle: string;
  scenarioContext: string;
  customerName: string;
  customerRole: string;
  difficulty: string;
  estimatedMinutes: number;
  steps: SimulationStep[];
  attemptsCount: number;
}

export interface TeacherAssignmentItem {
  id: string;
  type: string;
  title: string;
  description: string;
  instructions: string;
  caseSummary: string | null;
  questions: string[];
  pdfUrl: string | null;
  pdfName: string | null;
  dueDateIso: string | null;
  dueDateLabel: string;
  submissionsCount: number;
}

export interface TeacherQuizItem {
  id: string;
  title: string;
  description: string;
  category: string;
  timeLimitMinutes: number;
  passingScore: number;
  questions: QuizQuestion[];
  attemptsCount: number;
}

export interface TeacherSubmissionItem {
  id: string;
  studentName: string;
  studentClass: string | null;
  assignmentTitle: string;
  assignmentType: string;
  answers: string[];
  questions: string[];
  fileUrl: string | null;
  fileName: string | null;
  videoLink: string | null;
  notes: string | null;
  status: string;
  score: number | null;
  teacherFeedback: string | null;
  submittedAtLabel: string;
}

export interface TeacherSimAttemptItem {
  id: string;
  studentName: string;
  studentClass: string | null;
  simulationTitle: string;
  score: number;
  maxScore: number;
  reflection: string | null;
  teacherFeedback: string | null;
  completedAtLabel: string;
}

interface TeacherWorkspaceProps {
  initialTab?: string;
  students: TeacherStudentRow[];
  materials: TeacherMaterialItem[];
  simulations: TeacherSimulationItem[];
  assignments: TeacherAssignmentItem[];
  quizzes: TeacherQuizItem[];
  submissions: TeacherSubmissionItem[];
  simAttempts: TeacherSimAttemptItem[];
}

const TABS = [
  { id: "students", label: "Pantau Siswa", icon: Users },
  { id: "materials", label: "Materi & PDF", icon: BookOpen },
  { id: "simulations", label: "Simulasi Digital", icon: MonitorPlay },
  { id: "assignments", label: "LKPD, Proyek & PDF", icon: ClipboardList },
  { id: "quizzes", label: "Kuis Interaktif", icon: HelpCircle },
  { id: "grading", label: "Penilaian & Umpan Balik", icon: ClipboardCheck },
] as const;

type TabId = (typeof TABS)[number]["id"];

function makeEmptySimStep(index: number): SimulationStep {
  return {
    id: `step-${Date.now()}-${index}`,
    situation: "",
    customerDialog: "",
    prompt: "Bagaimana respons pelayanan terbaik Anda?",
    options: [
      { id: "a", text: "", score: 50, rating: "Sangat Tepat", feedback: "" },
      { id: "b", text: "", score: 15, rating: "Kurang Tepat", feedback: "" },
    ],
  };
}

function makeEmptyQuizQuestion(index: number): QuizQuestion {
  return {
    id: `q-${Date.now()}-${index}`,
    type: "MCQ",
    question: "",
    options: ["", "", "", ""],
    correctIndex: 0,
    explanation: "",
  };
}

export function TeacherWorkspace({
  initialTab,
  students,
  materials,
  simulations,
  assignments,
  quizzes,
  submissions,
  simAttempts,
}: TeacherWorkspaceProps) {
  const router = useRouter();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const matFormRef = useRef<HTMLFormElement | null>(null);
  const asgFormRef = useRef<HTMLFormElement | null>(null);
  const validTab = TABS.find((t) => t.id === initialTab)?.id || "students";

  const [activeTab, setActiveTab] = useState<TabId>(validTab);
  const [banner, setBanner] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    endpoint: string;
    id: string;
    title: string;
    description: string;
    onAfter?: () => void;
  } | null>(null);
  const [uploadingTargetId, setUploadingTargetId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ===== MATERI STATE (CREATE / EDIT) =====
  const [editingMatId, setEditingMatId] = useState<string | null>(null);
  const [matTitle, setMatTitle] = useState("");
  const [matSubtitle, setMatSubtitle] = useState("");
  const [matSummary, setMatSummary] = useState("");
  const [matContent, setMatContent] = useState("");
  const [matVideoUrl, setMatVideoUrl] = useState("");
  const [matDuration, setMatDuration] = useState(20);
  const [matActivity, setMatActivity] = useState("");
  const [matPdfUrl, setMatPdfUrl] = useState("");
  const [matPdfName, setMatPdfName] = useState("");
  const [uploadingMatPdf, setUploadingMatPdf] = useState(false);
  const [matPdfFeedback, setMatPdfFeedback] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [savingMat, setSavingMat] = useState(false);

  // ===== SIMULASI STATE (CREATE / EDIT) =====
  const [editingSimId, setEditingSimId] = useState<string | null>(null);
  const [simTitle, setSimTitle] = useState("");
  const [simSubtitle, setSimSubtitle] = useState("");
  const [simContext, setSimContext] = useState("");
  const [simCustomerName, setSimCustomerName] = useState("");
  const [simCustomerRole, setSimCustomerRole] = useState("");
  const [simDifficulty, setSimDifficulty] = useState<"Dasar" | "Menengah" | "Lanjut">("Dasar");
  const [simMinutes, setSimMinutes] = useState(10);
  const [simSteps, setSimSteps] = useState<SimulationStep[]>([makeEmptySimStep(1)]);
  const [savingSim, setSavingSim] = useState(false);

  // ===== LKPD / PROYEK STATE (CREATE / EDIT) =====
  const [editingAsgId, setEditingAsgId] = useState<string | null>(null);
  const [asgType, setAsgType] = useState<"LKPD" | "PROJECT">("LKPD");
  const [asgTitle, setAsgTitle] = useState("");
  const [asgDesc, setAsgDesc] = useState("");
  const [asgInst, setAsgInst] = useState("");
  const [asgCase, setAsgCase] = useState("");
  const [asgQuestionsText, setAsgQuestionsText] = useState("");
  const [asgDueDate, setAsgDueDate] = useState("");
  const [asgPdfUrl, setAsgPdfUrl] = useState("");
  const [asgPdfName, setAsgPdfName] = useState("");
  const [uploadingAsgPdf, setUploadingAsgPdf] = useState(false);
  const [asgPdfFeedback, setAsgPdfFeedback] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [savingAsg, setSavingAsg] = useState(false);

  // ===== KUIS STATE (CREATE / EDIT) =====
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
  const [quizTitle, setQuizTitle] = useState("");
  const [quizDesc, setQuizDesc] = useState("");
  const [quizCategory, setQuizCategory] = useState<"KONSEP" | "ETIKA" | "STUDI_KASUS" | "EVALUASI">(
    "EVALUASI"
  );
  const [quizTime, setQuizTime] = useState(15);
  const [quizPassing, setQuizPassing] = useState(75);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([makeEmptyQuizQuestion(1)]);
  const [savingQuiz, setSavingQuiz] = useState(false);

  // ===== PENILAIAN STATE =====
  const [gradeDrafts, setGradeDrafts] = useState<
    Record<string, { score: string; feedback: string }>
  >(() =>
    Object.fromEntries(
      submissions.map((s) => [
        s.id,
        {
          score: s.score !== null ? String(s.score) : "",
          feedback: s.teacherFeedback || "",
        },
      ])
    )
  );
  const [savingGradeId, setSavingGradeId] = useState<string | null>(null);
  const [simFeedbackDrafts, setSimFeedbackDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(simAttempts.map((s) => [s.id, s.teacherFeedback || ""]))
  );
  const [savingSimFbId, setSavingSimFbId] = useState<string | null>(null);

  function notify(type: "ok" | "err", text: string) {
    setBanner({ type, text });
  }

  async function uploadPdfFile(file: File, folder: string) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", folder);
    const res = await fetch("/api/uploads", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Gagal mengunggah file PDF.");
    return { fileUrl: data.fileUrl as string, fileName: data.fileName as string };
  }

  // ---- MATERI HANDLERS ----
  function startEditMaterial(m: TeacherMaterialItem) {
    setEditingMatId(m.id);
    setMatTitle(m.title);
    setMatSubtitle(m.subtitle);
    setMatSummary(m.summary);
    setMatContent(m.content);
    setMatVideoUrl(m.videoUrl || "");
    setMatDuration(m.durationMinutes);
    setMatActivity(m.activityPrompt || "");
    setMatPdfUrl(m.pdfUrl || "");
    setMatPdfName(m.pdfName || "");
    setMatPdfFeedback(null);
    notify("ok", `Mode Edit aktif untuk "Materi ${m.order}: ${m.title}".`);
    requestAnimationFrame(() => {
      matFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function resetMaterialForm() {
    setEditingMatId(null);
    setMatTitle("");
    setMatSubtitle("");
    setMatSummary("");
    setMatContent("");
    setMatVideoUrl("");
    setMatDuration(20);
    setMatActivity("");
    setMatPdfUrl("");
    setMatPdfName("");
    setMatPdfFeedback(null);
  }

  async function handleSaveMaterial(e: React.FormEvent) {
    e.preventDefault();
    if (uploadingMatPdf) return;
    setSavingMat(true);
    setBanner(null);
    try {
      const url = editingMatId ? `/api/teacher/materials/${editingMatId}` : "/api/teacher/materials";
      const method = editingMatId ? "PATCH" : "POST";
      const normalizedVideoUrl = matVideoUrl.trim() ? toEmbedVideoUrl(matVideoUrl) : null;
      if (matVideoUrl.trim() && !normalizedVideoUrl) {
        throw new Error(
          "Link video tidak valid. Gunakan link YouTube (youtu.be atau youtube.com) atau Google Drive yang diawali https://."
        );
      }
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: matTitle,
          subtitle: matSubtitle,
          summary: matSummary,
          content: matContent,
          videoUrl: normalizedVideoUrl,
          durationMinutes: matDuration,
          activityPrompt: matActivity || null,
          pdfUrl: matPdfUrl || null,
          pdfName: matPdfName || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan materi.");
      resetMaterialForm();
      notify("ok", data.message);
      router.refresh();
    } catch (err) {
      notify("err", err instanceof Error ? err.message : "Gagal menyimpan materi.");
    } finally {
      setSavingMat(false);
    }
  }

  async function handleAttachMaterialPdf(materialId: string, file?: File) {
    if (!file) return;
    setUploadingTargetId(materialId);
    setBanner(null);
    try {
      const uploaded = await uploadPdfFile(file, "materi");
      const res = await fetch(`/api/teacher/materials/${materialId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfUrl: uploaded.fileUrl, pdfName: uploaded.fileName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menautkan PDF.");
      if (editingMatId === materialId) {
        setMatPdfUrl(uploaded.fileUrl);
        setMatPdfName(uploaded.fileName);
        setMatPdfFeedback({
          type: "ok",
          text: `PDF "${uploaded.fileName}" sudah terpasang dan aktif di halaman siswa.`,
        });
      }
      notify("ok", `PDF "${uploaded.fileName}" berhasil dipasang ke materi!`);
      router.refresh();
    } catch (err) {
      notify("err", err instanceof Error ? err.message : "Gagal mengunggah PDF.");
    } finally {
      setUploadingTargetId(null);
    }
  }

  async function executePendingDelete() {
    if (!pendingDelete) return;
    setDeletingId(pendingDelete.id);
    setBanner(null);
    try {
      const res = await fetch(pendingDelete.endpoint, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus data.");
      pendingDelete.onAfter?.();
      setPendingDelete(null);
      notify("ok", data.message);
      router.refresh();
    } catch (err) {
      notify("err", err instanceof Error ? err.message : "Gagal menghapus data.");
      setPendingDelete(null);
    } finally {
      setDeletingId(null);
    }
  }

  // ---- SIMULASI HANDLERS ----
  function startEditSimulation(s: TeacherSimulationItem) {
    setEditingSimId(s.id);
    setSimTitle(s.title);
    setSimSubtitle(s.subtitle);
    setSimContext(s.scenarioContext);
    setSimCustomerName(s.customerName);
    setSimCustomerRole(s.customerRole);
    setSimDifficulty(
      s.difficulty === "Lanjut" || s.difficulty === "Menengah" ? s.difficulty : "Dasar"
    );
    setSimMinutes(s.estimatedMinutes);
    setSimSteps(s.steps.length > 0 ? structuredClone(s.steps) : [makeEmptySimStep(1)]);
    notify("ok", `Mode Edit aktif untuk "${s.title}".`);
  }

  function resetSimulationForm() {
    setEditingSimId(null);
    setSimTitle("");
    setSimSubtitle("");
    setSimContext("");
    setSimCustomerName("");
    setSimCustomerRole("");
    setSimDifficulty("Dasar");
    setSimMinutes(10);
    setSimSteps([makeEmptySimStep(1)]);
  }

  async function handleSaveSimulation(e: React.FormEvent) {
    e.preventDefault();
    setSavingSim(true);
    setBanner(null);
    try {
      const url = editingSimId
        ? `/api/teacher/simulations/${editingSimId}`
        : "/api/teacher/simulations";
      const method = editingSimId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: simTitle,
          subtitle: simSubtitle,
          scenarioContext: simContext,
          customerName: simCustomerName,
          customerRole: simCustomerRole,
          difficulty: simDifficulty,
          estimatedMinutes: simMinutes,
          steps: simSteps,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan skenario simulasi.");
      resetSimulationForm();
      notify("ok", data.message);
      router.refresh();
    } catch (err) {
      notify("err", err instanceof Error ? err.message : "Gagal menyimpan simulasi.");
    } finally {
      setSavingSim(false);
    }
  }

  // ---- LKPD / PROYEK HANDLERS ----
  function startEditAssignment(a: TeacherAssignmentItem) {
    setEditingAsgId(a.id);
    setAsgType(a.type === "PROJECT" ? "PROJECT" : "LKPD");
    setAsgTitle(a.title);
    setAsgDesc(a.description);
    setAsgInst(a.instructions);
    setAsgCase(a.caseSummary || "");
    setAsgQuestionsText(a.questions.join("\n"));
    setAsgDueDate(a.dueDateIso || "");
    setAsgPdfUrl(a.pdfUrl || "");
    setAsgPdfName(a.pdfName || "");
    setAsgPdfFeedback(null);
    notify("ok", `Mode Edit aktif untuk "${a.title}".`);
    requestAnimationFrame(() => {
      asgFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function resetAssignmentForm() {
    setEditingAsgId(null);
    setAsgType("LKPD");
    setAsgTitle("");
    setAsgDesc("");
    setAsgInst("");
    setAsgCase("");
    setAsgQuestionsText("");
    setAsgDueDate("");
    setAsgPdfUrl("");
    setAsgPdfName("");
    setAsgPdfFeedback(null);
  }

  async function handleSaveAssignment(e: React.FormEvent) {
    e.preventDefault();
    if (uploadingAsgPdf) return;
    setSavingAsg(true);
    setBanner(null);
    try {
      const questions = asgQuestionsText
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      const url = editingAsgId
        ? `/api/teacher/assignments/${editingAsgId}`
        : "/api/teacher/assignments";
      const method = editingAsgId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: asgType,
          title: asgTitle,
          description: asgDesc,
          instructions: asgInst,
          caseSummary: asgCase || null,
          questions,
          pdfUrl: asgPdfUrl || null,
          pdfName: asgPdfName || null,
          dueDate: asgDueDate || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan tugas.");
      resetAssignmentForm();
      notify("ok", data.message);
      router.refresh();
    } catch (err) {
      notify("err", err instanceof Error ? err.message : "Gagal menyimpan tugas.");
    } finally {
      setSavingAsg(false);
    }
  }

  async function handleAttachAssignmentPdf(assignmentId: string, file?: File) {
    if (!file) return;
    setUploadingTargetId(assignmentId);
    setBanner(null);
    try {
      const uploaded = await uploadPdfFile(file, "lkpd");
      const res = await fetch(`/api/teacher/assignments/${assignmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfUrl: uploaded.fileUrl, pdfName: uploaded.fileName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menautkan PDF.");
      if (editingAsgId === assignmentId) {
        setAsgPdfUrl(uploaded.fileUrl);
        setAsgPdfName(uploaded.fileName);
        setAsgPdfFeedback({
          type: "ok",
          text: `PDF "${uploaded.fileName}" sudah terpasang dan aktif di halaman siswa.`,
        });
      }
      notify("ok", `PDF "${uploaded.fileName}" berhasil dilampirkan ke LKPD/Proyek!`);
      router.refresh();
    } catch (err) {
      notify("err", err instanceof Error ? err.message : "Gagal mengunggah PDF.");
    } finally {
      setUploadingTargetId(null);
    }
  }

  // ---- KUIS HANDLERS ----
  function startEditQuiz(q: TeacherQuizItem) {
    setEditingQuizId(q.id);
    setQuizTitle(q.title);
    setQuizDesc(q.description);
    setQuizCategory(
      (["KONSEP", "ETIKA", "STUDI_KASUS", "EVALUASI"].includes(q.category)
        ? q.category
        : "EVALUASI") as "KONSEP" | "ETIKA" | "STUDI_KASUS" | "EVALUASI"
    );
    setQuizTime(q.timeLimitMinutes);
    setQuizPassing(q.passingScore);
    setQuizQuestions(q.questions.length > 0 ? structuredClone(q.questions) : [makeEmptyQuizQuestion(1)]);
    notify("ok", `Mode Edit aktif untuk "${q.title}".`);
  }

  function resetQuizForm() {
    setEditingQuizId(null);
    setQuizTitle("");
    setQuizDesc("");
    setQuizCategory("EVALUASI");
    setQuizTime(15);
    setQuizPassing(75);
    setQuizQuestions([makeEmptyQuizQuestion(1)]);
  }

  async function handleSaveQuiz(e: React.FormEvent) {
    e.preventDefault();
    setSavingQuiz(true);
    setBanner(null);
    try {
      const cleanedQuestions = quizQuestions.map((q, idx) => ({
        ...q,
        id: q.id || `q-${Date.now()}-${idx + 1}`,
        type: q.type === "TRUE_FALSE" || q.type === "CASE" ? q.type : "MCQ",
        options:
          q.type === "TRUE_FALSE"
            ? ["Benar", "Salah"]
            : q.options.map((o) => o.trim()).filter(Boolean),
      }));

      const url = editingQuizId ? `/api/teacher/quizzes/${editingQuizId}` : "/api/teacher/quizzes";
      const method = editingQuizId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: quizTitle,
          description: quizDesc,
          category: quizCategory,
          timeLimitMinutes: quizTime,
          passingScore: quizPassing,
          questions: cleanedQuestions,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan kuis.");
      resetQuizForm();
      notify("ok", data.message);
      router.refresh();
    } catch (err) {
      notify("err", err instanceof Error ? err.message : "Gagal menyimpan kuis.");
    } finally {
      setSavingQuiz(false);
    }
  }

  // ---- PENILAIAN HANDLERS ----
  async function handleSaveGrade(submissionId: string) {
    const draft = gradeDrafts[submissionId];
    const numScore = Number(draft?.score);
    if (Number.isNaN(numScore) || numScore < 0 || numScore > 100) {
      notify("err", "Masukkan nilai angka valid antara 0 sampai 100.");
      return;
    }

    setSavingGradeId(submissionId);
    setBanner(null);
    try {
      const res = await fetch(`/api/teacher/submissions/${submissionId}/grade`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score: numScore,
          teacherFeedback: draft?.feedback || "",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan nilai.");
      notify("ok", data.message);
      router.refresh();
    } catch (err) {
      notify("err", err instanceof Error ? err.message : "Gagal menilai tugas.");
    } finally {
      setSavingGradeId(null);
    }
  }

  async function handleSaveSimFeedback(attemptId: string) {
    const text = (simFeedbackDrafts[attemptId] || "").trim();
    if (text.length < 3) {
      notify("err", "Tuliskan umpan balik minimal 3 karakter.");
      return;
    }
    setSavingSimFbId(attemptId);
    setBanner(null);
    try {
      const res = await fetch(`/api/teacher/simulations/${attemptId}/feedback`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherFeedback: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan umpan balik.");
      notify("ok", data.message);
      router.refresh();
    } catch (err) {
      notify("err", err instanceof Error ? err.message : "Gagal menyimpan umpan balik.");
    } finally {
      setSavingSimFbId(null);
    }
  }

  function handleTabKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex = index;
    if (e.key === "ArrowRight") nextIndex = (index + 1) % TABS.length;
    else if (e.key === "ArrowLeft") nextIndex = (index - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") nextIndex = 0;
    else if (e.key === "End") nextIndex = TABS.length - 1;
    else return;

    e.preventDefault();
    setActiveTab(TABS[nextIndex].id);
    const btn = tabRefs.current[nextIndex];
    btn?.focus();
    btn?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  const pendingGrading = submissions.filter((s) => s.status !== "GRADED").length;

  return (
    <div className="space-y-6">
      {/* 4 Kartu Aksi Cepat Ramah Orang Awam (1 Klik Langsung Buka Tab Terkait) */}
      <section aria-label="Menu Aksi Cepat Guru">
        <p className="mb-3 text-xs font-extrabold uppercase tracking-wider text-slate-400">
          Apa yang ingin Bapak/Ibu kelola hari ini?
        </p>
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <button
            type="button"
            onClick={() => setActiveTab("materials")}
            className={`interactive-lift rounded-3xl border p-4 text-left transition ${
              activeTab === "materials"
                ? "border-sky-400 bg-sky-50 ring-2 ring-sky-200"
                : "border-sky-200/80 bg-gradient-to-br from-sky-50/70 via-white to-white hover:border-sky-300"
            }`}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500 text-white shadow-xs">
              <BookOpen className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="mt-3 text-sm font-extrabold text-slate-950">Upload PDF &amp; Materi</p>
            <p className="mt-0.5 text-xs text-slate-600">Tambah, edit, atau pasang modul PDF</p>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("assignments")}
            className={`interactive-lift rounded-3xl border p-4 text-left transition ${
              activeTab === "assignments"
                ? "border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200"
                : "border-emerald-200/80 bg-gradient-to-br from-emerald-50/70 via-white to-white hover:border-emerald-300"
            }`}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-xs">
              <ClipboardList className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="mt-3 text-sm font-extrabold text-slate-950">LKPD, Proyek &amp; PDF</p>
            <p className="mt-0.5 text-xs text-slate-600">Buat lembar kerja &amp; lampirkan PDF</p>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("grading")}
            className={`interactive-lift rounded-3xl border p-4 text-left transition ${
              activeTab === "grading"
                ? "border-orange-400 bg-orange-50 ring-2 ring-orange-200"
                : "border-orange-200/80 bg-gradient-to-br from-orange-50/70 via-white to-white hover:border-orange-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#ff5f3d] text-white shadow-xs">
                <ClipboardCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              {pendingGrading > 0 && (
                <span className="rounded-full bg-[#ff5f3d] px-2.5 py-0.5 text-[11px] font-extrabold text-white">
                  {pendingGrading} baru
                </span>
              )}
            </div>
            <p className="mt-3 text-sm font-extrabold text-slate-950">Nilai Tugas &amp; Simulasi</p>
            <p className="mt-0.5 text-xs text-slate-600">Periksa jawaban &amp; beri umpan balik</p>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("students")}
            className={`interactive-lift rounded-3xl border p-4 text-left transition ${
              activeTab === "students"
                ? "border-violet-400 bg-violet-50 ring-2 ring-violet-200"
                : "border-violet-200/80 bg-gradient-to-br from-violet-50/70 via-white to-white hover:border-violet-300"
            }`}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-xs">
              <Users className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="mt-3 text-sm font-extrabold text-slate-950">Pantau Siswa</p>
            <p className="mt-0.5 text-xs text-slate-600">Lihat progres {students.length} siswa aktif</p>
          </button>
        </div>
      </section>

      {banner && (
        <div
          role={banner.type === "err" ? "alert" : "status"}
          className={`flex items-center gap-2.5 rounded-2xl border px-4 py-3 text-sm ${
            banner.type === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {banner.type === "ok" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
          )}
          <span>{banner.text}</span>
        </div>
      )}

      {/* Single-Row Scrollable Accessible Tablist */}
      <div className="rounded-t-2xl border-b border-slate-200 bg-white px-2">
        <div
          role="tablist"
          aria-label="Ruang Kerja Guru"
          className="flex flex-nowrap gap-1 overflow-x-auto"
        >
          {TABS.map((tab, index) => {
            const Icon = tab.icon;
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                ref={(el) => {
                  tabRefs.current[index] = el;
                }}
                id={`teacher-tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                tabIndex={selected ? 0 : -1}
                onClick={(e) => {
                  setActiveTab(tab.id);
                  e.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest" });
                }}
                onKeyDown={(e) => handleTabKeyDown(e, index)}
                className="olh-tab flex flex-none items-center gap-2 whitespace-nowrap px-4 py-3.5 text-sm font-semibold text-slate-600 transition-colors hover:text-[#0f294a]"
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* PANEL 1: PANTAU SISWA */}
      <div role="tabpanel" aria-labelledby="teacher-tab-students" hidden={activeTab !== "students"}>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
          <h2 className="text-lg font-extrabold text-[#0f294a]">Pemantauan Kemajuan Belajar Siswa</h2>
          <p className="mt-1 text-xs text-slate-500">
            Rekap real-time penyelesaian materi, simulasi, rata-rata kuis, dan tugas seluruh siswa.
          </p>
          <div tabIndex={0} role="region" aria-label="Tabel progres siswa" className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-3">Nama Siswa</th>
                  <th scope="col" className="px-4 py-3">Kelas</th>
                  <th scope="col" className="px-4 py-3">Materi</th>
                  <th scope="col" className="px-4 py-3">Simulasi</th>
                  <th scope="col" className="px-4 py-3">Rata-rata Kuis</th>
                  <th scope="col" className="px-4 py-3">Tugas Terkumpul</th>
                  <th scope="col" className="px-4 py-3">Poin XP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-900">{s.name}</p>
                      <p className="text-xs text-slate-500">{s.email}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{s.className || "-"}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {s.materialsDone}/{s.totalMaterials}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {s.simulationsDone}/{s.totalSimulations}
                    </td>
                    <td className="px-4 py-3 font-bold text-indigo-700">
                      {s.avgQuiz !== null ? `${s.avgQuiz}/100` : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{s.submissionsCount} tugas</td>
                    <td className="px-4 py-3 font-extrabold text-[#0f766e]">{s.points} XP</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* PANEL 2: KELOLA MATERI & UPLOAD PDF (TAMBAH / EDIT / HAPUS) */}
      <div role="tabpanel" aria-labelledby="teacher-tab-materials" hidden={activeTab !== "materials"}>
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
            <h2 className="text-lg font-extrabold text-[#0f294a]">
              Daftar Materi &amp; Lampiran PDF ({materials.length})
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Unggah PDF langsung, edit isi materi, atau hapus materi yang tidak diperlukan.
            </p>

            <div className="mt-4 divide-y divide-slate-100">
              {materials.map((m) => (
                <div
                  key={m.id}
                  className="flex flex-col justify-between gap-3 py-4 lg:flex-row lg:items-center"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-[#0f294a] px-2 py-0.5 text-xs font-bold text-white">
                        Bab {m.order}
                      </span>
                      <Link
                        href={`/materi/${m.slug}`}
                        className="text-sm font-bold text-slate-900 hover:text-[#1d4ed8] hover:underline"
                      >
                        {m.title}
                      </Link>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">{m.subtitle}</p>
                    {m.pdfUrl && (
                      <a
                        href={m.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-rose-700 hover:underline"
                      >
                        <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>PDF: {m.pdfName || "Dokumen.pdf"}</span>
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </a>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <label
                      htmlFor={`mat-pdf-${m.id}`}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-800 hover:bg-rose-100"
                    >
                      {uploadingTargetId === m.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      <span>{m.pdfUrl ? "Ganti PDF" : "Upload PDF"}</span>
                    </label>
                    <input
                      id={`mat-pdf-${m.id}`}
                      type="file"
                      accept=".pdf,application/pdf"
                      className="visually-hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        void handleAttachMaterialPdf(m.id, file);
                      }}
                    />

                    <button
                      type="button"
                      onClick={() => startEditMaterial(m)}
                      className="inline-flex items-center gap-1 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-[#1d4ed8] hover:bg-blue-100"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setPendingDelete({
                          endpoint: `/api/teacher/materials/${m.id}`,
                          id: m.id,
                          title: "Hapus materi ini?",
                          description: `Materi "${m.title}" beserta progres siswa pada bab ini akan dihapus permanen.`,
                          onAfter: () => {
                            if (editingMatId === m.id) resetMaterialForm();
                          },
                        })
                      }
                      aria-label={`Hapus materi ${m.title}`}
                      className="rounded-xl border border-slate-200 bg-white p-1.5 text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Form Tambah / Edit Materi */}
          <form
            ref={matFormRef}
            onSubmit={handleSaveMaterial}
            className={`space-y-4 rounded-2xl border bg-white p-6 shadow-2xs ${
              editingMatId ? "border-blue-300 ring-2 ring-blue-100" : "border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-[#0f294a]">
                {editingMatId ? "Edit Materi Pembelajaran" : "Tambah Materi Pembelajaran Baru"}
              </h3>
              {editingMatId && (
                <button
                  type="button"
                  onClick={resetMaterialForm}
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-200"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Batal Edit</span>
                </button>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="new-mat-title" className="block text-xs font-bold text-slate-700">
                  Judul Materi
                </label>
                <input
                  id="new-mat-title"
                  required
                  value={matTitle}
                  onChange={(e) => setMatTitle(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="new-mat-sub" className="block text-xs font-bold text-slate-700">
                  Subjudul Singkat
                </label>
                <input
                  id="new-mat-sub"
                  required
                  value={matSubtitle}
                  onChange={(e) => setMatSubtitle(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="new-mat-sum" className="block text-xs font-bold text-slate-700">
                  Ringkasan Materi
                </label>
                <textarea
                  id="new-mat-sum"
                  required
                  rows={2}
                  value={matSummary}
                  onChange={(e) => setMatSummary(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="new-mat-content" className="block text-xs font-bold text-slate-700">
                  Isi Materi (Markdown: ## Judul, - daftar, **tebal**)
                </label>
                <textarea
                  id="new-mat-content"
                  required
                  rows={5}
                  value={matContent}
                  onChange={(e) => setMatContent(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm"
                />
              </div>
              <div>
                <label htmlFor="new-mat-video" className="block text-xs font-bold text-slate-700">
                  Link Video YouTube (Opsional)
                </label>
                <input
                  id="new-mat-video"
                  type="text"
                  value={matVideoUrl}
                  onChange={(e) => setMatVideoUrl(e.target.value)}
                  placeholder="https://youtu.be/... atau https://www.youtube.com/watch?v=..."
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Tempel link YouTube biasa (youtu.be / watch / shorts) — sistem otomatis mengubahnya ke mode embed.
                </p>
                {matVideoUrl.trim() && (
                  <p
                    className={`mt-1 text-[11px] font-semibold ${
                      toEmbedVideoUrl(matVideoUrl) ? "text-emerald-700" : "text-rose-600"
                    }`}
                  >
                    {toEmbedVideoUrl(matVideoUrl)
                      ? "✓ Link video valid & siap diputar di halaman siswa."
                      : "Format link video belum valid. Pastikan diawali https://"}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="new-mat-dur" className="block text-xs font-bold text-slate-700">
                  Estimasi Durasi Baca (Menit)
                </label>
                <input
                  id="new-mat-dur"
                  type="number"
                  min={5}
                  max={180}
                  value={matDuration}
                  onChange={(e) => setMatDuration(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="new-mat-act" className="block text-xs font-bold text-slate-700">
                  Panduan Aktivitas Mandiri Siswa (Opsional)
                </label>
                <input
                  id="new-mat-act"
                  value={matActivity}
                  onChange={(e) => setMatActivity(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <span className="block text-xs font-bold text-slate-700">
                  Lampiran File PDF Materi (Opsional — maks. 4 MB)
                </span>
                <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
                  <label
                    htmlFor="new-mat-pdf"
                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 ${
                      uploadingMatPdf ? "pointer-events-none opacity-60" : ""
                    }`}
                  >
                    {uploadingMatPdf ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-600" aria-hidden="true" />
                    ) : (
                      <Upload className="h-3.5 w-3.5 text-rose-600" aria-hidden="true" />
                    )}
                    <span>
                      {uploadingMatPdf
                        ? "Mengunggah PDF..."
                        : matPdfUrl
                          ? "Ganti File PDF"
                          : "Pilih File PDF Materi"}
                    </span>
                  </label>
                  <input
                    id="new-mat-pdf"
                    type="file"
                    accept=".pdf,application/pdf"
                    className="visually-hidden"
                    disabled={uploadingMatPdf}
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (!f) return;
                      setUploadingMatPdf(true);
                      setMatPdfFeedback(null);
                      try {
                        const up = await uploadPdfFile(f, "materi");
                        setMatPdfUrl(up.fileUrl);
                        setMatPdfName(up.fileName);
                        if (editingMatId) {
                          const patchRes = await fetch(`/api/teacher/materials/${editingMatId}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              pdfUrl: up.fileUrl,
                              pdfName: up.fileName,
                            }),
                          });
                          const patchData = await patchRes.json();
                          if (!patchRes.ok) {
                            throw new Error(patchData.error || "Gagal menautkan PDF ke materi.");
                          }
                          setMatPdfFeedback({
                            type: "ok",
                            text: `PDF "${up.fileName}" berhasil diunggah dan langsung tersimpan ke materi ini!`,
                          });
                          notify("ok", `PDF "${up.fileName}" berhasil disimpan ke materi.`);
                          router.refresh();
                        } else {
                          setMatPdfFeedback({
                            type: "ok",
                            text: `PDF "${up.fileName}" terunggah. Klik "Terbitkan Materi Baru" untuk menyimpan.`,
                          });
                          notify("ok", `PDF "${up.fileName}" siap diterbitkan bersama materi baru.`);
                        }
                      } catch (err) {
                        const msg = err instanceof Error ? err.message : "Gagal upload PDF.";
                        setMatPdfFeedback({ type: "err", text: msg });
                        notify("err", msg);
                      } finally {
                        setUploadingMatPdf(false);
                      }
                    }}
                  />
                  {matPdfUrl && (
                    <>
                      <a
                        href={matPdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
                      >
                        <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                        <span className="max-w-[220px] truncate">{matPdfName || "Dokumen.pdf"}</span>
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </a>
                      <button
                        type="button"
                        onClick={async () => {
                          setMatPdfUrl("");
                          setMatPdfName("");
                          if (editingMatId) {
                            await fetch(`/api/teacher/materials/${editingMatId}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ pdfUrl: null, pdfName: null }),
                            });
                            setMatPdfFeedback({ type: "ok", text: "Lampiran PDF dilepas dari materi." });
                            router.refresh();
                          } else {
                            setMatPdfFeedback(null);
                          }
                        }}
                        className="text-xs font-semibold text-rose-600 hover:underline"
                      >
                        Lepas PDF
                      </button>
                    </>
                  )}
                </div>
                {matPdfFeedback && (
                  <p
                    role={matPdfFeedback.type === "err" ? "alert" : "status"}
                    className={`mt-2 text-xs font-semibold ${
                      matPdfFeedback.type === "ok" ? "text-emerald-700" : "text-rose-600"
                    }`}
                  >
                    {matPdfFeedback.text}
                  </p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={savingMat || uploadingMatPdf}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0f294a] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#163a66] disabled:opacity-60"
            >
              {savingMat || uploadingMatPdf ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : editingMatId ? (
                <Save className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Plus className="h-4 w-4" aria-hidden="true" />
              )}
              <span>
                {uploadingMatPdf
                  ? "Menunggu Upload PDF..."
                  : editingMatId
                    ? "Simpan Perubahan Materi"
                    : "Terbitkan Materi Baru"}
              </span>
            </button>
          </form>
        </div>
      </div>

      {/* PANEL 3: KELOLA SIMULASI DIGITAL (TAMBAH / EDIT / HAPUS) */}
      <div
        role="tabpanel"
        aria-labelledby="teacher-tab-simulations"
        hidden={activeTab !== "simulations"}
      >
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
            <h2 className="text-lg font-extrabold text-[#0f294a]">
              Daftar Skenario Simulasi Digital ({simulations.length})
            </h2>
            <div className="mt-4 divide-y divide-slate-100">
              {simulations.map((s) => (
                <div
                  key={s.id}
                  className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-teal-700 px-2 py-0.5 text-xs font-bold text-white">
                        S{s.order}
                      </span>
                      <Link
                        href={`/simulasi/${s.slug}`}
                        className="text-sm font-bold text-slate-900 hover:text-[#1d4ed8] hover:underline"
                      >
                        {s.title}
                      </Link>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Tamu: {s.customerName} ({s.customerRole}) • {s.steps.length} langkah • Tingkat{" "}
                      {s.difficulty} • {s.attemptsCount}x dicoba siswa
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => startEditSimulation(s)}
                      className="inline-flex items-center gap-1 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-[#1d4ed8] hover:bg-blue-100"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setPendingDelete({
                          endpoint: `/api/teacher/simulations/${s.id}`,
                          id: s.id,
                          title: "Hapus skenario simulasi ini?",
                          description: `Skenario "${s.title}" beserta riwayat percobaan siswa akan dihapus permanen.`,
                          onAfter: () => {
                            if (editingSimId === s.id) resetSimulationForm();
                          },
                        })
                      }
                      aria-label={`Hapus simulasi ${s.title}`}
                      className="rounded-xl border border-slate-200 bg-white p-1.5 text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Form Tambah / Edit Simulasi */}
          <form
            onSubmit={handleSaveSimulation}
            className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-[#0f294a]">
                {editingSimId ? "Edit Skenario Simulasi" : "Tambah Skenario Simulasi Baru"}
              </h3>
              {editingSimId && (
                <button
                  type="button"
                  onClick={resetSimulationForm}
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Batal Edit</span>
                </button>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="sim-title" className="block text-xs font-bold text-slate-700">
                  Judul Simulasi
                </label>
                <input
                  id="sim-title"
                  required
                  value={simTitle}
                  onChange={(e) => setSimTitle(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="sim-sub" className="block text-xs font-bold text-slate-700">
                  Subjudul
                </label>
                <input
                  id="sim-sub"
                  required
                  value={simSubtitle}
                  onChange={(e) => setSimSubtitle(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="sim-cust" className="block text-xs font-bold text-slate-700">
                  Nama Tamu Kantor
                </label>
                <input
                  id="sim-cust"
                  required
                  value={simCustomerName}
                  onChange={(e) => setSimCustomerName(e.target.value)}
                  placeholder="Contoh: Ibu Rina Wijaya"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="sim-role" className="block text-xs font-bold text-slate-700">
                  Jabatan / Instansi Tamu
                </label>
                <input
                  id="sim-role"
                  required
                  value={simCustomerRole}
                  onChange={(e) => setSimCustomerRole(e.target.value)}
                  placeholder="Contoh: Klien PT Karya Bersama"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="sim-diff" className="block text-xs font-bold text-slate-700">
                  Tingkat Kesulitan
                </label>
                <select
                  id="sim-diff"
                  value={simDifficulty}
                  onChange={(e) =>
                    setSimDifficulty(e.target.value as "Dasar" | "Menengah" | "Lanjut")
                  }
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm"
                >
                  <option value="Dasar">Dasar</option>
                  <option value="Menengah">Menengah</option>
                  <option value="Lanjut">Lanjut</option>
                </select>
              </div>
              <div>
                <label htmlFor="sim-min" className="block text-xs font-bold text-slate-700">
                  Estimasi Waktu (Menit)
                </label>
                <input
                  id="sim-min"
                  type="number"
                  min={3}
                  max={60}
                  value={simMinutes}
                  onChange={(e) => setSimMinutes(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="sim-ctx" className="block text-xs font-bold text-slate-700">
                  Konteks Skenario Perkantoran
                </label>
                <textarea
                  id="sim-ctx"
                  required
                  rows={2}
                  value={simContext}
                  onChange={(e) => setSimContext(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm"
                />
              </div>
            </div>

            {/* Builder Langkah Dialog */}
            <div className="space-y-4">
              {simSteps.map((step, sIdx) => (
                <div
                  key={step.id}
                  className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-[#0f294a]">
                      Langkah Dialog #{sIdx + 1}
                    </span>
                    {simSteps.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setSimSteps((prev) => prev.filter((_, i) => i !== sIdx))}
                        className="text-xs font-bold text-rose-600 hover:underline"
                      >
                        Hapus Langkah
                      </button>
                    )}
                  </div>

                  <input
                    required
                    value={step.situation}
                    onChange={(e) => {
                      const next = structuredClone(simSteps);
                      next[sIdx].situation = e.target.value;
                      setSimSteps(next);
                    }}
                    placeholder="Situasi langkah (misal: Tamu mendekati meja resepsionis...)"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
                  />
                  <input
                    required
                    value={step.customerDialog}
                    onChange={(e) => {
                      const next = structuredClone(simSteps);
                      next[sIdx].customerDialog = e.target.value;
                      setSimSteps(next);
                    }}
                    placeholder="Dialog tamu (misal: Selamat pagi, saya ingin bertemu bagian keuangan...)"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
                  />
                  <input
                    required
                    value={step.prompt}
                    onChange={(e) => {
                      const next = structuredClone(simSteps);
                      next[sIdx].prompt = e.target.value;
                      setSimSteps(next);
                    }}
                    placeholder="Pertanyaan untuk siswa"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
                  />

                  <div className="space-y-2.5 pl-2">
                    {step.options.map((opt, oIdx) => (
                      <div
                        key={opt.id}
                        className="grid gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-12"
                      >
                        <input
                          required
                          value={opt.text}
                          onChange={(e) => {
                            const next = structuredClone(simSteps);
                            next[sIdx].options[oIdx].text = e.target.value;
                            setSimSteps(next);
                          }}
                          placeholder={`Pilihan ${String.fromCharCode(65 + oIdx)}`}
                          className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs sm:col-span-6"
                        />
                        <select
                          aria-label="Rating pilihan"
                          value={opt.rating}
                          onChange={(e) => {
                            const next = structuredClone(simSteps);
                            next[sIdx].options[oIdx].rating = e.target.value;
                            setSimSteps(next);
                          }}
                          className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs sm:col-span-3"
                        >
                          <option value="Sangat Tepat">Sangat Tepat</option>
                          <option value="Cukup">Cukup</option>
                          <option value="Kurang Tepat">Kurang Tepat</option>
                        </select>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={opt.score}
                          onChange={(e) => {
                            const next = structuredClone(simSteps);
                            next[sIdx].options[oIdx].score = Number(e.target.value);
                            setSimSteps(next);
                          }}
                          aria-label="Skor pilihan"
                          className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs sm:col-span-3"
                        />
                        <input
                          required
                          value={opt.feedback}
                          onChange={(e) => {
                            const next = structuredClone(simSteps);
                            next[sIdx].options[oIdx].feedback = e.target.value;
                            setSimSteps(next);
                          }}
                          placeholder="Umpan balik instan untuk pilihan ini..."
                          className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs sm:col-span-12"
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const next = structuredClone(simSteps);
                        next[sIdx].options.push({
                          id: String.fromCharCode(97 + next[sIdx].options.length),
                          text: "",
                          score: 25,
                          rating: "Cukup",
                          feedback: "",
                        });
                        setSimSteps(next);
                      }}
                      className="text-xs font-bold text-[#1d4ed8] hover:underline"
                    >
                      + Tambah Pilihan Tindakan
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setSimSteps((prev) => [...prev, makeEmptySimStep(prev.length + 1)])}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span>Tambah Langkah Dialog</span>
              </button>

              <button
                type="submit"
                disabled={savingSim}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0f766e] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#0d625c] disabled:opacity-60"
              >
                {savingSim ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Save className="h-4 w-4" aria-hidden="true" />
                )}
                <span>{editingSimId ? "Simpan Perubahan Simulasi" : "Terbitkan Simulasi Baru"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* PANEL 4: KELOLA LKPD, PROYEK & UPLOAD PDF (TAMBAH / EDIT / HAPUS) */}
      <div
        role="tabpanel"
        aria-labelledby="teacher-tab-assignments"
        hidden={activeTab !== "assignments"}
      >
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
            <h2 className="text-lg font-extrabold text-[#0f294a]">
              Daftar LKPD &amp; Proyek Praktik ({assignments.length})
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Unggah PDF LKPD/Panduan, edit petunjuk &amp; pertanyaan analisis, atau hapus tugas.
            </p>

            <div className="mt-4 divide-y divide-slate-100">
              {assignments.map((a) => (
                <div
                  key={a.id}
                  className="flex flex-col justify-between gap-3 py-4 lg:flex-row lg:items-center"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                          a.type === "LKPD"
                            ? "bg-teal-100 text-teal-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {a.type}
                      </span>
                      <Link
                        href={a.type === "LKPD" ? `/lkpd/${a.id}` : `/proyek/${a.id}`}
                        className="text-sm font-bold text-slate-900 hover:text-[#1d4ed8] hover:underline"
                      >
                        {a.title}
                      </Link>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Tenggat: {a.dueDateLabel} • {a.submissionsCount} pengumpulan siswa
                    </p>
                    {a.pdfUrl && (
                      <a
                        href={a.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-rose-700 hover:underline"
                      >
                        <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>PDF: {a.pdfName || "LembarKerja.pdf"}</span>
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </a>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <label
                      htmlFor={`asg-pdf-${a.id}`}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-800 hover:bg-rose-100"
                    >
                      {uploadingTargetId === a.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      <span>{a.pdfUrl ? "Ganti PDF" : "Upload PDF"}</span>
                    </label>
                    <input
                      id={`asg-pdf-${a.id}`}
                      type="file"
                      accept=".pdf,application/pdf"
                      className="visually-hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        void handleAttachAssignmentPdf(a.id, file);
                      }}
                    />

                    <button
                      type="button"
                      onClick={() => startEditAssignment(a)}
                      className="inline-flex items-center gap-1 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-[#1d4ed8] hover:bg-blue-100"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setPendingDelete({
                          endpoint: `/api/teacher/assignments/${a.id}`,
                          id: a.id,
                          title: `Hapus ${a.type} ini?`,
                          description: `Tugas "${a.title}" beserta seluruh jawaban siswa yang terkumpul akan dihapus permanen.`,
                          onAfter: () => {
                            if (editingAsgId === a.id) resetAssignmentForm();
                          },
                        })
                      }
                      aria-label={`Hapus tugas ${a.title}`}
                      className="rounded-xl border border-slate-200 bg-white p-1.5 text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Form Tambah / Edit LKPD & Proyek */}
          <form
            ref={asgFormRef}
            onSubmit={handleSaveAssignment}
            className={`space-y-4 rounded-2xl border bg-white p-6 shadow-2xs ${
              editingAsgId ? "border-teal-300 ring-2 ring-teal-100" : "border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-[#0f294a]">
                {editingAsgId ? `Edit ${asgType}` : "Buat LKPD atau Proyek Praktik Baru"}
              </h3>
              {editingAsgId && (
                <button
                  type="button"
                  onClick={resetAssignmentForm}
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Batal Edit</span>
                </button>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="asg-type" className="block text-xs font-bold text-slate-700">
                  Jenis Tugas
                </label>
                <select
                  id="asg-type"
                  value={asgType}
                  onChange={(e) => setAsgType(e.target.value as "LKPD" | "PROJECT")}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm"
                >
                  <option value="LKPD">LKPD (Lembar Kerja Peserta Didik)</option>
                  <option value="PROJECT">Proyek Praktik</option>
                </select>
              </div>
              <div>
                <label htmlFor="asg-due" className="block text-xs font-bold text-slate-700">
                  Tenggat Pengumpulan (Opsional)
                </label>
                <input
                  id="asg-due"
                  type="date"
                  value={asgDueDate}
                  onChange={(e) => setAsgDueDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="asg-title" className="block text-xs font-bold text-slate-700">
                  Judul {asgType}
                </label>
                <input
                  id="asg-title"
                  required
                  value={asgTitle}
                  onChange={(e) => setAsgTitle(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="asg-desc" className="block text-xs font-bold text-slate-700">
                  Deskripsi / Tujuan Kegiatan
                </label>
                <input
                  id="asg-desc"
                  required
                  value={asgDesc}
                  onChange={(e) => setAsgDesc(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="asg-inst" className="block text-xs font-bold text-slate-700">
                  Petunjuk Pengerjaan
                </label>
                <textarea
                  id="asg-inst"
                  required
                  rows={2}
                  value={asgInst}
                  onChange={(e) => setAsgInst(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm"
                />
              </div>
              {asgType === "LKPD" && (
                <>
                  <div className="sm:col-span-2">
                    <label htmlFor="asg-case" className="block text-xs font-bold text-slate-700">
                      Ringkasan Kasus Pelayanan (Opsional)
                    </label>
                    <textarea
                      id="asg-case"
                      rows={2}
                      value={asgCase}
                      onChange={(e) => setAsgCase(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="asg-qs" className="block text-xs font-bold text-slate-700">
                      Daftar Pertanyaan Analisis (1 pertanyaan per baris)
                    </label>
                    <textarea
                      id="asg-qs"
                      rows={3}
                      value={asgQuestionsText}
                      onChange={(e) => setAsgQuestionsText(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm"
                    />
                  </div>
                </>
              )}
              <div className="sm:col-span-2">
                <span className="block text-xs font-bold text-slate-700">
                  Upload File PDF LKPD / Panduan Proyek (Opsional — maks. 4 MB)
                </span>
                <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
                  <label
                    htmlFor="new-asg-pdf"
                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 ${
                      uploadingAsgPdf ? "pointer-events-none opacity-60" : ""
                    }`}
                  >
                    {uploadingAsgPdf ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-600" aria-hidden="true" />
                    ) : (
                      <Upload className="h-3.5 w-3.5 text-rose-600" aria-hidden="true" />
                    )}
                    <span>
                      {uploadingAsgPdf
                        ? "Mengunggah PDF..."
                        : asgPdfUrl
                          ? "Ganti File PDF"
                          : "Pilih File PDF LKPD/Panduan"}
                    </span>
                  </label>
                  <input
                    id="new-asg-pdf"
                    type="file"
                    accept=".pdf,application/pdf"
                    className="visually-hidden"
                    disabled={uploadingAsgPdf}
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (!f) return;
                      setUploadingAsgPdf(true);
                      setAsgPdfFeedback(null);
                      try {
                        const up = await uploadPdfFile(f, "lkpd");
                        setAsgPdfUrl(up.fileUrl);
                        setAsgPdfName(up.fileName);
                        if (editingAsgId) {
                          const patchRes = await fetch(`/api/teacher/assignments/${editingAsgId}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              pdfUrl: up.fileUrl,
                              pdfName: up.fileName,
                            }),
                          });
                          const patchData = await patchRes.json();
                          if (!patchRes.ok) {
                            throw new Error(patchData.error || "Gagal menautkan PDF ke tugas.");
                          }
                          setAsgPdfFeedback({
                            type: "ok",
                            text: `PDF "${up.fileName}" berhasil diunggah dan langsung tersimpan ke tugas ini!`,
                          });
                          notify("ok", `PDF "${up.fileName}" berhasil disimpan ke LKPD/Proyek.`);
                          router.refresh();
                        } else {
                          setAsgPdfFeedback({
                            type: "ok",
                            text: `PDF "${up.fileName}" terunggah. Klik "Terbitkan ${asgType}" untuk menyimpan.`,
                          });
                          notify("ok", `PDF "${up.fileName}" siap diterbitkan.`);
                        }
                      } catch (err) {
                        const msg = err instanceof Error ? err.message : "Gagal upload PDF.";
                        setAsgPdfFeedback({ type: "err", text: msg });
                        notify("err", msg);
                      } finally {
                        setUploadingAsgPdf(false);
                      }
                    }}
                  />
                  {asgPdfUrl && (
                    <>
                      <a
                        href={asgPdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
                      >
                        <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                        <span className="max-w-[220px] truncate">{asgPdfName || "LembarKerja.pdf"}</span>
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </a>
                      <button
                        type="button"
                        onClick={async () => {
                          setAsgPdfUrl("");
                          setAsgPdfName("");
                          if (editingAsgId) {
                            await fetch(`/api/teacher/assignments/${editingAsgId}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ pdfUrl: null, pdfName: null }),
                            });
                            setAsgPdfFeedback({ type: "ok", text: "Lampiran PDF dilepas dari tugas." });
                            router.refresh();
                          } else {
                            setAsgPdfFeedback(null);
                          }
                        }}
                        className="text-xs font-semibold text-rose-600 hover:underline"
                      >
                        Lepas PDF
                      </button>
                    </>
                  )}
                </div>
                {asgPdfFeedback && (
                  <p
                    role={asgPdfFeedback.type === "err" ? "alert" : "status"}
                    className={`mt-2 text-xs font-semibold ${
                      asgPdfFeedback.type === "ok" ? "text-emerald-700" : "text-rose-600"
                    }`}
                  >
                    {asgPdfFeedback.text}
                  </p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={savingAsg || uploadingAsgPdf}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0f766e] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#0d625c] disabled:opacity-60"
            >
              {savingAsg || uploadingAsgPdf ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : editingAsgId ? (
                <Save className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Plus className="h-4 w-4" aria-hidden="true" />
              )}
              <span>
                {uploadingAsgPdf
                  ? "Menunggu Upload PDF..."
                  : editingAsgId
                    ? "Simpan Perubahan Tugas"
                    : `Terbitkan ${asgType}`}
              </span>
            </button>
          </form>
        </div>
      </div>

      {/* PANEL 5: KELOLA KUIS (TAMBAH / EDIT / HAPUS) */}
      <div role="tabpanel" aria-labelledby="teacher-tab-quizzes" hidden={activeTab !== "quizzes"}>
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
            <h2 className="text-lg font-extrabold text-[#0f294a]">
              Daftar Kuis Interaktif ({quizzes.length})
            </h2>
            <div className="mt-4 divide-y divide-slate-100">
              {quizzes.map((q) => (
                <div
                  key={q.id}
                  className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center"
                >
                  <div>
                    <span className="text-[11px] font-bold uppercase text-indigo-700">
                      {q.category}
                    </span>
                    <p className="text-sm font-bold text-slate-900">{q.title}</p>
                    <p className="text-xs text-slate-500">
                      {q.questions.length} soal • {q.timeLimitMinutes} menit • KKM {q.passingScore}{" "}
                      • {q.attemptsCount}x dikerjakan siswa
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => startEditQuiz(q)}
                      className="inline-flex items-center gap-1 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-[#1d4ed8] hover:bg-blue-100"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Edit Soal</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setPendingDelete({
                          endpoint: `/api/teacher/quizzes/${q.id}`,
                          id: q.id,
                          title: "Hapus kuis interaktif ini?",
                          description: `Kuis "${q.title}" beserta seluruh riwayat nilai kuis siswa akan dihapus permanen.`,
                          onAfter: () => {
                            if (editingQuizId === q.id) resetQuizForm();
                          },
                        })
                      }
                      aria-label={`Hapus kuis ${q.title}`}
                      className="rounded-xl border border-slate-200 bg-white p-1.5 text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <form
            onSubmit={handleSaveQuiz}
            className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-[#0f294a]">
                {editingQuizId ? "Edit Kuis Interaktif" : "Buat Kuis Interaktif Baru"}
              </h3>
              {editingQuizId && (
                <button
                  type="button"
                  onClick={resetQuizForm}
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Batal Edit</span>
                </button>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="qz-title" className="block text-xs font-bold text-slate-700">
                  Judul Kuis
                </label>
                <input
                  id="qz-title"
                  required
                  value={quizTitle}
                  onChange={(e) => setQuizTitle(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="qz-desc" className="block text-xs font-bold text-slate-700">
                  Deskripsi Singkat
                </label>
                <input
                  id="qz-desc"
                  required
                  value={quizDesc}
                  onChange={(e) => setQuizDesc(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="qz-cat" className="block text-xs font-bold text-slate-700">
                  Kategori
                </label>
                <select
                  id="qz-cat"
                  value={quizCategory}
                  onChange={(e) =>
                    setQuizCategory(
                      e.target.value as "KONSEP" | "ETIKA" | "STUDI_KASUS" | "EVALUASI"
                    )
                  }
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm"
                >
                  <option value="KONSEP">Konsep &amp; Prinsip</option>
                  <option value="ETIKA">Etika Pelayanan</option>
                  <option value="STUDI_KASUS">Studi Kasus</option>
                  <option value="EVALUASI">Evaluasi Akhir</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="qz-time" className="block text-xs font-bold text-slate-700">
                    Durasi (Menit)
                  </label>
                  <input
                    id="qz-time"
                    type="number"
                    min={3}
                    max={120}
                    value={quizTime}
                    onChange={(e) => setQuizTime(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="qz-kkm" className="block text-xs font-bold text-slate-700">
                    KKM (0–100)
                  </label>
                  <input
                    id="qz-kkm"
                    type="number"
                    min={50}
                    max={100}
                    value={quizPassing}
                    onChange={(e) => setQuizPassing(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {quizQuestions.map((q, qIdx) => (
                <div
                  key={q.id}
                  className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-[#0f294a]">Soal #{qIdx + 1}</span>
                    <div className="flex items-center gap-2">
                      <select
                        aria-label={`Tipe soal ${qIdx + 1}`}
                        value={q.type}
                        onChange={(e) => {
                          const next = structuredClone(quizQuestions);
                          const t = e.target.value as "MCQ" | "TRUE_FALSE" | "CASE";
                          next[qIdx] = {
                            ...next[qIdx],
                            type: t,
                            options: t === "TRUE_FALSE" ? ["Benar", "Salah"] : ["", "", "", ""],
                            correctIndex: 0,
                          };
                          setQuizQuestions(next);
                        }}
                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs"
                      >
                        <option value="MCQ">Pilihan Ganda</option>
                        <option value="TRUE_FALSE">Benar / Salah</option>
                        <option value="CASE">Studi Kasus</option>
                      </select>
                      {quizQuestions.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setQuizQuestions((prev) => prev.filter((_, i) => i !== qIdx))
                          }
                          aria-label={`Hapus soal ${qIdx + 1}`}
                          className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </div>

                  <input
                    required
                    value={q.question}
                    onChange={(e) => {
                      const next = structuredClone(quizQuestions);
                      next[qIdx].question = e.target.value;
                      setQuizQuestions(next);
                    }}
                    placeholder="Tulis pertanyaan soal di sini..."
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm"
                  />

                  <div className="grid gap-2 sm:grid-cols-2">
                    {q.options.map((opt, oIdx) => (
                      <div key={oIdx} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`correct-${q.id}`}
                          aria-label={`Kunci opsi ${String.fromCharCode(65 + oIdx)}`}
                          checked={q.correctIndex === oIdx}
                          onChange={() => {
                            const next = structuredClone(quizQuestions);
                            next[qIdx].correctIndex = oIdx;
                            setQuizQuestions(next);
                          }}
                        />
                        <input
                          required
                          disabled={q.type === "TRUE_FALSE"}
                          value={opt}
                          onChange={(e) => {
                            const next = structuredClone(quizQuestions);
                            next[qIdx].options[oIdx] = e.target.value;
                            setQuizQuestions(next);
                          }}
                          placeholder={`Opsi ${String.fromCharCode(65 + oIdx)}`}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
                        />
                      </div>
                    ))}
                  </div>

                  <input
                    required
                    value={q.explanation}
                    onChange={(e) => {
                      const next = structuredClone(quizQuestions);
                      next[qIdx].explanation = e.target.value;
                      setQuizQuestions(next);
                    }}
                    placeholder="Pembahasan jawaban benar..."
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs"
                  />
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() =>
                  setQuizQuestions((prev) => [...prev, makeEmptyQuizQuestion(prev.length + 1)])
                }
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span>Tambah Soal</span>
              </button>

              <button
                type="submit"
                disabled={savingQuiz}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0f294a] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#163a66] disabled:opacity-60"
              >
                {savingQuiz ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Save className="h-4 w-4" aria-hidden="true" />
                )}
                <span>{editingQuizId ? "Simpan Perubahan Kuis" : "Terbitkan Kuis Baru"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* PANEL 6: PENILAIAN & UMPAN BALIK */}
      <div role="tabpanel" aria-labelledby="teacher-tab-grading" hidden={activeTab !== "grading"}>
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
            <h2 className="text-lg font-extrabold text-[#0f294a]">
              Penilaian Pengumpulan LKPD &amp; Proyek Siswa
            </h2>

            {submissions.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">Belum ada tugas yang dikumpulkan siswa.</p>
            ) : (
              <div className="mt-4 space-y-4">
                {submissions.map((sub) => {
                  const draft = gradeDrafts[sub.id] || { score: "", feedback: "" };
                  return (
                    <article
                      key={sub.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-bold uppercase text-slate-700 ring-1 ring-slate-200">
                            {sub.assignmentType}
                          </span>
                          <h3 className="mt-1 text-sm font-extrabold text-slate-900">
                            {sub.studentName}{" "}
                            <span className="font-normal text-slate-500">
                              ({sub.studentClass || "Siswa"}) — {sub.assignmentTitle}
                            </span>
                          </h3>
                          <p className="text-xs text-slate-500">
                            Dikumpulkan: {sub.submittedAtLabel}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                            sub.status === "GRADED"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {sub.status === "GRADED" ? `Nilai: ${sub.score}/100` : "Perlu Dinilai"}
                        </span>
                      </div>

                      {sub.answers.length > 0 && (
                        <div className="mt-3 space-y-2 rounded-xl bg-white p-3.5 text-xs ring-1 ring-slate-200/80">
                          {sub.answers.map((ans, idx) => (
                            <div key={idx}>
                              <p className="font-bold text-slate-700">
                                {idx + 1}. {sub.questions[idx] || `Jawaban ${idx + 1}`}
                              </p>
                              <p className="mt-0.5 text-slate-600">{ans || "—"}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="mt-3 flex flex-wrap gap-3 text-xs">
                        {sub.fileUrl && (
                          <a
                            href={sub.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-3 py-1.5 font-bold text-rose-700 hover:underline"
                          >
                            <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Lampiran PDF: {sub.fileName || "Lihat Dokumen"}</span>
                          </a>
                        )}
                        {sub.videoLink && (
                          <a
                            href={sub.videoLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 font-bold text-[#1d4ed8] hover:underline"
                          >
                            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Buka Tautan Video/Dokumen</span>
                          </a>
                        )}
                      </div>

                      {sub.notes && (
                        <p className="mt-2.5 text-xs text-slate-700">
                          <strong>Catatan Siswa:</strong> {sub.notes}
                        </p>
                      )}

                      <div className="mt-4 grid gap-3 border-t border-slate-200 pt-3 sm:grid-cols-12">
                        <div className="sm:col-span-3">
                          <label
                            htmlFor={`score-${sub.id}`}
                            className="block text-[11px] font-bold text-slate-700"
                          >
                            Nilai (0–100)
                          </label>
                          <input
                            id={`score-${sub.id}`}
                            type="number"
                            min={0}
                            max={100}
                            value={draft.score}
                            onChange={(e) =>
                              setGradeDrafts((prev) => ({
                                ...prev,
                                [sub.id]: { ...draft, score: e.target.value },
                              }))
                            }
                            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold"
                          />
                        </div>
                        <div className="sm:col-span-6">
                          <label
                            htmlFor={`fb-${sub.id}`}
                            className="block text-[11px] font-bold text-slate-700"
                          >
                            Umpan Balik Guru
                          </label>
                          <input
                            id={`fb-${sub.id}`}
                            type="text"
                            value={draft.feedback}
                            onChange={(e) =>
                              setGradeDrafts((prev) => ({
                                ...prev,
                                [sub.id]: { ...draft, feedback: e.target.value },
                              }))
                            }
                            placeholder="Berikan apresiasi atau saran perbaikan..."
                            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                          />
                        </div>
                        <div className="flex items-end sm:col-span-3">
                          <button
                            type="button"
                            disabled={savingGradeId === sub.id}
                            onClick={() => handleSaveGrade(sub.id)}
                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#0f766e] px-4 py-2 text-xs font-bold text-white hover:bg-[#0d625c] disabled:opacity-60"
                          >
                            {savingGradeId === sub.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                            ) : (
                              <Save className="h-3.5 w-3.5" aria-hidden="true" />
                            )}
                            <span>Simpan Nilai</span>
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
            <div className="flex items-center gap-2">
              <MessageSquareText className="h-5 w-5 text-[#1d4ed8]" aria-hidden="true" />
              <h2 className="text-lg font-extrabold text-[#0f294a]">
                Umpan Balik Hasil Simulasi Digital Siswa
              </h2>
            </div>

            {simAttempts.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">Belum ada hasil simulasi siswa.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {simAttempts.map((sa) => (
                  <div
                    key={sa.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-bold text-slate-900">
                        {sa.studentName} ({sa.studentClass || "Siswa"}) — {sa.simulationTitle}
                      </p>
                      <span className="rounded-lg bg-blue-100 px-2.5 py-0.5 font-extrabold text-[#0f294a]">
                        Skor {sa.score}/{sa.maxScore} (
                        {Math.round((sa.score / Math.max(1, sa.maxScore)) * 100)}%) •{" "}
                        {sa.completedAtLabel}
                      </span>
                    </div>
                    {sa.reflection && (
                      <p className="mt-2 rounded-lg bg-white p-2.5 text-slate-700 ring-1 ring-slate-200/70">
                        <strong>Refleksi Siswa:</strong> {sa.reflection}
                      </p>
                    )}
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <label htmlFor={`sim-fb-${sa.id}`} className="visually-hidden">
                        Umpan balik guru untuk {sa.studentName}
                      </label>
                      <input
                        id={`sim-fb-${sa.id}`}
                        type="text"
                        value={simFeedbackDrafts[sa.id] || ""}
                        onChange={(e) =>
                          setSimFeedbackDrafts((prev) => ({ ...prev, [sa.id]: e.target.value }))
                        }
                        placeholder="Tulis umpan balik guru untuk simulasi ini..."
                        className="flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs"
                      />
                      <button
                        type="button"
                        disabled={savingSimFbId === sa.id}
                        onClick={() => handleSaveSimFeedback(sa.id)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#0f294a] px-4 py-2 text-xs font-bold text-white hover:bg-[#163a66] disabled:opacity-60"
                      >
                        {savingSimFbId === sa.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                        ) : (
                          <Save className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                        <span>Kirim Umpan Balik</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={pendingDelete?.title || "Konfirmasi Hapus"}
        description={pendingDelete?.description || ""}
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        variant="danger"
        loading={Boolean(deletingId)}
        onConfirm={executePendingDelete}
        onClose={() => setPendingDelete(null)}
      />

      {/* Toast Melayang agar Notifikasi Upload PDF / Simpan Selalu Terlihat */}
      {banner && (
        <div
          role={banner.type === "err" ? "alert" : "status"}
          className={`fixed right-5 bottom-5 z-50 flex max-w-md items-center gap-2.5 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-xl ${
            banner.type === "ok"
              ? "border-emerald-200 bg-emerald-600 text-white"
              : "border-red-200 bg-rose-600 text-white"
          }`}
        >
          {banner.type === "ok" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          <span className="flex-1">{banner.text}</span>
          <button
            type="button"
            onClick={() => setBanner(null)}
            aria-label="Tutup notifikasi"
            className="rounded-lg p-1 hover:bg-white/20"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
