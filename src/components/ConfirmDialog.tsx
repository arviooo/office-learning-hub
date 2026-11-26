"use client";

import { useEffect, useId, useRef } from "react";
import { AlertTriangle, CheckCircle2, Loader2, LogOut, Trash2, X } from "lucide-react";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "logout" | "primary";
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Ya, Lanjutkan",
  cancelLabel = "Batal",
  variant = "primary",
  loading = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Fallback light-dismiss (klik luar modal) untuk browser tanpa native closedby
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if ("closedBy" in HTMLDialogElement.prototype) return;

    let pressedOutside = false;
    const isOutside = (e: PointerEvent) => {
      const r = dialog.getBoundingClientRect();
      return (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      );
    };

    const onDown = (e: PointerEvent) => {
      pressedOutside = isOutside(e);
    };
    const onUp = (e: PointerEvent) => {
      if (pressedOutside && isOutside(e) && !loading) {
        dialog.close();
      }
    };

    dialog.addEventListener("pointerdown", onDown);
    dialog.addEventListener("pointerup", onUp);
    return () => {
      dialog.removeEventListener("pointerdown", onDown);
      dialog.removeEventListener("pointerup", onUp);
    };
  }, [loading]);

  const iconConfig =
    variant === "danger"
      ? {
          Icon: Trash2,
          wrap: "bg-rose-50 text-rose-600 ring-1 ring-rose-200/80",
          btn: "bg-rose-600 text-white hover:bg-rose-700 shadow-rose-200/80",
        }
      : variant === "logout"
      ? {
          Icon: LogOut,
          wrap: "bg-orange-50 text-[#ff5f3d] ring-1 ring-orange-200/80",
          btn: "bg-gradient-to-r from-[#ff6a45] to-[#ff512f] text-white hover:from-[#ff5a32] hover:to-[#f04422] shadow-orange-200/80",
        }
      : {
          Icon: CheckCircle2,
          wrap: "bg-sky-50 text-sky-600 ring-1 ring-sky-200/80",
          btn: "bg-[#32302d] text-white hover:bg-[#1e1d1b] shadow-slate-200/80",
        };

  const ActiveIcon = iconConfig.Icon;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descId}
      onClose={() => {
        if (dialogRef.current) dialogRef.current.returnValue = "";
        onClose();
      }}
      onCancel={(e) => {
        if (loading) e.preventDefault();
      }}
      {...({ closedby: loading ? "none" : "any" } as Record<string, string>)}
      className="olh-confirm-dialog m-auto w-[min(92vw,420px)] rounded-[28px] border border-slate-200/90 bg-white p-0 text-slate-900 shadow-2xl"
    >
      <div className="relative p-6 sm:p-7">
        <button
          type="button"
          disabled={loading}
          onClick={() => dialogRef.current?.close()}
          aria-label="Tutup jendela konfirmasi"
          className="absolute top-4 right-4 rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="flex flex-col items-center text-center">
          <span
            className={`flex h-14 w-14 items-center justify-center rounded-2xl ${iconConfig.wrap}`}
          >
            <ActiveIcon className="h-6 w-6" aria-hidden="true" />
          </span>

          <h1
            id={titleId}
            className="mt-4 text-lg font-extrabold tracking-tight text-slate-950 [text-wrap:balance]"
          >
            {title}
          </h1>

          <p
            id={descId}
            className="mt-2 text-sm leading-relaxed text-slate-600 [text-wrap:pretty]"
          >
            {description}
          </p>

          {variant === "danger" && (
            <div className="mt-3.5 inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-[11px] font-semibold text-rose-700">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Tindakan ini tidak dapat dibatalkan</span>
            </div>
          )}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            autoFocus={variant === "danger" || variant === "logout"}
            disabled={loading}
            onClick={() => dialogRef.current?.close()}
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            autoFocus={variant === "primary"}
            disabled={loading}
            onClick={onConfirm}
            className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm transition disabled:opacity-60 ${iconConfig.btn}`}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            <span>{loading ? "Memproses..." : confirmLabel}</span>
          </button>
        </div>
      </div>
    </dialog>
  );
}
