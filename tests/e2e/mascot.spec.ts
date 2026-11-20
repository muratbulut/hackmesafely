import { readFileSync } from "node:fs";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { isLive, signUpVerified, uniqueEmail } from "./support/account";
import { signInDesktop, withTempRoom } from "./support/lab";

const oldKargo = JSON.parse(readFileSync("tests/fixtures/rooms/sahte-kargo-maili.json", "utf8")).content;

// Maskot (components/mascot): menüdeki canlı logonun gözü (gözlü a) fareyi izler, 10 saniyede bir
// a'nın içinde gezer; ana sayfada öbür a'ya kaçar, diğer sayfalarda a'nın içinde kalır; hesap
// formlarında şifre yazılırken gözünü kapatır. Hap biçimli eski maskot 404'te kapalı düğmedir; yavaş
// sayfa geçişinde ve çıkışta tam ekran örtü çıkar; odada bağlantıya bakar ama tuzakla güvenli
// bağlantıya aynı bakar. Görünüm birim testlerde (mascot.test.tsx), burada gerçek tarayıcıdaki
// davranış denetlenir: ruh hâli (data-mood), tepki sınıfı (mc-r-...), bakış yönü (--mc-x, --mc-y).

const wordmark = (page: Page) => page.locator("svg.mc-wordmark").filter({ visible: true }).first();
const gaze = (el: Locator) => el.evaluate((svg) => Number((svg as SVGElement).style.getPropertyValue("--mc-x") || "NaN"));
const classes = (el: Locator) => el.evaluate((svg) => svg.getAttribute("class") ?? "");
/** Gözün durduğu a: 0 üstteki (hack me), 1 alttaki (safely). */
const eyeLine = (el: Locator) => el.evaluate((svg) => Array.from(svg.querySelectorAll(".mc-a")).findIndex((a) => a.classList.contains("mc-a-on")));
const eyeMoved = (el: Locator) => el.evaluate((svg) => Array.from(svg.querySelectorAll(".mc-bang")).some((b) => b.hasAttribute("transform")));

test.describe("menüdeki canlı logo", () => {
  test("gözü fareyi izler", async ({ page, isMobile }) => {
    test.skip(isMobile, "fareyle izleme yalnızca fare olan cihazda");
    await page.goto("/");
    const logo = wordmark(page);
    await expect(logo).toBeVisible();
    // Göz logonun solunda (h ile c arasında): fare sayfanın soluna gidince sola, sağına gidince sağa
    // bakar. Sayfa canlanana kadar (hidrasyon) fare yeniden oynatılır.
    await expect(async () => {
      await page.mouse.move(5, 40);
      expect(await gaze(logo)).toBeLessThan(0);
    }).toPass();
    await page.mouse.move(1430, 450);
    await expect.poll(() => gaze(logo)).toBeGreaterThan(0.5);
  });

  test("Hareketi azalt açıksa göz fareyi izlemez, gezmez", async ({ page, isMobile }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.clock.install();
    await page.goto("/");
    const logo = wordmark(page);
    await expect(logo).toBeVisible();
    if (!isMobile) {
      await page.mouse.move(5, 450);
      await page.mouse.move(1430, 450);
    }
    await page.clock.runFor(30_000);
    expect(Number.isNaN(await gaze(logo))).toBe(true);
    expect(await eyeMoved(logo)).toBe(false);
    expect(await eyeLine(logo)).toBe(0);
  });

  test("ana sayfada göz 10 saniye sonra gezer, sonunda öbür a'ya kaçar", async ({ page }) => {
    await page.clock.install();
    await page.goto("/");
    const logo = wordmark(page);
    await expect(logo).toBeVisible();
    expect(await eyeLine(logo)).toBe(0);
    // Sayfa canlanmadan (hidrasyon) sayaç kurulmaz; saat, göz öbür a'ya geçene kadar ileri alınır.
    await expect
      .poll(async () => {
        await page.clock.runFor(5_000);
        return eyeLine(logo);
      })
      .toBe(1);
  });

  test("diğer sayfalarda göz a'nın içinde gezer ama kaçmaz", async ({ page }) => {
    await page.clock.install();
    await page.goto("/sss");
    const logo = wordmark(page);
    await expect(logo).toBeVisible();
    // Bekleme (10 sn) bitince göz kıpırdar.
    await expect
      .poll(async () => {
        await page.clock.runFor(2_000);
        return eyeMoved(logo);
      })
      .toBe(true);
    // Ana sayfadaki turdan uzun süre geçse de göz üstteki a'da kalır.
    await page.clock.runFor(60_000);
    expect(await eyeLine(logo)).toBe(0);
  });
});

test("giriş formunda şifre yazılırken logo gözünü kapatır; yazılanı hiçbir yere yazmaz", async ({ page }) => {
  await page.goto("/giris");
  const logo = wordmark(page);
  await expect(logo).toBeVisible();
  // Eski maskot formun üstünde artık yok.
  await expect(page.locator("main svg[data-mood]")).toHaveCount(0);

  const email = page.getByLabel("E-posta");
  const long = "cok-uzun-bir-eposta-adresi@ornek.invalid";
  await email.fill(long);
  await expect(page.locator("html")).not.toHaveAttribute("data-mascot-eyes", /.*/);

  const password = page.getByLabel("Şifre", { exact: true });
  // Sayfa canlanana kadar (hidrasyon) alana yeniden girilir.
  await expect(async () => {
    await email.click();
    await password.click();
    await expect(page.locator("html")).toHaveAttribute("data-mascot-eyes", "shut", { timeout: 1_000 });
  }).toPass();
  // Kapalı göz: kırpma animasyonu durur, göz çizgi olur.
  const eye = logo.locator(".mc-a-on .mc-eye");
  await expect.poll(() => eye.evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
  const secret = "GizliSifre!2026";
  await password.fill(secret);

  // Şifreden çıkınca göz açılır.
  await page.getByRole("heading", { level: 1 }).click();
  await expect(page.locator("html")).not.toHaveAttribute("data-mascot-eyes", /.*/);

  // Logo yazılana bakmaz: e-posta ve şifre html'de ya da logoda yok.
  for (const el of [page.locator("html"), logo]) {
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
    // Canlı sitede (Cloudflare önünde) gecikme her isteğe ulaşmıyor, sayfa 0,3 saniyeden önce açılıp
    // örtü haklı olarak çıkmıyor; test yalnızca kendi derlememize karşı koşar.
    test.skip(isLive, "zamanlamaya bağlı test canlı sitede çalışmaz");
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
    // Eski sahte kargo maili (gerçek ve sahte bağlantılı); yeni odada gerçek maillerin bağlantısı yok.
    await withTempRoom(oldKargo, async (slug) => {
      await page.goto(`/oda/${slug}/oyna`);
      await page.getByRole("button", { name: "Hazırım, başla" }).click();
      await signInDesktop(page);

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
});
