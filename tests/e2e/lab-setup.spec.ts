import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { isLive, signUpVerified, uniqueEmail } from "./support/account";
import { withDb } from "./support/db";
import { attemptsOf, pickUpPhone } from "./support/lab";

// Telefon kurulumu (Şehir Kapısı "Yeni telefonunu kur", 20 Kasım): Ayça eski telefonunu verir.
// Evin ağına defterdeki şifreyle bağlanılır, güncelleme bildirim çubuğundan Ayarlar'da yüklenir,
// Harita ve El Feneri kurulur. El Feneri'ndeki "3 virüs" reklamını kapatmak doğrudur;
// temizleyiciyi kurmak "Az kalsın"dır, oda sürer. Bitince Ayça'ya "Kurdum!" yazılır.
// İçerik geçici bir mahallede, eğitimsiz (oda açıktır) yayınlanır; adresi "e2e-".
// LAYOUT_SHOTS=<klasör> verilirse ekran görüntüleri alınır (depoya girmez).

test.skip(isLive, "veritabanına yazan ve hesap açan testler canlı sitede çalışmaz");

const room = JSON.parse(readFileSync("labs/rooms/sehir-kapisi/yeni-telefonunu-kur.json", "utf8")).content;
const setup = room.mission.install.setup;
const stamp = () => `${Date.now().toString(36)}${process.pid.toString(36)}${randomUUID().slice(0, 4)}`;
const newId = () => `e2e${randomUUID().replace(/-/g, "").slice(0, 21)}`;
const shots = process.env.LAYOUT_SHOTS;

