// Canlı nabzın (CanliNabiz-Son) saf hesapları: son bir saatin 5 dakikalık dilimleri ve isimsiz
// akışın cümleleri. Veritabanı sorguları lib/admin/pulse.ts içinde. Akışta kim olduğu hiç yoktur:
// "biri", "bir öğrenci"; yalnızca lab, mahalle ya da il · ilçe. Saf modül; birim testli.

import { format, getMessages } from "@/lib/i18n";
import { badgeCodes, type BadgeCode } from "@/lib/progress/badges";

/** "Şu an odada": son bu kadar dakikada labda hareketi olan öğrenci. */
export const liveWindowMinutes = 10;
/** Son bir saat, 5 dakikalık 12 dilim. */
export const bucketMinutes = 5;
export const bucketCount = 12;
/** Akışta gösterilen en fazla hareket. */
export const feedSize = 30;
/** Sayfa bu aralıkla yenilenir (Duraklat ile durur). */
export const refreshSeconds = 15;

/** Dilim numaraları (0 en eski) ve sayıları -> 12 sayılık dizi; aralık dışı dilim yok sayılır. */
export function fillBuckets(rows: readonly { b: number; n: number }[], count = bucketCount): number[] {
  const buckets = Array.from({ length: count }, () => 0);
  for (const row of rows) {
    if (Number.isInteger(row.b) && row.b >= 0 && row.b < count) buckets[row.b] += row.n;
  }
  return buckets;
}

export const feedKinds = ["safe", "done", "hacked", "reported", "clicked", "training", "signup", "application", "badge"] as const;
export type FeedKind = (typeof feedKinds)[number];

/** Veritabanından gelen hareket: kimin olduğu yok, yalnızca türü, zamanı, labı ve yeri. */
export type FeedRow = {
  kind: string;
  at: Date;
  labId: string | null;
  /** application: il; badge: rozet kodu. */
  a: string | null;
  /** application: ilçe. */
  b: string | null;
};

export type FeedLab = { name: string; template: string; neighborhood: string };

/** Hareketin cümlesi; `subject` birleştirmede kullanılır (odanın ya da rozetin adı; kayıt ve talepte yok). */
export type FeedEntry = { kind: FeedKind; text: string; where: string | null; subject: string | null };

const isFeedKind = (kind: string): kind is FeedKind => (feedKinds as readonly string[]).includes(kind);
const isBadge = (code: string | null): code is BadgeCode => !!code && (badgeCodes as readonly string[]).includes(code);

/** Hareketin cümlesi ve yeri; bilinmeyen tür ya da eksik bilgi için null (akışta gösterilmez). */
export function feedEntry(row: FeedRow, labs: ReadonlyMap<string, FeedLab>): FeedEntry | null {
  if (!isFeedKind(row.kind)) return null;
  const t = getMessages().adminPulse;
  const e = t.events;
  const lab = row.labId ? labs.get(row.labId) : undefined;
  const name = lab?.name ?? e.unknownLab;
  const where = lab?.neighborhood ?? null;

  switch (row.kind) {
    case "safe":
    case "done":
    case "hacked":
    case "clicked":
    case "training":
      return { kind: row.kind, text: format(e[row.kind], { lab: name }), where, subject: name };
    case "reported": {
      const template = lab?.template === "MESSAGING" ? "MESSAGING" : "INBOX";
      return { kind: "reported", text: format(e.reported[template], { lab: name }), where, subject: name };
    }
    case "signup":
      return { kind: "signup", text: e.signup, where: null, subject: null };
    case "application":
      return {
        kind: "application",
        text: e.application,
        where: row.a && row.b ? format(t.place, { province: row.a, district: row.b }) : (row.a ?? null),
        subject: null,
      };
    case "badge": {
      if (!isBadge(row.a)) return null;
      const badge = getMessages().progress.badges[row.a].name;
      return { kind: "badge", text: format(e.badge, { badge }), where: null, subject: badge };
    }
  }
}

export type FeedMergeInput<T> = T & FeedEntry;
export type FeedMerged<T> = FeedMergeInput<T> & { n: number };

/**
 * Art arda gelen aynı hareket tek satır olur (17 Kasım, Murat): "Sahte kargo maili: 3 kişi güvende
 * kaldı", "2 yeni öğrenci aramıza katıldı". Satırın zamanı ve anahtarı en yenisininkidir; `n` kaç
 * hareketin birleştiğini söyler. Liste en yeni en üstte verilir.
 */
export function mergeFeed<T extends { kind: FeedKind; text: string }>(items: readonly FeedMergeInput<T>[]): FeedMerged<T>[] {
  const t = getMessages().adminPulse.merged;
  const out: FeedMerged<T>[] = [];
  for (const item of items) {
    const last = out.at(-1);
    if (last && last.kind === item.kind && last.text === item.text) {
      last.n += 1;
      continue;
    }
    out.push({ ...item, n: 1 });
  }
  return out.map((m) => {
    if (m.n === 1) return m;
    switch (m.kind) {
      case "signup":
        return { ...m, text: format(t.signup, { n: m.n }) };
      case "application":
        return { ...m, text: format(t.application, { n: m.n }) };
      case "badge":
        return { ...m, text: format(t.badge, { n: m.n, badge: m.subject ?? "" }) };
      default:
        return { ...m, text: format(t.lab, { lab: m.subject ?? getMessages().adminPulse.events.unknownLab, n: m.n, verb: t.verbs[m.kind] }) };
    }
  });
}

/** Günün 24 saatinden en hareketlisi: "14:00"; hiç biten yoksa null. */
export function peakHour(hours: readonly number[]): string | null {
  let best = 0;
  for (let h = 1; h < hours.length; h++) if (hours[h] > hours[best]) best = h;
  return hours[best] > 0 ? `${String(best).padStart(2, "0")}:00` : null;
}
