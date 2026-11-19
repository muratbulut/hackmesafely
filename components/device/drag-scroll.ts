"use client";

import { useEffect } from "react";

/*
 * Telefonun içinde kaydırma çubuğu görünmez (19 Kasım, Murat: "kaydırma kısmı çıkmasın, sürükleyerek
 * aşağı insin"; phone.css). Dokunmatik ekranda parmakla, farede tekerlekle kaydırılır; bu dosya fareyle
 * basılı tutup sürükleyerek kaydırmayı ekler. Dinleyici belgede tektir: telefon kullanan her bileşen
 * useDragScroll() çağırır, son telefon kalkınca dinleyici de kalkar.
 */

const PHONE = '[data-device="phone"], .dv-screen';
/** Bu kadar pikselden az hareket tıklamadır, sürükleme sayılmaz. */
const THRESHOLD = 6;

let users = 0;

function scrollableParent(target: Element, phone: Element): HTMLElement | null {
  for (let el: Element | null = target; el && el !== phone.parentElement; el = el.parentElement) {
    if (!(el instanceof HTMLElement)) continue;
    const { overflowY } = getComputedStyle(el);
    if ((overflowY === "auto" || overflowY === "scroll") && el.scrollHeight > el.clientHeight + 1) return el;
  }
  return null;
}

function onPointerDown(event: PointerEvent) {
  if (event.pointerType !== "mouse" || event.button !== 0) return;
  const target = event.target instanceof Element ? event.target : null;
  const phone = target?.closest(PHONE);
  if (!target || !phone || target.closest("input, textarea, select, [contenteditable]")) return;
  const box = scrollableParent(target, phone);
  if (!box) return;

  const startY = event.clientY;
  const startTop = box.scrollTop;
  let dragging = false;

  const move = (e: PointerEvent) => {
    const dy = e.clientY - startY;
    if (!dragging && Math.abs(dy) < THRESHOLD) return;
    if (!dragging) {
      dragging = true;
      box.style.cursor = "grabbing";
      box.style.userSelect = "none";
    }
    box.scrollTop = startTop - dy;
    e.preventDefault();
  };
  const up = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    window.removeEventListener("pointercancel", up);
    box.style.cursor = "";
    box.style.userSelect = "";
    if (!dragging) return;
    // Sürüklemenin sonundaki tıklama bir düğmeye basmasın.
    const swallow = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener("click", swallow, { capture: true, once: true });
    setTimeout(() => window.removeEventListener("click", swallow, { capture: true }), 0);
  };
  window.addEventListener("pointermove", move, { passive: false });
  window.addEventListener("pointerup", up);
  window.addEventListener("pointercancel", up);
}

/** Telefonun içinde fareyle sürükleyerek kaydırmayı açar (bileşen ekranda kaldıkça). */
export function useDragScroll() {
  useEffect(() => {
    if (users++ === 0) document.addEventListener("pointerdown", onPointerDown);
    return () => {
      if (--users === 0) document.removeEventListener("pointerdown", onPointerDown);
    };
  }, []);
}
