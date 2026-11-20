import { randomUUID } from "node:crypto";
import { expect, type Page } from "@playwright/test";
import { withDb } from "./db";

/**
 * Öğrencinin mahalledeki eğitim labını bitmiş sayar (senaryo labları ancak eğitimden sonra
 * açılır). Eğitimin kendisi lab.spec.ts'te arayüzden baştan sona oynanır; diğer testler beklemesin.
 */
export async function finishTraining(email: string, slug = "oltalama-egitimi") {
  await withDb((client) =>
    client.query(
      `INSERT INTO "TrainingProgress" ("userId", "labId", "cardIndex", "completedAt")
       SELECT u.id, l.id, 99, now() FROM "User" u, "Lab" l WHERE u.email = $1 AND l.slug = $2
       ON CONFLICT ("userId", "labId") DO UPDATE SET "completedAt" = now()`,
      [email, slug],
    ),
  );
}

/** Öğrencinin bu labdaki denemeleri ve olayları (sunucuda ne kaydedildiğini görmek için). */
export async function attemptsOf(email: string, slug: string) {
  const result = await withDb((client) =>
    client.query<{ id: string; status: string; reportScore: number | null; events: string }>(
      `SELECT a.id, a.status, a."reportScore",
              coalesce((SELECT json_agg(json_build_object('type', e.type, 'data', e.data) ORDER BY e.seq)::text FROM "LabEvent" e WHERE e."attemptId" = a.id), '[]') AS events
       FROM "LabAttempt" a JOIN "User" u ON u.id = a."userId" JOIN "Lab" l ON l.id = a."labId"
       WHERE u.email = $1 AND l.slug = $2 ORDER BY a."startedAt"`,
      [email, slug],
    ),
  );
  return result?.rows ?? [];
}

/**
 * Görevli odanın kapağı (/oda/[oda], MissionCover): sağda (telefonda üstte) arayanın gelen arama
 * ekranı ve hikâye kartları görünür, bildirim telefonu yoktur, sayfa yana kaymaz; içerikteki gizli
 * metinler (SMS tutarı, bitiş aramaları) sayfaya gelmez.
 */
export async function checkMissionCover(page: Page, slug: string, caller: string, secrets: string[]) {
  await page.goto(`/oda/${slug}`);
  const cover = page.getByRole("img", { name: `${caller} arıyor` }).filter({ visible: true });
  await expect(cover).toHaveCount(1);
  await expect(page.getByRole("img", { name: /uygulamasına gelen bildirimler$/ }).filter({ visible: true })).toHaveCount(0);
  const box = await cover.boundingBox();
  const width = page.viewportSize()?.width ?? 0;
  expect(box && box.x >= 0 && box.x + box.width <= width).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const html = await page.content();
  for (const secret of secrets) expect(html).not.toContain(secret);
}

/**
 * Alarmdan sonraki sonuç sahnesi (19 ve 22. revize): "Adım adım ne oldu" yok; telefonda sahne
 * (para, kart, hesap ya da adres) oynar, öğrenci "Devam" deyince rapor açılır.
 */
export async function continueFromScene(page: Page, scene?: "money" | "card" | "account" | "home") {
  const view = page.getByTestId("hacked-scene");
  await expect(view).toBeVisible();
  if (scene) await expect(view).toHaveAttribute("data-scene", scene);
  await view.getByRole("button", { name: "Devam" }).click();
  await expect(page.getByTestId("lab-report")).toBeVisible();
}

/**
 * Rapor adım adım gelir (14. revize): 1 Odada ne oldu, 2 kaçırdığın ya da yakaladığın işaretler,
 * 3 Bir dahaki sefere. "Sonraki" ile istenen adıma gelinir; düğmeler (Tekrar dene, sonraki oda)
 * son adımdadır.
 */
export async function reportStep(page: Page, step: "steps" | "signs" | "tips") {
  const journey = page.getByTestId("report-journey");
  for (let i = 0; i < 3; i++) {
    if ((await journey.getAttribute("data-step")) === step) return;
    await page.getByRole("button", { name: "Sonraki" }).filter({ visible: true }).first().click();
  }
  await expect(journey).toHaveAttribute("data-step", step);
}

const levelUpDialog = (page: Page) => page.getByRole("dialog", { name: "Seviye atladın" });

/** Seviye atlama kutlaması çıkar (yeni seviyeyle) ve "Harika" ile kapanır. */
export async function closeLevelUp(page: Page, level: number) {
  const dialog = levelUpDialog(page);
  await expect(dialog.getByRole("heading", { name: `SEVİYE ${level}` })).toBeVisible();
  await dialog.getByRole("button", { name: "Harika" }).click();
  await expect(dialog).toBeHidden();
}

