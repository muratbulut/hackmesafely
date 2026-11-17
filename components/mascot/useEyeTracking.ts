"use client";

import { useEffect, type RefObject } from "react";
import { prefersReducedMotion } from "@/lib/motion";

/** Bakış yönünü maskotun köküne yazar (-1 ile 1 arası). Göz bebeği CSS'te bu değişkenlerle kayar. */
export function setGaze(el: Element | null, x: number, y: number) {
  if (!(el instanceof SVGElement)) return;
  el.style.setProperty("--mc-x", x.toFixed(2));
  el.style.setProperty("--mc-y", y.toFixed(2));
}

/** Varsayılan bakış: biraz sağa (logodaki hâli). */
export function resetGaze(el: Element | null) {
  if (!(el instanceof SVGElement)) return;
  el.style.removeProperty("--mc-x");
  el.style.removeProperty("--mc-y");
}

/** Gözün kutudaki yeri (0 ile 1 arası). Hap biçimli maskotta göz topu kutunun %70'inde, ortada. */
export type EyeSpot = { x: number; y: number };
const MASCOT_EYE: EyeSpot = { x: 90 / 128, y: 0.5 };

/** Gözün bir noktaya bakması için yön: göz topundan o noktaya. */
export function gazeTowards(el: Element, px: number, py: number, near = 260, eye: EyeSpot = MASCOT_EYE) {
  const box = el.getBoundingClientRect();
  const cx = box.left + box.width * eye.x;
  const cy = box.top + box.height * eye.y;
  const dx = px - cx;
  const dy = py - cy;
  const d = Math.hypot(dx, dy) || 1;
  const k = Math.min(1, d / near);
  return { x: (dx / d) * k, y: (dy / d) * k };
}

/**
 * Göz fareyi izler. Yalnızca fare olan cihazda ve "Hareketi azalt" kapalıyken; telefonda ve tablette
 * maskot yalnızca kırpar. Her harekette yeniden çizim olmaz: değer doğrudan SVG'ye yazılır.
 * `eye` gözün kutudaki yerini verir (logoda göz bir a'dan öbürüne geçebilir); verilmezse maskotunki.
 */
export function useEyeTracking(ref: RefObject<SVGSVGElement | null>, enabled = true, eye?: RefObject<EyeSpot>) {
  useEffect(() => {
    if (!enabled || typeof window.matchMedia !== "function") return;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    let frame = 0;
    let last: PointerEvent | null = null;

    function apply() {
      frame = 0;
      const el = ref.current;
      if (!el || !last || !fine.matches || prefersReducedMotion()) return;
      const { x, y } = gazeTowards(el, last.clientX, last.clientY, undefined, eye?.current);
      setGaze(el, x, y);
    }
    function onMove(e: PointerEvent) {
      if (e.pointerType !== "mouse") return;
      last = e;
      if (!frame) frame = window.requestAnimationFrame(apply);
    }
    function onLeave() {
      resetGaze(ref.current);
    }

    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [ref, enabled, eye]);
}
