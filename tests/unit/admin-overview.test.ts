import { describe, expect, it } from "vitest";
import {
  agoLabel,
  clock,
  dayKey,
  dayMonth,
  dayMonthShort,
  dayStart,
  monthStart,
  trParts,
  upcomingFridays,
  weekStart,
  whenLabel,
} from "@/lib/admin/calendar";
import {
  buildAreas,
  buildChart,
  buildVerdict,
  emptyCounts,
  emptyNewsWeeks,
  noticedFirst,
  overviewWindows,
  rankTraps,
  tipRepeatDay,
  topMissed,
  versusLastWeek,
  windowKeys,
  type AreaInput,
  type WindowCounts,
  type WindowKey,
} from "@/lib/admin/overview-model";
import { feedEntry, fillBuckets, mergeFeed, peakHour, type FeedLab } from "@/lib/admin/pulse-model";

const at = (iso: string) => new Date(iso);
// Pazartesi 12 Ekim 2026, Türkiye saatiyle 00.30 (UTC'de hâlâ pazar).
const mondayNight = at("2026-10-11T21:30:00Z");
// Pazar 11 Ekim 2026, Türkiye saatiyle 14.05.
const sunday = at("2026-10-11T11:05:00Z");

describe("yönetim takvimi (Türkiye saati)", () => {
  it("gün, hafta ve ay başı Türkiye saatiyle", () => {
    expect(trParts(mondayNight)).toMatchObject({ year: 2026, month: 9, day: 12, weekday: 0, hour: 0, minute: 30 });
    expect(dayStart(mondayNight).toISOString()).toBe("2026-10-11T21:00:00.000Z");
    expect(weekStart(mondayNight).toISOString()).toBe("2026-10-11T21:00:00.000Z");
    expect(weekStart(sunday).toISOString()).toBe("2026-10-04T21:00:00.000Z");
    expect(monthStart(sunday).toISOString()).toBe("2026-09-30T21:00:00.000Z");
    expect(monthStart(sunday, 1).toISOString()).toBe("2026-08-31T21:00:00.000Z");
    expect(monthStart(at("2026-01-15T10:00:00Z"), 1).toISOString()).toBe("2025-11-30T21:00:00.000Z");
    expect(dayKey(mondayNight)).toBe("2026-10-12");
    expect(clock(sunday)).toBe("14:05");
  });

  it("sıradaki cumalar: bugün cumaysa o da", () => {
    expect(upcomingFridays(sunday, 4).map(dayKey)).toEqual(["2026-10-16", "2026-10-23", "2026-10-30", "2026-11-06"]);
    expect(upcomingFridays(at("2026-10-16T08:00:00Z"), 2).map(dayKey)).toEqual(["2026-10-16", "2026-10-23"]);
    expect(upcomingFridays(at("2026-10-16T08:00:00Z"), 1)[0].toISOString()).toBe("2026-10-15T21:00:00.000Z");
  });

  it("tarih metinleri", () => {
    expect(dayMonth(sunday)).toBe("11 Ekim");
    expect(dayMonthShort(at("2026-09-07T10:00:00Z"))).toBe("7 Eyl");
    expect(whenLabel(at("2026-10-11T06:15:00Z"), sunday)).toEqual({ short: "Bugün 09:15", full: "11 Ekim 2026, 09:15" });
    expect(whenLabel(at("2026-10-10T19:10:00Z"), sunday).short).toBe("Dün 22:10");
    expect(whenLabel(at("2026-10-09T08:00:00Z"), sunday).short).toBe("9 Ekim");
    expect(whenLabel(at("2025-12-30T08:00:00Z"), sunday).short).toBe("30 Aralık 2025");
  });

  it("canlı nabızdaki süreler tam yazımla", () => {
    const now = at("2026-10-11T12:00:00Z");
    const ago = (seconds: number) => agoLabel(new Date(now.getTime() - seconds * 1000), now);
    expect(ago(3)).toBe("az önce");
    expect(ago(-5)).toBe("az önce");
    expect(ago(40)).toBe("az önce");
    expect(ago(50)).toBe("1 dakika önce");
    expect(ago(150)).toBe("3 dakika önce");
    expect(ago(2 * 3600 + 5)).toBe("2 saat önce");
    expect(ago(86_400 + 3600)).toBe("dün");
    expect(ago(4 * 86_400)).toBe("4 gün önce");
  });
});

