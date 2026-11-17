// Kayıt defterinin verisi (Kayit-Defteri) ve Özet'teki "Son kayıtlar". Süzgeçler (tür, kişi,
// arama) ve sayfalama veritabanında yapılır; hedeflerin adları (kişi, okul, lab, talep, ipucu,
// haber) tek bir toplu sorguyla bulunur. Kayıtlar yalnızca okunur: bu modül yazmaz.
//
// Gizlilik: e-posta hiç okunmaz. Öğrenci hedef "Ad S." yazılır ve aramada yalnızca adıyla bulunur
// (soyadı görünmediği için aramayla da sınanamaz). Yalnızca sunucuda; çağıran sayfa önce erişimi
// denetler (requirePermission("AUDIT_LOG")).

import "server-only";
import type { AuditKind } from "@/lib/audit";
import { avatarOf } from "@/lib/avatars";
import { db } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import { effectivePermissions } from "./access";
import { auditLink, type AuditLink, type LinkAccess } from "./audit-links";
import {
  actorName,
  auditKindOf,
  auditSentence,
  kindRules,
  type KindRule,
  referencedTargets,
  shortName,
  type SentenceOptions,
  type TargetInfo,
  type TargetLookup,
} from "./audit-sentences";
import type { AuditFilters } from "./audit-url";
import { clock, dayHeading, dayKey, dayKeyStart, dayMs, whenLabel } from "./calendar";

/** Bir sayfadaki kayıt sayısı. */
export const auditPageSize = 50;

/** Ekrandaki bir kayıt: hazır metinler, kişinin kimliği ya da e-postası yok. */
export type AuditEntryView = {
  id: string;
  /** "Bugün 09:15", "Dün 22:10", "9 Ekim" */
  when: string;
  /** "9 Ekim 2026, 09:15" (üzerine gelince, ekran okuyucu) */
  whenFull: string;
  /** ISO zaman (<time dateTime>) */
  at: string;
  /** Gün başlığı için: Türkiye günü ("2026-11-14") ve başlığı ("Bugün", "Dün", "14 Kasım, Cuma"). */
  day: string;
  dayLabel: string;
  /** Gün başlığının altındaki saat: "09:15". */
  clock: string;
  /** Yapan kişinin kimliği: adına basınca yalnızca onun kayıtları (kişi süzgeci, ?kisi=). */
  actor: { id: string; name: string; avatar: string };
  kind: AuditKind;
  sentence: string;
  /** İlgili sayfa (talep, oda, kişi...); bakanın izni yoksa ya da hedef silinmişse null. */
  link: AuditLink | null;
};

type Row = {
  id: string;
  action: string;
  target: string;
  details: unknown;
  createdAt: Date;
  actorId: string;
  actorName: string;
  actorRole: string;
  actorAvatar: string | null;
};

// ---------------------------------------------------------------------------------------
// Süzgeçler (SQL parçaları; değerler her zaman parametre)
// ---------------------------------------------------------------------------------------

const likeEscape = (value: string) => value.replace(/[\\%_]/g, (c) => `\\${c}`);

function ruleSql(rule: KindRule): Prisma.Sql {
  const parts = [
    ...rule.prefixes.map((p) => Prisma.sql`l."action" LIKE ${`${likeEscape(p)}%`}`),
    ...rule.actions.map((a) => Prisma.sql`l."action" = ${a}`),
  ];
  const match = Prisma.sql`(${Prisma.join(parts, " OR ")})`;
  if (!rule.except?.length) return match;
  return Prisma.sql`(${match} AND l."action" NOT IN (${Prisma.join(rule.except)}))`;
}

/** Türün koşulu: lib/audit.ts auditKindOf ile aynı (kindRules; "Rol" diğerlerinin hiçbiri). */
function kindSql(kind: AuditKind): Prisma.Sql {
  if (kind !== "role") return ruleSql(kindRules[kind]);
  return Prisma.sql`NOT (${Prisma.join(Object.values(kindRules).map(ruleSql), " OR ")})`;
}

