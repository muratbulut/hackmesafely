"use client";

import { useRef, useState } from "react";
import { getMessages } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Mascot } from "./Mascot";

/** Dokununca sekme süresi (mascot.css, mc-r-try). */
const TRY_MS = 1200;

/**
 * 404'teki sıfır: logonun yazı tipinden sıfır, iç boşluğunda logodaki göz. Göz etrafa bakıp kaybolan
 * sayfayı arar; dokununca iç boşlukta sekip duvarlara vurur, sıfır vurulan yöne esner.
 */
export function LostMascot({ className }: { className?: string }) {
  const t = getMessages().mascot;
  const [trying, setTrying] = useState(false);
  const timer = useRef<number | null>(null);

  function poke() {
    if (timer.current !== null) window.clearTimeout(timer.current);
    setTrying(false);
    window.requestAnimationFrame(() => setTrying(true));
    timer.current = window.setTimeout(() => setTrying(false), TRY_MS + 50);
  }

  return (
    <button type="button" onClick={poke} aria-label={t.pet} className={cn("mc-button cursor-pointer rounded-[24px] leading-none", className)}>
      <Mascot mood="off" glyph="zero" poke={trying} className="block h-full w-auto" />
    </button>
  );
}