/** Pencerelerin sayıları; verilmeyen pencere boş. */
function counts(values: Partial<Record<WindowKey, Partial<WindowCounts>>>) {
  return Object.fromEntries(windowKeys.map((key) => [key, { ...emptyCounts, ...values[key] }])) as Record<WindowKey, WindowCounts>;
}

describe("özet: sayılar ve grafik", () => {
  it("pencereler: son 6 hafta pazartesiden, geçen haftanın aynı günleri, tüm zamanlar", () => {
    const windows = overviewWindows(sunday);
    expect(windows.map((w) => w.key)).toEqual([...windowKeys]);
    expect(windows[0].start.toISOString()).toBe("2026-08-30T21:00:00.000Z");
    expect(windows[5].start.toISOString()).toBe("2026-10-04T21:00:00.000Z");
    expect(windows[4].end.getTime()).toBe(windows[5].start.getTime());
    // Bitmemiş pencere bir gün sonrasına kadar açık (saat farkı yeni satırı dışarıda bırakmasın).
    expect(windows[5].end.getTime()).toBeGreaterThan(sunday.getTime());
    // Geçen hafta, bu haftada geçen süre kadar: pazartesi 00.00'dan pazar 14.05'e.
    const lastSame = windows.find((w) => w.key === "lastSame")!;
    expect(lastSame.start.toISOString()).toBe("2026-09-27T21:00:00.000Z");
    expect(lastSame.end.toISOString()).toBe("2026-10-04T11:05:00.000Z");
    // Pazartesi gece yarısı geçen haftanın penceresi boş (yarım haftayı tam haftayla kıyaslamaz).
    const monday = overviewWindows(weekStart(mondayNight)).find((w) => w.key === "lastSame")!;
    expect(monday.end.getTime()).toBe(monday.start.getTime());
  });

  it("adil kıyas cümlesi: yüzde yok, fark sayıyla", () => {
    expect(versusLastWeek(5, 3)).toBe("geçen hafta aynı günlerde 3, 2 fazla");
    expect(versusLastWeek(2, 1180)).toBe("geçen hafta aynı günlerde 1.180, 1.178 az");
    expect(versusLastWeek(4, 4)).toBe("geçen hafta aynı günlerde de 4");
  });

  it("ilk denemede fark eden: 10 denemeden azsa yüzde yerine kesir", () => {
    expect(noticedFirst({ firstTries: 0, firstNoticed: 0 })).toEqual({ value: "—", sub: "henüz ilk deneme yok" });
    expect(noticedFirst({ firstTries: 3, firstNoticed: 3 })).toEqual({ value: "3/3", sub: "3 ilk denemede 3 kez fark edildi" });
    expect(noticedFirst({ firstTries: 200, firstNoticed: 126 })).toEqual({ value: "%63", sub: "200 ilk denemeden" });
  });

  it("son 6 haftanın grafiği: biten oda, son çubuk bu hafta", () => {
    const bars = buildChart(counts({ w0: { finished: 180 }, w3: { finished: 905 }, w4: { finished: 1045 }, w5: { finished: 1180 } }), overviewWindows(sunday));
    expect(bars.map((b) => b.label)).toEqual(["31 Ağu", "7 Eyl", "14 Eyl", "21 Eyl", "28 Eyl", "Bu hafta"]);
    expect(bars.map((b) => b.value)).toEqual([180, 0, 0, 905, 1045, 1180]);
    expect(bars.at(-1)).toMatchObject({ current: true, display: "1.180" });
    expect(bars.filter((b) => b.current)).toHaveLength(1);
  });
});

