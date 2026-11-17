// Yönetim özetinin (Durum karnesi, 17 Kasım) verisi. Bütün sayılar veritabanında toplanır (count,
// FILTER, GROUP BY); sayfaya yalnızca toplamlar ve hazır metinler gider: öğrenci adı, e-postası ya
// da kimliği yok. Alanlar kişinin izinlerine göre seçilir (izni olmayan alanın sayısı sayfaya hiç
// gönderilmez). Yalnızca sunucuda; çağıran sayfa önce erişimi denetler (lib/admin/access.ts).

import "server-only";
import { db } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import { format, getMessages } from "@/lib/i18n";
import { schemaFor, type ScenarioContent, type Template } from "@/lib/lab/content";
import { requestTime } from "@/lib/lab/data";
import { can, hasLabAccess, type AdminAccess } from "./access";
import { clip } from "./audit-sentences";
import { dayMonth, trParts, upcomingFridays, weekMs, weekStart } from "./calendar";
import { readContent, sameContent } from "./lab-data";
import {
  buildAreas,
  buildChart,
  buildVerdict,
  emptyCounts,
  emptyNewsWeeks,
  noticedFirst,
  overviewWindows,
  rankTraps,
  topMissed,
  trapMinSample,
  windowKeys,
  type Area,
  type AreaInput,
  type ChartBar,
  type MissRow,
  type Tone,
  type TrapStat,
  type WindowCounts,
  type WindowKey,
} from "./overview-model";

// ---------------------------------------------------------------------------------------
// Sayılar ve grafik
// ---------------------------------------------------------------------------------------

type CountRow = { i: number; finished: number; firstTries: number; firstNoticed: number; signups: number; active: number };

/**
 * Bütün pencerelerin sayıları tek sorguda. Biten lab: biten senaryo denemesi (tamamlandı ya da
 * hacklendi) ve biten eğitim. Tuzağı fark eden: öğrencinin o labdaki ilk biten denemesi, raporu
 * "Güvende kaldın" (getNoticeCounts ile aynı kural; pencereye ilk denemenin bittiği an girer). Aktif öğrenci: pencerede labda bir şey yapan öğrenci (deneme başlattı,
 * bitirdi, olay gönderdi, eğitim kartı ilerletti). Yeni kayıt: öğrenci hesabı.
 */
async function windowCounts(now: Date) {
  const windows = overviewWindows(now);
  const values = Prisma.join(windows.map((w, i) => Prisma.sql`(${i}::int, ${w.start}::timestamp, ${w.end}::timestamp)`));
  // Olay tablosu büyür: yalnızca son 6 haftanın aralığına bakılır. "Tüm zamanlar"
  // penceresi için deneme ve eğitim satırları zaten herkesi kapsar (her olayın bir denemesi var).
  const eventsFrom = new Date(Math.min(...windows.filter((w) => w.key !== "all").map((w) => w.start.getTime())));
  const rows = await db.$queryRaw<CountRow[]>`
    WITH win(i, s, e) AS (VALUES ${values}),
    finished AS (
      SELECT "endedAt" AS t, ("resultReport"->>'status' = 'safe') AS noticed,
        row_number() OVER (PARTITION BY "userId", "labId" ORDER BY "startedAt", "id") = 1 AS first
      FROM "LabAttempt" WHERE "status" IN ('COMPLETED', 'HACKED') AND "endedAt" IS NOT NULL
      UNION ALL
      SELECT "completedAt", false, false FROM "TrainingProgress" WHERE "completedAt" IS NOT NULL
    ),
    students AS (SELECT "id", "createdAt" FROM "User" WHERE "role" = 'STUDENT'),
    activity AS (
      SELECT "userId" AS u, "startedAt" AS t FROM "LabAttempt"
      UNION ALL SELECT "userId", "endedAt" FROM "LabAttempt" WHERE "endedAt" IS NOT NULL
      UNION ALL SELECT "userId", "updatedAt" FROM "TrainingProgress"
      UNION ALL SELECT a."userId", e."createdAt" FROM "LabEvent" e JOIN "LabAttempt" a ON a."id" = e."attemptId" WHERE e."createdAt" >= ${eventsFrom}
    )
    SELECT win.i,
      (SELECT count(*)::int FROM finished f WHERE f.t >= win.s AND f.t < win.e) AS finished,
      (SELECT count(*)::int FROM finished f WHERE f.first AND f.t >= win.s AND f.t < win.e) AS "firstTries",
      (SELECT count(*)::int FROM finished f WHERE f.first AND f.noticed AND f.t >= win.s AND f.t < win.e) AS "firstNoticed",
      (SELECT count(*)::int FROM students s WHERE s."createdAt" >= win.s AND s."createdAt" < win.e) AS signups,
      (SELECT count(DISTINCT x.u)::int FROM activity x JOIN students s ON s."id" = x.u WHERE x.t >= win.s AND x.t < win.e) AS active
    FROM win ORDER BY win.i`;

  const counts = Object.fromEntries(windowKeys.map((key) => [key, { ...emptyCounts }])) as Record<WindowKey, WindowCounts>;
  for (const row of rows) {
    const key = windows[row.i]?.key;
    if (key) counts[key] = { finished: row.finished, firstTries: row.firstTries, firstNoticed: row.firstNoticed, signups: row.signups, active: row.active };
  }
  return { counts, windows };
}

