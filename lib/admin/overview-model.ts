// Yönetim özetinin (Durum karnesi, 17 Kasım) saf hesapları: zaman pencereleri, adil haftalık kıyas,
// dört alanın durumu (trafik ışığı), son 6 haftanın grafiği, gündemdeki boş haftalar ve en çok
// tuzağa düşülen lablar. Veritabanı sorguları lib/admin/overview.ts içinde; burası yalnızca
// sayılardan ekrandaki metni çıkarır. Hepsi toplam sayıdır, öğrenci adı ya da kimliği yoktur.
// Saf modül; birim testli.

import { format, getMessages } from "@/lib/i18n";
import { paths } from "@/lib/navigation";
import { dayMonth, dayMonthShort, dayMs, dayStart, weekMs, weekStart } from "./calendar";

// ---------------------------------------------------------------------------------------
// Zaman pencereleri
// ---------------------------------------------------------------------------------------

export const chartWeeks = 6;
export const windowKeys = ["w0", "w1", "w2", "w3", "w4", "w5", "lastSame", "all"] as const;
export type WindowKey = (typeof windowKeys)[number];
export type TimeWindow = { key: WindowKey; start: Date; end: Date };

/**
 * Sayıların pencereleri: son 6 hafta (w0 en eski, w5 bu hafta), geçen haftanın aynı günleri
 * (lastSame: geçen pazartesiden, bu haftada geçen süre kadar) ve tüm zamanlar. Bu hafta yarım
 * olduğu için tam geçen haftayla değil lastSame ile kıyaslanır (pazartesi sabahı "%62 az" demesin).
 * Bitmemiş pencerenin sonu bir gün sonrasıdır (sunucu ile veritabanı saati arasındaki küçük fark
 * yeni satırı dışarıda bırakmasın; gelecekte tarihli satır yok).
 */
export function overviewWindows(now: Date): TimeWindow[] {
  const thisWeek = weekStart(now).getTime();
  const open = new Date(now.getTime() + dayMs);
  const weeks = Array.from({ length: chartWeeks }, (_, i): TimeWindow => {
    const start = thisWeek - (chartWeeks - 1 - i) * weekMs;
    return { key: windowKeys[i], start: new Date(start), end: i === chartWeeks - 1 ? open : new Date(start + weekMs) };
  });
  const lastWeek = thisWeek - weekMs;
  return [
    ...weeks,
    { key: "lastSame", start: new Date(lastWeek), end: new Date(lastWeek + Math.max(0, now.getTime() - thisWeek)) },
    { key: "all", start: new Date(0), end: open },
  ];
}

/**
 * Bir penceredeki sayılar: biten lab (eğitim + senaryo), öğrencinin bir senaryo labındaki ilk biten
 * denemesi (firstTries) ve bunlardan tuzağı fark eden (firstNoticed), yeni kayıt, aktif öğrenci.
 */
export type WindowCounts = { finished: number; firstTries: number; firstNoticed: number; signups: number; active: number };
export const emptyCounts: WindowCounts = { finished: 0, firstTries: 0, firstNoticed: 0, signups: 0, active: 0 };

const thousands = (n: number) => n.toLocaleString("tr-TR");

/** Adil kıyas cümlesi: "geçen hafta aynı günlerde 2, 1 fazla" (yüzde yok; küçük sayıda yanıltır). */
export function versusLastWeek(current: number, before: number): string {
  const t = getMessages().adminOverview.versus;
  if (current === before) return format(t.same, { n: thousands(before) });
  return format(current > before ? t.more : t.less, { n: thousands(before), diff: thousands(Math.abs(current - before)) });
}

/**
 * İlk denemede tuzağı fark eden. En az `trapMinSample` ilk deneme yoksa yüzde verilmez: "3/3" ve
 * "3 ilk denemede 3 kez fark edildi" (küçük sayıda %100 yanıltır).
 */
export function noticedFirst(c: Pick<WindowCounts, "firstTries" | "firstNoticed">): { value: string; sub: string } {
  const t = getMessages().adminOverview.noticed;
  if (c.firstTries === 0) return { value: t.none, sub: t.noTries };
  const n = { tries: thousands(c.firstTries), noticed: thousands(c.firstNoticed) };
  if (c.firstTries < trapMinSample) return { value: format(t.fraction, n), sub: format(t.few, n) };
  return { value: format(t.percent, { n: Math.round((c.firstNoticed / c.firstTries) * 100) }), sub: format(t.many, n) };
}

