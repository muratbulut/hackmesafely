import { expect, test, type Page } from "@playwright/test";
import { isLive, signUpVerified, uniqueEmail } from "./support/account";
import { callAction } from "./support/actions";
import { withDb } from "./support/db";
import { attemptsOf, finishTraining, signInDesktop } from "./support/lab";

// "Baştan başla" (19 Kasım, Murat): senaryo odasında yarım deneme silinmez, ABANDONED olur ve yeni
// deneme ilk sahneden başlar; eğitim odasında ilk karta dönülür. Bitmiş eğitim bitmiş kalır.

test.skip(isLive, "hesap açan testler canlı sitede çalışmaz");

const playPath = "/oda/sahte-kargo-maili/oyna";
const trainingPath = "/oda/oltalama-egitimi/oyna";

async function trainingRow(email: string) {
  const result = await withDb((client) =>
    client.query<{ cardIndex: number; answeredCards: string[]; completedAt: Date | null }>(
      `SELECT p."cardIndex", p."answeredCards", p."completedAt" FROM "TrainingProgress" p JOIN "User" u ON u.id = p."userId" JOIN "Lab" l ON l.id = p."labId"
       WHERE u.email = $1 AND l.slug = 'oltalama-egitimi'`,
      [email],
    ),
  );
  return result?.rows[0] ?? null;
}

/** Odaya girer, bir mail açar (yarım deneme bir olay yazmış olsun). */
async function startAndOpenMail(page: Page) {
  await page.goto(playPath);
  await page.getByRole("button", { name: "Hazırım, başla" }).click();
  await signInDesktop(page);
  await page.getByTestId("scenario-player").getByRole("button", { name: /^Kargo Takip/ }).click();
}

const dialog = (page: Page) => page.getByTestId("restart-dialog");

test("senaryo kapağında Baştan başla: yarım deneme yarım kalır, oda ilk sahneden açılır", async ({ page }) => {
  const email = uniqueEmail("bastan-kapak");
  await signUpVerified(page, email);
  await finishTraining(email);

  // Yarım deneme yokken kapakta Baştan başla yok.
  await page.goto("/oda/sahte-kargo-maili");
  await expect(page.getByTestId("restart-room")).toHaveCount(0);

  await startAndOpenMail(page);
  await expect.poll(async () => (await attemptsOf(email, "sahte-kargo-maili"))[0]?.events ?? "[]").not.toBe("[]");

  await page.goto("/oda/sahte-kargo-maili");
  await page.getByTestId("restart-room").filter({ visible: true }).click();
  await expect(dialog(page).getByRole("heading", { name: "Odayı baştan başlatmak istiyor musun?" })).toBeVisible();
  // Vazgeç hiçbir şeyi değiştirmez.
  await dialog(page).getByRole("button", { name: "Vazgeç" }).click();
  await expect(dialog(page)).toHaveCount(0);
  expect((await attemptsOf(email, "sahte-kargo-maili")).map((a) => a.status)).toEqual(["IN_PROGRESS"]);

  await page.getByTestId("restart-room").filter({ visible: true }).click();
  await dialog(page).getByRole("button", { name: "Baştan başla" }).click();
  await expect(page).toHaveURL(playPath);
  await expect(page.getByRole("button", { name: "Hazırım, başla" })).toBeVisible();
  // Eski deneme silinmedi, olaylarıyla duruyor; yeni deneme "Hazırım, başla" ile açılır.
  const before = await attemptsOf(email, "sahte-kargo-maili");
  expect(before.map((a) => a.status)).toEqual(["ABANDONED"]);
  expect(before[0].events).not.toBe("[]");

  await page.getByRole("button", { name: "Hazırım, başla" }).click();
  await expect(page.getByTestId("stage-lock")).toBeVisible();
  await expect.poll(async () => (await attemptsOf(email, "sahte-kargo-maili")).map((a) => a.status)).toEqual(["ABANDONED", "IN_PROGRESS"]);
  // Yarım bırakılan deneme odayı bitmiş saymaz: kapakta "Odaya gir" değil, yeni yarım deneme var.
  await page.goto("/oda/sahte-kargo-maili");
  await expect(page.locator(`a[data-action="continue"]`).filter({ visible: true })).toBeVisible();
});