/**
 * Arama: yapan kişi, hedef kişi (öğrencide yalnızca adı), okul, lab (adı ya da adresi), talep
 * (başvuran ya da okulu), ipucu metni, haber başlığı; ayrıntıdaki ad ve başlık.
 */
function searchSql(query: string): Prisma.Sql {
  const pattern = `%${likeEscape(query)}%`;
  const people = Prisma.sql`
    SELECT "id" FROM "User"
    WHERE (CASE WHEN "role" = 'STUDENT' THEN split_part(btrim("displayName"), ' ', 1) ELSE "displayName" END) ILIKE ${pattern}`;
  const schools = Prisma.sql`SELECT "id" FROM "School" WHERE "name" ILIKE ${pattern}`;
  return Prisma.sql`(
    l."actorId" IN (${people})
    OR l."target" IN (
      SELECT 'user:' || "id" FROM (${people}) p
      UNION ALL SELECT 'school:' || "id" FROM (${schools}) s
      UNION ALL SELECT 'lab:' || "id" FROM "Lab" WHERE "slug" ILIKE ${pattern} OR "draftContent"->'meta'->>'name' ILIKE ${pattern}
      UNION ALL SELECT 'application:' || a."id" FROM "TeacherApplication" a
        WHERE a."userId" IN (${people}) OR a."schoolId" IN (${schools}) OR a."newSchoolName" ILIKE ${pattern}
      UNION ALL SELECT 'tip:' || "id" FROM "DailyTip" WHERE "text" ILIKE ${pattern}
      UNION ALL SELECT 'news:' || "id" FROM "NewsArticle" WHERE "title" ILIKE ${pattern}
    )
    OR l."details"->>'userId' IN (${people})
    OR l."details"->>'schoolId' IN (${schools})
    OR l."details"->>'name' ILIKE ${pattern}
    OR l."details"->>'title' ILIKE ${pattern}
    OR l."details"->>'slug' ILIKE ${pattern}
  )`;
}

function whereSql(filters: AuditFilters, withCursor: boolean): Prisma.Sql {
  const conditions: Prisma.Sql[] = [Prisma.sql`true`];
  if (filters.kind) conditions.push(kindSql(filters.kind));
  if (filters.person) conditions.push(Prisma.sql`l."actorId" = ${filters.person}`);
  if (filters.query) conditions.push(searchSql(filters.query));
  // Tarih aralığı Türkiye günleriyle: başlangıç gününün 00.00'ından bitiş gününün sonuna kadar.
  const from = filters.from ? dayKeyStart(filters.from) : null;
  const to = filters.to ? dayKeyStart(filters.to) : null;
  if (from) conditions.push(Prisma.sql`l."createdAt" >= ${from}`);
  if (to) conditions.push(Prisma.sql`l."createdAt" < ${new Date(to.getTime() + dayMs)}`);
  if (withCursor && filters.cursor) {
    conditions.push(Prisma.sql`(l."createdAt", l."id") < (SELECT "createdAt", "id" FROM "AuditLog" WHERE "id" = ${filters.cursor})`);
  }
  return Prisma.join(conditions, " AND ");
}

const selectRows = (where: Prisma.Sql, limit: number) => db.$queryRaw<Row[]>`
  SELECT l."id", l."action", l."target", l."details", l."createdAt", l."actorId",
    u."displayName" AS "actorName", u."role"::text AS "actorRole", u."avatar" AS "actorAvatar"
  FROM "AuditLog" l JOIN "User" u ON u."id" = l."actorId"
  WHERE ${where}
  ORDER BY l."createdAt" DESC, l."id" DESC
  LIMIT ${limit}`;

// ---------------------------------------------------------------------------------------
// Hedeflerin adları
// ---------------------------------------------------------------------------------------

type TargetRow = { key: string; kind: TargetInfo["kind"]; name: string | null; role: string | null; extra: string | null };