// ---------------------------------------------------------------------------------------
// Odalar: yayındaki, gizli ve yayınlanmamış değişikliği olanlar
// ---------------------------------------------------------------------------------------

type LabSummary = {
  published: number;
  hidden: number;
  /** Taslakta ya da yayınlanmamış değişikliği olan lablar (Lablar-Son "Yayınlanmamış değişiklik var"). */
  pending: { name: string; neighborhood: string }[];
};

async function labSummary(): Promise<LabSummary> {
  const labs = await db.lab.findMany({
    orderBy: [{ neighborhood: { sortOrder: "asc" } }, { type: "asc" }, { sortOrder: "asc" }],
    select: {
      id: true,
      slug: true,
      template: true,
      status: true,
      publishedVersion: true,
      draftContent: true,
      neighborhood: { select: { name: true } },
    },
  });
  const published = labs.filter((l) => l.publishedVersion !== null);
  const versions = published.length
    ? await db.labVersion.findMany({
        where: { OR: published.map((l) => ({ labId: l.id, version: l.publishedVersion! })) },
        select: { labId: true, content: true },
      })
    : [];
  const live = new Map(versions.map((v) => [v.labId, v.content]));

  const pending = labs.flatMap((lab) => {
    const content = readContent(lab.template, lab.draftContent, lab.slug);
    const current = live.get(lab.id);
    const changed = current !== undefined && !sameContent(content, schemaFor(lab.template).safeParse(current).data ?? current);
    return lab.status === "DRAFT" || changed ? [{ name: content.meta.name || lab.slug, neighborhood: lab.neighborhood.name }] : [];
  });
  return {
    published: labs.filter((l) => l.status === "PUBLISHED").length,
    hidden: labs.filter((l) => l.status === "HIDDEN").length,
    pending,
  };
}

// ---------------------------------------------------------------------------------------
// En çok tuzağa düşülen lablar (yalnızca Özet; 17 Kasım Canlı nabızdan kalktı)
// ---------------------------------------------------------------------------------------

export type TrapView = {
  name: string;
  neighborhood: { name: string; color: string };
  /** Hacklenerek biten denemelerin yüzdesi. */
  rate: number;
  finished: string;
  /** En çok kaçırılan rapor satırı (sahte öğe ya da soru); yoksa null. */
  missed: string | null;
};

