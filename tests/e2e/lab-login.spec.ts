import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { isLive, signUpVerified, uniqueEmail } from "./support/account";
import { withDb } from "./support/db";
import { attemptsOf, signInDesktop } from "./support/lab";

// Giriş görevli oda (Şehir Kapısı "Okul bilgisayarında giriş yap ve çık", 19 Kasım): sınıfın
// ortak bilgisayarında okulun portalına girilir, kod telefona gelir, yandaki Deniz kodu ister
// (yüz yüze konuşma, sesli), ödev yüklenir, zil çalınca bilgisayar sıradakine bırakılır. Çıkış
// yapmadan kalkınca "Az kalsın" açılır, oda sürer. Şifre hiç yazılmaz (noktalar kendiliğinden).
// İçerik geçici bir mahallede, eğitimsiz (oda açıktır) yayınlanır; adresi "e2e-".
// LAYOUT_SHOTS=<klasör> verilirse ekran görüntüleri alınır (depoya girmez).

test.skip(isLive, "veritabanına yazan ve hesap açan testler canlı sitede çalışmaz");

const room = JSON.parse(readFileSync("labs/rooms/sehir-kapisi/okul-bilgisayarinda-giris.json", "utf8")).content;
const login = room.mission.login;
const deniz = room.tasks.find((t: { id: string }) => t.id === "deniz");
const last = room.tasks.find((t: { id: string }) => t.id === "evde");
const stamp = () => `${Date.now().toString(36)}${process.pid.toString(36)}${randomUUID().slice(0, 4)}`;
const newId = () => `e2e${randomUUID().replace(/-/g, "").slice(0, 21)}`;
const shots = process.env.LAYOUT_SHOTS;

async function shot(page: Page, name: string, isMobile: boolean) {
  if (!shots) return;
  mkdirSync(shots, { recursive: true });
  await page.waitForTimeout(800);
  await page.screenshot({
    path: `${shots}/giris-${isMobile ? "telefon" : "masaustu"}-${name}.png`,
  });
}

