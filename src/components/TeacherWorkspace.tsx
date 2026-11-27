"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  Image as ImageIcon,
  Loader2,
  MessageSquareText,
  MonitorPlay,
  Pencil,
  Plus,
  Save,
  Shuffle,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import {
  flattenLkpdQuestions,
  parseLkpdCases,
  type LkpdCase,
  type LkpdQuestion,
  type QuizQuestion,
} from "@/lib/assessment";
import type { SimulationStep } from "@/lib/simulation";
import { toEmbedVideoUrl } from "@/lib/video";
import { uploadImageClient, uploadPdfClient } from "@/lib/uploadPdf";
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
  instructions: string | null;
  customerName: string;
  customerRole: string;
  difficulty: string;
  estimatedMinutes: number;
  imageUrl: string | null;
  imageName: string | null;
  pdfUrl: string | null;
  pdfName: string | null;
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
  cases: LkpdCase[];
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
  shuffleQuestions: boolean;
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
  status: string;
  score: number;
  maxScore: number;
  fileUrl: string | null;
  fileName: string | null;
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

function makeEmptyLkpdQuestion(index: number): LkpdQuestion {
  return {
    id: `lq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${index}`,
    text: "",
  };
}

function makeEmptyLkpdCase(index: number): LkpdCase {
  return {
    id: `lc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${index}`,
    title: `Kasus ${index}. `,
    description: "",
    questions: [makeEmptyLkpdQuestion(1)],
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
  const simFormRef = useRef<HTMLFormElement | null>(null);
  const asgFormRef = useRef<HTMLFormElement | null>(null);
  const validTab = TABS.find((t) => t.id === initialTab)?.id || "students";

  const [activeTab, setActiveTab] = useState<TabId>(validTab);
  const [materialsList, setMaterialsList] = useState<TeacherMaterialItem[]>(materials);
  const [simulationsList, setSimulationsList] = useState<TeacherSimulationItem[]>(simulations);
  const [assignmentsList, setAssignmentsList] = useState<TeacherAssignmentItem[]>(assignments);
  const [quizzesList, setQuizzesList] = useState<TeacherQuizItem[]>(quizzes);
  const [submissionsList, setSubmissionsList] = useState<TeacherSubmissionItem[]>(submissions);
  const [simAttemptsList, setSimAttemptsList] = useState<TeacherSimAttemptItem[]>(simAttempts);
  const [banner, setBanner] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    endpoint: string;
    id: string;
    title: string;
    description: string;
    onAfter?: () => void;
  } | null>(null);
  const [uploadingTargetId, setUploadingTargetId] = useState<string | null>(null);
  const [uploadPercent, setUploadPercent] = useState<number>(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setMaterialsList(materials);
  }, [materials]);
  useEffect(() => {
    setSimulationsList(simulations);
  }, [simulations]);
  useEffect(() => {
    setAssignmentsList(assignments);
  }, [assignments]);
  useEffect(() => {
    setQuizzesList(quizzes);
  }, [quizzes]);
  useEffect(() => {
    setSubmissionsList(submissions);
  }, [submissions]);
  useEffect(() => {
    setSimAttemptsList(simAttempts);
  }, [simAttempts]);

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

  // ===== SIMULASI STATE (CREATE / EDIT — ROLEPLAY PDF & GAMBAR) =====
  const [editingSimId, setEditingSimId] = useState<string | null>(null);
  const [simTitle, setSimTitle] = useState("");
  const [simSubtitle, setSimSubtitle] = useState("");
  const [simContext, setSimContext] = useState("");
  const [simInstructions, setSimInstructions] = useState("");
  const [simCustomerName, setSimCustomerName] = useState("");
  const [simCustomerRole, setSimCustomerRole] = useState("");
  const [simDifficulty, setSimDifficulty] = useState<"Dasar" | "Menengah" | "Lanjut">("Dasar");
  const [simMinutes, setSimMinutes] = useState(15);
  const [simImageUrl, setSimImageUrl] = useState("");
  const [simImageName, setSimImageName] = useState("");
  const [simPdfUrl, setSimPdfUrl] = useState("");
  const [simPdfName, setSimPdfName] = useState("");
  const [uploadingSimImage, setUploadingSimImage] = useState(false);
  const [uploadingSimPdf, setUploadingSimPdf] = useState(false);
  const [simAssetFeedback, setSimAssetFeedback] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [savingSim, setSavingSim] = useState(false);

  // ===== LKPD / PROYEK STATE (CREATE / EDIT) =====
  const [editingAsgId, setEditingAsgId] = useState<string | null>(null);
  const [asgType, setAsgType] = useState<"LKPD" | "PROJECT">("LKPD");
  const [asgTitle, setAsgTitle] = useState("");
  const [asgDesc, setAsgDesc] = useState("");
  const [asgInst, setAsgInst] = useState("");
  const [asgCases, setAsgCases] = useState<LkpdCase[]>(() => [makeEmptyLkpdCase(1)]);
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
  const [quizShuffle, setQuizShuffle] = useState(true);
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
  const [simGradeDrafts, setSimGradeDrafts] = useState<
    Record<string, { score: string; feedback: string }>
  >(() =>
    Object.fromEntries(
      simAttempts.map((s) => [
        s.id,
        {
          score: s.status === "GRADED" ? String(s.score) : "",
          feedback: s.teacherFeedback || "",
        },
      ])
    )
  );
  const [savingSimFbId, setSavingSimFbId] = useState<string | null>(null);

  function notify(type: "ok" | "err", text: string) {
    setBanner({ type, text });
  }

  async function uploadPdfFile(file: File, folder: string) {
    setUploadPercent(0);
    try {
      return await uploadPdfClient(file, folder, (pct) => setUploadPercent(pct));
    } finally {
      setUploadPercent(0);
    }
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
      if (data.material) {
        const saved: TeacherMaterialItem = {
          id: data.material.id,
          order: data.material.order,
          slug: data.material.slug,
          title: data.material.title,
          subtitle: data.material.subtitle,
          summary: data.material.summary,
          content: data.material.content,
          videoUrl: data.material.videoUrl,
          pdfUrl: data.material.pdfUrl,
          pdfName: data.material.pdfName,
          durationMinutes: data.material.durationMinutes,
          activityPrompt: data.material.activityPrompt,
        };
        setMaterialsList((prev) =>
          editingMatId
            ? prev.map((item) => (item.id === editingMatId ? saved : item))
            : [...prev, saved]
        );
      }
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
      setMaterialsList((prev) =>
        prev.map((item) =>
          item.id === materialId
            ? { ...item, pdfUrl: uploaded.fileUrl, pdfName: uploaded.fileName }
            : item
        )
      );
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
      if (pendingDelete.endpoint.includes("/materials/")) {
        setMaterialsList((prev) => prev.filter((item) => item.id !== pendingDelete.id));
      } else if (pendingDelete.endpoint.includes("/simulations/")) {
        setSimulationsList((prev) => prev.filter((item) => item.id !== pendingDelete.id));
      } else if (pendingDelete.endpoint.includes("/assignments/")) {
        setAssignmentsList((prev) => prev.filter((item) => item.id !== pendingDelete.id));
      } else if (pendingDelete.endpoint.includes("/quizzes/")) {
        setQuizzesList((prev) => prev.filter((item) => item.id !== pendingDelete.id));
      }
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
    setSimInstructions(s.instructions || "");
    setSimCustomerName(s.customerName);
    setSimCustomerRole(s.customerRole);
    setSimDifficulty(
      s.difficulty === "Lanjut" || s.difficulty === "Menengah" ? s.difficulty : "Dasar"
    );
    setSimMinutes(s.estimatedMinutes);
    setSimImageUrl(s.imageUrl || "");
    setSimImageName(s.imageName || "");
    setSimPdfUrl(s.pdfUrl || "");
    setSimPdfName(s.pdfName || "");
    setSimAssetFeedback(null);
    notify("ok", `Mode Edit aktif untuk "${s.title}".`);
    requestAnimationFrame(() => {
      simFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function resetSimulationForm() {
    setEditingSimId(null);
    setSimTitle("");
    setSimSubtitle("");
    setSimContext("");
    setSimInstructions("");
    setSimCustomerName("");
    setSimCustomerRole("");
    setSimDifficulty("Dasar");
    setSimMinutes(15);
    setSimImageUrl("");
    setSimImageName("");
    setSimPdfUrl("");
    setSimPdfName("");
    setSimAssetFeedback(null);
  }

  async function handleSaveSimulation(e: React.FormEvent) {
    e.preventDefault();
    if (uploadingSimImage || uploadingSimPdf) return;
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
          instructions: simInstructions.trim() || null,
          customerName: simCustomerName,
          customerRole: simCustomerRole,
          difficulty: simDifficulty,
          estimatedMinutes: simMinutes,
          imageUrl: simImageUrl || null,
          imageName: simImageName || null,
          pdfUrl: simPdfUrl || null,
          pdfName: simPdfName || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan skenario simulasi.");
      if (data.simulation) {
        const saved: TeacherSimulationItem = {
          id: data.simulation.id,
          order: data.simulation.order,
          slug: data.simulation.slug,
          title: data.simulation.title,
          subtitle: data.simulation.subtitle,
          scenarioContext: data.simulation.scenarioContext,
          instructions: data.simulation.instructions ?? null,
          customerName: data.simulation.customerName,
          customerRole: data.simulation.customerRole,
          difficulty: data.simulation.difficulty,
          estimatedMinutes: data.simulation.estimatedMinutes,
          imageUrl: data.simulation.imageUrl ?? null,
          imageName: data.simulation.imageName ?? null,
          pdfUrl: data.simulation.pdfUrl ?? null,
          pdfName: data.simulation.pdfName ?? null,
          steps: simulationsList.find((item) => item.id === editingSimId)?.steps ?? [],
          attemptsCount:
            simulationsList.find((item) => item.id === editingSimId)?.attemptsCount ?? 0,
        };
        setSimulationsList((prev) =>
          editingSimId
            ? prev.map((item) => (item.id === editingSimId ? saved : item))
            : [...prev, saved]
        );
      }
      resetSimulationForm();
      notify("ok", data.message);
      router.refresh();
    } catch (err) {
      notify("err", err instanceof Error ? err.message : "Gagal menyimpan simulasi.");
    } finally {
      setSavingSim(false);
    }
  }

  async function handleAttachSimulationImage(simId: string, file?: File) {
    if (!file) return;
    setUploadingTargetId(`sim-img-${simId}`);
    setBanner(null);
    try {
      const uploaded = await uploadImageClient(file, "simulasi");
      const res = await fetch(`/api/teacher/simulations/${simId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: uploaded.fileUrl, imageName: uploaded.fileName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menautkan gambar skenario.");
      setSimulationsList((prev) =>
        prev.map((item) =>
          item.id === simId
            ? { ...item, imageUrl: uploaded.fileUrl, imageName: uploaded.fileName }
            : item
        )
      );
      if (editingSimId === simId) {
        setSimImageUrl(uploaded.fileUrl);
        setSimImageName(uploaded.fileName);
        setSimAssetFeedback({
          type: "ok",
          text: `Gambar "${uploaded.fileName}" sudah terpasang dan langsung tampil di halaman siswa.`,
        });
      }
      notify("ok", `Gambar "${uploaded.fileName}" berhasil dipasang ke skenario simulasi!`);
      router.refresh();
    } catch (err) {
      notify("err", err instanceof Error ? err.message : "Gagal mengunggah gambar.");
    } finally {
      setUploadingTargetId(null);
    }
  }

  async function handleAttachSimulationPdf(simId: string, file?: File) {
    if (!file) return;
    setUploadingTargetId(`sim-pdf-${simId}`);
    setBanner(null);
    try {
      const uploaded = await uploadPdfFile(file, "simulasi");
      const res = await fetch(`/api/teacher/simulations/${simId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfUrl: uploaded.fileUrl, pdfName: uploaded.fileName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menautkan PDF soal.");
      setSimulationsList((prev) =>
        prev.map((item) =>
          item.id === simId
            ? { ...item, pdfUrl: uploaded.fileUrl, pdfName: uploaded.fileName }
            : item
        )
      );
      if (editingSimId === simId) {
        setSimPdfUrl(uploaded.fileUrl);
        setSimPdfName(uploaded.fileName);
        setSimAssetFeedback({
          type: "ok",
          text: `PDF soal "${uploaded.fileName}" sudah terpasang di skenario ini.`,
        });
      }
      notify("ok", `PDF soal "${uploaded.fileName}" berhasil dipasang ke skenario simulasi!`);
      router.refresh();
    } catch (err) {
      notify("err", err instanceof Error ? err.message : "Gagal mengunggah PDF soal.");
    } finally {
      setUploadingTargetId(null);
    }
  }

  // ---- LKPD / PROYEK HANDLERS ----
  function startEditAssignment(a: TeacherAssignmentItem) {
    setEditingAsgId(a.id);
    setAsgType(a.type === "PROJECT" ? "PROJECT" : "LKPD");
    setAsgTitle(a.title);
    setAsgDesc(a.description);
    setAsgInst(a.instructions);
    setAsgCases(
      a.cases.length > 0
        ? structuredClone(a.cases).map((c) => ({
            ...c,
            questions: c.questions.length > 0 ? c.questions : [makeEmptyLkpdQuestion(1)],
          }))
        : [makeEmptyLkpdCase(1)]
    );
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
    setAsgCases([makeEmptyLkpdCase(1)]);
    setAsgDueDate("");
    setAsgPdfUrl("");
    setAsgPdfName("");
    setAsgPdfFeedback(null);
  }

  function moveLkpdCase(caseIdx: number, direction: -1 | 1) {
    setAsgCases((prev) => {
      const target = caseIdx + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = structuredClone(prev);
      const [moved] = next.splice(caseIdx, 1);
      next.splice(target, 0, moved);
      return next;
    });
  }

  function moveLkpdQuestion(caseIdx: number, qIdx: number, direction: -1 | 1) {
    setAsgCases((prev) => {
      const next = structuredClone(prev);
      const qs = next[caseIdx]?.questions;
      if (!qs) return prev;
      const target = qIdx + direction;
      if (target < 0 || target >= qs.length) return prev;
      const [moved] = qs.splice(qIdx, 1);
      qs.splice(target, 0, moved);
      return next;
    });
  }

  async function handleSaveAssignment(e: React.FormEvent) {
    e.preventDefault();
    if (uploadingAsgPdf) return;
    setSavingAsg(true);
    setBanner(null);
    try {
      const cleanedCases: LkpdCase[] =
        asgType === "LKPD"
          ? asgCases
              .map((c, idx) => ({
                id: c.id || `case-${idx + 1}`,
                title: c.title.trim(),
                description: c.description.trim(),
                questions: c.questions
                  .map((q, qIdx) => ({ id: q.id || `c${idx + 1}-q${qIdx + 1}`, text: q.text.trim() }))
                  .filter((q) => q.text.length > 0),
              }))
              .filter((c) => c.title.length > 0 || c.description.length > 0 || c.questions.length > 0)
          : [];

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
          cases: asgType === "LKPD" ? cleanedCases : undefined,
          pdfUrl: asgPdfUrl || null,
          pdfName: asgPdfName || null,
          dueDate: asgDueDate || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan tugas.");
      if (data.assignment) {
        const parsedCases = parseLkpdCases(data.assignment.questionsJson, data.assignment.caseSummary);
        const saved: TeacherAssignmentItem = {
          id: data.assignment.id,
          type: data.assignment.type,
          title: data.assignment.title,
          description: data.assignment.description,
          instructions: data.assignment.instructions,
          caseSummary: data.assignment.caseSummary,
          cases: parsedCases,
          questions: flattenLkpdQuestions(parsedCases).map((q) => q.text),
          pdfUrl: data.assignment.pdfUrl,
          pdfName: data.assignment.pdfName,
          dueDateIso: asgDueDate || null,
          dueDateLabel: asgDueDate
            ? new Intl.DateTimeFormat("id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric",
              }).format(new Date(asgDueDate))
            : "Fleksibel",
          submissionsCount:
            assignmentsList.find((item) => item.id === editingAsgId)?.submissionsCount ?? 0,
        };
        setAssignmentsList((prev) =>
          editingAsgId
            ? prev.map((item) => (item.id === editingAsgId ? saved : item))
            : [...prev, saved]
        );
      }
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
      setAssignmentsList((prev) =>
        prev.map((item) =>
          item.id === assignmentId
            ? { ...item, pdfUrl: uploaded.fileUrl, pdfName: uploaded.fileName }
            : item
        )
      );
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
    setQuizShuffle(q.shuffleQuestions);
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
    setQuizShuffle(true);
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
          shuffleQuestions: quizShuffle,
          questions: cleanedQuestions,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan kuis.");
      if (data.quiz) {
        const saved: TeacherQuizItem = {
          id: data.quiz.id,
          title: data.quiz.title,
          description: data.quiz.description,
          category: data.quiz.category,
          timeLimitMinutes: data.quiz.timeLimitMinutes,
          passingScore: data.quiz.passingScore,
          shuffleQuestions: Boolean(data.quiz.shuffleQuestions ?? quizShuffle),
          questions: cleanedQuestions,
          attemptsCount:
            quizzesList.find((item) => item.id === editingQuizId)?.attemptsCount ?? 0,
        };
        setQuizzesList((prev) =>
          editingQuizId
            ? prev.map((item) => (item.id === editingQuizId ? saved : item))
            : [...prev, saved]
        );
      }
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
      setSubmissionsList((prev) =>
        prev.map((item) =>
          item.id === submissionId
            ? { ...item, status: "GRADED", score: numScore, teacherFeedback: draft?.feedback || "" }
            : item
        )
      );
      notify("ok", data.message);
      router.refresh();
    } catch (err) {
      notify("err", err instanceof Error ? err.message : "Gagal menilai tugas.");
    } finally {
      setSavingGradeId(null);
    }
  }

  async function handleSaveSimFeedback(attemptId: string) {
    const draft = simGradeDrafts[attemptId] || { score: "", feedback: "" };
    const numScore = Number(draft.score);
    if (draft.score.trim() === "" || Number.isNaN(numScore) || numScore < 0 || numScore > 100) {
      notify("err", "Masukkan nilai skenario simulasi antara 0 sampai 100.");
      return;
    }
    setSavingSimFbId(attemptId);
    setBanner(null);
    try {
      const res = await fetch(`/api/teacher/simulations/${attemptId}/feedback`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score: numScore,
          teacherFeedback: draft.feedback.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan nilai simulasi.");
      setSimAttemptsList((prev) =>
        prev.map((item) =>
          item.id === attemptId
            ? {
                ...item,
                status: "GRADED",
                score: Math.round(numScore),
                maxScore: 100,
                teacherFeedback: draft.feedback.trim() || null,
              }
            : item
        )
      );
      notify("ok", data.message);
      router.refresh();
    } catch (err) {
      notify("err", err instanceof Error ? err.message : "Gagal menyimpan nilai simulasi.");
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

  const pendingGrading =
    submissionsList.filter((s) => s.status !== "GRADED").length +
    simAttemptsList.filter((sa) => sa.status !== "GRADED").length;

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
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-[#0f294a]">
                Pemantauan Kemajuan Belajar Siswa
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Rekap real-time penyelesaian materi, simulasi, rata-rata kuis, dan tugas seluruh
                siswa. Nilai lengkap hanya terlihat oleh guru dan dapat diekspor ke Excel.
              </p>
            </div>
            <a
              href="/api/teacher/export-grades"
              download
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700"
            >
              <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
              <span>Export Nilai ke Excel (.xlsx)</span>
            </a>
          </div>
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
              Daftar Materi &amp; Lampiran PDF ({materialsList.length})
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Unggah PDF langsung (maks. 15 MB), edit isi materi, atau hapus materi yang tidak diperlukan.
            </p>

            <div className="mt-4 divide-y divide-slate-100">
              {materialsList.map((m) => (
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
                      <span>
                        {uploadingTargetId === m.id
                          ? `Mengunggah${uploadPercent > 0 ? ` ${uploadPercent}%` : "..."}`
                          : m.pdfUrl
                            ? "Ganti PDF"
                            : "Upload PDF"}
                      </span>
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
                  Lampiran File PDF Materi (Opsional — maks. 15 MB)
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
                          setMaterialsList((prev) =>
                            prev.map((item) =>
                              item.id === editingMatId
                                ? { ...item, pdfUrl: up.fileUrl, pdfName: up.fileName }
                                : item
                            )
                          );
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
                            setMaterialsList((prev) =>
                              prev.map((item) =>
                                item.id === editingMatId
                                  ? { ...item, pdfUrl: null, pdfName: null }
                                  : item
                              )
                            );
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

      {/* PANEL 3: KELOLA SIMULASI / SKENARIO ROLEPLAY (GAMBAR & PDF) */}
      <div
        role="tabpanel"
        aria-labelledby="teacher-tab-simulations"
        hidden={activeTab !== "simulations"}
      >
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
            <h2 className="text-lg font-extrabold text-[#0f294a]">
              Daftar Skenario Simulasi &amp; Tugas Roleplay ({simulationsList.length})
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Unggah gambar ilustrasi (PNG/JPG/WEBP maks. 4 MB) atau file PDF soal skenario (maks.
              15 MB). Siswa mengunduh soal lalu mengumpulkan naskah dialog roleplay dalam format PDF.
            </p>
            <div className="mt-4 divide-y divide-slate-100">
              {simulationsList.map((s) => (
                <div
                  key={s.id}
                  className="flex flex-col justify-between gap-3 py-4 lg:flex-row lg:items-center"
                >
                  <div className="flex items-start gap-3.5">
                    {s.imageUrl ? (
                      <a
                        href={s.imageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-14 w-20 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
                      >
                        <img
                          src={s.imageUrl}
                          alt={`Ilustrasi ${s.title}`}
                          className="h-full w-full object-cover"
                        />
                      </a>
                    ) : (
                      <div className="flex h-14 w-20 shrink-0 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-400">
                        <ImageIcon className="h-5 w-5" aria-hidden="true" />
                      </div>
                    )}
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
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
                        Tamu: {s.customerName} ({s.customerRole}) • Tingkat {s.difficulty} •{" "}
                        {s.attemptsCount} pengumpulan PDF siswa
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px]">
                        {s.imageUrl ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 font-semibold text-sky-700">
                            <ImageIcon className="h-3 w-3" aria-hidden="true" />
                            <span>Gambar terpasang</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">Belum ada gambar</span>
                        )}
                        {s.pdfUrl ? (
                          <a
                            href={s.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700 hover:underline"
                          >
                            <FileText className="h-3 w-3" aria-hidden="true" />
                            <span>{s.pdfName || "PDF Soal"}</span>
                          </a>
                        ) : (
                          <span className="text-slate-400">• Soal teks cetak PDF otomatis</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <label
                      htmlFor={`sim-img-upload-${s.id}`}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-800 hover:bg-sky-100"
                    >
                      {uploadingTargetId === `sim-img-${s.id}` ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      <span>{s.imageUrl ? "Ganti Gambar" : "Upload Gambar"}</span>
                    </label>
                    <input
                      id={`sim-img-upload-${s.id}`}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="visually-hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        e.target.value = "";
                        handleAttachSimulationImage(s.id, f);
                      }}
                    />

                    <label
                      htmlFor={`sim-pdf-upload-${s.id}`}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100"
                    >
                      {uploadingTargetId === `sim-pdf-${s.id}` ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      <span>
                        {uploadingTargetId === `sim-pdf-${s.id}`
                          ? `${uploadPercent}%`
                          : s.pdfUrl
                            ? "Ganti PDF"
                            : "Upload PDF"}
                      </span>
                    </label>
                    <input
                      id={`sim-pdf-upload-${s.id}`}
                      type="file"
                      accept=".pdf,application/pdf"
                      className="visually-hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        e.target.value = "";
                        handleAttachSimulationPdf(s.id, f);
                      }}
                    />

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
                          description: `Skenario "${s.title}" beserta seluruh unggahan PDF siswa akan dihapus permanen.`,
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

          {/* Form Tambah / Edit Simulasi Roleplay PDF + Gambar */}
          <form
            ref={simFormRef}
            onSubmit={handleSaveSimulation}
            className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-[#0f294a]">
                  {editingSimId
                    ? "Edit Skenario Simulasi Roleplay"
                    : "Tambah Skenario Simulasi Roleplay Baru"}
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Skenario ini dapat diunduh siswa sebagai PDF soal roleplay, lalu siswa menyusun
                  dialog dan mengunggah hasilnya dalam format PDF.
                </p>
              </div>
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
                  Judul Skenario Simulasi
                </label>
                <input
                  id="sim-title"
                  required
                  value={simTitle}
                  onChange={(e) => setSimTitle(e.target.value)}
                  placeholder="Contoh: Tamu dengan Janji Temu"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="sim-sub" className="block text-xs font-bold text-slate-700">
                  Subjudul / Fokus Materi
                </label>
                <input
                  id="sim-sub"
                  required
                  value={simSubtitle}
                  onChange={(e) => setSimSubtitle(e.target.value)}
                  placeholder="Contoh: Materi 1 • Penerimaan Tamu Langsung"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="sim-cust" className="block text-xs font-bold text-slate-700">
                  Nama Tamu / Penelepon
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
                  max={120}
                  value={simMinutes}
                  onChange={(e) => setSimMinutes(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="sim-ctx" className="block text-xs font-bold text-slate-700">
                  Teks Soal &amp; Konteks Skenario Roleplay
                </label>
                <textarea
                  id="sim-ctx"
                  required
                  rows={4}
                  value={simContext}
                  onChange={(e) => setSimContext(e.target.value)}
                  placeholder="Tuliskan situasi lengkap, kronologi kedatangan/telepon tamu, dan tantangan yang harus diselesaikan dalam dialog roleplay siswa..."
                  className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="sim-inst" className="block text-xs font-bold text-slate-700">
                  Panduan Tugas Roleplay &amp; Pembuatan Dialog (Opsional)
                </label>
                <textarea
                  id="sim-inst"
                  rows={3}
                  value={simInstructions}
                  onChange={(e) => setSimInstructions(e.target.value)}
                  placeholder="Contoh: 1) Buat naskah dialog berpasangan (Resepsionis & Tamu) menerapkan 3S. 2) Sertakan pengisian buku tamu. 3) Simpan dialog menjadi PDF lalu unggah."
                  className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm"
                />
              </div>

              {/* Upload Gambar Ilustrasi Skenario */}
              <div className="rounded-2xl border border-dashed border-sky-300 bg-sky-50/40 p-4">
                <p className="text-xs font-extrabold text-sky-900">
                  Gambar Ilustrasi Skenario (PNG/JPG/WEBP, maks. 4 MB)
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Tampil di kartu skenario dan lembar soal roleplay yang dicetak siswa.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <label
                    htmlFor="sim-form-img"
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-sky-300 bg-white px-3.5 py-2 text-xs font-bold text-sky-800 hover:bg-sky-50"
                  >
                    {uploadingSimImage ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    <span>
                      {uploadingSimImage
                        ? "Mengunggah Gambar..."
                        : simImageUrl
                          ? "Ganti Gambar"
                          : "Pilih Gambar Skenario"}
                    </span>
                  </label>
                  <input
                    id="sim-form-img"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="visually-hidden"
                    disabled={uploadingSimImage}
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (!f) return;
                      setUploadingSimImage(true);
                      setSimAssetFeedback(null);
                      try {
                        const up = await uploadImageClient(f, "simulasi");
                        setSimImageUrl(up.fileUrl);
                        setSimImageName(up.fileName);
                        if (editingSimId) {
                          const patchRes = await fetch(`/api/teacher/simulations/${editingSimId}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              imageUrl: up.fileUrl,
                              imageName: up.fileName,
                            }),
                          });
                          const patchData = await patchRes.json();
                          if (!patchRes.ok) {
                            throw new Error(patchData.error || "Gagal menyimpan gambar skenario.");
                          }
                          setSimulationsList((prev) =>
                            prev.map((item) =>
                              item.id === editingSimId
                                ? { ...item, imageUrl: up.fileUrl, imageName: up.fileName }
                                : item
                            )
                          );
                          setSimAssetFeedback({
                            type: "ok",
                            text: `Gambar "${up.fileName}" langsung tersimpan ke skenario ini.`,
                          });
                          router.refresh();
                        } else {
                          setSimAssetFeedback({
                            type: "ok",
                            text: `Gambar "${up.fileName}" terunggah. Klik "Terbitkan Skenario" untuk menyimpan.`,
                          });
                        }
                      } catch (err) {
                        const msg = err instanceof Error ? err.message : "Gagal unggah gambar.";
                        setSimAssetFeedback({ type: "err", text: msg });
                        notify("err", msg);
                      } finally {
                        setUploadingSimImage(false);
                      }
                    }}
                  />
                  {simImageUrl && (
                    <button
                      type="button"
                      onClick={async () => {
                        setSimImageUrl("");
                        setSimImageName("");
                        if (editingSimId) {
                          await fetch(`/api/teacher/simulations/${editingSimId}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ imageUrl: null, imageName: null }),
                          });
                          setSimulationsList((prev) =>
                            prev.map((item) =>
                              item.id === editingSimId
                                ? { ...item, imageUrl: null, imageName: null }
                                : item
                            )
                          );
                          router.refresh();
                        }
                      }}
                      className="text-xs font-semibold text-rose-600 hover:underline"
                    >
                      Hapus Gambar
                    </button>
                  )}
                </div>
                {simImageUrl && (
                  <div className="mt-3 overflow-hidden rounded-xl border border-sky-200 bg-white">
                    <img
                      src={simImageUrl}
                      alt={simImageName || "Pratinjau gambar skenario"}
                      className="max-h-40 w-full object-contain"
                    />
                  </div>
                )}
              </div>

              {/* Upload PDF Soal Skenario */}
              <div className="rounded-2xl border border-dashed border-rose-300 bg-rose-50/40 p-4">
                <p className="text-xs font-extrabold text-rose-900">
                  Lampiran File PDF Soal Roleplay (Opsional, maks. 15 MB)
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Jika kosong, siswa tetap bisa mengunduh/mencetak teks soal di atas menjadi PDF.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <label
                    htmlFor="sim-form-pdf"
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-rose-300 bg-white px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50"
                  >
                    {uploadingSimPdf ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    <span>
                      {uploadingSimPdf
                        ? `Mengunggah PDF... ${uploadPercent}%`
                        : simPdfUrl
                          ? "Ganti PDF Soal"
                          : "Pilih File PDF Soal"}
                    </span>
                  </label>
                  <input
                    id="sim-form-pdf"
                    type="file"
                    accept=".pdf,application/pdf"
                    className="visually-hidden"
                    disabled={uploadingSimPdf}
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (!f) return;
                      setUploadingSimPdf(true);
                      setSimAssetFeedback(null);
                      try {
                        const up = await uploadPdfFile(f, "simulasi");
                        setSimPdfUrl(up.fileUrl);
                        setSimPdfName(up.fileName);
                        if (editingSimId) {
                          const patchRes = await fetch(`/api/teacher/simulations/${editingSimId}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              pdfUrl: up.fileUrl,
                              pdfName: up.fileName,
                            }),
                          });
                          const patchData = await patchRes.json();
                          if (!patchRes.ok) {
                            throw new Error(patchData.error || "Gagal menyimpan PDF skenario.");
                          }
                          setSimulationsList((prev) =>
                            prev.map((item) =>
                              item.id === editingSimId
                                ? { ...item, pdfUrl: up.fileUrl, pdfName: up.fileName }
                                : item
                            )
                          );
                          setSimAssetFeedback({
                            type: "ok",
                            text: `PDF soal "${up.fileName}" langsung tersimpan ke skenario ini.`,
                          });
                          router.refresh();
                        } else {
                          setSimAssetFeedback({
                            type: "ok",
                            text: `PDF "${up.fileName}" terunggah. Klik "Terbitkan Skenario" untuk menyimpan.`,
                          });
                        }
                      } catch (err) {
                        const msg = err instanceof Error ? err.message : "Gagal unggah PDF.";
                        setSimAssetFeedback({ type: "err", text: msg });
                        notify("err", msg);
                      } finally {
                        setUploadingSimPdf(false);
                      }
                    }}
                  />
                  {simPdfUrl && (
                    <>
                      <a
                        href={simPdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
                      >
                        <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                        <span className="max-w-[180px] truncate">{simPdfName || "Soal.pdf"}</span>
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </a>
                      <button
                        type="button"
                        onClick={async () => {
                          setSimPdfUrl("");
                          setSimPdfName("");
                          if (editingSimId) {
                            await fetch(`/api/teacher/simulations/${editingSimId}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ pdfUrl: null, pdfName: null }),
                            });
                            setSimulationsList((prev) =>
                              prev.map((item) =>
                                item.id === editingSimId
                                  ? { ...item, pdfUrl: null, pdfName: null }
                                  : item
                              )
                            );
                            router.refresh();
                          }
                        }}
                        className="text-xs font-semibold text-rose-600 hover:underline"
                      >
                        Lepas PDF
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {simAssetFeedback && (
              <p
                role={simAssetFeedback.type === "err" ? "alert" : "status"}
                className={`text-xs font-semibold ${
                  simAssetFeedback.type === "ok" ? "text-emerald-700" : "text-rose-600"
                }`}
              >
                {simAssetFeedback.text}
              </p>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingSim || uploadingSimImage || uploadingSimPdf}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0f766e] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#0d625c] disabled:opacity-60"
              >
                {savingSim || uploadingSimImage || uploadingSimPdf ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Save className="h-4 w-4" aria-hidden="true" />
                )}
                <span>
                  {editingSimId ? "Simpan Perubahan Skenario" : "Terbitkan Skenario Baru"}
                </span>
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
              Daftar LKPD &amp; Proyek Praktik ({assignmentsList.length})
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Unggah PDF LKPD/Panduan (maks. 15 MB), edit petunjuk &amp; pertanyaan analisis, atau hapus tugas.
            </p>

            <div className="mt-4 divide-y divide-slate-100">
              {assignmentsList.map((a) => (
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
                      Tenggat: {a.dueDateLabel}
                      {a.type === "LKPD" && (
                        <> • {a.cases.length} kasus • {a.questions.length} pertanyaan</>
                      )}{" "}
                      • {a.submissionsCount} pengumpulan siswa
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
                <div className="space-y-4 sm:col-span-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-teal-200 bg-teal-50/60 px-4 py-3">
                    <div>
                      <p className="text-xs font-extrabold text-[#0f294a]">
                        Struktur Kasus &amp; Pertanyaan Analisis LKPD
                      </p>
                      <p className="text-[11px] text-slate-600">
                        {asgCases.length} kasus •{" "}
                        {asgCases.reduce(
                          (acc, c) =>
                            acc + c.questions.filter((q) => q.text.trim().length > 0).length,
                          0
                        )}{" "}
                        pertanyaan aktif (judul &amp; deskripsi kasus tidak dihitung sebagai pertanyaan)
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setAsgCases((prev) => [...prev, makeEmptyLkpdCase(prev.length + 1)])
                      }
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#0f766e] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#0d625c]"
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Tambah Kasus</span>
                    </button>
                  </div>

                  {asgCases.map((c, cIdx) => (
                    <div
                      key={c.id}
                      className="space-y-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#0f294a] px-2.5 py-1 text-xs font-bold text-white">
                          Kasus #{cIdx + 1}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={cIdx === 0}
                            onClick={() => moveLkpdCase(cIdx, -1)}
                            aria-label={`Pindahkan Kasus ${cIdx + 1} ke atas`}
                            title="Naikkan urutan kasus"
                            className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                          >
                            <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            disabled={cIdx === asgCases.length - 1}
                            onClick={() => moveLkpdCase(cIdx, 1)}
                            aria-label={`Pindahkan Kasus ${cIdx + 1} ke bawah`}
                            title="Turunkan urutan kasus"
                            className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                          >
                            <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                          {asgCases.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                setAsgCases((prev) => prev.filter((_, idx) => idx !== cIdx))
                              }
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100"
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>Hapus Kasus</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor={`asg-case-title-${c.id}`}
                          className="block text-xs font-bold text-slate-700"
                        >
                          Judul Kasus
                        </label>
                        <input
                          id={`asg-case-title-${c.id}`}
                          required
                          value={c.title}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAsgCases((prev) =>
                              prev.map((item, idx) =>
                                idx === cIdx ? { ...item, title: val } : item
                              )
                            );
                          }}
                          placeholder={`Contoh: Kasus ${cIdx + 1}. Tamu dengan Janji Temu`}
                          className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-900"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor={`asg-case-desc-${c.id}`}
                          className="block text-xs font-bold text-slate-700"
                        >
                          Deskripsi / Ringkasan Kasus (Tampil sebagai teks bacaan siswa, bukan pertanyaan)
                        </label>
                        <textarea
                          id={`asg-case-desc-${c.id}`}
                          rows={3}
                          value={c.description}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAsgCases((prev) =>
                              prev.map((item, idx) =>
                                idx === cIdx ? { ...item, description: val } : item
                              )
                            );
                          }}
                          placeholder="Tuliskan skenario atau cerita kasus perkantoran untuk dianalisis siswa..."
                          className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900"
                        />
                      </div>

                      {/* Daftar Pertanyaan Milik Kasus Ini */}
                      <div className="space-y-2.5 pt-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700">
                            Daftar Pertanyaan Kasus #{cIdx + 1} ({c.questions.length})
                          </span>
                        </div>

                        {c.questions.map((q, qIdx) => (
                          <div key={q.id} className="flex items-start gap-2">
                            <span className="mt-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-extrabold text-teal-900">
                              {qIdx + 1}
                            </span>
                            <input
                              aria-label={`Pertanyaan ${qIdx + 1} pada Kasus ${cIdx + 1}`}
                              value={q.text}
                              onChange={(e) => {
                                const val = e.target.value;
                                setAsgCases((prev) =>
                                  prev.map((item, idx) =>
                                    idx === cIdx
                                      ? {
                                          ...item,
                                          questions: item.questions.map((qItem, qi) =>
                                            qi === qIdx ? { ...qItem, text: val } : qItem
                                          ),
                                        }
                                      : item
                                  )
                                );
                              }}
                              placeholder={`Tuliskan pertanyaan nomor ${qIdx + 1}...`}
                              className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                            />
                            <div className="flex shrink-0 items-center gap-1 pt-0.5">
                              <button
                                type="button"
                                disabled={qIdx === 0}
                                onClick={() => moveLkpdQuestion(cIdx, qIdx, -1)}
                                aria-label={`Naikkan pertanyaan ${qIdx + 1}`}
                                title="Naikkan urutan pertanyaan"
                                className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                              >
                                <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                disabled={qIdx === c.questions.length - 1}
                                onClick={() => moveLkpdQuestion(cIdx, qIdx, 1)}
                                aria-label={`Turunkan pertanyaan ${qIdx + 1}`}
                                title="Turunkan urutan pertanyaan"
                                className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                              >
                                <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setAsgCases((prev) =>
                                    prev.map((item, idx) =>
                                      idx === cIdx
                                        ? {
                                            ...item,
                                            questions: item.questions.filter((_, qi) => qi !== qIdx),
                                          }
                                        : item
                                    )
                                  )
                                }
                                aria-label={`Hapus pertanyaan ${qIdx + 1}`}
                                title="Hapus pertanyaan"
                                className="rounded-lg border border-rose-200 bg-white p-1.5 text-rose-600 hover:bg-rose-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                              </button>
                            </div>
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={() =>
                            setAsgCases((prev) =>
                              prev.map((item, idx) =>
                                idx === cIdx
                                  ? {
                                      ...item,
                                      questions: [
                                        ...item.questions,
                                        makeEmptyLkpdQuestion(item.questions.length + 1),
                                      ],
                                    }
                                  : item
                              )
                            )
                          }
                          className="inline-flex items-center gap-1.5 rounded-xl border border-teal-300 bg-white px-3 py-1.5 text-xs font-bold text-[#0f766e] hover:bg-teal-50"
                        >
                          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Tambah Pertanyaan</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="sm:col-span-2">
                <span className="block text-xs font-bold text-slate-700">
                  Upload File PDF LKPD / Panduan Proyek (Opsional — maks. 15 MB)
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
                          setAssignmentsList((prev) =>
                            prev.map((item) =>
                              item.id === editingAsgId
                                ? { ...item, pdfUrl: up.fileUrl, pdfName: up.fileName }
                                : item
                            )
                          );
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
              Daftar Kuis Interaktif ({quizzesList.length})
            </h2>
            <div className="mt-4 divide-y divide-slate-100">
              {quizzesList.map((q) => (
                <div
                  key={q.id}
                  className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-bold uppercase text-indigo-700">
                        {q.category}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        1x Kesempatan
                      </span>
                      {q.shuffleQuestions && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                          <Shuffle className="h-2.5 w-2.5" aria-hidden="true" />
                          <span>Acak Soal</span>
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm font-bold text-slate-900">{q.title}</p>
                    <p className="text-xs text-slate-500">
                      {q.questions.length} soal • {q.timeLimitMinutes} menit • KKM {q.passingScore}{" "}
                      • {q.attemptsCount} siswa sudah mengerjakan
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
              <div className="sm:col-span-2">
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-violet-200 bg-violet-50/60 px-4 py-3 text-xs font-semibold text-violet-950">
                  <input
                    type="checkbox"
                    checked={quizShuffle}
                    onChange={(e) => setQuizShuffle(e.target.checked)}
                    className="h-4 w-4 rounded border-violet-300 text-violet-600 focus:ring-violet-500"
                  />
                  <span className="flex items-center gap-1.5">
                    <Shuffle className="h-3.5 w-3.5 text-violet-600" aria-hidden="true" />
                    <span>
                      Acak urutan soal secara otomatis untuk setiap siswa (kuis hanya bisa
                      dikerjakan 1x per siswa dan nilai tidak ditampilkan di halaman siswa)
                    </span>
                  </span>
                </label>
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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-extrabold text-[#0f294a]">
                  Penilaian Pengumpulan LKPD &amp; Proyek Siswa
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Nilai yang Anda simpan masuk ke rekap guru (tidak ditampilkan ke siswa) dan siap
                  diekspor ke Excel.
                </p>
              </div>
              <a
                href="/api/teacher/export-grades"
                download
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700"
              >
                <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
                <span>Export Semua Nilai (.xlsx)</span>
              </a>
            </div>

            {submissionsList.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">Belum ada tugas yang dikumpulkan siswa.</p>
            ) : (
              <div className="mt-4 space-y-4">
                {submissionsList.map((sub) => {
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
                Penilaian Skenario Simulasi Roleplay (PDF Dialog Siswa)
              </h2>
            </div>

            {simAttemptsList.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">
                Belum ada unggahan PDF dialog roleplay dari siswa.
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                {simAttemptsList.map((sa) => {
                  const draft = simGradeDrafts[sa.id] || {
                    score: sa.status === "GRADED" ? String(sa.score) : "",
                    feedback: sa.teacherFeedback || "",
                  };
                  return (
                    <article
                      key={sa.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-xs"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-extrabold text-slate-900">
                            {sa.studentName}{" "}
                            <span className="font-normal text-slate-500">
                              ({sa.studentClass || "Siswa"}) — {sa.simulationTitle}
                            </span>
                          </p>
                          <p className="mt-0.5 text-slate-500">Dikirim: {sa.completedAtLabel}</p>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                            sa.status === "GRADED"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {sa.status === "GRADED" ? `Nilai: ${sa.score}/100` : "Perlu Dinilai"}
                        </span>
                      </div>

                      {sa.fileUrl && (
                        <div className="mt-3">
                          <a
                            href={sa.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-xl bg-rose-50 px-3.5 py-2 font-bold text-rose-700 ring-1 ring-rose-200/80 hover:bg-rose-100"
                          >
                            <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Lihat PDF Dialog Siswa: {sa.fileName || "DialogRoleplay.pdf"}</span>
                            <ExternalLink className="h-3 w-3" aria-hidden="true" />
                          </a>
                        </div>
                      )}

                      {sa.reflection && (
                        <p className="mt-2.5 rounded-lg bg-white p-2.5 text-slate-700 ring-1 ring-slate-200/70">
                          <strong>Catatan / Anggota Kelompok:</strong> {sa.reflection}
                        </p>
                      )}

                      <div className="mt-3 grid gap-3 border-t border-slate-200 pt-3 sm:grid-cols-12">
                        <div className="sm:col-span-3">
                          <label
                            htmlFor={`sim-score-${sa.id}`}
                            className="block text-[11px] font-bold text-slate-700"
                          >
                            Nilai (0–100)
                          </label>
                          <input
                            id={`sim-score-${sa.id}`}
                            type="number"
                            min={0}
                            max={100}
                            value={draft.score}
                            onChange={(e) =>
                              setSimGradeDrafts((prev) => ({
                                ...prev,
                                [sa.id]: { ...draft, score: e.target.value },
                              }))
                            }
                            placeholder="0–100"
                            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold"
                          />
                        </div>
                        <div className="sm:col-span-6">
                          <label
                            htmlFor={`sim-fb-${sa.id}`}
                            className="block text-[11px] font-bold text-slate-700"
                          >
                            Umpan Balik Guru (Opsional)
                          </label>
                          <input
                            id={`sim-fb-${sa.id}`}
                            type="text"
                            value={draft.feedback}
                            onChange={(e) =>
                              setSimGradeDrafts((prev) => ({
                                ...prev,
                                [sa.id]: { ...draft, feedback: e.target.value },
                              }))
                            }
                            placeholder="Tulis apresiasi atau catatan perbaikan dialog roleplay..."
                            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm"
                          />
                        </div>
                        <div className="flex items-end sm:col-span-3">
                          <button
                            type="button"
                            disabled={savingSimFbId === sa.id}
                            onClick={() => handleSaveSimFeedback(sa.id)}
                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#0f294a] px-4 py-2 text-xs font-bold text-white hover:bg-[#163a66] disabled:opacity-60"
                          >
                            {savingSimFbId === sa.id ? (
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
