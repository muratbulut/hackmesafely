"use client";

import { Maximize2, Minimize2 } from "lucide-react";
import { createContext, use, useEffect, useState, type ReactNode } from "react";
import { getMessages } from "@/lib/i18n";
import { cn } from "@/lib/utils";

// Sunum modu (17 Kasım, Murat): "Tam ekran" düğmesi menüyü gizler, sayfayı büyütür ve tarayıcıyı
// tam ekrana alır; Esc ya da "Çık" ile dönülür. Veri yenilemesi aynen sürer.

const PresentContext = createContext<{ on: boolean; toggle: () => void }>({ on: false, toggle: () => {} });

export function Present({ children, zoom = 1.22 }: { children: ReactNode; zoom?: number }) {
  const [on, setOn] = useState(false);

  useEffect(() => {
    if (!on) return;
    void document.documentElement.requestFullscreen?.().catch(() => undefined);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOn(false);
    };
    const onChange = () => {
      if (!document.fullscreenElement) setOn(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onChange);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onChange);
      if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => undefined);
    };
  }, [on]);

  return (
    <PresentContext value={{ on, toggle: () => setOn((value) => !value) }}>
      {on ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-canvas" style={{ zoom }} data-testid="pulse-present">
          {children}
        </div>
      ) : (
        children
      )}
    </PresentContext>
  );
}

export function PresentButton({ className }: { className?: string }) {
  const t = getMessages().adminPulse;
  const { on, toggle } = use(PresentContext);
  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        "inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-line bg-surface px-3.5 text-sm font-bold text-fg hover:border-line-strong",
        className,
      )}
    >
      {on ? <Minimize2 className="size-4" aria-hidden="true" /> : <Maximize2 className="size-4" aria-hidden="true" />}
      {on ? t.presentExit : t.present}
    </button>
  );
}
