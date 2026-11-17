// Canlı nabzın verisi (CanliNabiz-Son): şu an labda olan öğrenci sayısı ve mahallelere dağılımı,
// son bir saatte biten lablar ve isimsiz akış. Hepsi veritabanında toplanır; sayfaya yalnızca
// sayılar ve hazır cümleler gider (öğrenci adı, e-postası, kimliği yok; akıştaki satırların
// anahtarı sunucu açıldığında rastgele seçilen bir anahtarla karılmış özettir).
//
// "Şu an odada": rolü öğrenci olan, son 10 dakikada sürmekte olan bir senaryo denemesini başlatan
// ya da o denemede bir şey yapan (olay), ya da bitmemiş bir eğitim labında kart ilerleten kişi.
// Bir kişi aynı anda iki labdaysa toplamda bir kez, mahallelerde her birinde sayılır.
// Yalnızca sunucuda; çağıran sayfa önce erişimi denetler (requireAdminAccess).

import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { requestTime } from "@/lib/lab/data";
import { agoLabel, dayStart, minuteMs, trParts } from "./calendar";
import {
  bucketCount,
  bucketMinutes,
  feedEntry,
  feedSize,
  fillBuckets,
  liveWindowMinutes,
  mergeFeed,
  peakHour,
  type FeedKind,
  type FeedLab,
  type FeedRow,
} from "./pulse-model";

export type PulseFeedItem = {
  /** Yalnızca listedeki yerini tutmak için: kişiyle ya da kayıtla eşlenemez. */
  id: string;
  kind: FeedKind;
  text: string;
  where: string | null;
  at: string;
  ago: string;
  /** Birleşen hareket sayısı (art arda aynı olay tek satır olur). */
  n: number;
};

export type PulseToday = {
  /** Bugün biten oda (senaryo ve eğitim). */
  finished: number;
  safe: number;
  hacked: number;
  signups: number;
  /** Günün 24 saati, Türkiye saatiyle; her saatte biten oda. */
  hours: number[];
  /** "14:00" ya da null. */
  peak: string | null;
  /** Şu anki saat (0-23), grafikte işaretlenir. */
  nowHour: number;
};

export type PulseData = {
  live: number;
  neighborhoods: { name: string; color: string; icon: string; count: number }[];
  hour: { finished: number; buckets: number[] };
  today: PulseToday;
  /** Akıştaki en yeni hareketin ne kadar önce olduğu ("2 saat önce"); hareket yoksa null. */
  lastActivity: string | null;
  feed: PulseFeedItem[];
};

// Akıştaki satırların anahtarı: sunucu her açılışta yeni bir anahtar seçer, özet geri çevrilemez.
const feedKey = randomBytes(16);
const feedId = (kind: string, ref: string) => createHmac("sha256", feedKey).update(`${kind}:${ref}`).digest("base64url").slice(0, 16);

type LiveRow = { neighborhoodId: string | null; count: number };

async function liveCounts(since: Date) {
  return db.$queryRaw<LiveRow[]>`
    WITH live AS (
      SELECT a."userId" AS u, a."labId" AS lab FROM "LabAttempt" a
      WHERE a."status" = 'IN_PROGRESS'
        AND (a."startedAt" >= ${since} OR EXISTS (SELECT 1 FROM "LabEvent" e WHERE e."attemptId" = a."id" AND e."createdAt" >= ${since}))
      UNION
      SELECT p."userId", p."labId" FROM "TrainingProgress" p WHERE p."completedAt" IS NULL AND p."updatedAt" >= ${since}
    ),
    students AS (
      SELECT live.u, l."neighborhoodId" AS n FROM live
      JOIN "User" s ON s."id" = live.u AND s."role" = 'STUDENT'
      JOIN "Lab" l ON l."id" = live.lab
    )
    SELECT n AS "neighborhoodId", count(DISTINCT u)::int AS count FROM students GROUP BY n
    UNION ALL
    SELECT NULL, count(DISTINCT u)::int FROM students`;
}