test("oda içinde Baştan başla: Çık penceresinden (ve masaüstünde şeritten) aynı onay", async ({ page, isMobile }) => {
  const email = uniqueEmail("bastan-oda");
  await signUpVerified(page, email);
  await finishTraining(email);
  await startAndOpenMail(page);

  if (!isMobile) {
    await page.getByTestId("bar-restart").click();
    await expect(dialog(page)).toBeVisible();
    await dialog(page).getByRole("button", { name: "Vazgeç" }).click();
    await page.getByRole("button", { name: "Çık", exact: true }).first().click();
  } else {
    await page.getByRole("button", { name: "Odadan çık", exact: true }).click();
  }
  const exit = page.getByRole("alertdialog", { name: "Odadan çıkmak istiyor musun?" });
  await exit.getByTestId("exit-restart").click();
  await expect(exit).toHaveCount(0);
  await dialog(page).getByRole("button", { name: "Baştan başla" }).click();
  await expect(page.getByRole("button", { name: "Hazırım, başla" })).toBeVisible();
  expect((await attemptsOf(email, "sahte-kargo-maili")).map((a) => a.status)).toEqual(["ABANDONED"]);
});

test("eğitimde Baştan başla: bitmemiş eğitimde ilk karta ve cevaplar sıfırlanır, bitmiş eğitim bitmiş kalır", async ({ page, isMobile }) => {
  const email = uniqueEmail("bastan-egitim");
  await signUpVerified(page, email);
  const player = page.getByTestId("training-player");

  await page.goto(trainingPath);
  await player.getByRole("button", { name: "Devam", exact: true }).click();
  await expect.poll(async () => (await trainingRow(email))?.cardIndex ?? 0).toBeGreaterThan(0);

  const restart = isMobile ? player.getByRole("button", { name: "Baştan başla" }) : player.getByTestId("training-restart");
  await restart.click();
  await dialog(page).getByRole("button", { name: "Baştan başla" }).click();
  await expect(player.getByRole("button", { name: "Geri" })).toBeDisabled();
  expect(await trainingRow(email)).toMatchObject({ cardIndex: 0, answeredCards: [], completedAt: null });

  // Bitmiş eğitim: satıra dokunulmaz ("okunan kart" düşmez), eğitim bitmiş sayılır.
  await finishTraining(email);
  await withDb((client) =>
    client.query(
      `UPDATE "TrainingProgress" p SET "cardIndex" = 7 FROM "User" u, "Lab" l WHERE u.id = p."userId" AND l.id = p."labId" AND u.email = $1 AND l.slug = 'oltalama-egitimi'`,
      [email],
    ),
  );
  await page.goto(trainingPath);
  await restart.click();
  await dialog(page).getByRole("button", { name: "Baştan başla" }).click();
  await expect(player.getByRole("button", { name: "Geri" })).toBeDisabled();
  const row = await trainingRow(email);
  expect(row?.completedAt).not.toBeNull();
  expect(row?.cardIndex).toBe(7);
});

test("restartAttempt yalnızca öğrencinin kendi yarım denemesine dokunur", async ({ page, browser }) => {
  const owner = uniqueEmail("bastan-sahip");
  await signUpVerified(page, owner);
  await finishTraining(owner);
  await startAndOpenMail(page);

  const other = await browser.newPage();
  const otherEmail = uniqueEmail("bastan-baska");
  await signUpVerified(other, otherEmail);
  await finishTraining(otherEmail);
  expect(await callAction(other.request, "restartAttempt", ["sahte-kargo-maili"])).toEqual({ ok: true });
  expect(await callAction(other.request, "restartAttempt", ["oltalama-egitimi"])).toEqual({ ok: false, reason: "not_found" });
  expect((await attemptsOf(owner, "sahte-kargo-maili")).map((a) => a.status)).toEqual(["IN_PROGRESS"]);
  await other.close();
});
