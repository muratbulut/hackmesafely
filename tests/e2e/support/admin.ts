import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { withDb } from "./db";

/**
 * Hesabı yönetici yapar. Canlıda ilk yönetici ADMIN_EMAILS ile atanır; testlerde adres her
 * koşuda yeni olduğu için rol doğrudan yazılır (ADMIN_EMAILS ayrıştırması birim testli).
 */
export async function makeAdmin(email: string) {
  await withDb((client) => client.query(`UPDATE "User" SET "role" = 'ADMIN' WHERE "email" = $1`, [email]));
}

/**
 * Testlerin açtığı lablar ("e2e-" ile başlayan adres) ve onlara bağlı denemeler, eğitim
 * ilerlemeleri ve sürümler silinir. `slug` verilirse yalnız o lab; `olderThanMinutes` verilirse
 * yalnız o kadar eski olanlar (aynı anda koşan başka bir test grubunun labına dokunulmaz).
 * Kayıt defteri (AuditLog) silinmez; zaten silinemez.
 */
export async function deleteTestLabs({ slug, olderThanMinutes }: { slug?: string; olderThanMinutes?: number } = {}) {
  await withDb(async (client) => {
    const { rows } = await client.query<{ id: string }>(
      `SELECT "id" FROM "Lab"
        WHERE "slug" LIKE 'e2e-%'
          AND ($1::text IS NULL OR "slug" = $1)
          AND ($2::int IS NULL OR "createdAt" < now() - make_interval(mins => $2::int))`,
      [slug ?? null, olderThanMinutes ?? null],
    );
    const ids = rows.map((r) => r.id);
    if (ids.length === 0) return;
    await client.query("BEGIN");
    try {
      await client.query(`DELETE FROM "LabAttempt" WHERE "labId" = ANY($1)`, [ids]);
      await client.query(`DELETE FROM "TrainingProgress" WHERE "labId" = ANY($1)`, [ids]);
      await client.query(`DELETE FROM "LabVersion" WHERE "labId" = ANY($1)`, [ids]);
      await client.query(`DELETE FROM "Lab" WHERE "id" = ANY($1)`, [ids]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  });
}

/**
 * Testin odası: örnek odanın (labs/examples/) kopyası, verilen ad ve "e2e-" adresle taslak olarak
 * veritabanına yazılır (odalar panelde açılmaz, depodaki dosyadan gelir; 39, 17 Kasım). Mahallenin
 * senaryolarının sonuna eklenir. Silmek için deleteTestLabs.
 */
export async function insertTestLab({
  slug,
  name,
  example = "sahte-kargo-maili",
  change,
}: {
  slug: string;
  name: string;
  example?: string;
  /** İçeriği yazmadan önce değiştirir (ör. yayına hazır olmayan taslak için görevleri siler). */
  change?: (content: Record<string, unknown>) => void;
}) {
  const room = JSON.parse(readFileSync(`labs/examples/${example}.json`, "utf8")) as {
    neighborhood: string;
    type: string;
    template: string;
    content: { meta: { name: string; difficulty: string; durationMin: number } } & Record<string, unknown>;
  };
  room.content.meta.name = name;
  change?.(room.content);
  const id = `e2e${randomUUID().replace(/-/g, "").slice(0, 21)}`;
  await withDb((client) =>
    client.query(
      `INSERT INTO "Lab" ("id", "slug", "neighborhoodId", "type", "template", "sortOrder", "status", "difficulty", "durationMin", "draftContent", "updatedAt")
       SELECT $1, $2, n."id", $3, $4, 900, 'DRAFT', $5, $6, $7::jsonb, now() FROM "Neighborhood" n WHERE n."slug" = $8`,
      [id, slug, room.type, room.template, room.content.meta.difficulty, room.content.meta.durationMin, JSON.stringify(room.content), room.neighborhood],
    ),
  );
  return id;
}

/** Öğrencinin haritasında görünmeyecek kadar sonda geçici bir mahalle (deleteTestNeighborhood ile silinir). */
export async function insertTestNeighborhood(name: string) {
  const id = `e2e${randomUUID().replace(/-/g, "").slice(0, 21)}`;
  const slug = `e2e-mahalle-${randomUUID().slice(0, 8)}`;
  await withDb((client) =>
    client.query(`INSERT INTO "Neighborhood" ("id", "slug", "name", "color", "sortOrder") VALUES ($1, $2, $3, 'accent', 9000 + floor(random() * 900)::int)`, [id, slug, name]),
  );
  return { id, slug };
}

/** Geçici mahalleye taslak oda ekler (eğitim ya da gelen kutusu senaryosu); kimliğini döner. */
export async function insertNeighborhoodLab(neighborhoodId: string, { name, type, sortOrder }: { name: string; type: "TRAINING" | "SCENARIO"; sortOrder: number }) {
  // Örnek odanın içeriği (şemaya uyan taslak; adı listede okunur).
  const content = JSON.parse(readFileSync(`labs/examples/${type === "TRAINING" ? "oltalama-egitimi" : "sahte-kargo-maili"}.json`, "utf8")).content;
  content.meta.name = name;
  const id = `e2e${randomUUID().replace(/-/g, "").slice(0, 21)}`;
  await withDb((client) =>
    client.query(
      `INSERT INTO "Lab" ("id", "slug", "neighborhoodId", "type", "template", "sortOrder", "status", "difficulty", "durationMin", "draftContent", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, 'DRAFT', 'EASY', 5, $7::jsonb, now())`,
      [id, `e2e-oda-${randomUUID().slice(0, 12)}`, neighborhoodId, type, type === "TRAINING" ? "TRAINING" : "INBOX", sortOrder, JSON.stringify(content)],
    ),
  );
  return id;
}

export async function deleteTestNeighborhood(id: string) {
  await withDb(async (client) => {
    const labs = `SELECT "id" FROM "Lab" WHERE "neighborhoodId" = $1`;
    await client.query(`DELETE FROM "LabAttempt" WHERE "labId" IN (${labs})`, [id]);
    await client.query(`DELETE FROM "TrainingProgress" WHERE "labId" IN (${labs})`, [id]);
    await client.query(`DELETE FROM "LabVersion" WHERE "labId" IN (${labs})`, [id]);
    await client.query(`UPDATE "Lab" SET "unlockedById" = NULL WHERE "neighborhoodId" = $1`, [id]);
    await client.query(`DELETE FROM "Lab" WHERE "neighborhoodId" = $1`, [id]);
    await client.query(`DELETE FROM "Neighborhood" WHERE "id" = $1`, [id]);
  });
}
