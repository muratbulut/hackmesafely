"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { getMessages } from "@/lib/i18n";
import { prefersReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Okulum'un pencereleri (öğretmen, talep, sınıf): masaüstünde sağdan çekmece, telefonda alttan
 * pencere. Tarayıcının <dialog> penceresi: odak içeride kalır, Escape, perde ve kapat düğmesi
 * kapatır. İçerik `close` ile kendi kapat düğmesini çizer (kapanış kısa bir animasyonla).
 * `extra` pencere açıkken içinde çizilir (bildirim kutusu perdenin altında kalmasın diye).
 */
export function SchoolSheet({
  open,
  label,
  onClose,
  extra,
  children,
}: {
  open: boolean;
  label: string;
  onClose: () => void;
  extra?: ReactNode;
  children: (close: () => void) => ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      setClosing(false);
      d.showModal();
    }
    if (!open && d.open) d.close();
  }, [open]);

  function requestClose() {
    if (prefersReducedMotion()) {
      onClose();
      return;
    }
    // Kapanırken perdeye ikinci dokunuş ikinci bir zamanlayıcı kurmaz; kursaydı geç kalan kapanış
    // hemen ardından açılan pencereyi de kapatırdı.
    if (closing) return;
    setClosing(true);
    window.setTimeout(() => {
      setClosing(false);
      onClose();
    }, 200);
  }

  return (
    <dialog
      ref={ref}
      aria-label={label}
      onCancel={(e) => {
        e.preventDefault();
        requestClose();
      }}
      onClose={() => {
        if (open) onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) requestClose();
      }}
      className={cn(
        "m-0 mt-auto max-h-[90dvh] w-full max-w-full overflow-y-auto rounded-t-3xl border-0 border-t border-line bg-canvas p-0 text-fg backdrop:bg-scrim",
        "lg:mt-0 lg:ml-auto lg:h-dvh lg:max-h-dvh lg:w-[460px] lg:rounded-none lg:border-t-0 lg:border-l",
        closing
          ? "[animation:slide-up_.2s_ease-in_reverse_both] backdrop:[animation:fade-in_.2s_ease-in_reverse_both] lg:[animation:slide-in-page_.2s_ease-in_reverse_both]"
          : "open:[animation:slide-up_.28s_cubic-bezier(.2,.8,.2,1)_both] backdrop:[animation:fade-in_.2s_ease-out_both] lg:open:[animation:slide-in-page_.3s_cubic-bezier(.2,.8,.2,1)_both]",
      )}
    >
      {open ? (
        <div className="flex flex-col gap-[18px] px-4 pt-3 pb-6 lg:px-6 lg:pt-[22px] lg:pb-8">
          <span aria-hidden="true" className="h-1 w-10 self-center rounded-full bg-line lg:hidden" />
          {children(requestClose)}
        </div>
      ) : null}
      {extra}
    </dialog>
  );
}

/** Pencerenin kapat düğmesi. */
export function SheetClose({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={getMessages().school.drawer.close}
      className={cn("flex size-10 flex-none cursor-pointer items-center justify-center rounded-xl border border-line bg-surface text-fg-2", className)}
    >
      <X className="size-[18px]" strokeWidth={2} aria-hidden="true" />
    </button>
  );
}

/** Pencerenin üstü: küçük başlık, ad satırı ve kapat düğmesi. */
export function SheetTop({ eyebrow, onClose, children }: { eyebrow: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="flex min-w-0 flex-col gap-1.5">
        <span className="text-[11px] font-bold tracking-[1.5px] text-fg-3">{eyebrow}</span>
        {children}
      </span>
      <SheetClose onClick={onClose} />
    </div>
  );
}