describe("özet: durum karnesi", () => {
  const students = { active: 12, finished: 5, finishedBefore: 3, canSeeUsers: true };
  const full: AreaInput = {
    applications: { pending: 6, newSchool: 3, answered: 1, notes: 0 },
    students,
    news: { emptyWeeks: [at("2026-10-22T21:00:00Z"), at("2026-10-29T21:00:00Z")], next: at("2026-10-15T21:00:00Z") },
    tips: { pool: 6, now: sunday },
    labs: {
      published: 20,
      hidden: 1,
      drafts: [
        { name: "Sahte antivirüs uyarısı", neighborhood: "Zararlı Yazılım Ormanı" },
        { name: "Taksitli oyun parası", neighborhood: "Para Çarşısı" },
      ],
    },
  };

  it("ipucu havuzu 7'den azsa bugünkü ipucunun yeniden çıkacağı gün", () => {
    expect(dayKey(tipRepeatDay(6, sunday)!)).toBe("2026-10-17");
    expect(tipRepeatDay(7, sunday)).toBeNull();
    expect(tipRepeatDay(0, sunday)).toBeNull();
  });

  it("dört alan sırayla; renk, sayı, satır ve gidilecek sayfa", () => {
    const areas = buildAreas(full);
    expect(areas.map((a) => [a.key, a.tone, a.value, a.href])).toEqual([
      ["applications", "work", "6", "/yonetim/talepler"],
      ["students", "good", "5", "/yonetim/kullanicilar"],
      ["content", "watch", "2", "/yonetim/gundem"],
      ["labs", "watch", "20", "/yonetim/odalar"],
    ]);
    expect(areas[0]).toMatchObject({ unit: "talep bekliyor", line: "3 tanesi listede olmayan okuldan, 1 tanesinde istediğin bilgi geldi.", go: "Taleplere git" });
    expect(areas[1]).toMatchObject({ unit: "oda bitti bu hafta", line: "12 öğrenci aktif · geçen hafta aynı günlerde 3, 2 fazla", go: "Kullanıcılara git" });
    expect(areas[2]).toMatchObject({
      name: "Gündem ve ipucu",
      unit: "hafta gündemde boş",
      line: "Sıradaki haber 16 Ekim. İpucu havuzu azaldı: 6 ipucu, 17 Ekim günü bugünkü ipucu tekrar çıkar.",
    });
    expect(areas[3].line).toBe("2 odada yayınlanmamış değişiklik: Sahte antivirüs uyarısı (Zararlı Yazılım Ormanı) ve Taksitli oyun parası (Para Çarşısı).");
  });

  it("her şey yolundayken alanlar yeşil, üstteki cümle de", () => {
    const areas = buildAreas({
      applications: { pending: 0, newSchool: 0, answered: 0, notes: 0 },
      students: { ...students, finished: 3 },
      news: { emptyWeeks: [], next: null },
      tips: { pool: 30, now: sunday },
      labs: { published: 20, hidden: 0, drafts: [] },
    });
    expect(areas.map((a) => a.tone)).toEqual(["good", "good", "good", "good"]);
    expect(areas[0].line).toBe("Bekleyen talep yok.");
    expect(areas[1].line).toBe("12 öğrenci aktif · geçen hafta aynı günlerde de 3");
    expect(areas[2].line).toBe("Planlı haber yok. İpucu havuzunda 30 ipucu.");
    expect(areas[3].line).toBe("Bekleyen taslak yok. Gizli oda: 0.");
    expect(buildVerdict(areas, { ...students, finished: 3 })).toEqual({
      tone: "good",
      title: "Her şey yolunda.",
      sub: "Bu hafta 12 öğrenci 3 oda bitirdi; geçen hafta aynı günlerde de 3.",
    });
  });

  it("izni olmayan alan çıkmaz; yalnızca ipucu izni olan sorumlu", () => {
    const areas = buildAreas({ students: { ...students, finished: 1, canSeeUsers: false }, tips: { pool: 0, now: sunday } });
    expect(areas.map((a) => [a.key, a.tone])).toEqual([
      ["students", "watch"],
      ["content", "watch"],
    ]);
    expect(areas[0]).toMatchObject({ href: "/yonetim/canli-nabiz", go: "Canlı nabza git" });
    expect(areas[1]).toMatchObject({ name: "Günün ipucu", value: "0", unit: "ipucu havuzda", line: "İpucu havuzu boş, sabit ipucu görünüyor.", href: "/yonetim/ipucu" });
    expect(buildVerdict(areas, students).title).toBe("2 iş seni bekliyor.");
  });

  it("üstteki cümle: en kötü alanın rengi, kaç iş ve kaç alan yolunda", () => {
    const verdict = buildVerdict(buildAreas(full), students);
    expect(verdict).toEqual({
      tone: "work",
      title: "3 iş seni bekliyor, 1 alan yolunda.",
      sub: "Bu hafta 12 öğrenci 5 oda bitirdi; geçen hafta aynı günlerde 3, 2 fazla.",
    });
  });

  it("üçten fazla taslak oda kısaltılır", () => {
    const drafts = Array.from({ length: 5 }, (_, i) => ({ name: `Oda ${i + 1}`, neighborhood: "Hesap Kalesi" }));
    expect(buildAreas({ students, labs: { published: 1, hidden: 0, drafts } })[1].line).toBe(
      "5 odada yayınlanmamış değişiklik: Oda 1 (Hesap Kalesi), Oda 2 (Hesap Kalesi), Oda 3 (Hesap Kalesi) ve 2 oda daha.",
    );
  });

  it("gündemde boş hafta: cumanın haftasında (pazartesi-pazar) planlı ya da yayında haber yoksa", () => {
    const fridays = upcomingFridays(sunday, 4);
    const published = [
      at("2026-10-12T05:00:00Z"), // 16 Ekim haftasının pazartesisi
      at("2026-10-25T20:59:00Z"), // 23 Ekim haftasının pazarı, 23.59
      at("2026-11-01T21:00:00Z"), // 6 Kasım haftasının pazartesisi 00.00
    ];
    expect(emptyNewsWeeks(fridays, published).map(dayKey)).toEqual(["2026-10-30"]);
    expect(emptyNewsWeeks(fridays, []).map(dayKey)).toEqual(fridays.map(dayKey));
  });
});

