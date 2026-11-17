import { readFileSync } from "node:fs";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { isLive, signUpVerified, uniqueEmail } from "./support/account";
import { withDb } from "./support/db";

// Para Çarşısı temel eğitimi (oda dosyası, gerçek sunucu): video soruları, açılan bilgi kartları,
// kutulara ayırma, eşleştirme, boşluk doldurma, tıkla-bul ve mini testler öğrencinin gözünden
// baştan sona oynanır. Cevaplar sunucuda denetlenir; doğrular test için oda dosyasından okunur,
// oynatıcı onları bilmez. Bitince eğitimin açtığı senaryo odası açılır.

const room = JSON.parse(readFileSync("labs/rooms/para-carsisi/kisisel-veri-ve-para-guvenligi.json", "utf8"));
const training = room.content;
const slug: string = room.slug;
const scenario = JSON.parse(readFileSync("labs/rooms/para-carsisi/kulaklik-icin-veli-karti.json", "utf8"));
const draftScenario = JSON.parse(readFileSync("labs/rooms/para-carsisi/eski-telefonunu-sat.json", "utf8"));

type Card = { id: string; type: string; [key: string]: unknown };
const cards: Card[] = training.cards;

const playerOf = (page: Page) => page.getByTestId("training-player");
const shown = (scope: Locator, text: string | RegExp) => scope.getByText(text).filter({ visible: true }).first();

/** Sürükle bırak kartlarında ilk girişte "Nasıl oynanır" penceresi açılır; kapatılır. */
async function closeHelp(page: Page) {
  await page.getByRole("button", { name: /Anladım, başla/ }).click();
  await expect(page.getByRole("button", { name: /Anladım, başla/ })).toHaveCount(0);
}

/**
 * Video sorusu: tarayıcı videoyu açamazsa soru videonun altında sorulur; açarsa video soru
 * saniyesine atlatılır, durur ve soru videonun üstünde sorulur.
 */
async function answerVideo(page: Page, at: number, option: string) {
  const player = playerOf(page);
  await page.waitForFunction(() => {
    const video = document.querySelector<HTMLVideoElement>('[data-testid="training-player"] video');
    return !video || video.readyState >= 1 || video.error !== null;
  });
  const video = player.locator("video");
  const button = player.getByRole("button", { name: option, exact: true });
  // Atlama sayfa React'e bağlanmadan olursa "timeupdate" kaçar ve soru açılmaz: soru görünene kadar
  // yeniden atlatılır (yük altındaki CI'da telefonda görüldü).
  await expect(async () => {
    if (await video.count()) await video.evaluate((v: HTMLVideoElement, second) => void (v.currentTime = second), at);
    await expect(button).toBeVisible({ timeout: 1500 });
  }).toPass({ timeout: 20_000 });
  await button.click();
}

/** Kutulara ayırma: önce bilgiye, sonra kutuya dokunarak. `bins` her bilginin konacağı kutu. */
async function sortInto(page: Page, card: Card, bins: number[]) {
  const player = playerOf(page);
  const items = card.items as { text: string }[];
  const labels = (card.bins as { label: string }[]).map((b) => b.label);
  for (const [i, item] of items.entries()) {
    await player.getByRole("group", { name: "Yerleştirilecek bilgiler" }).getByRole("button", { name: `${item.text}. Kutusuna koymak için seç ya da sürükle.` }).click();
    await player.getByRole("button", { name: `Seçili bilgiyi şuraya koy: ${labels[bins[i]]}` }).click();
  }
}

/** Seçenek kutusundan sıradaki boş yere kelimeyi koyar (eşleştirme ve boşluk doldurma). */
async function choose(page: Page, text: string) {
  await playerOf(page).getByRole("group", { name: "Seçenekler" }).getByRole("button", { name: text, exact: true }).click();
}

const next = (page: Page) => playerOf(page).getByRole("button", { name: /^(Devam|Bitir)$/ });

