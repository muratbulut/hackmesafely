// Yönetimdeki ipucu ekranının uyarıları (hoca öncesi kontrol, 40): havuz küçükse tekrar uyarısı
// ve "tekrar" etiketi, mahalle başına havuz sayısı, az okunan ipucu. Saf fonksiyonlar; hem
// sunucuda hem tarayıcıda çalışır, birim testlidir (tests/unit/tips.test.ts).

import type { DayKey, PlannedDay, TipStatus } from "./schedule";

/** Bir hafta tekrarsız geçsin diye havuzda en az bu kadar ipucu olmalı. */
export const minPoolForWeek = 7;

/** "Az okunuyor" için en az bu kadar görülme (az sayıda görülmede oran yanıltır). */
export const lowReadMinViews = 10;
/** "Neden?"e bakanların oranı bunun altındaysa (yüzde) ipucu "az okunuyor" sayılır. */
export const lowReadPercent = 20;

/**
 * Planda daha önce (bugün dahil) gösterilmiş bir ipucunun yeniden çıktığı günler. Havuz
 * küçükse ipuçları dönüp yeniden gelir; sabitlenen bir ipucu da önceki gösterimini tekrarlayabilir.
 */
export function repeatDays(plan: readonly PlannedDay[]): Set<DayKey> {
  const seen = new Set<string>();
  const repeats = new Set<DayKey>();
  for (const day of plan) {
    if (!day.tipId) continue;
    if (seen.has(day.tipId)) repeats.add(day.day);
    seen.add(day.tipId);
  }
  return repeats;
}

/** Havuz uyarısı: havuz bir haftaya yetmiyorsa ilk tekrar günü; yetiyorsa null. */
export function poolWarning(plan: readonly PlannedDay[], poolSize: number): { firstRepeat: DayKey } | null {
  if (poolSize === 0 || poolSize >= minPoolForWeek) return null;
  const repeats = repeatDays(plan);
  const first = plan.find((d) => repeats.has(d.day));
  return first ? { firstRepeat: first.day } : null;
}

/** Mahalle başına havuzdaki (taslak ve arşiv sayılmaz) ipucu sayısı. */
export function poolByNeighborhood(tips: readonly { status: TipStatus; neighborhoodId: string | null }[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const tip of tips) {
    if (tip.status !== "POOL" || !tip.neighborhoodId) continue;
    counts.set(tip.neighborhoodId, (counts.get(tip.neighborhoodId) ?? 0) + 1);
  }
  return counts;
}

/** Yeterince görülmüş ama "Neden?"ine pek bakılmayan ipucu: metni yeniden yazmaya değer. */
export function isLowRead(tip: { views: number; reasonViews: number }): boolean {
  return tip.views >= lowReadMinViews && (tip.reasonViews / tip.views) * 100 < lowReadPercent;
}
