"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";

interface AuthFormProps {
  mode: "login" | "register";
  initialRole?: "student" | "teacher" | "admin";
}

export function AuthForm({ mode, initialRole = "student" }: AuthFormProps) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const announcerRef = useRef<HTMLDivElement | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [identityNo, setIdentityNo] = useState("");
  const [classCode, setClassCode] = useState("MPLB11A");
  const [role, setRole] = useState<"STUDENT" | "TEACHER">(
    initialRole === "teacher" ? "TEACHER" : "STUDENT"
  );
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Sinkronisasi ARIA untuk validasi pasca-interaksi (:user-invalid + fallback)
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    const supportsUserInvalid =
      typeof CSS !== "undefined" && CSS.supports("selector(:user-invalid)");
    const dirtyMap = new WeakMap<Element, { interacted: boolean; blurred: boolean }>();

    const linkError = (el: HTMLElement, shown: boolean) => {
      const errorId = el.dataset.error;
      if (!errorId) return;
      const ids = (el.getAttribute("aria-describedby") || "")
        .split(/\s+/)
        .filter((id) => id && id !== errorId);
      if (shown) ids.push(errorId);
      if (ids.length) el.setAttribute("aria-describedby", ids.join(" "));
      else el.removeAttribute("aria-describedby");
    };

    const syncAria = (el: Element, announce = false) => {
      if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement)) return;
      const invalid = supportsUserInvalid
        ? el.matches(":user-invalid")
        : !el.validity.valid && Boolean(dirtyMap.get(el)?.blurred);

      el.setAttribute("aria-invalid", invalid ? "true" : "false");
      linkError(el, invalid);

      if (!supportsUserInvalid && dirtyMap.get(el)?.blurred) {
        el.classList.toggle("user-invalid-fallback", !el.validity.valid);
        el.classList.toggle("user-valid-fallback", el.validity.valid);
      }

      if (invalid && announce && announcerRef.current && el.dataset.error) {
        const errEl = document.getElementById(el.dataset.error);
        if (errEl) {
          announcerRef.current.textContent = errEl.textContent?.trim() || "";
        }
      }
    };

    form.querySelectorAll("input, select").forEach((el) => {
      el.setAttribute("aria-invalid", "false");
    });

    const onBlur = (e: Event) => {
      const target = e.target as HTMLElement;
      const st = dirtyMap.get(target) || { interacted: false, blurred: false };
      st.blurred = true;
      dirtyMap.set(target, st);
      syncAria(target, true);
    };

    const onInput = (e: Event) => {
      const target = e.target as HTMLElement;
      const st = dirtyMap.get(target) || { interacted: false, blurred: false };
      st.interacted = true;
      dirtyMap.set(target, st);
      syncAria(target, false);
    };

    const onInvalid = (e: Event) => {
      const target = e.target as HTMLElement;
      dirtyMap.set(target, { interacted: true, blurred: true });
      syncAria(target, false);
    };

    form.addEventListener("blur", onBlur, true);
    form.addEventListener("input", onInput);
    form.addEventListener("invalid", onInvalid, true);

    return () => {
      form.removeEventListener("blur", onBlur, true);
      form.removeEventListener("input", onInput);
      form.removeEventListener("invalid", onInvalid, true);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);

    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload =
        mode === "login"
          ? { email, password }
          : { name, email, password, role, identityNo, classCode };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const rawText = await res.text();
      let data: { error?: string; redirectTo?: string } = {};
      try {
        data = JSON.parse(rawText);
      } catch {
        data = { error: "Respons server tidak valid. Silakan coba lagi." };
      }

      if (!res.ok) {
        setErrorMsg(data.error || "Terjadi kesalahan. Silakan coba lagi.");
        setSubmitting(false);
        return;
      }

      // Gunakan navigasi penuh langsung agar cookie sesi HttpOnly langsung aktif tanpa macet di router cache
      window.location.assign(data.redirectTo || "/dashboard");
    } catch {
      setErrorMsg("Tidak dapat terhubung ke server. Periksa koneksi Anda.");
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full">
      <div ref={announcerRef} aria-live="polite" className="visually-hidden" />

      {errorMsg && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-3.5">
        {mode === "register" && (
          <>
            <fieldset>
              <legend className="text-xs font-semibold text-slate-600">Daftar Sebagai</legend>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                <label
                  className={`flex cursor-pointer items-center justify-center rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                    role === "STUDENT"
                      ? "border-[#32302d] bg-[#32302d] text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value="STUDENT"
                    checked={role === "STUDENT"}
                    onChange={() => setRole("STUDENT")}
                    className="sr-only"
                  />
                  Siswa SMK MPLB
                </label>
                <label
                  className={`flex cursor-pointer items-center justify-center rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                    role === "TEACHER"
                      ? "border-[#32302d] bg-[#32302d] text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value="TEACHER"
                    checked={role === "TEACHER"}
                    onChange={() => setRole("TEACHER")}
                    className="sr-only"
                  />
                  Guru Pengampu
                </label>
              </div>
            </fieldset>

            <div className="form-field">
              <label htmlFor="full-name" className="block text-xs font-medium text-slate-600">
                Nama Lengkap
              </label>
              <input
                id="full-name"
                name="name"
                type="text"
                autoComplete="name"
                enterKeyHint="next"
                required
                minLength={3}
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-error="name-error"
                placeholder="Nama lengkap sesuai kelas"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-slate-400 focus:outline-none"
              />
              <div
                id="name-error"
                className="field-error-msg mt-1 items-center gap-1 text-xs font-medium text-red-600"
              >
                <span role="img" aria-label="Error">⚠️</span>
                <span>Nama lengkap wajib diisi minimal 3 karakter.</span>
              </div>
            </div>
          </>
        )}

        {/* Email */}
        <div className="form-field">
          <label htmlFor="email" className="block text-xs font-medium text-slate-600">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            spellCheck={false}
            enterKeyHint="next"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            data-error="email-error"
            placeholder="Email"
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-slate-400 focus:outline-none"
          />
          <div
            id="email-error"
            className="field-error-msg mt-1 items-center gap-1 text-xs font-medium text-red-600"
          >
            <span role="img" aria-label="Error">⚠️</span>
            <span>Masukkan alamat email yang valid (contoh: nama@officehub.sch.id).</span>
          </div>
        </div>

        {/* Kata Sandi */}
        <div className="form-field">
          <label htmlFor="password" className="block text-xs font-medium text-slate-600">
            Kata Sandi
          </label>
          {mode === "register" && (
            <span id="password-hint" className="mt-0.5 block text-[11px] text-slate-400">
              Minimal 6 karakter.
            </span>
          )}
          <div className="input-wrap relative mt-1">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              enterKeyHint={mode === "login" ? "done" : "next"}
              required
              minLength={mode === "register" ? 6 : 1}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-describedby={mode === "register" ? "password-hint" : undefined}
              data-error="password-error"
              placeholder="Kata Sandi"
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pr-10 pl-3.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-slate-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-700"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
          <div
            id="password-error"
            className="field-error-msg mt-1 items-center gap-1 text-xs font-medium text-red-600"
          >
            <span role="img" aria-label="Error">⚠️</span>
            <span>
              {mode === "register"
                ? "Kata sandi wajib diisi minimal 6 karakter."
                : "Kata sandi wajib diisi."}
            </span>
          </div>
        </div>

        {mode === "register" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="form-field">
              <label htmlFor="identity-no" className="block text-xs font-medium text-slate-600">
                {role === "STUDENT" ? "NISN (Opsional)" : "NIP (Opsional)"}
              </label>
              <input
                id="identity-no"
                name="identityNo"
                type="text"
                inputMode="numeric"
                enterKeyHint="next"
                value={identityNo}
                onChange={(e) => setIdentityNo(e.target.value)}
                placeholder={role === "STUDENT" ? "0094827xxx" : "19870415xxx"}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
              />
            </div>

            {role === "STUDENT" && (
              <div className="form-field">
                <label htmlFor="class-code" className="block text-xs font-medium text-slate-600">
                  Kode Kelas
                </label>
                <span id="class-hint" className="block text-[11px] text-slate-400">
                  MPLB11A / MPLB11B
                </span>
                <input
                  id="class-code"
                  name="classCode"
                  type="text"
                  required
                  enterKeyHint="done"
                  value={classCode}
                  onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                  aria-describedby="class-hint"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold uppercase text-slate-900 focus:border-slate-400 focus:outline-none"
                />
              </div>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#32302d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1e1d1b] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          <span>
            {submitting
              ? "Memproses..."
              : mode === "login"
              ? "Masuk"
              : role === "STUDENT"
              ? "Daftar Akun Siswa"
              : "Daftar Akun Guru"}
          </span>
        </button>
      </form>

      <p className="mt-7 text-center text-xs text-slate-500">
        {mode === "login" ? (
          <>
            Baru di Office Learning Hub?{" "}
            <Link href="/register" className="font-semibold text-sky-600 hover:underline">
              Daftar gratis sekarang.
            </Link>
          </>
        ) : (
          <>
            Sudah punya akun?{" "}
            <Link href="/login" className="font-semibold text-sky-600 hover:underline">
              Masuk di sini.
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