/** "tür:kimlik" anahtarlarının adları, tek sorguda. Bulunamayan (silinmiş) hedef sözlükte olmaz. */
export async function resolveTargets(keys: readonly string[]): Promise<TargetLookup> {
  const ids: Record<TargetInfo["kind"], string[]> = { user: [], school: [], lab: [], application: [], tip: [], news: [] };
  for (const key of keys) {
    const at = key.indexOf(":");
    const kind = key.slice(0, at) as TargetInfo["kind"];
    if (at > 0 && kind in ids) ids[kind].push(key.slice(at + 1));
  }
  if (Object.values(ids).every((list) => list.length === 0)) return new Map();

  const rows = await db.$queryRaw<TargetRow[]>`
    SELECT 'user:' || "id" AS key, 'user' AS kind, "displayName" AS name, "role"::text AS role, NULL AS extra
      FROM "User" WHERE "id" = ANY(${ids.user}::text[])
    UNION ALL
    SELECT 'school:' || "id", 'school', "name", NULL, NULL FROM "School" WHERE "id" = ANY(${ids.school}::text[])
    UNION ALL
    SELECT 'lab:' || l."id", 'lab', coalesce(nullif(btrim(l."draftContent"->'meta'->>'name'), ''), l."slug"), NULL, n."name"
      FROM "Lab" l JOIN "Neighborhood" n ON n."id" = l."neighborhoodId" WHERE l."id" = ANY(${ids.lab}::text[])
    UNION ALL
    SELECT 'application:' || a."id", 'application', u."displayName", u."role"::text, coalesce(s."name", a."newSchoolName")
      FROM "TeacherApplication" a JOIN "User" u ON u."id" = a."userId" LEFT JOIN "School" s ON s."id" = a."schoolId"
      WHERE a."id" = ANY(${ids.application}::text[])
    UNION ALL
    SELECT 'tip:' || "id", 'tip', "text", NULL, NULL FROM "DailyTip" WHERE "id" = ANY(${ids.tip}::text[])
    UNION ALL
    SELECT 'news:' || "id", 'news', "title", NULL, NULL FROM "NewsArticle" WHERE "id" = ANY(${ids.news}::text[])`;

  const lookup = new Map<string, TargetInfo>();
  for (const row of rows) {
    const name = row.name ?? "";
    if (row.kind === "user") lookup.set(row.key, { kind: "user", name, role: row.role ?? "STUDENT" });
    else if (row.kind === "school") lookup.set(row.key, { kind: "school", name });
    else if (row.kind === "lab") lookup.set(row.key, { kind: "lab", name, neighborhood: row.extra });
    else if (row.kind === "application") lookup.set(row.key, { kind: "application", name, role: row.role ?? "STUDENT", school: row.extra });
    else if (row.kind === "tip") lookup.set(row.key, { kind: "tip", text: name });
    else if (row.kind === "news") lookup.set(row.key, { kind: "news", title: name });
  }
  return lookup;
}

async function toViews(rows: readonly Row[], now: Date, access: LinkAccess | null, options: SentenceOptions = {}): Promise<AuditEntryView[]> {
  const lookup = await resolveTargets(referencedTargets(rows));
  return rows.map((row) => {
    const when = whenLabel(row.createdAt, now);
    return {
      id: row.id,
      when: when.short,
      whenFull: when.full,
      at: row.createdAt.toISOString(),
      day: dayKey(row.createdAt),
      dayLabel: dayHeading(row.createdAt, now),
      clock: clock(row.createdAt),
      actor: {
        id: row.actorId,
        name: actorName({ name: row.actorName, role: row.actorRole }, options),
        avatar: avatarOf({ id: row.actorId, avatar: row.actorAvatar }).emoji,
      },
      kind: auditKindOf(row.action),
      sentence: auditSentence(row, lookup, options),
      link: access ? auditLink(row, lookup, access) : null,
    };
  });
}

// ---------------------------------------------------------------------------------------
// Sayfalar
// ---------------------------------------------------------------------------------------

export type Seer = { name: string; avatar: string; admin: boolean };
export type AuditPerson = { id: string; name: string };

export type AuditPage = {
  entries: AuditEntryView[];
  /** Süzgece uyan bütün kayıtların sayısı. */
  total: number;
  /** Daha eski kayıtlar için imleç; yoksa null. */
  older: string | null;
  seers: Seer[];
  /** Kişi süzgecinin seçenekleri: kayıt defterine kaydı düşen kişiler. */
  people: AuditPerson[];
};