test.describe("Para Çarşısı eğitimi", () => {
  test.skip(isLive, "hesap açan testler canlı sitede çalışmaz");

  test("öğrenci bütün kart türlerini oynar; sunucu cevapları denetler, eğitim bitince senaryo odası açılır", async ({ page }) => {
    test.slow();
    const email = uniqueEmail("para-egitim");
    await signUpVerified(page, email);

    // Eğitim bitmeden senaryo odası açılmaz: oynatıcı odanın kapağına gönderir.
    await page.goto(`/oda/${scenario.slug}/oyna`);
    await page.waitForURL(new RegExp(`/oda/${scenario.slug}$`));

    await page.goto(`/oda/${slug}/oyna`);
    const player = playerOf(page);
    await expect(player).toBeVisible();

    for (const card of cards) {
      // Her kart ekrana gelince başlığı ya da sorusu görünür.
      const heading = (card.title ?? card.question) as string | undefined;
      if (card.type !== "video" && heading) await expect(shown(player, heading)).toBeVisible();

      if (card.type === "video") {
        const q = card.question as { at: number; options: string[]; answer: number };
        // Soru cevaplanmadan geçilmez.
        await expect(next(page)).toBeDisabled();
        await answerVideo(page, q.at, q.options[q.answer]);
        await expect(shown(player, "Doğru!")).toBeVisible();
      }

      if (card.type === "info") {
        const list = { explore: "Profil alanları", bankCard: "Kartın bölümleri", steps: "Adımlar" }[card.layout as string];
        if (list) {
          // Açılan bilgi kartında bütün maddeler açılmadan Devam yok.
          await expect(next(page)).toBeDisabled();
          const items = player.getByRole("list", { name: list }).getByRole("button");
          for (let i = 0; i < (card.points as unknown[]).length; i++) await items.nth(i).click();
        }
      }

      if (card.type === "sort") {
        await closeHelp(page);
        const items = card.items as { text: string; bin: number }[];
        // Hoşgörülü kart: "Okulunun adı" daha sıkı kutuya (kırmızı) konursa doğru sayılır (sarı not);
        // "Fotoğrafın" daha açık kutuya (yeşil) konursa yanlıştır. Gerisi doğru kutusuna.
        const bins = items.map((item) => (item.text === "Okulunun adı" ? 2 : item.text === "Fotoğrafın" ? 0 : item.bin));
        const check = player.getByRole("button", { name: "Kontrol et" });
        await expect(check).toBeDisabled();
        await sortInto(page, card, bins);
        await expect(next(page)).toBeDisabled();
        await check.click();
        await expect(shown(player, `${items.length - 1}/${items.length} doğru.`)).toBeVisible();
        await expect(shown(player, /Bazı bilgileri daha sıkı bir kutuya koydun/)).toBeVisible();
        await expect(player.getByRole("button", { name: "Fotoğrafın, Yeşil kutu içinde: yanlış" })).toBeVisible();
        await expect(player.getByRole("button", { name: "Okulunun adı, Kırmızı kutu içinde: doğru" })).toBeVisible();
        await expect(shown(player, "Doğrusu: Sarı kutu")).toBeVisible();
      }

      if (card.type === "match") {
        await closeHelp(page);
        // Sol sütun yazarın sırasıyla gelir; her satıra uyan seçenek sırayla seçilir.
        for (const pair of card.pairs as { right: string }[]) await choose(page, pair.right);
        await player.getByRole("button", { name: "Kontrol et" }).click();
        await expect(shown(player, "Hepsi doğru!")).toBeVisible();
      }

      if (card.type === "fill") {
        await closeHelp(page);
        const sentences = card.sentences as string[];
        for (const sentence of sentences) {
          for (const [, word] of sentence.matchAll(/\[([^\]]+)\]/g)) await choose(page, word);
          // Cümle dolunca öğrenci kendisi geçer; sondaki özette kontrol edilir.
          await player.getByRole("button", { name: /^(Sonraki cümle|Özete geç)/ }).click();
        }
        await player.getByRole("button", { name: "Kontrol et" }).click();
        await expect(shown(player, "Hepsi doğru!")).toBeVisible();
      }

      if (card.type === "clickFind") {
        await player.locator('[data-part="subject"]').click();
        await expect(shown(player, "Burası normal görünüyor. Başka bir yere bak.")).toBeVisible();
        for (const spot of card.spots as { part: string }[]) await player.locator(`[data-part="${spot.part}"]`).click();
        await expect(shown(player, "Hepsini buldun!")).toBeVisible();
      }

      if (card.type === "quiz") {
        await expect(next(page)).toBeDisabled();
        // İlk şıklardan yanlış olanı seçilir: sunucu doğrusunu harfiyle söyler, cevap değişmez.
        const wrong = card.answer === 0 ? 1 : 0;
        await player.getByRole("group", { name: "Cevaplar" }).getByRole("button").nth(wrong).click();
        await expect(shown(player, `Tam değil. Doğrusu ${"ABCD"[card.answer as number]}.`)).toBeVisible();
      }

      await next(page).click();
    }

    await expect(page.getByRole("heading", { name: "Eğitim odası bitti!" })).toBeVisible();
    // Özet sunucunun sonuçlarından: kutularda bir yanlış, iki testte iki yanlış.
    const sortCard = cards.find((c) => c.type === "sort")!;
    const sortTotal = (sortCard.items as unknown[]).length;
    const summary = (label: string) => page.getByRole("listitem").filter({ hasText: label });
    await expect(summary("Video sorusu")).toContainText("2/2");
    await expect(summary("Kutulara ayırma")).toContainText(`${sortTotal - 1}/${sortTotal}`);
    await expect(summary("Eşleştirme")).toContainText("4/4");
    await expect(summary("Boşluk doldurma")).toContainText("4/4");
    await expect(summary("Tıkla-bul")).toContainText("4/4");
    await expect(summary("Mini test")).toContainText("0/2");
    // Yayındaki senaryo açıldı; taslaktaki "Eski telefonunu sat" listede yok.
    await expect(page.getByRole("listitem").filter({ hasText: scenario.content.meta.title })).toContainText("Açıldı");
    await expect(page.getByRole("listitem").filter({ hasText: draftScenario.content.meta.title })).toHaveCount(0);

    // Sunucu: eğitim bitti, soru sorulan bütün kartlar cevaplandı olarak kayıtlı.
    const progress = await withDb((client) =>
      client.query<{ completedAt: Date | null; answeredCards: string[] }>(
        `SELECT p."completedAt", p."answeredCards" FROM "TrainingProgress" p JOIN "User" u ON u.id = p."userId" JOIN "Lab" l ON l.id = p."labId"
         WHERE u.email = $1 AND l.slug = $2`,
        [email, slug],
      ),
    );
    const row = progress?.rows[0];
    expect(row?.completedAt).not.toBeNull();
    const asked = cards.filter((c) => ["video", "quiz", "sort", "match", "fill"].includes(c.type)).map((c) => c.id);
    expect(row?.answeredCards).toEqual(expect.arrayContaining(asked));

    await page.getByRole("link", { name: /İlk senaryo odasına geç/ }).click();
    await expect(page).toHaveURL(new RegExp(`/oda/${scenario.slug}$`));
    await page.goto(`/oda/${scenario.slug}/oyna`);
    await expect(page.getByRole("button", { name: "Hazırım, başla" })).toBeVisible();
  });

  test("yarıda bırakılan eğitim kaldığı karttan açılır; kart yeniden oynanır, pencere bir daha açılmaz", async ({ page }) => {
    const email = uniqueEmail("para-yarim");
    await signUpVerified(page, email);
    await page.goto(`/oda/${slug}/oyna`);
    const player = playerOf(page);

    // Video ve keşfet kartını geçip kutulara ayırmayı doğru yapar.
    const [video, explore, sort] = cards;
    const q = video.question as { at: number; options: string[]; answer: number };
    await answerVideo(page, q.at, q.options[q.answer]);
    await next(page).click();
    const items = player.getByRole("list", { name: "Profil alanları" }).getByRole("button");
    for (let i = 0; i < (explore.points as unknown[]).length; i++) await items.nth(i).click();
    await next(page).click();
    await closeHelp(page);
    const right = (sort.items as { bin: number }[]).map((item) => item.bin);
    await sortInto(page, sort, right);
    await player.getByRole("button", { name: "Kontrol et" }).click();
    await expect(shown(player, "Hepsi doğru!")).toBeVisible();

    // Sayfa yenilenince eğitim aynı karttan açılır (ilerleme 3/12, bitiş ekranı da sayılır). Sonuçlar tarayıcıda tutulmaz: kart
    // boş gelir, öğrenci yeniden yerleştirip kontrol eder; "Nasıl oynanır" bir daha açılmaz.
    await page.reload();
    await expect(shown(player, sort.title as string)).toBeVisible();
    await expect(shown(player, `3/${cards.length + 1}`)).toBeVisible();
    await expect(page.getByRole("button", { name: /Anladım, başla/ })).toHaveCount(0);
    await expect(next(page)).toBeDisabled();
    await sortInto(page, sort, right);
    await player.getByRole("button", { name: "Kontrol et" }).click();
    await expect(shown(player, "Hepsi doğru!")).toBeVisible();
    await expect(next(page)).toBeEnabled();
  });
});