/**
 * Hacklenerek biten senaryo denemelerinin payı en yüksek lablar (en az trapMinSample deneme). "En
 * çok kaçırılan" saklanan rapor özetlerinden çıkar: işaretler tek tek kaydedilmediği için sahte öğe
 * ve soru satırlarından en çok "kötü" ya da "yarım" kalan gösterilir (gerçek öğe yanlış alarmdır,
 * cevaplanmayan soru kaçırma sayılmaz).
 *
 * "En çok kaçırılan" labın cevabıdır (hangi mailin sahte olduğu). Yalnızca lab izni olan (labı
 * zaten düzenleyicide gören) kişiye verilir: `withMissed` false ise hiç hesaplanmaz, sayfaya gitmez.
 * Ekipteki öğrenci hesabı labları oynayan bir öğrencidir (güvenlik turu 4).
 */
export async function getTraps(withMissed: boolean): Promise<TrapView[]> {
  const stats = await db.$queryRaw<TrapStat[]>`
    SELECT "labId", count(*)::int AS total, count(*) FILTER (WHERE "status" = 'HACKED')::int AS hacked
    FROM "LabAttempt" WHERE "status" IN ('COMPLETED', 'HACKED') GROUP BY "labId"`;
  const top = rankTraps(stats);
  if (top.length === 0) return [];
  const ids = top.map((s) => s.labId);

  const [misses, labs] = await Promise.all([
    withMissed
      ? db.$queryRaw<MissRow[]>`
          SELECT a."labId", r->>'type' AS type, coalesce(r->>'item', r->>'task') AS key, count(*)::int AS missed
          FROM "LabAttempt" a
          CROSS JOIN LATERAL jsonb_array_elements(
            CASE WHEN jsonb_typeof(a."resultReport"->'rows') = 'array' THEN a."resultReport"->'rows' ELSE '[]'::jsonb END
          ) AS r
          WHERE a."labId" = ANY(${ids}) AND a."status" IN ('COMPLETED', 'HACKED')
            AND r->>'type' IN ('fake', 'question') AND r->>'state' IN ('bad', 'part')
            AND coalesce(r->>'item', r->>'task') IS NOT NULL
          GROUP BY 1, 2, 3`
      : Promise.resolve([]),
    db.lab.findMany({
      where: { id: { in: ids } },
      select: { id: true, slug: true, template: true, draftContent: true, publishedVersion: true, neighborhood: { select: { name: true, color: true } } },
    }),
  ]);
  const missedBy = topMissed(misses);
  const versions = missedBy.size
    ? await db.labVersion.findMany({
        where: { OR: labs.filter((l) => l.publishedVersion !== null).map((l) => ({ labId: l.id, version: l.publishedVersion! })) },
        select: { labId: true, content: true },
      })
    : [];
  const t = getMessages().adminOverview.traps;
  const byId = new Map(labs.map((l) => [l.id, l]));
  const live = new Map(versions.map((v) => [v.labId, v.content]));

  return top.flatMap((stat) => {
    const lab = byId.get(stat.labId);
    if (!lab) return [];
    const miss = missedBy.get(lab.id);
    const content = miss ? (readContent(lab.template, live.get(lab.id) ?? lab.draftContent, lab.slug) as ScenarioContent) : null;
    return [
      {
        name: readContent(lab.template, lab.draftContent, lab.slug).meta.name || lab.slug,
        neighborhood: lab.neighborhood,
        rate: stat.rate,
        finished: format(t.finished, { n: stat.total.toLocaleString("tr-TR") }),
        missed: miss && content ? missedLabel(lab.template, content, miss) : null,
      },
    ];
  });
}

function missedLabel(template: Template, content: ScenarioContent, miss: MissRow): string | null {
  const t = getMessages().adminOverview.traps;
  if (template === "TRAINING") return null;
  if (miss.type === "fake") {
    const item = content.items?.find((i) => i.id === miss.key);
    return item?.sender ? format(t.missedFake[template], { sender: clip(item.sender, 40) }) : null;
  }
  const task = content.tasks?.find((task) => task.id === miss.key);
  return task?.text ? format(t.missedQuestion, { text: clip(task.text, 70) }) : null;
}