/**
 * Bu sayfayı görenler: doğrulanmış, askıda olmayan yöneticiler ve "Kayıt defteri" izni geçerli
 * olan sorumlular (öğrenci hesabına bu izin hiç geçmez: effectivePermissions). Yöneticiler önce.
 */
async function getSeers(): Promise<Seer[]> {
  const users = await db.user.findMany({
    where: {
      emailVerified: true,
      suspended: false,
      OR: [{ role: "ADMIN" }, { teamPermissions: { some: { permission: "AUDIT_LOG" } } }],
    },
    select: { id: true, displayName: true, avatar: true, role: true, birthYear: true, teamPermissions: { select: { permission: true } } },
    orderBy: { createdAt: "asc" },
  });
  return users
    .filter((u) => effectivePermissions(u, u.teamPermissions.map((p) => p.permission)).includes("AUDIT_LOG"))
    .map((u) => ({ name: shortName(u.displayName), avatar: avatarOf(u).emoji, admin: u.role === "ADMIN" }))
    .sort((a, b) => Number(b.admin) - Number(a.admin));
}

/** Kayıt defterine kaydı düşen kişiler (en son işlem yapan 200 kişi), ada göre. */
async function getPeople(): Promise<AuditPerson[]> {
  const rows = await db.$queryRaw<{ id: string; name: string; role: string }[]>`
    SELECT u."id", u."displayName" AS name, u."role"::text AS role
    FROM (SELECT "actorId", max("createdAt") AS last FROM "AuditLog" GROUP BY "actorId" ORDER BY last DESC LIMIT 200) a
    JOIN "User" u ON u."id" = a."actorId"`;
  return rows
    .map((r) => ({ id: r.id, name: r.role === "STUDENT" ? shortName(r.name) : r.name.trim() }))
    .sort((a, b) => a.name.localeCompare(b.name, "tr"));
}

/** Kayıt defteri sayfası; `access` bakanın izinleri (satırdaki "Aç" bağlantıları yalnızca izinli sayfalara). */
export async function getAuditPage(filters: AuditFilters, now: Date, access: LinkAccess): Promise<AuditPage> {
  const [rows, [count], seers, people] = await Promise.all([
    selectRows(whereSql(filters, true), auditPageSize + 1),
    db.$queryRaw<{ n: number }[]>`SELECT count(*)::int AS n FROM "AuditLog" l WHERE ${whereSql(filters, false)}`,
    getSeers(),
    getPeople(),
  ]);
  const page = rows.slice(0, auditPageSize);
  return {
    entries: await toViews(page, now, access),
    total: count?.n ?? 0,
    older: rows.length > auditPageSize ? page[page.length - 1].id : null,
    seers,
    people,
  };
}

// ---------------------------------------------------------------------------------------
// CSV (app/yonetim/kayit-defteri/indir)
// ---------------------------------------------------------------------------------------

/** Bir indirmede en çok bu kadar kayıt (daha fazlası için tarih aralığı daraltılır). */
export const auditExportLimit = 5000;

export type AuditExportRow = { at: Date; actor: string; kind: AuditKind; sentence: string };

/** Süzgece uyan kayıtlar, sayfalamasız (en yeniden eskiye, en çok auditExportLimit). */
export async function getAuditExport(filters: AuditFilters, now: Date): Promise<{ rows: AuditExportRow[]; total: number }> {
  const [rows, [count]] = await Promise.all([
    selectRows(whereSql(filters, false), auditExportLimit),
    db.$queryRaw<{ n: number }[]>`SELECT count(*)::int AS n FROM "AuditLog" l WHERE ${whereSql(filters, false)}`,
  ]);
  const views = await toViews(rows, now, null);
  return {
    rows: views.map((view, i) => ({ at: rows[i].createdAt, actor: view.actor.name, kind: view.kind, sentence: view.sentence })),
    total: count?.n ?? 0,
  };
}
