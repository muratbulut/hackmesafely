import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { isLive, signUpVerified, uniqueEmail } from "./support/account";
import { withDb } from "./support/db";
import { attemptsOf, pickUpPhone } from "./support/lab";

// Kurulum görevli oda (Şehir Kapısı "Bu uygulama nereden geliyor?", 19 Kasım): Deniz arar,
// matematik öğretmeninin ödev verdiği oyun telefona mağazadan kurulur. Sınıf grubundaki .apk'yı
// kurmak istemek "Az kalsın"dır, oda sürer. Gerçek oyunda konuma "İzin verme" denir, ödev açılır.
// İçerik geçici bir mahallede, eğitimsiz (oda açıktır) yayınlanır; adresi "e2e-".
// LAYOUT_SHOTS=<klasör> verilirse ekran görüntüleri alınır (depoya girmez).

test.skip(isLive, "veritabanına yazan ve hesap açan testler canlı sitede çalışmaz");

const room = JSON.parse(readFileSync("labs/rooms/sehir-kapisi/uygulama-nereden-geliyor.json", "utf8")).content;
const install = room.mission.install;
const real = install.apps.find((a: { copy?: boolean }) => !a.copy);
const stamp = () => `${Date.now().toString(36)}${process.pid.toString(36)}${randomUUID().slice(0, 4)}`;
const newId = () => `e2e${randomUUID().replace(/-/g, "").slice(0, 21)}`;
const shots = process.env.LAYOUT_SHOTS;

