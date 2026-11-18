import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { isLive, signUpVerified, uniqueEmail } from "./support/account";
import { withDb } from "./support/db";
import { attemptsOf, signInDesktop } from "./support/lab";

// Kayıt görevli oda ve "Az kalsın" (Şehir Kapısı "Bağlantı nereye gidiyor?", 18 Kasım): Deniz
// arar, sahte kulüp mailindeki düğme sahte okul girişini açar; şifre yazınca hacklendin değil
// "Az kalsın" ekranı gelir ve oda sürer (şifre kutusuna dokunmak yeter, öğrenci bir şey yazmaz). Gerçek kulüp mailindeki düğme okulun formunu açar.
// İçerik geçici bir mahallede, eğitimsiz (oda açıktır) yayınlanır; adresi "e2e-".
// LAYOUT_SHOTS=<klasör> verilirse ekran görüntüleri alınır (depoya girmez).

test.skip(isLive, "veritabanına yazan ve hesap açan testler canlı sitede çalışmaz");

const room = JSON.parse(readFileSync("labs/rooms/sehir-kapisi/baglanti-nereye-gidiyor.json", "utf8")).content;
const stamp = () => `${Date.now().toString(36)}${process.pid.toString(36)}${randomUUID().slice(0, 4)}`;
const newId = () => `e2e${randomUUID().replace(/-/g, "").slice(0, 21)}`;
const shots = process.env.LAYOUT_SHOTS;