// ---------------------------------------------------------------------------------------
// Sayfanın bütün verisi
// ---------------------------------------------------------------------------------------

type Counters = { pending: number; newSchool: number; answered: number; notes: number; tipPool: number };

async function counters(): Promise<Counters> {
  const [row] = await db.$queryRaw<Counters[]>`
    SELECT
      (SELECT count(*)::int FROM "TeacherApplication" WHERE "status" = 'PENDING') AS pending,
      (SELECT count(*)::int FROM "TeacherApplication" WHERE "status" = 'PENDING' AND "schoolId" IS NULL) AS "newSchool",
      (SELECT count(*)::int FROM "TeacherApplication" WHERE "status" = 'PENDING' AND "answeredAt" IS NOT NULL) AS answered,
      (SELECT count(*)::int FROM "TeacherApplication" WHERE "status" = 'PENDING' AND "coordinatorOpinion" IS NOT NULL) AS notes,
      (SELECT count(*)::int FROM "DailyTip" WHERE "status" = 'POOL') AS "tipPool"`;
  return row;
}

export type OverviewData = {
  eyebrow: string;
  verdict: { tone: Tone; title: string; sub: string };
  areas: Area[];
  chart: ChartBar[];
  noticed: { value: string; sub: string };
  traps: TrapView[];
};

export async function getOverview(access: AdminAccess): Promise<OverviewData> {
  const now = await requestTime();
  const t = getMessages().adminOverview;
  const fridays = upcomingFridays(now, 4);
  const newsFrom = weekStart(fridays[0]);
  const newsTo = new Date(weekStart(fridays[fridays.length - 1]).getTime() + weekMs);
  const withNews = can(access, "NEWS");

  const [numbers, labs, c, upcoming, traps] = await Promise.all([
    windowCounts(now),
    hasLabAccess(access) ? labSummary() : null,
    counters(),
    withNews
      ? db.newsArticle.findMany({
          where: { status: { in: ["SCHEDULED", "PUBLISHED"] }, publishedAt: { gte: newsFrom } },
          orderBy: { publishedAt: "asc" },
          select: { publishedAt: true },
          take: 20,
        })
      : [],
    getTraps(hasLabAccess(access)),
  ]);

  // İzni olmayan alanın girdisi hiç verilmez: alan çıkmaz, sayısı sayfaya gitmez.
  const week = numbers.counts.w5;
  const students = { active: week.active, finished: week.finished, finishedBefore: numbers.counts.lastSame.finished, canSeeUsers: can(access, "ROLES") };
  const input: AreaInput = { students };
  if (can(access, "APPLICATIONS")) input.applications = { pending: c.pending, newSchool: c.newSchool, answered: c.answered, notes: c.notes };
  if (withNews) {
    const published = upcoming.flatMap((a) => (a.publishedAt && a.publishedAt < newsTo ? [a.publishedAt] : []));
    const next = upcoming.find((a) => a.publishedAt && a.publishedAt > now)?.publishedAt ?? null;
    input.news = { emptyWeeks: emptyNewsWeeks(fridays, published), next };
  }
  if (can(access, "TIPS")) input.tips = { pool: c.tipPool, now };
  if (labs) input.labs = { published: labs.published, hidden: labs.hidden, drafts: labs.pending };
  const areas = buildAreas(input);

  return {
    eyebrow: format(t.eyebrow, { weekday: t.weekdays[trParts(now).weekday], date: dayMonth(now) }).toLocaleUpperCase("tr"),
    verdict: buildVerdict(areas, students),
    areas,
    chart: buildChart(numbers.counts, numbers.windows),
    noticed: noticedFirst(week),
    traps,
  };
}

export { trapMinSample };
