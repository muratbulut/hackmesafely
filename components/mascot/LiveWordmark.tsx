"use client";

import { useEffect, useRef } from "react";
import { logoGeometry, Wordmark } from "@/lib/brand";
import { onReducedMotionChange } from "@/lib/motion";
import { routes } from "@/lib/navigation";
import { startLogoEngine } from "./logo-engine";
import { useEyeTracking, type EyeSpot } from "./useEyeTracking";
import { usePasswordEyes } from "./usePasswordEyes";
import "./mascot.css";

/** Gözün logo kutusundaki yeri: 0 üstteki a, 1 alttaki a. */
function eyeSpot(line: 0 | 1): EyeSpot {
  const { box, a, hole } = logoGeometry;
  return { x: (a.x + hole.cx - box.x) / box.width, y: (a.lines[line] + hole.cy - box.y) / box.height };
}

/**
 * Üst menüdeki canlı logo. Gözlü a'nın gözü fareyi izler, arada kırpar; 10 saniyede bir iç boşlukta
 * gezip duvarlara çarpar. Ana sayfada sonunda öbür a'ya kaçar, diğer sayfalarda a'nın içinde kalır
 * (17 Kasım, Murat; hareket logo-engine.ts). Şifre yazılırken gözünü kapatır. Tıklanınca ana sayfa
 * açılır. "Hareketi azalt" açıksa göz yerinde durur.
 */
export function LiveWordmark({ className }: { className?: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const eye = useRef<EyeSpot>(eyeSpot(0));
  useEyeTracking(ref, true, eye);
  usePasswordEyes();

  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    function start() {
      eye.current = eyeSpot(0);
      return startLogoEngine(
        svg!,
        () => (window.location.pathname === routes.home ? "escape" : "inside"),
        (line) => {
          eye.current = eyeSpot(line);
        },
      );
    }
    let engine = start();
    // Ayar değişince logo baştan kurulur: göz üstteki a'ya döner, hareket yeni ayara göre başlar.
    const off = onReducedMotionChange(() => {
      engine.stop();
      engine = start();
    });
    return () => {
      off();
      engine.stop();
    };
  }, []);

  return <Wordmark live ref={ref} className={className} />;
}