async function shot(page: Page, name: string, isMobile: boolean) {
  if (!shots) return;
  mkdirSync(shots, { recursive: true });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${shots}/kayit-${isMobile ? "telefon" : "masaustu"}-${name}.png` });
}

async function withRoom(run: (slug: string) => Promise<void>) {
  const neighborhood = { id: newId(), slug: `e2e-mahalle-${stamp()}` };
  const lab = { id: newId(), slug: `e2e-kayit-${stamp()}` };
  const content = JSON.stringify(room);
  await withDb(async (client) => {
    await client.query(`INSERT INTO "Neighborhood" ("id", "slug", "name", "color", "sortOrder") VALUES ($1, $2, $3, 'accent', 9000 + floor(random() * 900)::int)`, [
      neighborhood.id,
      neighborhood.slug,
      `E2E Mahalle ${neighborhood.slug}`,
    ]);
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

/** Deniz'in araması: "Aç", "Geç", görev kartında "Tamam, hemen bakıyorum". */
async function answerIntro(page: Page, isMobile: boolean) {
  await page.getByRole("button", { name: "Hazırım, başla" }).click();
  const call = page.getByTestId("mission-call");
  await expect(call.getByText("Görüntülü arama…")).toBeVisible();
  await shot(page, "1-arama", isMobile);
  await call.getByRole("button", { name: "Aç", exact: true }).click();
  await expect(call.getByText("Selam!", { exact: false }).first()).toBeVisible();
  await shot(page, "2-gorusme", isMobile);
  await call.getByRole("button", { name: "Geç ›" }).click();
  await expect(call.getByRole("heading", { name: room.mission.title })).toBeVisible();
  await shot(page, "3-gorev-karti", isMobile);
  await call.getByRole("button", { name: room.mission.accept }).click();
  await expect(call).toHaveCount(0);
  // M1 sahnesi: bilgisayarın kilidinde "Oturum aç".
  await signInDesktop(page);
}

test("sahte girişe şifre yazan öğrenci: Az kalsın, sonra okulun formuyla kaydolur ve odayı bitirir", async ({ page, isMobile }) => {
  test.slow();
  await withRoom(async (slug) => {
    const email = uniqueEmail("kayit");
    await signUpVerified(page, email);
    await page.goto(`/oda/${slug}`);
    await shot(page, "0-kapak", isMobile);
    await page.goto(`/oda/${slug}/oyna`);

    // Formun cümlesi ve Az kalsın metinleri sayfada yok (sunucudan, olayla birlikte gelir).
    const html = await page.content();
    expect(html).not.toContain("Kaydın alındı");
    expect(html).not.toContain("hemen değiştir");

    await answerIntro(page, isMobile);
    await shot(page, "4-gelen-kutusu", isMobile);
    const app = page.getByTestId("scenario-player");
    const back = page.getByRole("button", { name: "Listeye dön" });

    // Sahte kulüp maili: düğme sahte okul girişini açar.
    await app.getByRole("button", { name: /^Kodlama Kulübü Kayıt/ }).click();
    await shot(page, "5-sahte-mail", isMobile);
    await app.getByRole("button", { name: "cinarortaokulu.k12.tr/kayit" }).click();
    await expect(app.getByRole("heading", { name: room.trap.title })).toBeVisible();
    await expect(app.getByRole("heading", { name: room.trap.title })).toBeVisible();
    // Az kalsın odasında şifre yazılmaz: kutuya dokununca noktalar kendiliğinden gelir, uyarı şeridi yok.
    const password = app.getByLabel(room.trap.ask);
    await expect(password).toHaveAttribute("readonly", "");
    await expect(app.getByText("Burada gerçek şifreni yazma", { exact: false })).toHaveCount(0);
    await password.click();
    await expect(password).toHaveValue("•".repeat(9));
    await shot(page, "6-sahte-giris", isMobile);
    await app.getByRole("button", { name: "Giriş yap ve doğrula" }).click();

    // Hacklendin yok: Az kalsın penceresi, düğmede yazanla gerçek adres yan yana.
    const almost = page.getByTestId("almost-dialog");
    await expect(almost.getByRole("heading", { name: "Az kalsın!" })).toBeVisible();
    await expect(almost.getByTestId("almost-url")).toContainText("kayit-formu.xyz");
    await expect(almost).toContainText(room.trap.actions[2]);
    await expect(page.getByTestId("hacked-alarm")).toHaveCount(0);
    await shot(page, "7-az-kalsin", isMobile);
    await almost.getByTestId("almost-back").click();
    await expect(almost).toHaveCount(0);
    let [attempt] = await attemptsOf(email, slug);
    expect(attempt.status).toBe("IN_PROGRESS");
    expect(attempt.events).toContain("info_entered");
    expect(JSON.stringify(attempt.events)).not.toContain("•");

    // Gerçek kulüp maili: okulun formu, kutular boş da gönderilebilir.
    if (isMobile && (await back.isVisible())) await back.click();
    await app.getByRole("button", { name: /^Çınar Ortaokulu Kodlama Kulübü/ }).click();
    await app.getByRole("button", { name: "Kayıt formu", exact: true }).click();
    const form = app.getByTestId("signup-form");
    await expect(form.getByRole("heading", { name: room.mission.signup.title })).toBeVisible();
    await expect(app.getByText("Güvenli değil")).toHaveCount(0);
    await form.getByLabel("Adın").fill("Defne");
    await shot(page, "8-form", isMobile);
    await form.getByRole("button", { name: "Gönder" }).click();
    await expect(form.getByText(room.mission.signup.done)).toBeVisible();
    await shot(page, "9-kaydin-alindi", isMobile);
    await form.getByRole("button", { name: "Gelen kutusuna dön" }).click();

    // Diğer mailler, sahteyi bildir, sorular, bitir.
    if (isMobile && (await back.isVisible())) await back.click();
    for (const name of ["Annem", "Market Puan"]) {
      await app.getByRole("button", { name: new RegExp(`^${name}`) }).click();
      if (isMobile) await back.click();
    }
    await app.getByRole("button", { name: /^Kodlama Kulübü Kayıt/ }).click();
    await app.getByRole("button", { name: isMobile ? "Bildir" : "Oltalama olarak bildir", exact: true }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Bildir", exact: true }).click();

    if (isMobile) await page.getByRole("button", { name: /Görevleri aç/ }).click();
    const tasks = isMobile ? page.getByRole("dialog", { name: "Görevler" }) : page.getByRole("complementary", { name: "Görevler" });
    await tasks.getByRole("button", { name: "İncelemeyi bitirdim" }).click();
    for (const task of room.tasks.filter((t: { type: string }) => t.type === "question")) {
      await tasks.getByRole("radiogroup", { name: task.text }).getByRole("radio").first().click();
      await tasks.getByRole("button", { name: "Cevabı gönder" }).click();
    }
    await tasks.getByRole("button", { name: "Odayı bitir, raporu gör" }).click();

    const call = page.getByTestId("mission-call");
    await expect(call.getByText("Deniz arıyor…")).toBeVisible();
    await call.getByRole("button", { name: "Geç ›" }).click();
    await expect(call.getByRole("heading", { name: room.mission.goodTitle })).toBeVisible();
    await shot(page, "10-iyi-bitis", isMobile);
    await call.getByRole("button", { name: "Raporu gör" }).click();

    const report = page.getByTestId("lab-report");
    // Sahte sayfaya şifre yazdı (0), sonra bildirdi: sahte 0 + gerçekler 3 + görev 1 + sorular 2 = 6/10.
    await expect(report.getByRole("img", { name: "60/100 puan" })).toBeVisible();
    await shot(page, "11-rapor", isMobile);
    [attempt] = await attemptsOf(email, slug);
    expect(attempt).toMatchObject({ status: "COMPLETED", reportScore: 60 });
    expect(attempt.events).toContain("form_sent");
    expect(JSON.stringify(attempt.events)).not.toContain("Defne");
  });
});
