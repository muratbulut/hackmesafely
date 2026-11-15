"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { getMessages } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Mascot, petReactions, type MascotReaction } from "./Mascot";
import { useEyeTracking } from "./useEyeTracking";

/** Bu kadar süre hiçbir şey yapılmazsa maskot (ve menüdeki logo) uyur. */
export const SLEEP_AFTER_MS = 60_000;
const WAKE_EVENTS = ["pointermove", "pointerdown", "keydown", "scroll", "touchstart"] as const;
/** Uyandıran dokunuştan sonra bu süre içinde gelen tıklama o dokunuşun kendisidir. */
const WAKE_CLICK_MS = 1_000;

/**
 * Tanıtım sayfasındaki büyük maskot. Gözü fareyi izler; her tıklamada sıradaki evcil tepkiyi oynar
 * (kırpar, sevinir, bakar, şaşırır, başı döner, kalp göz, uyur). 1 dakika hareket olmazsa uyur,
 * menüdeki logo da onunla uyur (html data-mascot="sleep"); fare, tuş ya da dokunuş uyandırır.
 */
export function HeroMascot({ className }: { className?: string }) {
  const t = getMessages().mascot;
  const ref = useRef<SVGSVGElement>(null);
  const [asleep, setAsleep] = useState(false);
  const [reaction, setReaction] = useState<MascotReaction | null>(null);
  const count = useRef(0);
  const timer = useRef<number | null>(null);
  // Uyandıran dokunuşun zamanı: o dokunuşun ardından gelen tıklama tepki oynatmaz. Uyandırma
  // olayı tıklamadan önce işlenir (durum çoktan "uyanık"tır), bu yüzden durum yetmez.
  const wokeByTouch = useRef<number | null>(null);
  useEyeTracking(ref, !asleep);

  useEffect(() => {
    let idle = window.setTimeout(sleep, SLEEP_AFTER_MS);
    function sleep() {
      setAsleep(true);
      setReaction(null);
      document.documentElement.dataset.mascot = "sleep";
    }
    function wake(e: Event) {
      window.clearTimeout(idle);
      idle = window.setTimeout(sleep, SLEEP_AFTER_MS);
      if (document.documentElement.dataset.mascot === "sleep") {
        wokeByTouch.current = e.type === "pointerdown" || e.type === "touchstart" ? e.timeStamp : null;
        delete document.documentElement.dataset.mascot;
        setAsleep(false);
      }
    }
    for (const name of WAKE_EVENTS) window.addEventListener(name, wake, { passive: true });
    return () => {
      window.clearTimeout(idle);
      for (const name of WAKE_EVENTS) window.removeEventListener(name, wake);
      delete document.documentElement.dataset.mascot;
    };
  }, []);

  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
  }, []);

  function poke(e: MouseEvent<HTMLButtonElement>) {
    // Uyurken ilk dokunuş yalnızca uyandırır (pointerdown zaten uyandırdı).
    const woke = wokeByTouch.current;
    wokeByTouch.current = null;
    if (asleep || (woke !== null && e.timeStamp - woke < WAKE_CLICK_MS)) return;
    const next = petReactions[count.current % petReactions.length];
    count.current += 1;
    if (timer.current !== null) window.clearTimeout(timer.current);
    // Aynı tepki üst üste gelirse animasyon baştan başlasın diye önce sınıf kaldırılır.
    setReaction(null);
    window.requestAnimationFrame(() => setReaction(next.id));
    timer.current = window.setTimeout(() => setReaction(null), next.ms + 50);
  }

  return (
    <button type="button" onClick={poke} aria-label={t.pet} className={cn("mc-button -m-2 cursor-pointer rounded-full p-2 leading-none", className)}>
      <Mascot ref={ref} mood={asleep ? "sleep" : "idle"} reaction={asleep ? null : reaction} follow className="block h-auto w-full" />
    </button>
  );
}
