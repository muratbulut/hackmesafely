"use server";

// Yönetimdeki oda işlemleri: yayınlama (ve hemen geri alma), gizleme / yeniden yayınlama, sıra
// değiştirme. Odanın içeriği panelde yazılmaz: oda depodaki dosyada yazılır, her yayında başlangıç
// verisi taslağa yansıtır (prisma/rooms.ts; 17 Kasım, Murat). Açan eğitim de dosyadadır
// (unlockedBy). Her eylem erişimi yeniden denetler; yayın ve sıra LAB_PUBLISHING ister. Her değişiklik
// kayıt defterine (AuditLog) yazılır; kayıt defteri silinmez ve düzenlenmez. Yazma işlemleri kişi
// başına istek sınırına tabidir (ipucu ve gündemle ortak sayaç).
//
// Sayfalar yalnızca React cache ile okur (sunucuda saklanan önbellek yok); refresh() açık
// sayfayı yeniler, öğrenci sayfaları bir sonraki açılışta yeni hali görür.

import { refresh } from "next/cache";
import { auditTarget, writeAudit, type AuditAction } from "@/lib/audit";
import { db } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import type { LabContent } from "@/lib/lab/content";
import { basicTrainingOf, gateOf, type GateLab } from "@/lib/lab/gates";
import { rateLimit, rateRules } from "@/lib/rate-limit";
import { getLabAccess, type AdminAccess } from "./access";
import { countInProgress, isPublishable, readContent, sameContent } from "./lab-data";
import { draftIssues, validateContent } from "./validate";

/** Yayın, gizleme ve sıra LAB_PUBLISHING ister. */
async function allowed(): Promise<AdminAccess | null> {
  const access = await getLabAccess();
  if (!access) return null;
  return access.canPublish ? access : null;
}

/**
 * Yazma işlemlerinin kapısı: izin, sonra kişi başına istek sınırı (lib/rate-limit.ts,
 * adminActions; her işlem silinmeyen kayıt defterine yazar). İzni olmayanın denemesi sayılmaz.
 */
async function writer(): Promise<{ access: AdminAccess } | { error: "forbidden" | "rateLimited" }> {
  const access = await allowed();
  if (!access) return { error: "forbidden" };
  const limit = await rateLimit.consume(rateRules.adminActions, access.userId);
  return limit.allowed ? { access } : { error: "rateLimited" };
}

/** Lab işleminin kaydı (lib/audit.ts), işlemle aynı veritabanı işleminde. */
const audit = (tx: Prisma.TransactionClient, actorId: string, action: AuditAction, labId: string, details: Prisma.InputJsonObject) =>
  writeAudit(tx, { actorId, action, target: auditTarget.lab(labId), details });

/** Kapaktaki zorluk ve süre, listelerde ve öğrenci kartlarında okunan sütunlara da yazılır. */
const columnsFrom = (content: LabContent) => ({ difficulty: content.meta.difficulty, durationMin: content.meta.durationMin });

export type ActionError =
  | "forbidden"
  | "notFound"
  | "invalid"
  | "notReady"
  | "unchanged"
  | "conflict"
  | "unreadable"
  | "notPublished"
  | "trainingFixed"
  | "tooLate"
  | "rateLimited"
  | "failed";

export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: ActionError; issues?: string[] };

// ---------------------------------------------------------------------------------------
// Yayınlama
// ---------------------------------------------------------------------------------------

async function loadLab(labId: string) {
  if (typeof labId !== "string" || labId.length > 64) return null;
  return db.lab.findUnique({
    where: { id: labId },
    select: { id: true, slug: true, type: true, template: true, status: true, publishedVersion: true, draftContent: true, draftRevision: true },
  });
}

/** Tarayıcıdan gelen taslak sürümü; tam sayı değilse (eski sayfa ya da elle çağrı) hiçbir sürümle eşleşmez. */
const asRevision = (value: unknown): number | null => (Number.isSafeInteger(value) ? (value as number) : null);

