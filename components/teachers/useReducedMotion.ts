"use client";

import { useSyncExternalStore } from "react";
import { onReducedMotionChange, prefersReducedMotion } from "@/lib/motion";

/**
 * "Hareketi azalt" açık mı (cihazın ya da sitenin ayarı, lib/motion.ts)? Sunucuda ve ilk çizimde
 * kapalı sayılır; ayar değişince güncellenir.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(onReducedMotionChange, prefersReducedMotion, () => false);
}
