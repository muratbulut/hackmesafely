import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { TeachingSectionData } from "@/components/profile/teaching/types";

// Profil > Öğretmenlik: duruma göre başlık, talep yokken üç adım, listeden branş (hoca öncesi kontrol 31).

vi.mock("@/lib/teacher/application-actions", () => ({
  submitApplication: vi.fn(),
  answerApplication: vi.fn(),
  withdrawApplication: vi.fn(),
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/profil", useRouter: () => ({ refresh: vi.fn() }), useSearchParams: () => new URLSearchParams() }));

const { TeachingSection } = await import("@/components/profile/TeachingSection");

const summary = {
  school: "Bornova Ortaokulu",
  place: "İzmir · Bornova",
  subject: "Matematik",
  institutionalEmail: null,
  document: null,
  sentOn: "10 Ekim",
};
const draft = { province: "İzmir", district: "Bornova", school: null, newSchoolName: "Bornova Ortaokulu", subject: "Matematk", institutionalEmail: "" };

function show(data: TeachingSectionData) {
  return render(<TeachingSection data={data} emailVerified onDone={() => {}} />);
}

describe("Öğretmenlik bölümünün başlığı", () => {
  it.each<[TeachingSectionData, string]>([
    [{ state: "none", draft: null, invited: false }, "Öğretmen misin?"],
    [{ state: "rejected", decidedOn: null, note: null, documentDeleted: false, draft }, "Öğretmen misin?"],
    [{ state: "pending", application: summary, answeredOn: null }, "Öğretmenlik talebin"],
    [{ state: "info", application: summary, question: "Belgeni ekler misin?", askedAt: "Dün 18:55" }, "Öğretmenlik talebin"],
    [{ state: "approved", approvedOn: null, school: null, documentDeleted: false, hasClass: false }, "Öğretmenlik"],
  ])("%#: %s", (data, title) => {
    const { unmount } = show(data);
    expect(screen.getByRole("region", { name: title })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe(title);
    unmount();
  });
});

describe("talep yokken", () => {
  it("açıklamanın altında üç kısa adım ve talep düğmesi", () => {
    show({ state: "none", draft: null, invited: false });
    const steps = screen.getByRole("list", { name: "Öğretmenlik nasıl açılır" });
    expect([...steps.querySelectorAll("li")].map((li) => li.textContent)).toEqual([
      "1Talebini gönder",
      "2Yönetici inceler, sonucu e-postayla bildiririz",
      "3Onaylanınca Sınıflarım açılır",
    ]);
    fireEvent.click(screen.getByRole("button", { name: "Öğretmenlik talebi oluştur" }));
    expect(screen.queryByRole("list", { name: "Öğretmenlik nasıl açılır" })).toBeNull();
  });
});

describe("branş", () => {
  const subjectValue = () => (document.querySelector('input[type="hidden"][name="subject"]') as HTMLInputElement).value;

  it("listeden seçilir; listede yoksa Başka bir branş ile yazılır", () => {
    show({ state: "none", draft: null, invited: true });
    const select = screen.getByLabelText("Branşın") as HTMLSelectElement;
    const options = [...select.options].map((o) => o.textContent);
    expect(options[0]).toBe("Branşını seç");
    expect(options).toContain("Bilişim Teknolojileri");
    expect(options.at(-1)).toBe("Başka bir branş");
    expect(screen.queryByLabelText("Branşının adı")).toBeNull();

    fireEvent.change(select, { target: { value: "Fizik" } });
    expect(subjectValue()).toBe("Fizik");

    fireEvent.change(select, { target: { value: "__other" } });
    const other = screen.getByLabelText("Branşının adı") as HTMLInputElement;
    expect(subjectValue()).toBe("");
    fireEvent.change(other, { target: { value: "Bilgisayar Bilimi" } });
    expect(subjectValue()).toBe("Bilgisayar Bilimi");
    // Formda tek bir "subject" alanı var: seçim kutusu ve yazı kutusu ada sahip değil.
    expect(document.querySelectorAll('[name="subject"]')).toHaveLength(1);
  });

  it("önceki talebin branşı listede yoksa yazı kutusu dolu açılır", () => {
    show({ state: "rejected", decidedOn: null, note: null, documentDeleted: false, draft });
    fireEvent.click(screen.getByRole("button", { name: "Bilgileri düzeltip yeniden gönder" }));
    expect((screen.getByLabelText("Branşın") as HTMLSelectElement).value).toBe("__other");
    expect((screen.getByLabelText("Branşının adı") as HTMLInputElement).value).toBe("Matematk");
    expect(subjectValue()).toBe("Matematk");
  });
});