/**
 * Kutlamanın kendisini denetlemeyen uzun akışlarda (CSP, ekran düzeni) kutlama çıkınca kapatılır;
 * açık pencere arkadaki sayfayı kapattığı için akış takılmasın.
 */
export async function dismissLevelUps(page: Page) {
  await page.addLocatorHandler(levelUpDialog(page), async (dialog) => {
    await dialog.getByRole("button", { name: "Harika" }).click();
  });
}

/** M1 ve T2 sahnesi (oda sahne şablonu): bilgisayarın kilit ekranında "Oturum aç". */
export async function signInDesktop(page: Page) {
  const lock = page.getByTestId("stage-lock");
  await lock.getByRole("button", { name: "Oturum aç" }).click();
  await expect(lock).toHaveCount(0);
}

/** T1 ve T2 sahnesi: masadaki telefonu alır (telefon ortaya gelir, ekranı açılır). */
export async function pickUpPhone(page: Page) {
  await page.getByTestId("stage-phone-pick").click();
  // "Bırak" masaüstünde telefonun altında, telefon genişliğinde oynatıcının şeridinde; görünen biri.
  await expect(page.locator('[data-testid="stage-phone-drop"]:visible')).toBeVisible();
}

/** Eğitim kartı (oda dosyasındaki hâliyle); yalnızca oynatmak için gereken alanlar. */
export type PlayCard = {
  id: string;
  type: string;
  layout?: string;
  answer?: number;
  points?: unknown[];
  spots?: { part: string }[];
  question?: { at: number; options: string[]; answer: number } | string | null;
  bins?: { label: string }[];
  items?: { text: string; bin: number }[];
  pairs?: { right: string }[];
  sentences?: string[];
};

/**
 * Eğitim kartını oynatıcıda doğru cevaplar ki "Devam" açılsın: sorulu video (soru saniyesine
 * atlanır), adım adım ve keşfet kartları (bütün maddeler açılır), kutulara ayırma, eşleştirme,
 * boşluk doldurma (ilk açılışta "Nasıl oynanır" penceresi kapatılır), tıkla-bul ve mini test.
 * Düz bilgi kartında yapılacak bir şey yoktur. "Devam"a basmaz.
 */
export async function answerTrainingCard(page: Page, card: PlayCard) {
  const player = page.getByTestId("training-player");
  const choose = (text: string) => player.getByRole("group", { name: "Seçenekler" }).getByRole("button", { name: text, exact: true }).click();
  if (["sort", "match", "fill"].includes(card.type)) {
    const help = page.getByRole("button", { name: /Anladım, başla/ });
    if (await help.isVisible({ timeout: 2000 }).catch(() => false)) await help.click();
    await expect(help).toBeHidden();
  }
  if (card.type === "video" && card.question && typeof card.question === "object") {
    const q = card.question;
    await page.waitForFunction(() => {
      const video = document.querySelector<HTMLVideoElement>('[data-testid="training-player"] video');
      return !video || video.readyState >= 1;
    });
    const video = player.locator("video");
    if (await video.count()) await video.evaluate((v: HTMLVideoElement, second) => void (v.currentTime = second), q.at);
    await player.getByRole("button", { name: q.options[q.answer], exact: true }).click();
  }
  if (card.type === "info" && (card.layout === "steps" || card.layout === "explore")) {
    const list = player.getByRole("list", { name: card.layout === "steps" ? "Adımlar" : "Profil alanları" }).getByRole("button");
    for (let i = 0; i < (card.points ?? []).length; i++) await list.nth(i).click();
  }
  if (card.type === "sort") {
    const labels = (card.bins ?? []).map((b) => b.label);
    for (const item of card.items ?? []) {
      await player
        .getByRole("group", { name: "Yerleştirilecek bilgiler" })
        .getByRole("button", { name: `${item.text}. Kutusuna koymak için seç ya da sürükle.` })
        .click();
      await player.getByRole("button", { name: `Seçili bilgiyi şuraya koy: ${labels[item.bin]}` }).click();
    }
    await player.getByRole("button", { name: "Kontrol et" }).click();
  }
  if (card.type === "match") {
    for (const pair of card.pairs ?? []) await choose(pair.right);
    await player.getByRole("button", { name: "Kontrol et" }).click();
  }
  if (card.type === "fill") {
    for (const sentence of card.sentences ?? []) {
      for (const [, word] of sentence.matchAll(/\[([^\]]+)\]/g)) await choose(word);
      await player.getByRole("button", { name: /^(Sonraki cümle|Özete geç)/ }).click();
    }
    await player.getByRole("button", { name: "Kontrol et" }).click();
  }
  if (card.type === "clickFind") {
    for (const spot of card.spots ?? []) await player.locator(`[data-part="${spot.part}"]`).click();
    await expect(player.getByText("Hepsini buldun!")).toBeVisible();
  }
  if (card.type === "quiz") await player.getByRole("group", { name: "Cevaplar" }).getByRole("button").nth(card.answer ?? 0).click();
}

