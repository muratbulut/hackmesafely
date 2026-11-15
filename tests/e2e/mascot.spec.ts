import { expect, test, type Locator, type Page } from "@playwright/test";
import { isLive, signUpVerified, uniqueEmail } from "./support/account";
import { finishTraining } from "./support/lab";

// Maskot (components/mascot): menüdeki isim hâli ve tanıtımdaki büyük maskot fareyi izler, büyük
// maskot dokununca tepki verir ve 1 dakikada uyur; hesap formlarında şifre yazılırken gözünü kapatır;
// 404'te kapalı düğmedir; yavaş sayfa geçişinde ve çıkışta tam ekran örtü çıkar; odada bağlantıya
// bakar ama tuzakla güvenli bağlantıya aynı bakar. Görünüm birim testlerde (mascot.test.tsx),
// burada gerçek tarayıcıdaki davranış denetlenir: SVG'nin ruh hâli (data-mood), tepki sınıfı
// (mc-r-...) ve bakış yönü (--mc-x, --mc-y).

const heroButton = (page: Page) => page.getByRole("button", { name: "Maskotu sev" }).filter({ visible: true }).first();
const heroMascot = (page: Page) => heroButton(page).locator("svg");
const wordmark = (page: Page) => page.locator("svg.mc-wordmark").filter({ visible: true }).first();
const gaze = (el: Locator) => el.evaluate((svg) => Number((svg as SVGElement).style.getPropertyValue("--mc-x") || "NaN"));
const classes = (el: Locator) => el.evaluate((svg) => svg.getAttribute("class") ?? "");

test.describe("tanıtım sayfasındaki maskot", () => {
  test("gözü fareyi izler; menüdeki isim hâli de izler", async ({ page, isMobile }) => {
    test.skip(isMobile, "fareyle izleme yalnızca fare olan cihazda");
    await page.goto("/");
    const hero = heroMascot(page);
    await expect(hero).toHaveAttribute("data-mood", "idle");

    // Fare sayfanın soluna gidince göz sola, sağına gidince sağa bakar. Sayfa canlanana kadar
    // (hidrasyon) fare yeniden oynatılır.
    await expect(async () => {
      await page.mouse.move(5, 450);
      expect(await gaze(hero)).toBeLessThan(0);
      expect(await gaze(wordmark(page))).toBeLessThan(0.5);
    }).toPass();
    await page.mouse.move(1430, 450);
    await expect.poll(() => gaze(hero)).toBeGreaterThan(0);
    await expect.poll(() => gaze(wordmark(page))).toBeGreaterThan(0);
  });

  test("Hareketi azalt açıksa göz fareyi izlemez", async ({ page, isMobile }) => {
    test.skip(isMobile, "fareyle izleme yalnızca fare olan cihazda");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const hero = heroMascot(page);
    await expect(hero).toBeVisible();
    await page.mouse.move(5, 450);
    await page.mouse.move(1430, 450);
    await page.waitForTimeout(300);
    expect(Number.isNaN(await gaze(hero))).toBe(true);
    expect(Number.isNaN(await gaze(wordmark(page)))).toBe(true);
  });

  test("her dokunuşta sıradaki tepkiyi oynar; telefonda göz dokunuşu izlemez", async ({ page, isMobile }) => {
    await page.goto("/");
    const hero = heroMascot(page);
    await heroButton(page).click();
    await expect.poll(() => classes(hero)).toContain("mc-r-blink");
    await heroButton(page).click();
    await expect.poll(() => classes(hero)).toContain("mc-r-cheer");
    await expect.poll(() => classes(hero)).not.toContain("mc-r-blink");
    // Tepki bitince her zamanki hâline döner.
    await expect.poll(() => classes(hero), { timeout: 5_000 }).not.toMatch(/mc-r-/);
    if (isMobile) expect(Number.isNaN(await gaze(hero))).toBe(true);
  });

  test("1 dakika hareket olmazsa uyur, menüdeki logo da uyur; fare uyandırır", async ({ page, isMobile }) => {
    await page.clock.install();
    await page.goto("/");
    const hero = heroMascot(page);
    await expect(hero).toHaveAttribute("data-mood", "idle");
    // Sayfa canlanmadan (hidrasyon) sayaç kurulmaz; saat, maskot uyuyana kadar ileri alınır.
    await expect
      .poll(async () => {
        await page.clock.runFor(61_000);
        return hero.getAttribute("data-mood");
      })
      .toBe("sleep");
    await expect(page.locator("html")).toHaveAttribute("data-mascot", "sleep");
    // Uyurken ilk dokunuş yalnızca uyandırır, tepki oynamaz.
    if (isMobile) await heroButton(page).tap();
    else await page.mouse.move(400, 400);
    await expect(hero).toHaveAttribute("data-mood", "idle");
    await expect(page.locator("html")).not.toHaveAttribute("data-mascot", /.*/);
    expect(await classes(hero)).not.toMatch(/mc-r-/);
  });
});