// ---------------------------------------------------------------------------------------
// Grafik
// ---------------------------------------------------------------------------------------

export type ChartBar = { label: string; value: number; display: string; current: boolean };

/** Son 6 haftada biten oda; son çubuk bu hafta (henüz bitmedi, ekranda taralı). */
export function buildChart(counts: Record<WindowKey, WindowCounts>, windows: readonly TimeWindow[]): ChartBar[] {
  const t = getMessages().adminOverview.chart;
  const weeks = windows.slice(0, chartWeeks);
  return weeks.map((w, i) => {
    const value = counts[w.key].finished;
    const current = i === weeks.length - 1;
    return { label: current ? t.thisWeek : dayMonthShort(w.start), value, display: thousands(value), current };
  });
}

// ---------------------------------------------------------------------------------------
// Durum karnesi: dört alan ve üstteki cümle
// ---------------------------------------------------------------------------------------

/** Alanın rengi: turuncu iş var, sarı göz at, yeşil yolunda. */
export const tones = ["work", "watch", "good"] as const;
export type Tone = (typeof tones)[number];

export const areaKeys = ["applications", "students", "content", "labs"] as const;
export type AreaKey = (typeof areaKeys)[number];

export type Area = { key: AreaKey; tone: Tone; name: string; value: string; unit: string; line: string; href: string; go: string };

/** Alanların girdisi; izni olmayan alanın girdisi hiç verilmez (alan da çıkmaz, sayısı sayfaya gitmez). */
export type AreaInput = {
  applications?: { pending: number; newSchool: number; answered: number; notes: number };
  /** Kullanıcılar sayfasını açabilen (ROLES) oraya, açamayan Canlı nabza gider. */
  students: { active: number; finished: number; finishedBefore: number; canSeeUsers: boolean };
  news?: { emptyWeeks: Date[]; next: Date | null };
  tips?: { pool: number; now: Date };
  labs?: { published: number; hidden: number; drafts: { name: string; neighborhood: string }[] };
};

/** Havuzda 7'den az ipucu varsa bugünkü ipucunun yeniden çıkacağı gün (havuz sırayla döner). */
export function tipRepeatDay(pool: number, now: Date): Date | null {
  return pool > 0 && pool < 7 ? new Date(dayStart(now).getTime() + pool * dayMs) : null;
}

const listFormat = () => new Intl.ListFormat("tr", { style: "long", type: "conjunction" });

/** Dört alan (Talepler, Öğrenciler, Gündem ve ipucu, Odalar); izni olmayan alan çıkmaz. */
export function buildAreas(input: AreaInput): Area[] {
  const t = getMessages().adminOverview.areas;
  const areas: Area[] = [];

  if (input.applications) {
    const a = input.applications;
    const parts = [
      a.newSchool > 0 ? format(t.applications.newSchool, { n: a.newSchool }) : "",
      a.answered > 0 ? format(t.applications.answered, { n: a.answered }) : "",
      a.notes > 0 ? format(t.applications.notes, { n: a.notes }) : "",
    ].filter(Boolean);
    areas.push({
      key: "applications",
      tone: a.pending > 0 ? "work" : "good",
      name: t.applications.name,
      value: thousands(a.pending),
      unit: t.applications.unit,
      line: a.pending === 0 ? t.applications.none : parts.length ? `${parts.join(", ")}.` : t.applications.decide,
      href: paths.adminApplications,
      go: t.applications.go,
    });
  }

  const s = input.students;
  areas.push({
    key: "students",
    tone: s.finished < s.finishedBefore ? "watch" : "good",
    name: t.students.name,
    value: thousands(s.finished),
    unit: t.students.unit,
    line: format(t.students.line, { active: thousands(s.active), versus: versusLastWeek(s.finished, s.finishedBefore) }),
    href: s.canSeeUsers ? paths.adminUsers : paths.adminPulse,
    go: s.canSeeUsers ? t.students.goUsers : t.students.goPulse,
  });

  if (input.news || input.tips) {
    const repeat = input.tips ? tipRepeatDay(input.tips.pool, input.tips.now) : null;
    const tipLine = input.tips
      ? input.tips.pool === 0
        ? t.content.tipEmpty
        : repeat
          ? format(t.content.tipRepeat, { n: input.tips.pool, date: dayMonth(repeat) })
          : format(t.content.tipPool, { n: input.tips.pool })
      : "";
    const tipTrouble = !!input.tips && (input.tips.pool === 0 || !!repeat);
    const news = input.news;
    const newsLine = news ? (news.next ? format(t.content.next, { date: dayMonth(news.next) }) : t.content.noNext) : "";
    areas.push({
      key: "content",
      tone: (news && news.emptyWeeks.length > 0) || tipTrouble ? "watch" : "good",
      name: news && input.tips ? t.content.name : news ? t.content.newsName : t.content.tipsName,
      value: news ? thousands(news.emptyWeeks.length) : thousands(input.tips!.pool),
      unit: news ? t.content.newsUnit : t.content.tipsUnit,
      line: [newsLine, tipLine].filter(Boolean).join(" "),
      href: news ? paths.adminNews : paths.adminTips,
      go: news ? t.content.goNews : t.content.goTips,
    });
  }

  if (input.labs) {
    const l = input.labs;
    const shown = l.drafts.slice(0, 3).map((d) => format(t.labs.item, d));
    if (l.drafts.length > 3) shown.push(format(t.labs.more, { n: l.drafts.length - 3 }));
    areas.push({
      key: "labs",
      tone: l.drafts.length > 0 ? "watch" : "good",
      name: t.labs.name,
      value: thousands(l.published),
      unit: t.labs.unit,
      line: l.drafts.length > 0 ? format(t.labs.drafts, { n: l.drafts.length, names: listFormat().format(shown) }) : format(t.labs.none, { n: l.hidden }),
      href: paths.adminLabs,
      go: t.labs.go,
    });
  }
  return areas;
}

