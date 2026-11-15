import { withDb } from "./db";

/**
 * Testteki öğrencinin bir eğitim labını bitirmiş sayılması (kartları tek tek geçmeden). Yalnızca
 * o öğrencinin satırı yazılır; başka kayıtlara dokunulmaz.
 */
export async function completeTraining(email: string, labSlug: string, cards = 4) {
  await withDb((client) =>
    client.query(
      `INSERT INTO "TrainingProgress" ("userId", "labId", "cardIndex", "completedAt", "updatedAt")
       SELECT u.id, l.id, $3, now(), now() FROM "User" u, "Lab" l WHERE u.email = $1 AND l.slug = $2
       ON CONFLICT ("userId", "labId") DO UPDATE SET "cardIndex" = $3, "completedAt" = now(), "updatedAt" = now()`,
      [email, labSlug, cards],
    ),
  );
}

/** Testteki öğrencinin bir senaryo odasını verilen rapor puanıyla bitirmiş sayılması (raporsuz). */
export async function finishScenario(email: string, labSlug: string, score: number) {
  await withDb((client) =>
    client.query(
      `INSERT INTO "LabAttempt" ("id", "userId", "labId", "labVersion", "status", "reportScore", "startedAt", "endedAt", "resultReport")
       SELECT gen_random_uuid()::text, u.id, l.id, l."publishedVersion", 'COMPLETED', $3, now(), now(), '{}'::jsonb
       FROM "User" u, "Lab" l WHERE u.email = $1 AND l.slug = $2`,
      [email, labSlug, score],
    ),
  );
}