/** Taslak, listenin bildiği sürümden sonra değişti: işlem geri alınır, "conflict" döner. */
class DraftConflict extends Error {}

/**
 * Labı yalnızca taslağı hâlâ `expected` sürümündeyse günceller (güvenlik turu 2, D9). Denetim ve
 * yazım tek bir UPDATE'tir: bu arada dosyadan gelen yeni taslak varsa yazılmaz.
 */
async function writeIfRevision(tx: Prisma.TransactionClient, labId: string, expected: number, data: Prisma.LabUncheckedUpdateManyInput) {
  const result = await tx.lab.updateMany({ where: { id: labId, draftRevision: expected }, data });
  if (result.count === 0) throw new DraftConflict();
}

/**
 * Taslağı yeni sürüm olarak yayınlar (sürüm numarası bir artar). `revision` yayınlayanın gördüğü
 * taslağın sürümüdür: listedeki "Yayınla" da gönderir; taslak bu arada değiştiyse yayınlamaz
 * ("conflict"), çünkü yayınlanacak hali kimse görmedi (D9). Taslak olduğu gibi yayınlanır.
 * Yayına hazır değilse, taslak okunamıyorsa ya da yayındaki sürümle aynıysa yayınlamaz. Labın
 * ortasındaki öğrenciler başladıkları sürümle bitirir.
 */
export async function publishLab(
  labId: string,
  form: { revision: number },
): Promise<ActionResult<{ version: number }>> {
  const gate = await writer();
  if ("error" in gate) return { ok: false, error: gate.error };
  const { access } = gate;
  // Eylem tarayıcıdan her türlü değerle çağrılabilir.
  const options: { revision?: unknown } = typeof form === "object" && form !== null ? form : {};
  const lab = await loadLab(labId);
  if (!lab) return { ok: false, error: "notFound" };
  if (draftIssues(lab.template, lab.draftContent)) return { ok: false, error: "unreadable" };

  const check = validateContent(lab.template, lab.draftContent);
  if (!check.ok) return { ok: false, error: "notReady" };
  const content = check.content;
  const expected = asRevision(options.revision);
  if (expected !== lab.draftRevision) return { ok: false, error: "conflict" };
  if (!isPublishable(lab.template, content)) return { ok: false, error: "notReady" };

  try {
    const published = await db.$transaction(async (tx) => {
      const current = lab.publishedVersion
        ? await tx.labVersion.findUnique({ where: { labId_version: { labId: lab.id, version: lab.publishedVersion } }, select: { content: true } })
        : null;
      // Yayındakiyle aynı içerik yeni sürüm olmaz (gizli lab "Yayınla" düğmesiyle geri açılır).
      if (current && sameContent(readContent(lab.template, current.content, ""), content)) {
        return null;
      }
      const last = await tx.labVersion.aggregate({ where: { labId: lab.id }, _max: { version: true } });
      const next = (last._max.version ?? 0) + 1;
      await tx.labVersion.create({
        data: { labId: lab.id, version: next, content: content as Prisma.InputJsonObject, publishedById: access.userId },
      });
      // Taslak olduğu gibi kalır (sürümü değişmez); yalnızca taslak hâlâ görülen sürümdeyse yazılır.
      await writeIfRevision(tx, lab.id, expected, { publishedVersion: next, status: "PUBLISHED", updatedById: access.userId, ...columnsFrom(content) });
      await audit(tx, access.userId, "lab.publish", lab.id, {
        slug: lab.slug,
        version: next,
        previousVersion: lab.publishedVersion,
        previousStatus: lab.status,
      });
      return { version: next };
    });
    if (published === null) return { ok: false, error: "unchanged" };
    refresh();
    return { ok: true, ...published };
  } catch (error) {
    if (error instanceof DraftConflict) return { ok: false, error: "conflict" };
    // Aynı anda iki yayın: ikincisi aynı sürüm numarasını alamaz.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { ok: false, error: "conflict" };
    console.error("[yönetim] lab yayınlanamadı:", error instanceof Error ? error.message : error);
    return { ok: false, error: "failed" };
  }
}