/** Üstteki tek cümle: kaç alanda iş var, kaçı yolunda; rengi en kötü alanın rengi. */
export function buildVerdict(areas: readonly Area[], students: AreaInput["students"]): { tone: Tone; title: string; sub: string } {
  const t = getMessages().adminOverview.verdict;
  const open = areas.filter((a) => a.tone !== "good").length;
  const tone: Tone = areas.some((a) => a.tone === "work") ? "work" : open > 0 ? "watch" : "good";
  return {
    tone,
    title: open === 0 ? t.allGood : open === areas.length ? format(t.openAll, { n: open }) : format(t.open, { n: open, good: areas.length - open }),
    sub: format(t.sub, {
      active: thousands(students.active),
      finished: thousands(students.finished),
      versus: versusLastWeek(students.finished, students.finishedBefore),
    }),
  };
}

/**
 * Gündemdeki boş haftalar: verilen cumaların haftasında (pazartesi-pazar) planlı ya da yayında
 * haber yoksa o cuma boştur.
 */
export function emptyNewsWeeks(fridays: readonly Date[], published: readonly Date[]): Date[] {
  return fridays.filter((friday) => {
    const start = weekStart(friday).getTime();
    return !published.some((at) => at.getTime() >= start && at.getTime() < start + weekMs);
  });
}

// ---------------------------------------------------------------------------------------
// En çok tuzağa düşülen lablar
// ---------------------------------------------------------------------------------------

/** Bir labın en az bu kadar biten senaryo denemesi olmadan oranı gösterilmez (küçük sayı yanıltır). */
export const trapMinSample = 10;

export type TrapStat = { labId: string; total: number; hacked: number };

/** Hacklenerek biten denemelerin payına göre sıralı lablar (en az `minSample` deneme, en az bir tuzak). */
export function rankTraps(stats: readonly TrapStat[], minSample = trapMinSample, limit = 4): (TrapStat & { rate: number })[] {
  return stats
    .filter((s) => s.total >= minSample && s.hacked > 0)
    .map((s) => ({ ...s, rate: Math.round((s.hacked / s.total) * 100) }))
    .sort((a, b) => b.hacked / b.total - a.hacked / a.total || b.total - a.total || a.labId.localeCompare(b.labId))
    .slice(0, limit);
}

/** Rapor satırının kaçırılma sayısı: sahte öğe ya da soru (gerçek öğe "kaçırılmaz", yanlış alarmdır). */
export type MissRow = { labId: string; type: "fake" | "question"; key: string; missed: number };

/** Her labın en çok kaçırılan satırı; eşitlikte sahte öğe sorudan önce gelir. */
export function topMissed(rows: readonly MissRow[]): Map<string, MissRow> {
  const best = new Map<string, MissRow>();
  for (const row of rows) {
    if (row.missed <= 0) continue;
    const current = best.get(row.labId);
    const better =
      !current ||
      row.missed > current.missed ||
      (row.missed === current.missed && row.type === "fake" && current.type !== "fake") ||
      (row.missed === current.missed && row.type === current.type && row.key < current.key);
    if (better) best.set(row.labId, row);
  }
  return best;
}