/**
 * Sahte kargo maili (18 Kasım yenilemesi, T2): iki Yolda Kargo maili var; sahte olan "teslim
 * edilemedi" der. Gelen kutusunda sahte maili açar.
 */
export const fakeKargoMail = /^Yolda Kargo.*teslim edilemedi/;
export async function openFakeKargo(scope: Page | ReturnType<Page["getByTestId"]>) {
  await scope.getByRole("button", { name: fakeKargoMail }).click();
}

/**
 * Sahte kargo sayfası: şifre kutusu yazılmaz, tarayıcının kayıtlı şifre önerisinde "Doldur" denir
 * (trap.autofill), sonra "Giriş yap ve doğrula". Sayfa açık olmalı.
 */
export async function submitSavedPassword(scope: Page | ReturnType<Page["getByTestId"]>) {
  await scope.getByTestId("trap-fill").click();
  await scope.getByRole("button", { name: /Giriş yap ve doğrula/ }).click();
}

/**
 * Sesli mesajlı görev (T2): hacklendin alarmından sonra görevi verenin kötü bitiş sesli mesajı
 * telefona düşer; öğrenci dinler, "Devam" deyince sonuç sahnesi açılır.
 */
export async function passVoiceNote(page: Page, action: "Devam" | "Raporu gör") {
  const voice = page.getByTestId("voicemail");
  // Bitiş mesajı (kötü, iyi ya da kaçırdın) gelene kadar beklenir.
  const note = voice.locator(`[data-testid="voice-note"][data-note="${action === "Devam" ? "bad" : "good"}"], [data-testid="voice-note"][data-note="missed"]`);
  await expect(note).toHaveCount(1, { timeout: 10_000 });
  // Mesaj telefon masadayken düşer ("Telefonu al: Ayça"): öğrenci telefonu alır. Telefon zaten
  // eldeyse bildirim çıkmaz, mesaj ekrandadır.
  const inHand = page.locator('[data-testid="stage-phone"][data-hand="true"]');
  const pick = page.getByRole("button", { name: /^Telefonu al: / });
  await expect(inHand.or(pick).first()).toBeVisible();
  if (!(await inHand.isVisible())) await pick.click();
  await note.getByTestId("voice-play").click();
  await voice.getByTestId("voicemail-action").filter({ hasText: action }).click();
}

/**
 * Testin kendi odası: kendi mahallesinde yayında bir senaryo odası açar, iş bitince siler. Genel
 * oynatıcı davranışını (maskot, bağlantılar) denetleyen testler odanın içeriğine bağlanmasın diye
 * eski sahte kargo maili (tests/fixtures/rooms) gibi sabit bir kopyayla çalışır.
 */
export async function withTempRoom(content: unknown, run: (slug: string) => Promise<void>, template = "INBOX") {
  const stamp = `${Date.now().toString(36)}${process.pid.toString(36)}${randomUUID().slice(0, 4)}`;
  const newId = () => `e2e${randomUUID().replace(/-/g, "").slice(0, 21)}`;
  const neighborhood = { id: newId(), slug: `e2e-mahalle-${stamp}` };
  const lab = { id: newId(), slug: `e2e-oda-${stamp}` };
  const json = JSON.stringify(content);
  await withDb(async (client) => {
    await client.query(`INSERT INTO "Neighborhood" ("id", "slug", "name", "color", "sortOrder") VALUES ($1, $2, $3, 'accent', 9000 + floor(random() * 900)::int)`, [
      neighborhood.id,
      neighborhood.slug,
      `E2E Mahalle ${neighborhood.slug}`,
    ]);
    await client.query(
      `INSERT INTO "Lab" ("id", "slug", "neighborhoodId", "type", "template", "sortOrder", "status", "publishedVersion", "difficulty", "durationMin", "draftContent", "updatedAt")
       VALUES ($1, $2, $3, 'SCENARIO', $5, 1, 'PUBLISHED', 1, 'EASY', 5, $4::jsonb, now())`,
      [lab.id, lab.slug, neighborhood.id, json, template],
    );
    await client.query(`INSERT INTO "LabVersion" ("labId", "version", "content") VALUES ($1, 1, $2::jsonb)`, [lab.id, json]);
  });
  try {
    await run(lab.slug);
  } finally {
    await withDb(async (client) => {
      await client.query(`DELETE FROM "LabAttempt" WHERE "labId" = $1`, [lab.id]);
      await client.query(`DELETE FROM "LabVersion" WHERE "labId" = $1`, [lab.id]);
      await client.query(`DELETE FROM "Lab" WHERE "id" = $1`, [lab.id]);
      await client.query(`DELETE FROM "Neighborhood" WHERE "id" = $1`, [neighborhood.id]);
    });
  }
}