/**
 * Yayınlamadan hemen sonra "Geri al" (bildirim kutusundaki 5 saniye): sürüm silinir, önceki
 * yayın hali döner. Taslak olduğu gibi kalır. Bu arada bir öğrenci yeni sürümle başladıysa
 * geri alınamaz.
 */
export async function undoPublish(labId: string, version: number): Promise<ActionResult> {
  const gate = await writer();
  if ("error" in gate) return { ok: false, error: gate.error };
  const { access } = gate;
  const lab = await loadLab(labId);
  if (!lab) return { ok: false, error: "notFound" };
  if (!Number.isInteger(version) || lab.publishedVersion !== version) return { ok: false, error: "tooLate" };

  // Önceki hal istemciden değil, yayının kayıt defteri satırından okunur.
  const log = await db.auditLog.findFirst({
    where: { action: "lab.publish", target: auditTarget.lab(lab.id), createdAt: { gte: new Date(Date.now() - 2 * 60_000) } },
    orderBy: { createdAt: "desc" },
    select: { details: true },
  });
  const details = (log?.details ?? null) as { version?: number; previousVersion?: number | null; previousStatus?: string } | null;
  if (!details || details.version !== version) return { ok: false, error: "tooLate" };
  const previousVersion = typeof details.previousVersion === "number" ? details.previousVersion : null;
  const previousStatus = previousVersion === null ? "DRAFT" : details.previousStatus === "HIDDEN" ? "HIDDEN" : "PUBLISHED";

  try {
    const undone = await db.$transaction(async (tx) => {
      if ((await tx.labAttempt.count({ where: { labId: lab.id, labVersion: version } })) > 0) return false;
      const previous = previousVersion
        ? await tx.labVersion.findUnique({ where: { labId_version: { labId: lab.id, version: previousVersion } }, select: { content: true } })
        : null;
      await tx.lab.update({
        where: { id: lab.id },
        data: {
          publishedVersion: previousVersion,
          status: previousStatus,
          updatedById: access.userId,
          ...(previous ? columnsFrom(readContent(lab.template, previous.content, lab.slug)) : {}),
        },
      });
      await tx.labVersion.delete({ where: { labId_version: { labId: lab.id, version } } });
      await audit(tx, access.userId, "lab.unpublish", lab.id, { slug: lab.slug, version, restoredVersion: previousVersion });
      return true;
    });
    if (!undone) return { ok: false, error: "tooLate" };
    refresh();
    return { ok: true };
  } catch (error) {
    console.error("[yönetim] yayın geri alınamadı:", error instanceof Error ? error.message : error);
    return { ok: false, error: "failed" };
  }
}

// ---------------------------------------------------------------------------------------
// Gizleme ve sıra
// ---------------------------------------------------------------------------------------

/**
 * Yayındaki senaryo labını gizler (haritadan kalkar, ilerlemeler silinmez) ya da gizli labı
 * yeniden yayına alır. Eğitim labı gizlenmez: mahallenin senaryoları ona bağlıdır.
 */