async function hourBuckets(from: Date) {
  return db.$queryRaw<{ b: number; n: number }[]>`
    WITH finished AS (
      SELECT "endedAt" AS t FROM "LabAttempt" WHERE "status" IN ('COMPLETED', 'HACKED') AND "endedAt" >= ${from}
      UNION ALL
      SELECT "completedAt" FROM "TrainingProgress" WHERE "completedAt" >= ${from}
    )
    SELECT floor(extract(epoch FROM (t - ${from}::timestamp)) / ${bucketMinutes * 60}::int)::int AS b, count(*)::int AS n
    FROM finished GROUP BY 1`;
}

type TodayRow = { finished: number; safe: number; hacked: number; signups: number };

/** Bugünün toplamları ve saat saat biten oda (senaryo ve eğitim), gün Türkiye saatiyle 00.00'da başlar. */
async function todayCounts(from: Date) {
  const [[row], hours] = await Promise.all([
    db.$queryRaw<TodayRow[]>`
      SELECT
        ((SELECT count(*) FROM "LabAttempt" WHERE "status" IN ('COMPLETED', 'HACKED') AND "endedAt" >= ${from})
          + (SELECT count(*) FROM "TrainingProgress" WHERE "completedAt" >= ${from}))::int AS finished,
        (SELECT count(*) FROM "LabAttempt" WHERE "status" = 'COMPLETED' AND "resultReport"->>'status' = 'safe' AND "endedAt" >= ${from})::int AS safe,
        (SELECT count(*) FROM "LabAttempt" WHERE "status" = 'HACKED' AND "endedAt" >= ${from})::int AS hacked,
        (SELECT count(*) FROM "User" WHERE "role" = 'STUDENT' AND "createdAt" >= ${from})::int AS signups`,
    db.$queryRaw<{ h: number; n: number }[]>`
      WITH finished AS (
        SELECT "endedAt" AS t FROM "LabAttempt" WHERE "status" IN ('COMPLETED', 'HACKED') AND "endedAt" >= ${from}
        UNION ALL
        SELECT "completedAt" FROM "TrainingProgress" WHERE "completedAt" >= ${from}
      )
      SELECT floor(extract(epoch FROM (t - ${from}::timestamp)) / 3600)::int AS h, count(*)::int AS n FROM finished GROUP BY 1`,
  ]);
  return { row: row ?? { finished: 0, safe: 0, hacked: 0, signups: 0 }, hours: fillBuckets(hours.map((r) => ({ b: r.h, n: r.n })), 24) };
}

type FeedQueryRow = FeedRow & { ref: string };

/**
 * Akış: her kaynaktan en yeni 24 hareket, sonra hepsinden en yeni feedSize. Öğrencinin
 * hareketleri (rolü öğrenci olanlar): kayıt, biten senaryo (güvende, bitti, tuzağa düştü), biten
 * eğitim, sahte öğeyi bildirme ya da sahte bağlantıya tıklama; ayrıca öğretmenlik talebi (il ·
 * ilçe) ve kazanılan rozet. Günün ipucuna bakış günle kaydedildiği için (saat yok) akışta yok.
 */
