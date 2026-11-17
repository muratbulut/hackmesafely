import { expect, test, type Page } from "@playwright/test";
import { isLive, signOutHere, signUpVerified, uniqueEmail } from "./support/account";
import { deleteTestLabs, deleteTestNeighborhood, insertNeighborhoodLab, insertTestLab, insertTestNeighborhood, makeAdmin } from "./support/admin";
import { withDb } from "./support/db";
import { attemptsOf, finishTraining } from "./support/lab";

// Next önceki sayfaları gizli olarak bellekte tutar; bildirimler yalnızca görünenler arasından aranır.
const toast = (page: Page, text: string | RegExp) => page.getByRole("status").filter({ hasText: text, visible: true });

/** Bu testin odasının adı ve adresi ("e2e-" ile başlar, sonda temizlenir). */
function testLab(tag: string, project: string) {
  const stamp = `${Date.now().toString(36)}${process.pid.toString(36)}`;
  const name = `E2E ${tag} ${stamp} ${project}`;
  return { name, slug: name.toLowerCase().replaceAll(" ", "-") };
}

/** Kayıt olur, e-postayı doğrular ve hesabı yönetici yapar. */
async function signUpAdmin(page: Page) {
  const email = uniqueEmail("admin");
  await signUpVerified(page, email);
  await makeAdmin(email);
  return email;
}

const sortOf = async (id: string) =>
  (await withDb((client) => client.query<{ sortOrder: number }>(`SELECT "sortOrder" FROM "Lab" WHERE "id" = $1`, [id])))!.rows[0].sortOrder;

test("giriş yapmamış ziyaretçi yönetim yerine girişe gönderilir", async ({ page }) => {
  await page.goto("/yonetim/odalar");
  await expect(page).toHaveURL(/\/giris\?sonra=%2Fyonetim%2Fodalar$/);
});