test("giriş formundaki maskot e-postanın ucuna bakar, şifrede gözünü kapatır; yazılanı hiçbir yere yazmaz", async ({ page }) => {
  await page.goto("/giris");
  const mascot = page.locator("main svg[data-mood]").filter({ visible: true }).first();
  await expect(mascot).toHaveAttribute("data-mood", "idle");

  const email = page.getByLabel("E-posta");
  await email.fill("a@b");
  // Kısa yazıda göz solda (yazının ucu), uzun yazıda sağda.
  await expect.poll(() => gaze(mascot)).toBeLessThan(-0.5);
  const long = "cok-uzun-bir-eposta-adresi@ornek.invalid";
  await email.fill(long);
  await expect.poll(() => gaze(mascot)).toBeGreaterThan(0.8);

  const password = page.getByLabel("Şifre", { exact: true });
  await password.click();
  await expect(mascot).toHaveAttribute("data-mood", "shut");
  // Menüdeki isim hâli de gözünü kapatır (html işareti).
  await expect(page.locator("html")).toHaveAttribute("data-mascot-eyes", "shut");
  const secret = "GizliSifre!2026";
  await password.fill(secret);

  // Şifreden çıkınca göz açılır.
  await page.getByRole("heading", { level: 1 }).click();
  await expect(mascot).toHaveAttribute("data-mood", "idle");
  await expect(page.locator("html")).not.toHaveAttribute("data-mascot-eyes", /.*/);

  // Maskot yalnızca uzunluğa bakar: yazılan e-posta ve şifre maskotta, html'de ya da menüdeki logoda yok.
  for (const el of [mascot, page.locator("html"), wordmark(page)]) {
    const attributes = await el.evaluate((node) => Array.from(node.attributes, (a) => a.value).join(" ") + (node.tagName === "svg" ? node.outerHTML : ""));
    expect(attributes).not.toContain(long);
    expect(attributes).not.toContain(secret);
  }
});

test("404'teki maskot kapalı düğmedir; dokununca açılmaya çalışır", async ({ page }) => {
  await page.goto("/olmayan-bir-sayfa");
  const button = page.getByRole("button", { name: "Maskotu sev" });
  const mascot = button.locator("svg");
  await expect(mascot).toHaveAttribute("data-mood", "off");
  await button.click();
  await expect.poll(() => classes(mascot)).toContain("mc-r-try");
  await expect.poll(() => classes(mascot), { timeout: 5_000 }).not.toContain("mc-r-try");
  await expect(mascot).toHaveAttribute("data-mood", "off");
});