async function feedRows() {
  return db.$queryRaw<FeedQueryRow[]>`
    SELECT * FROM (
      (SELECT 'signup' AS kind, u."id" AS ref, u."createdAt" AS at, NULL::text AS "labId", NULL::text AS a, NULL::text AS b
        FROM "User" u WHERE u."role" = 'STUDENT' ORDER BY u."createdAt" DESC LIMIT 24)
      UNION ALL
      (SELECT CASE WHEN x."status" = 'HACKED' THEN 'hacked' WHEN x."resultReport"->>'status' = 'safe' THEN 'safe' ELSE 'done' END,
          x."id", x."endedAt", x."labId", NULL, NULL
        FROM "LabAttempt" x JOIN "User" u ON u."id" = x."userId" AND u."role" = 'STUDENT'
        WHERE x."status" IN ('COMPLETED', 'HACKED') AND x."endedAt" IS NOT NULL
        ORDER BY x."endedAt" DESC LIMIT 24)
      UNION ALL
      (SELECT 'training', p."userId" || ':' || p."labId", p."completedAt", p."labId", NULL, NULL
        FROM "TrainingProgress" p JOIN "User" u ON u."id" = p."userId" AND u."role" = 'STUDENT'
        WHERE p."completedAt" IS NOT NULL ORDER BY p."completedAt" DESC LIMIT 24)
      UNION ALL
      (SELECT CASE WHEN e."type" = 'link_clicked' THEN 'clicked' ELSE 'reported' END, e."id", e."createdAt", x."labId", NULL, NULL
        FROM "LabEvent" e
        JOIN "LabAttempt" x ON x."id" = e."attemptId"
        JOIN "User" u ON u."id" = x."userId" AND u."role" = 'STUDENT'
        JOIN "LabVersion" v ON v."labId" = x."labId" AND v."version" = x."labVersion"
        WHERE ((e."type" = 'item_moved' AND e."data"->>'to' = 'spam') OR e."type" = 'link_clicked')
          AND EXISTS (
            SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(v."content"->'items') = 'array' THEN v."content"->'items' ELSE '[]'::jsonb END) item
            WHERE item->>'id' = e."data"->>'item' AND item->>'kind' = 'fake'
          )
        ORDER BY e."createdAt" DESC LIMIT 24)
      UNION ALL
      (SELECT 'application', t."id", t."createdAt", NULL, t."province", t."district"
        FROM "TeacherApplication" t ORDER BY t."createdAt" DESC LIMIT 24)
      UNION ALL
      (SELECT 'badge', g."userId" || ':' || g."badgeCode", g."earnedAt", NULL, g."badgeCode", NULL
        FROM "EarnedBadge" g JOIN "User" u ON u."id" = g."userId" AND u."role" = 'STUDENT'
        ORDER BY g."earnedAt" DESC LIMIT 24)
    ) feed
    ORDER BY at DESC LIMIT ${feedSize * 2}`;
}

/**
 * Sayfanın verisi (Sahne tasarımı, 17 Kasım): şu an, mahalleler, son 1 saat, bugün (toplamlar ve
 * saat saat), birleşmiş isimsiz akış. En çok tuzağa düşülen odalar yalnızca Özet'te.
 */
export async function getPulse(): Promise<PulseData> {
  const now = await requestTime();
  const since = new Date(now.getTime() - liveWindowMinutes * minuteMs);
  const hourFrom = new Date(now.getTime() - bucketCount * bucketMinutes * minuteMs);

  const [live, buckets, rows, today, neighborhoods, labs] = await Promise.all([
    liveCounts(since),
    hourBuckets(hourFrom),
    feedRows(),
    todayCounts(dayStart(now)),
    db.neighborhood.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true, color: true, icon: true } }),
    db.$queryRaw<{ id: string; name: string; template: string; neighborhood: string }[]>`
      SELECT l."id", coalesce(nullif(btrim(l."draftContent"->'meta'->>'name'), ''), l."slug") AS name,
        l."template"::text AS template, n."name" AS neighborhood
      FROM "Lab" l JOIN "Neighborhood" n ON n."id" = l."neighborhoodId"`,
  ]);

  const byNeighborhood = new Map(live.map((r) => [r.neighborhoodId, r.count]));
  const labMap = new Map<string, FeedLab>(labs.map((l) => [l.id, { name: l.name, template: l.template, neighborhood: l.neighborhood }]));
  const counted = fillBuckets(buckets);

  const entries: (Omit<PulseFeedItem, "n"> & { subject: string | null })[] = [];
  for (const row of rows) {
    const entry = feedEntry(row, labMap);
    if (!entry) continue;
    entries.push({ id: feedId(row.kind, row.ref), ...entry, at: row.at.toISOString(), ago: agoLabel(row.at, now) });
    if (entries.length === feedSize) break;
  }
  // Birleşmiş satırlarda `subject` (oda ya da rozet adı) tarayıcıya gitmez; cümlede zaten var.
  const feed: PulseFeedItem[] = mergeFeed(entries).map((m) => ({ id: m.id, kind: m.kind, text: m.text, where: m.where, at: m.at, ago: m.ago, n: m.n }));

  return {
    live: byNeighborhood.get(null) ?? 0,
    neighborhoods: neighborhoods.map((n) => ({ name: n.name, color: n.color, icon: n.icon, count: byNeighborhood.get(n.id) ?? 0 })),
    hour: { finished: counted.reduce((a, b) => a + b, 0), buckets: counted },
    today: { ...today.row, hours: today.hours, peak: peakHour(today.hours), nowHour: trParts(now).hour },
    lastActivity: entries[0] ? entries[0].ago : null,
    feed,
  };
}
