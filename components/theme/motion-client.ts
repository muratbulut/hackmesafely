"use client";

import { useSyncExternalStore } from "react";
import { MOTION_ATTRIBUTE, motionCookie, onReducedMotionChange, siteReducesMotion } from "@/lib/motion";

/** Sitenin "Hareketi azalt" ayarını uygular ve çereze yazar (profil > Görünüm). */
export function saveReduceMotion(reduce: boolean) {
  if (reduce) document.documentElement.setAttribute(MOTION_ATTRIBUTE, "reduce");
  else document.documentElement.removeAttribute(MOTION_ATTRIBUTE);
  document.cookie = motionCookie(reduce, location.protocol === "https:");
}

/** Sitenin ayarı (cihazın ayarından bağımsız); sunucuda kapalı. */
export function useSiteReduceMotion(): boolean {
  return useSyncExternalStore(onReducedMotionChange, siteReducesMotion, () => false);
}