test.describe("sayfa geçişi örtüsü", () => {
  test("sayfa 0,3 saniyede açılmazsa örtü çıkar, sayfa gelince kalkar", async ({ page }) => {
    // Gündem sayfasının bütün istekleri (ön yükleme dahil) 2 saniye bekletilir.
    await page.route(/\/gundem(\?|$)/, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2_000));
      await route.continue();
    });
    await page.goto("/sss");
    const overlay = page.getByTestId("page-overlay");
    await page.getByRole("link", { name: "Gündem", exact: true }).filter({ visible: true }).first().click();
    await expect(overlay).toBeVisible();
    await expect(overlay).toContainText("Sayfa açılıyor");
    await expect(overlay.locator("svg")).toHaveAttribute("data-mood", "loading");
    await page.waitForURL("/gundem");
    await expect(overlay).toHaveCount(0);
  });

  test("hızlı açılan sayfada ve aynı sayfaya giden bağlantıda örtü çıkmaz", async ({ page }) => {
    await page.goto("/sss");
    // Örtü bir kez bile görünürse yakalanır.
    await page.evaluate(() => {
      const seen = new MutationObserver(() => {
        if (document.querySelector('[data-testid="page-overlay"]')) document.documentElement.dataset.overlaySeen = "1";
      });
      seen.observe(document.body, { childList: true, subtree: true });
    });
    await page.getByRole("link", { name: "SSS", exact: true }).filter({ visible: true }).first().click();
    await page.waitForTimeout(600);
    await expect(page.locator("html")).not.toHaveAttribute("data-overlay-seen", "1");
  });

  test.describe("çıkış", () => {
    test.skip(isLive, "hesap açan testler canlı sitede çalışmaz");

    test("çıkışta örtüde maskot kapanıp uyur, sonra örtü kalkar", async ({ page }) => {
      await signUpVerified(page, uniqueEmail("maskot-cikis"));
      const banner = page.getByRole("banner");
      await banner.getByRole("button", { name: "Hesap menüsü" }).click();
      await banner.getByRole("button", { name: "Çıkış yap" }).click();
      const overlay = page.getByTestId("page-overlay");
      await expect(overlay).toContainText("Çıkış yapılıyor");
      await expect(overlay.locator("svg")).toHaveAttribute("data-mood", "out");
      await expect(overlay).toHaveCount(0, { timeout: 10_000 });
      await expect(banner.getByRole("link", { name: "Giriş yap" }).filter({ visible: true })).toBeVisible();
    });
  });
});

test.describe("odadaki maskot", () => {
  test.skip(isLive, "hesap açan testler canlı sitede çalışmaz");

  test("bağlantının üstüne gelinince ona bakar; tuzakla güvenli bağlantıya aynı bakar", async ({ page, isMobile }) => {
    test.skip(isMobile, "üstüne gelme (hover) yalnızca fareyle");
    const email = uniqueEmail("maskot-oda");
    await signUpVerified(page, email);
    await finishTraining(email);
    await page.goto("/oda/sahte-kargo-maili/oyna");
    await page.getByRole("button", { name: "Hazırım, başla" }).click();

    const app = page.getByTestId("scenario-player");
    const mascot = page.locator("svg[data-mood]").filter({ visible: true }).first();
    await expect(mascot).toHaveAttribute("data-mood", "idle");

    /** Bağlantının üstüne gelir; maskotun o anki hâlini (ruh hâli ve sınıfları) döndürür. */
    async function lookAt(open: RegExp, link: string) {
      await app.getByRole("button", { name: open }).click();
      await app.getByText(link, { exact: true }).hover();
      await expect(mascot).toHaveAttribute("data-mood", "look");
      const state = { mood: await mascot.getAttribute("data-mood"), classes: await classes(mascot) };
      // Bağlantıdan çıkınca bakmayı bırakır.
      await page.mouse.move(5, 5);
      await expect(mascot).toHaveAttribute("data-mood", "idle");
      return state;
    }

    // Kargo maili tuzak, market maili güvenli: maskot ikisine de aynı bakar.
    const trap = await lookAt(/^Kargo Takip/, "Adresi güncelle");
    const safe = await lookAt(/^Market Puan/, "Siparişlerim");
    expect(trap).toEqual(safe);
  });
});