export async function setLabVisibility(labId: string, visible: boolean, note = ""): Promise<ActionResult> {
  // Eylem tarayıcıdan her türlü değerle çağrılabilir: yalnızca gerçek true yayına alır.
  const show = visible === true;
  const gate = await writer();
  if ("error" in gate) return { ok: false, error: gate.error };
  const { access } = gate;
  const lab = await loadLab(labId);
  if (!lab) return { ok: false, error: "notFound" };
  // Eski bir kayıtta gizli kalmış eğitim labı yeniden açılabilir; gizlenemez.
  if (lab.type === "TRAINING" && !show) return { ok: false, error: "trainingFixed" };
  if (lab.publishedVersion === null) return { ok: false, error: "notPublished" };
  const cleanNote = typeof note === "string" ? note.trim().slice(0, 200) : "";

  const from = show ? "HIDDEN" : "PUBLISHED";
  const changed = await db.$transaction(async (tx) => {
    const result = await tx.lab.updateMany({
      where: { id: lab.id, status: from },
      data: { status: show ? "PUBLISHED" : "HIDDEN", updatedById: access.userId },
    });
    if (result.count === 0) return false;
    await audit(tx, access.userId, show ? "lab.unhide" : "lab.hide", lab.id, show ? { slug: lab.slug } : { slug: lab.slug, note: cleanNote });
    return true;
  });
  refresh();
  return changed ? { ok: true } : { ok: false, error: "unchanged" };
}

const gateFields = { id: true, slug: true, neighborhoodId: true, type: true, sortOrder: true, unlockedById: true } as const;

/** Mahallenin bütün labları (taslaklar dahil), sıralı; yönetimde açan eğitim bunlarla hesaplanır. */
const neighborhoodLabs = (tx: Prisma.TransactionClient, neighborhoodId: string) =>
  tx.lab.findMany({ where: { neighborhoodId }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: gateFields });

/**
 * Labı kendi grubunda bir sıra yukarı (-1) ya da aşağı (1) taşır: senaryo, aynı eğitimin açtığı
 * senaryolar arasında; ileri eğitim, ileri eğitimler arasında. Temel eğitim hep ilk (taşınmaz).
 */
export async function moveLab(labId: string, direction: -1 | 1): Promise<ActionResult<{ position: number }>> {
  const gate = await writer();
  if ("error" in gate) return { ok: false, error: gate.error };
  const { access } = gate;
  if (direction !== -1 && direction !== 1) return { ok: false, error: "invalid" };
  const lab = await db.lab.findUnique({ where: { id: String(labId) }, select: gateFields });
  if (!lab) return { ok: false, error: "notFound" };

  const position = await db.$transaction(async (tx) => {
    const labs = await neighborhoodLabs(tx, lab.neighborhoodId);
    const basic = basicTrainingOf(labs, lab.neighborhoodId);
    const current = labs.find((l) => l.id === lab.id);
    if (!current || current.id === basic?.id) return "fixed" as const;
    const group = (l: GateLab) => (l.type === "TRAINING" ? "advanced" : `scenario:${gateOf(l, labs)?.id ?? ""}`);
    const siblings = labs.filter((l) => l.id !== basic?.id && group(l) === group(current));
    const from = siblings.findIndex((s) => s.id === lab.id);
    const to = from + direction;
    if (to < 0 || to >= siblings.length) return null;
    const order = siblings.map((s) => s.id);
    [order[from], order[to]] = [order[to], order[from]];
    // Grubun sırası yeniden yazılır (eşit sıralar da düzelir); ileri eğitimler temelden sonra gelir.
    const first = current.type === "TRAINING" ? (basic?.sortOrder ?? 0) + 1 : 1;
    for (const [index, id] of order.entries()) {
      if (siblings.find((s) => s.id === id)!.sortOrder !== first + index) {
        await tx.lab.update({ where: { id }, data: { sortOrder: first + index } });
      }
    }
    await audit(tx, access.userId, "lab.reorder", lab.id, { slug: lab.slug, from: from + 1, to: to + 1 });
    return to + 1;
  });
  if (position === "fixed") return { ok: false, error: "trainingFixed" };
  if (position === null) return { ok: false, error: "unchanged" };
  refresh();
  return { ok: true, position };
}

/** Yayınlama penceresi için: şu an labın ortasında olan öğrenci sayısı (isim yok). */
export async function labInProgress(labId: string): Promise<number> {
  const access = await allowed();
  if (!access) return 0;
  return countInProgress(String(labId));
}

