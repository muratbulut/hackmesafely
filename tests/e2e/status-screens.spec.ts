import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { isLive, signUpVerified, uniqueEmail } from "./support/account";

// Hata ve bağlantı durumları gerçek tarayıcıda: sayfanın hata ekranı (app/error.tsx) ve "Tekrar
// dene", internet bağlantısı kopunca sayfanın üstündeki şerit, eğitim odasında bağlantı yokken
// verilen cevap. Durum ekranlarının görünümü /onizleme'de bir arada durur.

const training = JSON.parse(readFileSync("labs/rooms/para-carsisi/kisisel-veri-ve-para-guvenligi.json", "utf8"));

test("hata ekranı suçlamayan dille ve kısa bir kodla çıkar; Tekrar dene sayfayı geri getirir", async ({ page }) => {
  test.skip(isLive, "önizleme sayfası canlıda kapalı");
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/onizleme");
  // Önizlemedeki düğme, çizilirken hata fırlatan bir bileşen açar; kök hata sınırı devreye girer.
  await page.getByRole("button", { name: "Gerçek hata ekranını aç" }).click();
  const alert = page.getByRole("alert").filter({ hasText: "Bir şeyler ters gitti, bizim hatamız" });
  await expect(alert).toBeVisible();
  await expect(alert).toContainText("Birazdan tekrar dene.");
  await expect(alert).toContainText(/Hata 500 · /);
  // Teknik ayrıntı (hatanın iletisi, yığın) gösterilmez.
  await expect(page.getByText("StatusPreview error screen check")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Sunucu hatası" })).toHaveCount(0);

  await alert.getByRole("button", { name: "Tekrar dene" }).click();
  await expect(page.getByRole("button", { name: "Gerçek hata ekranını aç" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sunucu hatası" })).toBeVisible();
  await expect(alert).toHaveCount(0);
  // Sayfa çökmedi: hata yakalandı (tarayıcıda yakalanmamış hata yok).
  expect(errors).toEqual([]);
});

test("bağlantı kopunca sayfanın üstünde şerit çıkar, sayfa kapanmaz; bağlantı gelince şerit gider", async ({ page, context }) => {
  await page.goto("/sss");
  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toBeVisible();
  const banner = page.getByRole("alert").filter({ hasText: "İnternet bağlantın koptu" });
  await expect(banner).toHaveCount(0);

  await context.setOffline(true);
  await expect(banner).toBeVisible();
  await expect(banner).toContainText("Bağlantı gelince kaldığın yerden devam edersin.");
  await expect(heading).toBeVisible();
  // Bağlantı yokken Tekrar dene sunucuya ulaşamaz, düğme geri gelir.
  await banner.getByRole("button", { name: "Tekrar dene" }).click();
  await expect(banner.getByRole("button", { name: "Tekrar dene" })).toBeVisible();

  await context.setOffline(false);
  await expect(banner).toHaveCount(0);
  await expect(heading).toBeVisible();
});

test.describe("eğitim odasında bağlantı", () => {
  test.skip(isLive, "hesap açan testler canlı sitede çalışmaz");

  test("bağlantı yokken verilen cevap kaydedilmez ve söylenir; bağlantı gelince yeniden cevaplanır", async ({ page, context }) => {
    await signUpVerified(page, uniqueEmail("egitim-baglanti"));
    await page.goto(`/oda/${training.slug}/oyna`);
    const player = page.getByTestId("training-player");
    // İlk kart video sorusudur; soru videonun altında ya da (video açılırsa) üstünde sorulur.
    const first = training.content.cards[0];
    const right = first.question.options[first.question.answer];
    await expect(player).toBeVisible();
    const next = player.getByRole("button", { name: /^(Devam|Bitir)$/ });

    await page.waitForFunction(() => {
      const video = document.querySelector<HTMLVideoElement>('[data-testid="training-player"] video');
      return !video || video.readyState >= 1 || video.error !== null;
    });
    const video = player.locator("video");
    if (await video.count()) await video.evaluate((v: HTMLVideoElement, at) => void (v.currentTime = at), first.question.at);
    // Soru ekrana gelince bağlantı kesilir (video bağlantısızken soru saniyesine atlayamaz).
    await expect(player.getByRole("button", { name: right, exact: true })).toBeVisible();
    await context.setOffline(true);
    await player.getByRole("button", { name: right, exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "Bağlantı koptu" }).filter({ visible: true })).toBeVisible();
    await expect(page.getByRole("alert").filter({ hasText: "İnternet bağlantın koptu" })).toBeVisible();
    await expect(player.getByText("Doğru!")).toHaveCount(0);
    await expect(next).toBeDisabled();

    await context.setOffline(false);
    await expect(page.getByRole("alert").filter({ hasText: "İnternet bağlantın koptu" })).toHaveCount(0);
    await player.getByRole("button", { name: right, exact: true }).click();
    await expect(player.getByText("Doğru!").filter({ visible: true })).toBeVisible();
    await expect(next).toBeEnabled();
  });
});
