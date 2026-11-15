// Avatar çerçeveleri ve profil kartı arka planları (16 Kasım, hoca öncesi kontrol 29; tuval
// "29+ Avatar çerçeveleri"). Çerçeve seviyeden gelir, seçilmez: seviye arttıkça güçlenir. Her
// çerçeve iki seviye sürer; ikinci seviyesinde biraz daha canlanır (daha çok parçacık, biraz daha
// hızlı). Kart arka planı seviyeyle açılır, öğrenci açılanlardan birini seçer (User.cardBackground).
// Adlar sözlükte: t.progress.frames, t.progress.cardBackgrounds.

import { topLevel } from "./levels";

export const frameTiers = ["plain", "bubble", "spark", "ember", "digital", "hero"] as const;
export type FrameTier = (typeof frameTiers)[number];

/** Çerçevenin seviyesi: ilk seviyesinde sakin, ikincisinde canlı. Tek seviyelik çerçevelerde hep sakin. */
export type FrameStep = "calm" | "lively";

/** Her çerçevenin açıldığı seviye (sıralı). */
export const frameLevels: Record<FrameTier, number> = { plain: 1, bubble: 2, spark: 4, ember: 6, digital: 8, hero: 10 };

/** Ayrı bir "güçlendi" adımı olan seviyeler (çerçeve değişmez, canlanır). Dijital 8-9'da aynı kalır. */
const livelyLevels = new Set([3, 5, 7]);

const clampLevel = (level: number) => Math.max(1, Math.min(topLevel, Math.floor(level) || 1));

export function frameTierOf(level: number): FrameTier {
  const l = clampLevel(level);
  let tier: FrameTier = "plain";
  for (const t of frameTiers) if (frameLevels[t] <= l) tier = t;
  return tier;
}

export function frameStepOf(level: number): FrameStep {
  return livelyLevels.has(clampLevel(level)) ? "lively" : "calm";
}

export const cardBackgrounds = [
  { code: "plain", level: 1 },
  { code: "waves", level: 3 },
  { code: "clouds", level: 5 },
  { code: "night", level: 7 },
  { code: "aurora", level: 9 },
] as const;
export type CardBackgroundCode = (typeof cardBackgrounds)[number]["code"];

export function isCardBackgroundCode(value: unknown): value is CardBackgroundCode {
  return typeof value === "string" && cardBackgrounds.some((b) => b.code === value);
}

export function cardBackgroundLevel(code: CardBackgroundCode): number {
  return cardBackgrounds.find((b) => b.code === code)!.level;
}

/** Takılı arka plan; seçilmemişse ya da (bir gün eşikler değişirse) kilitliyse sade. */
export function cardBackgroundOf(value: string | null | undefined, level: number): CardBackgroundCode {
  return isCardBackgroundCode(value) && cardBackgroundLevel(value) <= clampLevel(level) ? value : "plain";
}

/** Bir seviyede gelen çerçeve değişikliği: yeni çerçeve ya da var olanın güçlenmesi. */
export type FrameUnlock = { level: number; tier: FrameTier; kind: "new" | "stronger" };

function frameUnlockAt(level: number): FrameUnlock | null {
  const tier = frameTierOf(level);
  if (level > 1 && frameLevels[tier] === level) return { level, tier, kind: "new" };
  if (livelyLevels.has(level)) return { level, tier, kind: "stronger" };
  return null;
}

/** Profil kartındaki "Sıradaki ödül": bir sonraki çerçeve adımı ve bir sonraki kart arka planı. */
export function nextRewards(level: number): { frame: FrameUnlock | null; background: { level: number; code: CardBackgroundCode } | null } {
  const l = clampLevel(level);
  let frame: FrameUnlock | null = null;
  for (let n = l + 1; n <= topLevel && !frame; n++) frame = frameUnlockAt(n);
  const background = cardBackgrounds.find((b) => b.level > l) ?? null;
  return { frame, background: background ? { level: background.level, code: background.code } : null };
}

/**
 * Seviye atlayınca açılanlar (from'dan sonraki seviyeden to'ya kadar). Birden çok seviye birden
 * atlanırsa çerçevede en sonuncusu, arka planlarda hepsi sayılır.
 */
export function levelUpUnlocks(from: number, to: number): { frame: FrameUnlock | null; backgrounds: CardBackgroundCode[] } {
  const a = clampLevel(from);
  const b = clampLevel(to);
  let frame: FrameUnlock | null = null;
  if (b > a) {
    if (frameTierOf(b) !== frameTierOf(a)) frame = { level: frameLevels[frameTierOf(b)], tier: frameTierOf(b), kind: "new" };
    else if (frameStepOf(b) !== frameStepOf(a)) frame = { level: b, tier: frameTierOf(b), kind: "stronger" };
  }
  const backgrounds = cardBackgrounds.filter((bg) => bg.level > a && bg.level <= b).map((bg) => bg.code);
  return { frame, backgrounds };
}