async function withRoom(run: (slug: string) => Promise<void>) {
  const neighborhood = { id: newId(), slug: `e2e-mahalle-${stamp()}` };
  const lab = { id: newId(), slug: `e2e-giris-${stamp()}` };
  const content = JSON.stringify(room);
  await withDb(async (client) => {
    await client.query(
      `INSERT INTO "Neighborhood" ("id", "slug", "name", "color", "sortOrder") VALUES ($1, $2, $3, 'accent', 9000 + floor(random() * 900)::int)`,
      [neighborhood.id, neighborhood.slug, `E2E Mahalle ${neighborhood.slug}`],
    );
    await client.query(
      `INSERT INTO "Lab" ("id", "slug", "neighborhoodId", "type", "template", "sortOrder", "status", "publishedVersion", "difficulty", "durationMin", "draftContent", "updatedAt")
       VALUES ($1, $2, $3, 'SCENARIO', 'INBOX', 1, 'PUBLISHED', 1, 'EASY', 5, $4::jsonb, now())`,
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

/** Başla, kilidi aç, notu oku: tarayıcıda portalın giriş sayfası açılır. */
async function startRoom(page: Page, slug: string, isMobile: boolean) {
  await page.goto(`/oda/${slug}/oyna`);
  // Deniz'in cevapları, son sözleri ve Az kalsın metinleri sayfada yok (sunucudan, olayla gelir).
  const html = await page.content();
  for (const secret of ["Eyvallah", "kantine", "senin adına mesaj", "şifresiz", deniz.right]) expect(html).not.toContain(secret);
  await page.getByRole("button", { name: "Hazırım, başla" }).click();
  // Arama yok: sahne kilitli bilgisayarla açılır, kilitte öğrencinin avatarı ve ortak hesap.
  await expect(page.getByTestId("mission-call")).toHaveCount(0);
  await expect(page.getByTestId("stage-lock")).toContainText("herkesin ortak hesabı");
  await shot(page, "1-kilit", isMobile);
  await signInDesktop(page);
  await expect(page.getByTestId("login-note")).toContainText("afis.png");
  await shot(page, "2-not", isMobile);
  await page.getByTestId("login-note-ok").click();
  await expect(page.getByTestId("school-portal")).toHaveAttribute("data-page", "login");
}

/** Şifre kutusuna dokun, "Şifremi yaz": noktalar kendiliğinden dolar. */
async function typePassword(page: Page) {
  await page.getByTestId("portal-password").click();
  await page.getByTestId("portal-password-type").click();
  await expect(page.getByTestId("portal-password")).toHaveText("•".repeat(8));
}

/** Kod telefona gelir: telefonu al, bak, bırak; Deniz konuşur. */
async function readCode(page: Page, isMobile: boolean) {
  await expect(page.getByTestId("school-portal")).toHaveAttribute("data-page", "code");
  // Telefona bakmadan kutuya dokununca yönlendirme.
  await page.getByTestId("portal-code").first().click();
  await expect(page.getByTestId("portal-code-nudge")).toContainText("telefonuna geldi");
  await expect(page.getByTestId("stage-phone-pick")).toContainText(login.site);
  await page.getByTestId("stage-phone-pick").click();
  await expect(page.getByTestId("login-sms")).toContainText(room.mission.code);
  await shot(page, "4-telefon", isMobile);
  await page.getByTestId("login-phone-drop").click();
}

/** Deniz: iki satır, seçenek, cevabı, "Ekranına dön". */
async function talkToDeniz(page: Page, option: number, isMobile: boolean) {
  const talk = page.getByTestId("talk-scene");
  await expect(talk).toBeVisible();
  await expect(talk).toHaveAttribute("data-place", "school");
  await expect(talk.getByTestId("talk-sub")).toContainText(deniz.talk.lines[0]);
  await talk.getByTestId("talk-next").click();
  await expect(talk.getByTestId("talk-sub")).toContainText(deniz.talk.lines[1]);
  await shot(page, "5-deniz", isMobile);
  await talk.getByTestId("talk-choice").nth(option).click();
  await expect(talk.getByTestId("talk-sub")).toContainText(deniz.talk.replies[option]);
  await talk.getByTestId("talk-done").click();
  await expect(talk).toHaveCount(0);
}

/** Kodu yaz, ödevi yükle; zil çalar. */
async function uploadHomework(page: Page, save: boolean, isMobile: boolean) {
  await page.getByTestId("portal-code").first().click();
  await expect(page.getByTestId("school-portal")).toHaveAttribute("data-page", "home");
  await expect(page.getByTestId("portal-save")).toBeVisible();
  await shot(page, "6-kaydet", isMobile);
  await page.getByTestId(save ? "portal-save-yes" : "portal-save-no").click();
  await page.getByTestId("portal-homework").click();
  await page.getByTestId("portal-choose").click();
  await page.getByTestId("portal-pick").click();
  await page.getByTestId("portal-upload").click();
  await expect(page.getByTestId("portal-uploaded")).toBeVisible();
  await expect(page.getByTestId("login-bell")).toBeVisible();
  await shot(page, "7-zil", isMobile);
}

async function logout(page: Page) {
  await page.getByTestId("portal-menu").click();
  await page.getByTestId("portal-logout").click();
  await expect(page.getByTestId("portal-bye")).toBeVisible();
}

/** Son soru panelde; "Odayı bitir", Deniz'in son sözleri, rapor. */
async function finish(page: Page, ending: string, score: number, isMobile: boolean) {
  if (isMobile) await page.getByRole("button", { name: /Görevleri aç/ }).click();
  const tasks = isMobile ? page.getByRole("dialog", { name: "Görevler" }) : page.getByRole("complementary", { name: "Görevler" });
  await tasks.getByRole("radiogroup", { name: last.text }).getByRole("radio").first().click();
  await tasks.getByRole("button", { name: "Cevabı gönder" }).click();
  await tasks.getByRole("button", { name: "Odayı bitir, raporu gör" }).click();
  const talk = page.getByTestId("talk-scene");
  await expect(talk.getByTestId("talk-sub")).toContainText(deniz.talk.endings[0][0]);
  await talk.getByTestId("talk-next").click();
  await expect(talk.getByTestId("talk-sub")).toContainText(ending);
  await shot(page, "10-son-soz", isMobile);
  await talk.getByTestId("talk-done").click();
  const report = page.getByTestId("lab-report");
  await expect(report.getByRole("img", { name: `${score}/100 puan` })).toBeVisible();
  await shot(page, "11-rapor", isMobile);
}

test("doğru yol: işareti kaldırır, kodu vermez, çıkış yapıp kalkar; 100 puan", async ({ page, isMobile }) => {
  test.slow();
  await withRoom(async (slug) => {
    const email = uniqueEmail("giris");
    await signUpVerified(page, email);
    await startRoom(page, slug, isMobile);
    await typePassword(page);
    await page.getByTestId("portal-remember").click();
    await expect(page.getByTestId("portal-remember")).toHaveAttribute("aria-checked", "false");
    await shot(page, "3-giris", isMobile);
    await page.getByTestId("portal-login").click();
    await readCode(page, isMobile);
    await talkToDeniz(page, 0, isMobile);
    await uploadHomework(page, false, isMobile);
    await logout(page);
    await page.getByTestId("login-leave").click();
    await expect(page.getByText(login.bell.left)).toBeVisible();
    await expect(page.getByTestId("almost-dialog")).toHaveCount(0);
    await expect(page.getByTestId("login-bell")).toHaveCount(0);
    await finish(page, "Kodu vermemen iyi oldu", 100, isMobile);

    const [attempt] = await attemptsOf(email, slug);
    expect(attempt).toMatchObject({ status: "COMPLETED", reportScore: 100 });
    // Şifre hiçbir olaya yazılmaz.
    expect(JSON.stringify(attempt.events)).not.toContain("•");
  });
});

test("yanlış yol: kodu söyler, tarayıcıyı kapatıp kalkar; Az kalsın, döner, çıkar", async ({ page, isMobile }) => {
  test.slow();
  await withRoom(async (slug) => {
    const email = uniqueEmail("giris");
    await signUpVerified(page, email);
    await startRoom(page, slug, isMobile);
    await typePassword(page);
    await page.getByTestId("portal-login").click();
    await readCode(page, isMobile);
    await talkToDeniz(page, 1, isMobile);
    await uploadHomework(page, true, isMobile);

    // Tarayıcıyı kapatmak çıkış değildir: kalkınca Az kalsın.
    await page.getByTestId("login-close-browser").click();
    await page.getByTestId("login-leave").click();
    const almost = page.getByTestId("almost-dialog");
    await expect(almost.getByRole("heading", { name: "Az kalsın!" })).toBeVisible();
    await expect(almost.getByTestId("almost-you")).toContainText("Tarayıcıyı kapattın");
    await expect(almost.getByTestId("almost-next")).toContainText("senin hesabın");
    await shot(page, "8-az-kalsin", isMobile);
    await almost.getByTestId("almost-back").click();

    // Tarayıcıyı yeniden açınca portal hâlâ içeride; çıkınca tarayıcı şifreyi hatırlıyor.
    await page.getByTestId("login-taskbar-browser").click();
    await expect(page.getByTestId("portal-still-open")).toBeVisible();
    await shot(page, "9-hala-acik", isMobile);
    await logout(page);
    await expect(page.getByTestId("portal-bye-saved")).toBeVisible();
    await page.getByTestId("login-leave").click();
    await expect(page.getByText(login.bell.left)).toBeVisible();

    // Çıkış 0 (önce açık bıraktı), Beni hatırla 0, şifre 0, ödev 1, Deniz 0, son soru 1 = 2/10.
    await finish(page, "bir daha kimseye söyleme", 20, isMobile);
    const [attempt] = await attemptsOf(email, slug);
    expect(attempt).toMatchObject({ status: "COMPLETED", reportScore: 20 });
    expect(attempt.events).toContain("desk_left");
  });
});