async function shot(page: Page, name: string, isMobile: boolean) {
  if (!shots) return;
  mkdirSync(shots, { recursive: true });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${shots}/kurulum-${isMobile ? "telefon" : "masaustu"}-${name}.png` });
}

async function withRoom(run: (slug: string) => Promise<void>) {
  const neighborhood = { id: newId(), slug: `e2e-mahalle-${stamp()}` };
  const lab = { id: newId(), slug: `e2e-kurulum-${stamp()}` };
  const content = JSON.stringify(room);
  await withDb(async (client) => {
    await client.query(
      `INSERT INTO "Neighborhood" ("id", "slug", "name", "color", "sortOrder") VALUES ($1, $2, $3, 'accent', 9000 + floor(random() * 900)::int)`,
      [neighborhood.id, neighborhood.slug, `E2E Mahalle ${neighborhood.slug}`],
    );
    await client.query(
      `INSERT INTO "Lab" ("id", "slug", "neighborhoodId", "type", "template", "sortOrder", "status", "publishedVersion", "difficulty", "durationMin", "draftContent", "updatedAt")
       VALUES ($1, $2, $3, 'SCENARIO', 'MESSAGING', 1, 'PUBLISHED', 1, 'EASY', 5, $4::jsonb, now())`,
      [lab.id, lab.slug, neighborhood.id, content],
    );
    await client.query(`INSERT INTO "LabVersion" ("labId", "version", "content") VALUES ($1, 1, $2::jsonb)`, [lab.id, content]);
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

/** Başla, Deniz'in araması (sesli), görev kartı; telefonu al: ana ekranda Mesajlar ve Mağaza. */
async function startRoom(page: Page, slug: string, isMobile: boolean) {
  await page.goto(`/oda/${slug}/oyna`);
  // Kopya olduğu, Az kalsın metinleri, ödevin "açıldı" cümlesi ve bitiş araması sayfada yok.
  const html = await page.content();
  for (const secret of ["FunFreeGamez · SMS", "kontrol eden yok", "gizlice reklam", install.game.done, room.mission.good[0], "ödev listesi yok"]) {
    expect(html).not.toContain(secret);
  }
  await page.getByRole("button", { name: "Hazırım, başla" }).click();
  const call = page.getByTestId("mission-call");
  await expect(call.getByText("Deniz", { exact: true }).first()).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => performance.getEntriesByType("resource").some((e) => e.name.endsWith("/sesler/uygulama-nereden-geliyor/acilis-1.mp3"))))
    .toBe(true);
  await shot(page, "1-arama", isMobile);
  await call.getByRole("button", { name: "Aç", exact: true }).click();
  await call.getByRole("button", { name: "Geç ›" }).click();
  await expect(call.getByRole("heading", { name: room.mission.title })).toBeVisible();
  await call.getByRole("button", { name: room.mission.accept }).click();
  await expect(call).toHaveCount(0);
  await pickUpPhone(page);
  await expect(page.getByTestId("install-home-screen")).toBeVisible();
  await shot(page, "2-ana-ekran", isMobile);
}

/** Mesajlar'da Kerem'in sohbetini açar (ekinde .apk). */
async function openKerem(page: Page) {
  await page.getByTestId("install-app-messages").click();
  const app = page.getByTestId("scenario-player");
  await app.getByRole("button", { name: /^Kerem/ }).first().click();
  return app;
}

/** Elif'in mesajını da açar (inceleme bütün mesajları ister), ana ekrana döner. */
async function readElifAndGoHome(page: Page) {
  const back = page.getByRole("button", { name: "Sohbetlere dön" });
  if (await back.isVisible()) await back.click();
  await page.getByTestId("scenario-player").getByRole("button", { name: /^Elif/ }).first().click();
  if (await back.isVisible()) await back.click();
  await page.getByTestId("install-home").click();
  await expect(page.getByTestId("install-home-screen")).toBeVisible();
}

/** Mağazada öneriye dokunur, Bilge Oyun Atölyesi'nin oyununu kurar, izinlere cevap verir, ödevi açar. */
async function installFromStore(page: Page, isMobile: boolean) {
  await page.getByTestId("install-app-store").click();
  await expect(page.getByTestId("store-suggestion")).toContainText(install.query);
  await shot(page, "5-magaza", isMobile);
  await page.getByTestId("store-suggestion").click();
  // Arama iki oyunu aynı biçimde gösterir; yayıncıya bakıp doğrusu seçilir.
  await expect(page.getByTestId("store-result")).toHaveCount(2);
  await page.getByTestId("store-result").filter({ hasText: real.publisher }).click();
  await expect(page.getByTestId("store-publisher")).toContainText(real.publisher);
  await page.getByTestId("store-get").click();
  // Bildirim izni (puansız), sonra konum: "İzin verme".
  const prompt = page.getByTestId("permission-prompt");
  await expect(prompt).toContainText(real.permissions[0].text);
  await prompt.getByTestId("permission-choice").first().click();
  await expect(prompt).toContainText(real.permissions[1].text);
  await shot(page, "6-izin", isMobile);
  await prompt.getByTestId("permission-choice").nth(real.permissions[1].right).click();
  await expect(page.getByTestId("install-game")).toContainText(install.game.homework);
  await page.getByTestId("homework-open").click();
  await expect(page.getByTestId("homework-done")).toContainText(install.game.done);
  await shot(page, "7-odev", isMobile);
}

/** Panelde inceleme ve iki soru (ilk seçenekler doğru); "Odayı bitir", Deniz'in araması (line: bildirdiyse ikinci satır), rapor. */
async function finish(page: Page, line: string | null, score: number, isMobile: boolean) {
  if (isMobile) {
    const drop = page.locator('[data-testid="stage-phone-drop"]:visible');
    if (await drop.isVisible()) await drop.click();
    await page.getByRole("button", { name: /Görevleri aç/ }).click();
  }
  const tasks = isMobile ? page.getByRole("dialog", { name: "Görevler" }) : page.getByRole("complementary", { name: "Görevler" });
  await tasks.getByRole("button", { name: "İncelemeyi bitirdim" }).click();
  for (const task of room.tasks.filter((t: { type: string }) => t.type === "question")) {
    await tasks.getByRole("radiogroup", { name: task.text }).getByRole("radio").first().click();
    await tasks.getByRole("button", { name: "Cevabı gönder" }).click();
  }
  await tasks.getByRole("button", { name: "Odayı bitir, raporu gör" }).click();
  const call = page.getByTestId("mission-call");
  await expect(call.getByText("Deniz arıyor…")).toBeVisible();
  await expect(call.getByText(room.mission.good[0], { exact: false }).first()).toBeVisible();
  // Kerem'in dosyasını bildirdiyse Deniz bir satır daha söyler (satırlar sırayla gelir).
  if (line) await expect(call.getByText(line, { exact: false }).first()).toBeVisible({ timeout: 20_000 });
  await call.getByRole("button", { name: "Geç ›" }).click();
  await expect(call.getByRole("heading", { name: room.mission.goodTitle })).toBeVisible();
  await call.getByRole("button", { name: "Raporu gör" }).click();
  const report = page.getByTestId("lab-report");
  await expect(report.getByRole("img", { name: `${score}/100 puan` })).toBeVisible();
  await shot(page, "9-rapor", isMobile);
}

test("doğru yol: .apk'yı bildirir, oyunu mağazadan kurar, konuma izin vermez; 100 puan", async ({ page, isMobile }) => {
  test.slow();
  await withRoom(async (slug) => {
    const email = uniqueEmail("kurulum");
    await signUpVerified(page, email);
    await startRoom(page, slug, isMobile);

    const app = await openKerem(page);
    await expect(app.getByRole("button", { name: /KesirKulesi_hizli\.apk/ })).toBeVisible();
    await shot(page, "3-kerem", isMobile);
    await app.getByRole("button", { name: "Bildir ve engelle", exact: true }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Bildir ve engelle" }).click();
    await readElifAndGoHome(page);
    await installFromStore(page, isMobile);

    await finish(page, "Kerem'in dosyasını bildirmişsin", 100, isMobile);
    const [attempt] = await attemptsOf(email, slug);
    expect(attempt).toMatchObject({ status: "COMPLETED", reportScore: 100 });
    expect(attempt.events).toContain("homework_opened");
  });
});

test(".apk'yı kurmak isteyen: telefonun uyarıları, Az kalsın, telefona döner, mağazadan kurar; 60 puan", async ({ page, isMobile }) => {
  test.slow();
  await withRoom(async (slug) => {
    const email = uniqueEmail("kurulum");
    await signUpVerified(page, email);
    await startRoom(page, slug, isMobile);

    const app = await openKerem(page);
    await app.getByRole("button", { name: /KesirKulesi_hizli\.apk/ }).click();
    // Telefonun uyarıları: indirilsin mi, bilinmeyen kaynak engeli, ayarda izin, kurulsun mu.
    await expect(page.getByTestId("file-download")).toContainText("KesirKulesi_hizli.apk");
    await page.getByTestId("file-ok").click();
    await expect(page.getByTestId("file-blocked")).toContainText("bilinmeyen kaynak");
    await shot(page, "4-engel", isMobile);
    await page.getByTestId("file-ok").click();
    await page.getByTestId("file-allow").check({ force: true });
    await page.getByTestId("file-continue").click();
    await expect(page.getByTestId("file-confirm")).toBeVisible();
    await page.getByTestId("file-ok").click();

    // Hiçbir şey kurulmaz: Az kalsın, iki yan yan yana, oda sürer.
    const almost = page.getByTestId("almost-dialog");
    await expect(almost.getByRole("heading", { name: "Az kalsın!" })).toBeVisible();
    await expect(almost).toContainText(install.fileCompare.left.value);
    await expect(almost).toContainText(install.fileCompare.right.note);
    await shot(page, "8-az-kalsin", isMobile);
    await almost.getByRole("button", { name: "Telefona dön" }).click();
    await expect(almost).toHaveCount(0);

    await readElifAndGoHome(page);
    await installFromStore(page, isMobile);
    // Kerem 0 (kurmak istedi) + Elif 1 + görev 1 + kopyayı kurmamak 1 + konum 1 + iki soru 2 = 6/10.
    await finish(page, null, 60, isMobile);
    const [attempt] = await attemptsOf(email, slug);
    expect(attempt).toMatchObject({ status: "COMPLETED", reportScore: 60 });
    expect(attempt.events).toContain("file_opened");
  });
});