async function shot(page: Page, name: string, isMobile: boolean) {
  if (!shots) return;
  mkdirSync(shots, { recursive: true });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${shots}/telefon-kurulumu-${isMobile ? "telefon" : "masaustu"}-${name}.png` });
}

async function withRoom(run: (slug: string) => Promise<void>) {
  const neighborhood = { id: newId(), slug: `e2e-mahalle-${stamp()}` };
  const lab = { id: newId(), slug: `e2e-telefon-${stamp()}` };
  const content = JSON.stringify(room);
  await withDb(async (client) => {
    await client.query(
      `INSERT INTO "Neighborhood" ("id", "slug", "name", "color", "sortOrder") VALUES ($1, $2, $3, 'accent', 9000 + floor(random() * 900)::int)`,
      [neighborhood.id, neighborhood.slug, `E2E Mahalle ${neighborhood.slug}`],
    );
    await client.query(
      `INSERT INTO "Lab" ("id", "slug", "neighborhoodId", "type", "template", "sortOrder", "status", "publishedVersion", "difficulty", "durationMin", "draftContent", "updatedAt")
       VALUES ($1, $2, $3, 'SCENARIO', 'MESSAGING', 1, 'PUBLISHED', 1, 'EASY', 6, $4::jsonb, now())`,
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

/** Başla, Ayça'nın araması, görev kartı; telefonu al: kurulumun "Merhaba" ekranı, sonra Wi‑Fi. */
async function startRoom(page: Page, slug: string, isMobile: boolean) {
  await page.goto(`/oda/${slug}/oyna`);
  // Evin ağı, açık ağın notu, güncellemenin sonucu ve bitiş satırları sayfada yok.
  const html = await page.content();
  for (const secret of [setup.wifi.openNote.text, setup.wifi.unknown, setup.update.done, setup.good.almost, room.mission.good[0]]) {
    expect(html).not.toContain(secret);
  }
  await page.getByRole("button", { name: "Hazırım, başla" }).click();
  const call = page.getByTestId("mission-call");
  await expect(call.getByText("Ayça", { exact: true }).first()).toBeVisible();
  await shot(page, "1-arama", isMobile);
  await call.getByRole("button", { name: "Aç", exact: true }).click();
  await call.getByRole("button", { name: "Geç ›" }).click();
  await expect(call.getByRole("heading", { name: room.mission.title })).toBeVisible();
  await call.getByRole("button", { name: room.mission.accept }).click();
  await expect(call).toHaveCount(0);
  await pickUpPhone(page);
  await page.getByTestId("setup-start").click();
  await expect(page.getByTestId("setup-wifi")).toBeVisible();
  await shot(page, "2-wifi", isMobile);
}

/** Ev_Wifi: şifre kutusu, defter, "Şifreyi yaz", Bağlan; ana ekranda güncelleme bildirimi. */
async function joinHome(page: Page, isMobile: boolean) {
  await page.getByTestId("wifi-network").filter({ hasText: "Ev_Wifi" }).click();
  await expect(page.getByTestId("wifi-connect")).toBeDisabled();
  await page.getByTestId("wifi-notebook-open").click();
  await expect(page.getByTestId("wifi-notebook")).toContainText(setup.wifi.password);
  await shot(page, "3-defter", isMobile);
  await page.getByTestId("wifi-fill").click();
  await page.getByTestId("wifi-connect").click();
  await expect(page.getByTestId("setup-home-screen")).toBeVisible();
  await expect(page.getByTestId("update-banner")).toContainText(setup.update.title);
}

/** Bildirim çubuğundan güncelleme, Mağaza'dan Harita ("Kullanırken") ve El Feneri (choice). */
async function updateAndInstall(page: Page, flashlightChoice: number, isMobile: boolean) {
  await page.getByTestId("shade-handle").click();
  await shot(page, "4-bildirim-cubugu", isMobile);
  await page.getByTestId("shade-update").click();
  await page.getByTestId("update-install").click();
  await expect(page.getByTestId("update-done")).toContainText(setup.update.done);
  await page.getByTestId("setup-home").click();
  for (const [name, choice] of [["Harita", 0], ["El Feneri", flashlightChoice]] as const) {
    await page.getByTestId("setup-app-store").click();
    await page.getByTestId("store-suggestion").filter({ hasText: name }).click();
    await page.getByTestId("store-result").filter({ hasText: name }).click();
    await page.getByTestId("store-get").click();
    const prompt = page.getByTestId("permission-prompt");
    await expect(prompt).toContainText("konumuna erişmek istiyor");
    await prompt.getByTestId("permission-choice").nth(choice).click();
    await expect(prompt).toHaveCount(0);
    if (name === "Harita") await page.getByTestId("setup-home").click();
  }
  // El Feneri açıldı; birazdan reklam bütün ekranı kaplar.
  await expect(page.getByTestId("setup-ad")).toContainText(setup.ad.title);
  await shot(page, "5-reklam", isMobile);
}

/** Ana ekranda Ayça'nın sorusu, "Kurdum!"; panelde iki soru (ilk seçenekler doğru), bitiş araması, rapor. */
async function finish(page: Page, line: string | null, score: number, isMobile: boolean) {
  await page.getByTestId("setup-home").click();
  await page.getByTestId("finish-reply").click();
  await expect(page.getByTestId("finish-sent")).toBeVisible();
  if (isMobile) {
    const drop = page.locator('[data-testid="stage-phone-drop"]:visible');
    if (await drop.isVisible()) await drop.click();
    await page.getByRole("button", { name: /Görevleri aç/ }).click();
  }
  const tasks = isMobile ? page.getByRole("dialog", { name: "Görevler" }) : page.getByRole("complementary", { name: "Görevler" });
  for (const task of room.tasks.filter((t: { type: string }) => t.type === "question")) {
    await tasks.getByRole("radiogroup", { name: task.text }).getByRole("radio").first().click();
    await tasks.getByRole("button", { name: "Cevabı gönder" }).click();
  }
  await tasks.getByRole("button", { name: "Odayı bitir, raporu gör" }).click();
  const call = page.getByTestId("mission-call");
  await expect(call.getByText(room.mission.good[0], { exact: false }).first()).toBeVisible();
  if (line) await expect(call.getByText(line, { exact: false }).first()).toBeVisible({ timeout: 20_000 });
  const skip = call.getByRole("button", { name: "Geç ›" });
  if (await skip.isVisible()) await skip.click();
  await expect(call.getByRole("heading", { name: room.mission.goodTitle })).toBeVisible();
  await call.getByRole("button", { name: "Raporu gör" }).click();
  const report = page.getByTestId("lab-report");
  await expect(report.getByRole("img", { name: `${score}/100 puan` })).toBeVisible();
  await shot(page, "9-rapor", isMobile);
}

test("doğru yol: evin ağı, güncelleme, izinler, reklamı kapatır, Kurdum!; 100 puan", async ({ page, isMobile }) => {
  test.slow();
  await withRoom(async (slug) => {
    const email = uniqueEmail("telefon");
    await signUpVerified(page, email);
    await startRoom(page, slug, isMobile);
    await joinHome(page, isMobile);
    await updateAndInstall(page, 2, isMobile);
    await page.getByTestId("ad-close").click();
    await expect(page.getByTestId("setup-ad")).toHaveCount(0);
    await finish(page, null, 100, isMobile);
    const [attempt] = await attemptsOf(email, slug);
    expect(attempt).toMatchObject({ status: "COMPLETED", reportScore: 100 });
    for (const type of ["wifi_connected", "update_installed", "ad_closed", "setup_finished"]) expect(attempt.events).toContain(type);
  });
});

test("açık ağ ve temizleyici: not, telefonun uyarıları, Az kalsın, oda sürer; 50 puan", async ({ page, isMobile }) => {
  test.slow();
  await withRoom(async (slug) => {
    const email = uniqueEmail("telefon");
    await signUpVerified(page, email);
    await startRoom(page, slug, isMobile);
    // Bedava_Internet: hemen bağlanır, not gelir; kurulum evin ağına geçmeden sürmez.
    await page.getByTestId("wifi-network").filter({ hasText: "Bedava_Internet" }).click();
    await expect(page.getByTestId("wifi-note")).toContainText(setup.wifi.openNote.title);
    await page.getByTestId("wifi-note-ok").click();
    await joinHome(page, isMobile);
    await updateAndInstall(page, 2, isMobile);

    await page.getByTestId("ad-clean").click();
    await expect(page.getByTestId("file-blocked")).toContainText("bilinmeyen kaynak");
    await page.getByTestId("file-ok").click();
    await expect(page.getByTestId("file-settings")).toContainText("El Feneri");
    await page.getByTestId("file-allow").check({ force: true });
    await page.getByTestId("file-continue").click();
    await page.getByTestId("file-ok").click();
    const almost = page.getByTestId("almost-dialog");
    await expect(almost.getByRole("heading", { name: "Az kalsın!" })).toBeVisible();
    await expect(almost).toContainText(room.mission.install.fileCompare.left.value);
    await shot(page, "8-az-kalsin", isMobile);
    await almost.getByRole("button", { name: "Telefona dön" }).click();
    await expect(almost).toHaveCount(0);

    // Reklam 0 (kurdu) + görev 1 + ağ 0 (açık ağ) + iki izin 2 + iki soru 2 = 5/10. Ayça açık ağ satırını da söyler.
    await finish(page, setup.good.openWifi, 50, isMobile);
    const [attempt] = await attemptsOf(email, slug);
    expect(attempt).toMatchObject({ status: "COMPLETED", reportScore: 50 });
    expect(attempt.events).toContain("file_opened");
  });
});