describe("özet: en çok tuzağa düşülen lablar", () => {
  it("en az örnek sayısı ve en az bir tuzak; orana göre sıralı, en fazla 4", () => {
    const ranked = rankTraps([
      { labId: "a", total: 9, hacked: 9 },
      { labId: "b", total: 100, hacked: 59 },
      { labId: "c", total: 20, hacked: 10 },
      { labId: "d", total: 50, hacked: 0 },
      { labId: "e", total: 40, hacked: 20 },
      { labId: "f", total: 10, hacked: 2 },
      { labId: "g", total: 30, hacked: 3 },
    ]);
    expect(ranked.map((r) => [r.labId, r.rate])).toEqual([
      ["b", 59],
      ["e", 50],
      ["c", 50],
      ["f", 20],
    ]);
  });

  it("en çok kaçırılan satır; eşitlikte sahte öğe sorudan önce", () => {
    const best = topMissed([
      { labId: "a", type: "question", key: "soru-1", missed: 7 },
      { labId: "a", type: "fake", key: "kargo", missed: 7 },
      { labId: "a", type: "fake", key: "banka", missed: 3 },
      { labId: "b", type: "question", key: "soru-2", missed: 2 },
      { labId: "b", type: "question", key: "soru-1", missed: 2 },
      { labId: "c", type: "fake", key: "x", missed: 0 },
    ]);
    expect(best.get("a")).toMatchObject({ type: "fake", key: "kargo" });
    expect(best.get("b")).toMatchObject({ key: "soru-1" });
    expect(best.has("c")).toBe(false);
  });
});

