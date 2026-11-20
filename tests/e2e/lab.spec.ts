import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { isLive, signOutHere, signUp, signUpVerified, uniqueEmail } from "./support/account";
import { answerTrainingCard, attemptsOf, closeLevelUp, continueFromScene, finishTraining, openFakeKargo, passVoiceNote, reportStep, signInDesktop, submitSavedPassword } from "./support/lab";

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Faz 3 bitti ölçütünün öğrenci tarafı: eğitim labı, sahte kargo maili (hacklenme ve güvende
// kalma yolları), sunucuda hesaplanan puan ve rapor. Doğru cevaplar örnek labdan okunur
// (labs/examples); oynatıcı onları hiç bilmez.

const training = JSON.parse(readFileSync("labs/rooms/oltalama-limani/oltalama-egitimi.json", "utf8")).content;
const kargo = JSON.parse(readFileSync("labs/rooms/oltalama-limani/sahte-kargo-maili.json", "utf8")).content;

const playPath = "/oda/sahte-kargo-maili/oyna";
const toast = (page: Page, text: string | RegExp) => page.getByRole("status").filter({ hasText: text, visible: true });

test("giriş yapmamış ziyaretçi labdan girişe gönderilir", async ({ page }) => {
  await page.goto(playPath);
  await expect(page).toHaveURL(/\/giris\?sonra=%2Foda%2Fsahte-kargo-maili%2Foyna$/);
});

test.describe("lab", () => {
  test.skip(isLive, "hesap açan testler canlı sitede çalışmaz");


  test("e-postasını doğrulamamış öğrenci senaryo labından doğrulamaya gönderilir", async ({ page }) => {
    await signUp(page, uniqueEmail("lab-dogrula"));
    await page.goto(playPath);
    await expect(page).toHaveURL(/\/dogrula\?sonra=%2Foda%2Fsahte-kargo-maili%2Foyna$/);
  });

  test("eğitim labı bitmeden senaryo labı açılmaz; eğitim kart kart biter", async ({ page }) => {
    await signUpVerified(page, uniqueEmail("egitim"));
    await page.goto(playPath);
    // Yönlendirme sayfa akarken gelir (Suspense içinde); gezinmenin bitmesi beklenir.
    await page.waitForURL(/\/oda\/sahte-kargo-maili$/);

    await page.goto("/oda/oltalama-egitimi/oyna");
    const player = page.getByTestId("training-player");
    await expect(player).toBeVisible();
    for (const card of training.cards) {
      if (card.type === "clickFind") {
        // Şüpheli olmayan yer "normal" der; şüpheli yerler numarayla işaretlenir.
        await player.locator('[data-part="subject"]').click();
        await expect(player.getByText("Burası normal görünüyor.")).toBeVisible();
        for (const spot of card.spots) await player.locator(`[data-part="${spot.part}"]`).click();
        await expect(player.getByText("Hepsini buldun!")).toBeVisible();
      } else if (card.type === "quiz") {
        const next = player.getByRole("button", { name: /^(Devam|Bitir)$/ });
        // Cevap vermeden geçilmez.
        await expect(next).toBeDisabled();
        await player.getByRole("group", { name: "Cevaplar" }).getByRole("button").nth(card.answer).click();
        await expect(player.getByText("Doğru!")).toBeVisible();
      } else await answerTrainingCard(page, card);
      await player.getByRole("button", { name: /^(Devam|Bitir)$/ }).click();
    }
    await expect(page.getByRole("heading", { name: "Eğitim odası bitti!" })).toBeVisible();
    // Eğitimi bitirmek "Kart kurdu" rozetini kazandırır; oynatıcı sağ üstte bildirir.
    const badge = page.getByTestId("badge-toast");
    await expect(badge).toContainText("Kart kurdu");
    await expect(badge.getByRole("link", { name: /Rozetlerimi gör/ })).toHaveAttribute("href", "/profil?bolum=rozetler");
    await page.getByRole("link", { name: /İlk senaryo odasına geç/ }).click();
    await expect(page).toHaveURL(/\/oda\/sahte-kargo-maili$/);
    await page.goto(playPath);
    await expect(page.getByRole("button", { name: "Hazırım, başla" })).toBeVisible();
  });

  test("sahte sayfaya şifre yazan hacklenir; yazdığı kaydedilmez, rapor yalnızca ona açılır", async ({ page, context, isMobile }) => {
    // Sesli mesaj dinlenir, iki hesap açılır: uzun bir akış.
    test.slow();
    const email = uniqueEmail("hacklen");
    await signUpVerified(page, email);
    await finishTraining(email);

    await page.goto(playPath);
    // Oynatıcıda sitenin üst menüsü yok, öğrenci odanın içindedir; çıkış oynatıcının şeridinde.
    await expect(page.getByRole("button", { name: "Hazırım, başla" })).toBeVisible();
    await expect(page.getByRole("banner")).toHaveCount(0);
    await page.getByRole("button", { name: "Hazırım, başla" }).click();
    await signInDesktop(page);
    await openFakeKargo(page);
    await page.getByRole("button", { name: "Adresi güncelle" }).click();
    // Şifre yazılmaz: tarayıcının kayıtlı şifre önerisinde "Doldur" (kutu salt okunur).
    await expect(page.getByLabel(/Postam şifresi/)).toHaveAttribute("readonly", "");
    await submitSavedPassword(page);

    await expect(page.getByTestId("hacked-alarm")).toBeVisible();
    // "Hangi hesap?" boş: Postam hesabı, bildirimler mail der.
    await expect(page.getByTestId("hacked-alarm").getByText("Postam hesabın ele geçirildi.")).toBeVisible();
    await page.getByRole("button", { name: "Geç", exact: true }).click();
    // Alarmdan sonra Ayça'nın sesli mesajı (arkadaşlarına da gitmiş), sonra hesap sahnesi;
    // "Adım adım ne oldu" ekranı yok (19 ve 22. revize).
    await passVoiceNote(page, "Devam");
    await continueFromScene(page, "account");
    // İlk senaryo odası seviye atlatır: rapor önce kutlamayla açılır (29+).
    await closeLevelUp(page, 2);
    const report = page.getByTestId("lab-report");
    await expect(report.getByRole("img", { name: "30/100 puan" })).toBeVisible();
    await expect(report.getByText("Hacklendin", { exact: true })).toBeVisible();
    // Rapor adım adım: önce "Odada ne oldu", işaretler ikinci adımda.
    await expect(report.getByRole("heading", { name: "Odada ne oldu" })).toBeVisible();
    await expect(report.getByRole("heading", { name: "Kaçırdığın işaretler" })).toHaveCount(0);
    // Raporda masaüstünde üst menü geri gelir.
    if (!isMobile) await expect(page.getByRole("navigation", { name: "Ana menü" })).toBeVisible();
    // Cevaplanmayan iki soru "yanlış" sayılmaz, ayrı yazılır (yapılmayan görev yanlış).
    await expect(report.getByText(/3 doğru · 0 kısmen · 2 yanlış · 2 cevaplanmadı/).filter({ visible: true })).toBeVisible();
    await reportStep(page, "signs");
    await expect(report.getByRole("heading", { name: "Kaçırdığın işaretler" })).toBeVisible();
    await reportStep(page, "tips");
    await expect(report.getByRole("heading", { name: "Bir dahaki sefere" })).toBeVisible();
    await expect(report.getByRole("link", { name: "Tekrar dene" }).filter({ visible: true })).toBeVisible();
    // İlk biten senaryo odası "İlk rapor" rozetini kazandırır; rapor bildirir.
    await expect(page.getByTestId("badge-toast")).toContainText("İlk rapor");
    const reportUrl = page.url();

    // Sunucu: deneme hacklendi olarak kapandı, puanı 3; kutudaki noktalar hiçbir olayda yok.
    const [attempt] = await attemptsOf(email, "sahte-kargo-maili");
    expect(attempt).toMatchObject({ status: "HACKED", reportScore: 30 });
    expect(attempt.events).toContain("info_entered");
    expect(attempt.events).not.toContain("•");

    // Biten deneme kapanmıştır: oyna sayfası yeni bir deneme için başlangıç penceresini açar.
    await page.goto(playPath);
    await expect(page.getByRole("button", { name: "Hazırım, başla" })).toBeVisible();

    // Başka bir öğrenci aynı rapor adresini açarsa "bulunamadı" görür.
    await signOutHere(context);
    await signUpVerified(page, uniqueEmail("baskasi"));
    await page.goto(reportUrl);
    await expect(page.getByTestId("lab-report")).toHaveCount(0);
    await expect(page.getByText("404", { exact: true })).toBeVisible();
  });

  test("sahte maili bildirip görevleri bitiren 100/100 alır; yarım kalan lab kaldığı yerden açılır", async ({ page, isMobile }) => {
    // Sesli mesaj, takip ve saat geçişiyle uzun bir akış.
    test.slow();
    const email = uniqueEmail("guvende");
    await signUpVerified(page, email);
    await finishTraining(email);

    await page.goto(playPath);
    await page.getByRole("button", { name: "Hazırım, başla" }).click();
    await signInDesktop(page);

    const app = page.getByTestId("scenario-player");
    const back = page.getByRole("button", { name: "Listeye dön" });
    // Ayça'nın sesli mesajı masadaki telefona düşer: telefon alınır, mesaj dinlenir, görev kabul edilir.
    await expect(page.getByTestId("stage-phone-pick")).toContainText(kargo.mission.caller);
    await page.getByTestId("stage-phone-pick").click();
    const voice = page.getByTestId("voicemail");
    await voice.getByTestId("voice-play").click();
    await expect(voice.getByTestId("voice-transcript")).toContainText(kargo.mission.lines[0].slice(0, 12));
    await voice.getByTestId("voicemail-card").getByRole("button", { name: kargo.mission.accept }).click();
    await expect(voice.getByText(kargo.mission.voicemail.reply)).toBeVisible();
    await page.locator('[data-testid="stage-phone-drop"]:visible').click();

    for (const item of kargo.items) {
      await app.getByRole("button", { name: new RegExp(`^${item.sender}.*${escapeRegExp(item.subject)}`) }).click();
      await expect(app.getByRole("heading", { name: item.subject })).toBeVisible();
      if (isMobile) await back.click();
    }

    // Çıkış penceresi kararları kaydeder; dönünce lab kaldığı yerden açılır.
    await page.getByRole("button", { name: isMobile ? "Odadan çık" : "Çık", exact: true }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Çık", exact: true }).click();
    await expect(page).toHaveURL(/\/oda\/sahte-kargo-maili$/);
    await page.goto(playPath);
    await expect(app).toBeVisible();
    await expect(page.getByRole("button", { name: "Hazırım, başla" })).toHaveCount(0);

    // Yolda Kargo uygulaması (görev çubuğunda): sahte mailin numarası bulunamaz, gerçek gönderi bulunur.
    // Hangi numaranın gerçek olduğunu sunucu söyler; sorgu "parcel_tracked" olarak kaydedilir.
    const taskbar = page.getByRole("group", { name: "Açık uygulamalar" });
    await taskbar.getByRole("button", { name: kargo.mission.track.app }).click();
    const tracker = page.getByTestId("parcel-tracker");
    const fakeItem = kargo.items.find((i: { kind: string; tracking?: string }) => i.kind === "fake" && i.tracking);
    await tracker.getByTestId("parcel-number").filter({ hasText: fakeItem.tracking }).click();
    await tracker.getByTestId("parcel-query").click();
    await expect(tracker.getByTestId("parcel-missing")).toContainText(kargo.mission.track.missing.title);
    await tracker.getByTestId("parcel-number").filter({ hasText: kargo.mission.track.number }).click();
    await tracker.getByTestId("parcel-query").click();
    await expect(tracker.getByTestId("parcel-found")).toContainText(kargo.mission.track.found.title);
    await taskbar.getByRole("button", { name: "postam" }).click();

    await openFakeKargo(app);
    await app.getByRole("button", { name: isMobile ? "Bildir" : "Oltalama olarak bildir", exact: true }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Bildir", exact: true }).click();
    await expect(toast(page, "Mail bildirildi")).toBeVisible();

    // Görevler: telefonda alttan açılan pencerede, masaüstünde sağda.
    if (isMobile) await page.getByRole("button", { name: /Görevleri aç/ }).click();
    const tasks = isMobile ? page.getByRole("dialog", { name: "Görevler" }) : page.getByRole("complementary", { name: "Görevler" });
    await tasks.getByRole("button", { name: "İncelemeyi bitirdim" }).click();
    for (const task of kargo.tasks.filter((t: { type: string }) => t.type === "question")) {
      const best = task.options.reduce((a: { points: number }, b: { points: number }) => (b.points > a.points ? b : a));
      await tasks.getByRole("radiogroup", { name: task.text }).getByRole("radio", { name: new RegExp(best.text.slice(0, 20)) }).click();
      await tasks.getByRole("button", { name: "Cevabı gönder" }).click();
    }
    await tasks.getByRole("button", { name: "Odayı bitir, raporu gör" }).click();
    // Saat ilerler, Ayça'nın teşekkür sesli mesajı telefona düşer; "Raporu gör" ile rapor açılır.
    await expect(page.getByTestId("voicemail-later")).toContainText(kargo.mission.voicemail.later.title);
    await passVoiceNote(page, "Raporu gör");

    await closeLevelUp(page, 2);
    const report = page.getByTestId("lab-report");
    await expect(report.getByRole("img", { name: "100/100 puan" })).toBeVisible();
    await expect(report.getByText("Güvende kaldın", { exact: true })).toBeVisible();
    await reportStep(page, "signs");
    await expect(report.getByRole("heading", { name: "Yakaladığın sahte maildeki işaretler" })).toBeVisible();
    const [attempt] = await attemptsOf(email, "sahte-kargo-maili");
    expect(attempt).toMatchObject({ status: "COMPLETED", reportScore: 100 });
    expect(attempt.events).toContain("parcel_tracked");
  });
});
