"use client";

import { RotateCcw } from "lucide-react";
import { useEffect, useEffectEvent, useRef } from "react";
import { createPortal } from "react-dom";

/**
 * "Baştan başla" onayı (19 Kasım, Murat): senaryo kapağında, oda şeridinde ve eğitim şeridinde aynı
 * pencere. Eski deneme silinmez, yarım kalır. Odak "Vazgeç"te başlar, Esc ve dışarı dokunmak kapatır.
 * Masaüstünde ortada, telefonda alttan açılır. Gövdeye taşınır: kapakta düğme telefonda yapışkan
 * kutunun içinde durur, pencere orada kalsa alt menü üstüne biner.
 */
export function RestartDialog({
  open,
  title,
  text,
  cancel,
  confirm,
  busy = false,
  error = null,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  text: string;
  cancel: string;
  confirm: string;
  busy?: boolean;
  /** Eylem kaydedilemediyse pencerede kalır, bu cümle görünür. */
  error?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const stay = useRef<HTMLButtonElement>(null);
  const close = useEffectEvent(onCancel);

  useEffect(() => {
    if (!open) return;
    stay.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;
  return createPortal(
    <div
      data-testid="restart-dialog"
      className="fixed inset-0 z-50 flex items-end justify-center bg-scrim [animation:fade-in_.15s_ease-out_both] sm:items-center sm:p-5"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="lab-restart-title"
        aria-describedby="lab-restart-text"
        onClick={(event) => event.stopPropagation()}
        className="flex w-full flex-col gap-3.5 rounded-t-[24px] border border-line bg-surface p-6 pb-[max(24px,env(safe-area-inset-bottom))] shadow-card [animation:pop_.25s_ease-out_both] sm:max-w-[420px] sm:rounded-[20px] sm:pb-6"
      >
        <span aria-hidden="true" className="flex size-11 items-center justify-center rounded-full bg-accent/15 text-accent-fg">
          <RotateCcw className="size-5" strokeWidth={2.2} />
        </span>
        <h2 id="lab-restart-title" className="font-heading text-[22px] leading-tight font-bold">
          {title}
        </h2>
        <p id="lab-restart-text" className="text-[15px] leading-relaxed text-fg-3">
          {text}
        </p>
        {error ? (
          <p role="alert" className="text-sm font-bold text-danger-fg">
            {error}
          </p>
        ) : null}
        <div className="mt-1 grid grid-cols-2 gap-2.5">
          <button
            ref={stay}
            type="button"
            onClick={onCancel}
            className="flex h-12 cursor-pointer items-center justify-center rounded-xl border border-line bg-card text-base font-bold text-fg"
          >
            {cancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-accent text-base font-bold text-on-accent hover:brightness-110 disabled:opacity-60"
          >
            <RotateCcw className="size-4" strokeWidth={2.4} aria-hidden="true" />
            {confirm}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