test.describe("yönetim paneli", () => {
  test.skip(isLive, "hesap açan testler canlı sitede çalışmaz");

  test("yönetici olmayan kullanıcı paneli görmez: sayfa yok der", async ({ page }) => {
    await signUpVerified(page, uniqueEmail("ogrenci"));
    for (const path of ["/yonetim", "/yonetim/odalar", "/yonetim/odalar/olmayan-lab"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bu sayfa yok");
      await expect(page.getByRole("navigation", { name: "Yönetim menüsü" })).toHaveCount(0);
    }
    await expect(page).toHaveTitle(/Sayfa bulunamadı/);
  });

  // 39 (17 Kasım, Murat): oda panelde yazılmaz; depodan taslak gelir, listede yayınlanır, öğrenci görür.
  test("yönetici depodan gelen taslak odayı listede yayınlar; odanın sayfası salt okunur; öğrenci odayı açar", async ({ page, context }, testInfo) => {
    test.slow();
    const lab = testLab("Kargo", testInfo.project.name);
    try {
      await insertTestLab({ slug: lab.slug, name: lab.name });
      const adminEmail = await signUpAdmin(page);
      await page.goto("/yonetim/odalar");
      await expect(page.getByRole("link", { name: "Yeni oda" })).toHaveCount(0);
      const harbor = page.getByRole("region", { name: "Oltalama Limanı" });
      await expect(harbor.getByRole("link", { name: `${lab.name} odasının sayfası` })).toBeVisible();

      await harbor.getByRole("button", { name: `Yayınla: ${lab.name}` }).click();
      const dialog = page.getByRole("dialog", { name: `${lab.name} odasını yayınla` });
      await dialog.getByRole("button", { name: "Yayınla", exact: true }).click();
      await expect(toast(page, `${lab.name} yayında`)).toBeVisible();
      await expect(harbor.getByRole("button", { name: `Gizle: ${lab.name}` })).toBeVisible();

      // Odanın sayfası: sayılar ve düğmeler var, form yok.
      await harbor.getByRole("link", { name: `${lab.name} odasının sayfası` }).click();
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(lab.name);
      await expect(page.getByText("Yayında · v1")).toBeVisible();
      await expect(page.getByRole("region", { name: "Odanın sayıları" })).toContainText("bitirdi");
      await expect(page.getByText("Depoda dosyası yok")).toBeVisible();
      await expect(page.getByRole("textbox")).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Kaydet" })).toHaveCount(0);

      // Öğrenci gibi dene: oynatıcı açılır, hiçbir şey kaydedilmez.
      await page.getByRole("link", { name: "Öğrenci gibi dene" }).click();
      await page.waitForURL(/\/onizle$/);
      await expect(page.getByRole("button", { name: "Hazırım, başla" })).toBeVisible();
      expect(await attemptsOf(adminEmail, lab.slug)).toEqual([]);

      // Öğrenci: mahallenin eğitimini bitirmiş yeni bir hesap yayındaki odayı açar.
      await signOutHere(context);
      const student = uniqueEmail("ogrenci");
      await signUpVerified(page, student);
      await finishTraining(student);
      await page.goto(`/oda/${lab.slug}/oyna`);
      await expect(page.getByRole("button", { name: "Hazırım, başla" })).toBeVisible();
    } finally {
      await deleteTestLabs({ slug: lab.slug });
    }
  });

  test("yayına hazır olmayan taslak yayınlanmaz; odanın sayfası eksikleri listeler", async ({ page }, testInfo) => {
    const lab = testLab("Eksik", testInfo.project.name);
    try {
      await insertTestLab({ slug: lab.slug, name: lab.name, change: (content) => (content.tasks = []) });
      await signUpAdmin(page);
      await page.goto("/yonetim/odalar");
      await page.getByRole("button", { name: `Yayınla: ${lab.name}` }).click();
      const dialog = page.getByRole("dialog", { name: `${lab.name} odasını yayınla` });
      await expect(dialog).toContainText("Bu oda henüz yayına hazır değil.");
      await expect(dialog.getByRole("button", { name: "Yayınla", exact: true })).toHaveCount(0);
      await dialog.getByRole("link", { name: "Odanın sayfasına git" }).click();
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(lab.name);
      const ready = page.getByRole("region", { name: "Yayına hazır mı?" });
      await expect(ready).toContainText("En az 4 görev, metinleri yazılı");
      await expect(ready).toContainText("Toplam puan 10");
    } finally {
      await deleteTestLabs({ slug: lab.slug });
    }
  });

  // 39 R1.3: numaralı liste; senaryo kendi eğitiminin altında, oklarla kendi grubunda taşınır ve hemen kaydedilir.
  test("sıra okları senaryoyu bir alta taşır ve hemen kaydeder; Geri al eski sıraya döner; eğitim katlanır", async ({ page }, testInfo) => {
    const tag = `${Date.now().toString(36)}${testInfo.project.name}`;
    const neighborhood = await insertTestNeighborhood(`E2E Sıra ${tag}`);
    try {
      await insertNeighborhoodLab(neighborhood.id, { name: `Temel ${tag}`, type: "TRAINING", sortOrder: 0 });
      const first = await insertNeighborhoodLab(neighborhood.id, { name: `Birinci ${tag}`, type: "SCENARIO", sortOrder: 1 });
      const second = await insertNeighborhoodLab(neighborhood.id, { name: `İkinci ${tag}`, type: "SCENARIO", sortOrder: 2 });
      await signUpAdmin(page);
      await page.goto("/yonetim/odalar");
      const section = page.getByRole("region", { name: `E2E Sıra ${tag}` });
      const names = section.getByRole("link", { name: /odasının sayfası$/ });
      await expect(names).toHaveText([`Temel ${tag}`, `Birinci ${tag}`, `İkinci ${tag}`]);
      // Temel eğitim hep ilk: oku yok.
      await expect(section.getByRole("button", { name: `Bir üste taşı: Temel ${tag}` })).toHaveCount(0);
      await expect(section.getByRole("button", { name: `Bir üste taşı: Birinci ${tag}` })).toBeDisabled();

      await section.getByRole("button", { name: `Bir alta taşı: Birinci ${tag}` }).click();
      await expect(toast(page, `Birinci ${tag} bir alta taşındı, sıra kaydedildi.`)).toBeVisible();
      await expect(names).toHaveText([`Temel ${tag}`, `İkinci ${tag}`, `Birinci ${tag}`]);
      expect(await sortOf(first)).toBeGreaterThan(await sortOf(second));
      await page.reload();
      await expect(names).toHaveText([`Temel ${tag}`, `İkinci ${tag}`, `Birinci ${tag}`]);

      await page.getByRole("button", { name: `Bir üste taşı: Birinci ${tag}` }).click();
      const moved = toast(page, `Birinci ${tag} bir üste taşındı`);
      await moved.getByRole("button", { name: "Geri al" }).click();
      await expect(toast(page, "Geri alındı.")).toBeVisible();
      await expect(names).toHaveText([`Temel ${tag}`, `İkinci ${tag}`, `Birinci ${tag}`]);

      // Eğitim satırı senaryolarını katlar.
      await section.getByRole("button", { name: `Temel ${tag} senaryolarını gizle` }).click();
      await expect(names).toHaveText([`Temel ${tag}`]);
      await section.getByRole("button", { name: `Temel ${tag} senaryolarını göster` }).click();
      await expect(names).toHaveCount(3);
    } finally {
      await deleteTestNeighborhood(neighborhood.id);
    }
  });
});