describe("canlı nabız", () => {
  it("son bir saatin 5 dakikalık dilimleri", () => {
    expect(
      fillBuckets([
        { b: 0, n: 2 },
        { b: 11, n: 5 },
        { b: 12, n: 9 },
        { b: -1, n: 9 },
        { b: 3.5, n: 9 },
      ]),
    ).toEqual([2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5]);
  });

  it("isimsiz akışın cümleleri", () => {
    const labs = new Map<string, FeedLab>([
      ["l1", { name: "Sahte kargo maili", template: "INBOX", neighborhood: "Oltalama Limanı" }],
      ["l2", { name: "Kodu soran arkadaş", template: "MESSAGING", neighborhood: "Hesap Kalesi" }],
      ["l3", { name: "Oltalama eğitimi", template: "TRAINING", neighborhood: "Oltalama Limanı" }],
    ]);
    const row = (kind: string, labId: string | null = null, a: string | null = null, b: string | null = null) => feedEntry({ kind, at: sunday, labId, a, b }, labs);
    expect(row("hacked", "l1")).toEqual({ kind: "hacked", text: '"Sahte kargo maili" odasında biri tuzağa düştü, rapor açıldı', where: "Oltalama Limanı", subject: "Sahte kargo maili" });
    expect(row("safe", "l1")?.text).toBe('"Sahte kargo maili" odasında biri güvende kaldı');
    expect(row("reported", "l1")?.text).toBe('"Sahte kargo maili" odasında biri sahte maili fark edip bildirdi');
    expect(row("reported", "l2")?.text).toBe('"Kodu soran arkadaş" odasında biri sahte mesajı fark edip bildirdi');
    expect(row("clicked", "l1")?.text).toBe('"Sahte kargo maili" odasında biri sahte bağlantıya tıkladı');
    expect(row("training", "l3")).toMatchObject({ text: '"Oltalama eğitimi" eğitimini biri bitirdi', where: "Oltalama Limanı" });
    expect(row("done", "silinmis")).toEqual({ kind: "done", text: '"bir oda" odasını biri bitirdi', where: null, subject: "bir oda" });
    expect(row("signup")).toEqual({ kind: "signup", text: "Yeni kayıt: bir öğrenci aramıza katıldı", where: null, subject: null });
    expect(row("application", null, "Ankara", "Çankaya")).toEqual({ kind: "application", text: "Yeni öğretmenlik talebi geldi", where: "Ankara · Çankaya", subject: null });
    expect(row("badge", null, "ilk-rapor")).toMatchObject({ text: 'Biri "İlk rapor" rozetini kazandı', subject: "İlk rapor" });
    expect(row("badge", null, "olmayan-rozet")).toBeNull();
    expect(row("tip_viewed")).toBeNull();
  });

  it("art arda aynı hareket tek satır olur, en yenisinin zamanı ve anahtarı kalır", () => {
    const labs = new Map<string, FeedLab>([["l1", { name: "Sahte kargo maili", template: "INBOX", neighborhood: "Oltalama Limanı" }]]);
    const entry = (id: string, kind: string, labId: string | null = null, a: string | null = null) => ({ id, ...feedEntry({ kind, at: sunday, labId, a, b: null }, labs)! });
    const merged = mergeFeed([
      entry("a", "safe", "l1"),
      entry("b", "safe", "l1"),
      entry("c", "safe", "l1"),
      entry("d", "hacked", "l1"),
      entry("e", "safe", "l1"),
      entry("f", "signup"),
      entry("g", "signup"),
      entry("h", "badge", null, "ilk-rapor"),
      entry("i", "badge", null, "ilk-rapor"),
      entry("j", "application"),
      entry("k", "application"),
      entry("l", "reported", "l1"),
      entry("m", "reported", "l1"),
    ]);
    expect(merged.map((m) => [m.id, m.n, m.text])).toEqual([
      ["a", 3, "Sahte kargo maili: 3 kişi güvende kaldı"],
      ["d", 1, '"Sahte kargo maili" odasında biri tuzağa düştü, rapor açıldı'],
      ["e", 1, '"Sahte kargo maili" odasında biri güvende kaldı'],
      ["f", 2, "2 yeni öğrenci aramıza katıldı"],
      ["h", 2, '2 kişi "İlk rapor" rozetini kazandı'],
      ["j", 2, "2 yeni öğretmenlik talebi geldi"],
      ["l", 2, "Sahte kargo maili: 2 kişi sahte olanı fark etti"],
    ]);
    expect(mergeFeed([])).toEqual([]);
  });

  it("günün en hareketli saati", () => {
    const hours = Array.from({ length: 24 }, () => 0);
    expect(peakHour(hours)).toBeNull();
    hours[9] = 3;
    hours[14] = 7;
    hours[15] = 7;
    expect(peakHour(hours)).toBe("14:00");
    expect(fillBuckets([{ b: 23, n: 2 }, { b: 24, n: 9 }], 24).at(-1)).toBe(2);
  });
});
