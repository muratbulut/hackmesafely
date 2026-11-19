import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { localDriver } from "@/components/lab/preview/local-driver";
import { fakeChoicesFor, reportForPath, defaultTryPath } from "@/lib/admin/try-path";
import { scenarioChecklist } from "@/lib/lab/checklist";
import { toClientScenario } from "@/lib/lab/client";
import { maxScore, missionMode, opensForm, parseScenario, rawTotal, usesTrapPage } from "@/lib/lab/content";
import { reduceEvents, taskProgress, type LabEventData } from "@/lib/lab/events";
import { buildReportView } from "@/lib/lab/report";
import { missionDone, scoreScenario } from "@/lib/lab/scoring";
import { linkPageFor, ownerOf } from "@/lib/lab/story";

// Kayıt görevli oda ve "Az kalsın" (Şehir Kapısı "Bağlantı nereye gidiyor?", 18 Kasım): Deniz arar,
// gerçek kulüp mailindeki bağlantı okulun formunu açar, sahte maildeki bağlantı sahte okul
// girişini. Sahte sayfaya şifre yazmak odayı bitirmez, "Az kalsın" ekranı gelir.

const file = JSON.parse(readFileSync("labs/rooms/sehir-kapisi/baglanti-nereye-gidiyor.json", "utf8"));
const room = parseScenario(file.content)!;
const kulaklik = parseScenario(JSON.parse(readFileSync("labs/rooms/para-carsisi/kulaklik-icin-veli-karti.json", "utf8")).content)!;

const opened: LabEventData[] = ["kulup-sahte", "kulup", "annem", "market-puan"].map((item) => ({ type: "item_opened", item }));
const signUp: LabEventData[] = [
  { type: "link_clicked", item: "kulup" },
  { type: "form_sent", item: "kulup" },
];
const best: LabEventData[] = [
  { type: "answer", task: "nereye", option: 0 },
  { type: "answer", task: "sahibi", option: 0 },
];
const almostEvents: LabEventData[] = [
  { type: "link_clicked", item: "kulup-sahte" },
  { type: "info_entered", item: "kulup-sahte" },
];
const score = (events: LabEventData[]) => scoreScenario(room, reduceEvents(events));

describe("kayıt görevi: oda dosyası", () => {
  it("şemaya uyuyor, puanı 10, yayına hazır ve Deniz arıyor", () => {
    expect(room.mission?.look).toBe("friend");
    expect(missionMode(room)).toBe("signup");
    expect(maxScore(room)).toBe(rawTotal);
    expect(scenarioChecklist(room, "INBOX").filter((c) => !c.ok)).toEqual([]);
  });

  it("eski görevli odalar alış görevi kalır, Az kalsın kapalıdır", () => {
    expect(missionMode(kulaklik)).toBe("shop");
    expect(kulaklik.trap.almost).toBe(false);
    expect(usesTrapPage(kulaklik, "INBOX")).toBe(false);
  });
});

describe("kayıt görevi: bağlantılar", () => {
  const link = (id: string) => {
    const item = room.items.find((i) => i.id === id)!;
    return linkPageFor(room, "INBOX", { ...item, link: item.link! });
  };

  it("gerçek kulüp maili formu açar; formun cümlesi sayfayla gitmez", () => {
    const page = link("kulup");
    expect(page.kind).toBe("form");
    expect(page.kind === "form" && page.form.fields).toEqual(["Adın", "Sınıfın"]);
    expect(JSON.stringify(page)).not.toContain("Kaydın alındı");
  });

  it("sahte kulüp maili sahte okul girişini, kampanya maili yalnızca adresi açar", () => {
    expect(link("kulup-sahte")).toMatchObject({ kind: "trap", url: "cinarortaokulu.k12.tr.kayit-formu.xyz/giris" });
    expect(link("market-puan")).toMatchObject({ kind: "site" });
  });

  it("form yalnızca gerçek ve bağlantılı öğede açılır", () => {
    const fake = room.items.find((i) => i.id === "kulup-sahte")!;
    expect(opensForm(room, { ...fake, form: true })).toBe(false);
    expect(opensForm(kulaklik, { link: { url: "x.com", text: "x" }, form: true, kind: "real" })).toBe(false);
  });

  it("tarayıcıya giden içerikte formun cümlesi ve Az kalsın metinleri yok", () => {
    const client = toClientScenario(room, "INBOX");
    expect(client.mission?.signup).toBe(true);
    const text = JSON.stringify(client);
    expect(text).not.toContain("Kaydın alındı");
    expect(text).not.toContain("kayit-formu.xyz/giris\",\"title");
    expect(text).not.toContain("hemen değiştir");
    expect(text).not.toContain("form\":true");
  });
});

describe("kayıt görevi: puan ve görev", () => {
  it("formu gönderince görev biter; her şeyi doğru yapan 100 alır", () => {
    const state = reduceEvents([...opened, ...signUp]);
    expect(taskProgress(room.tasks, state, "signup").done[1]).toBe(true);
    expect(missionDone(room, state)).toBe(true);
    const report = score([...opened, ...signUp, { type: "item_moved", item: "kulup-sahte", to: "spam" }, { type: "review_done" }, ...best]);
    expect(report).toMatchObject({ status: "safe", score: 100, title: "caught" });
  });

  it("form gönderilmeden görev bitmez, puanı 0", () => {
    const state = reduceEvents(opened);
    expect(taskProgress(room.tasks, state, "signup").done[1]).toBe(false);
    expect(score(opened).rows.find((r) => r.type === "mission")).toMatchObject({ done: false, points: 0 });
  });

  it("sahte sayfaya şifre yazmak Az kalsın: hacklenmiş sayılmaz, 0 puan, şifre ipucu çıkar", () => {
    const report = score([...opened, ...almostEvents, ...signUp]);
    expect(report.status).toBe("risky");
    expect(report.compromise).toBeNull();
    expect(report.rows[0]).toMatchObject({ type: "fake", outcome: "almost", points: 0, state: "bad" });
    expect(report.tips.map((i) => room.tips[i].when)).toContain("hacked");
    // Az kalsın'dan sonra kaydolmak görevin puanını yine verir.
    expect(report.rows.find((r) => r.type === "mission")).toMatchObject({ done: true, points: 1 });
  });

  it("raporun satırı Az kalsın cümlesini söyler", () => {
    const report = score([...opened, ...almostEvents]);
    const view = buildReportView(room, "INBOX", report);
    expect(JSON.stringify(view)).toContain("Az kalsın");
  });

  it("öğrenci gibi dene: Az kalsın seçeneği var, son anda durma yok", () => {
    expect(fakeChoicesFor(room)).toContain("almost");
    expect(fakeChoicesFor(room)).not.toContain("hacked");
    expect(fakeChoicesFor(room)).not.toContain("stopped");
    const path = defaultTryPath(room);
    expect(reportForPath(room, "INBOX", path).score).toBe(100);
    expect(reportForPath(room, "INBOX", { ...path, missionDone: false }).score).toBe(90);
    expect(reportForPath(room, "INBOX", { ...path, items: { ...path.items, "kulup-sahte": "almost" } }).rows[0]).toMatchObject({ outcome: "almost" });
  });
});

describe("kayıt görevi: önizleme sürücüsü", () => {
  it("Az kalsın odayı bitirmez; sonra form gönderilir ve iyi bitiş araması gelir", async () => {
    const onEnd = vi.fn();
    const driver = localDriver(room, "INBOX", onEnd);
    const { attemptId } = (await driver.start()) as { attemptId: string };
    expect(await driver.sendForm(attemptId, 0, "kulup")).toEqual({ ok: false, reason: "invalid" });
    await driver.openLink(attemptId, 1, "kulup-sahte");
    const trap = await driver.submitTrap(attemptId, 2, "kulup-sahte");
    expect(trap.ok && "almost" in trap && trap.almost).toMatchObject({
      linkText: "cinarortaokulu.k12.tr/kayit",
      owner: "kayit-formu.xyz",
      steps: room.trap.actions,
    });
    expect(onEnd).not.toHaveBeenCalled();
    await driver.openLink(attemptId, 3, "kulup");
    expect(await driver.sendForm(attemptId, 4, "kulup")).toEqual({ ok: true, done: room.mission!.signup!.done });
    // Sahte öğede form yok.
    expect(await driver.sendForm(attemptId, 5, "kulup-sahte")).toEqual({ ok: false, reason: "invalid" });
    const finish = await driver.finish(attemptId);
    expect(finish.ok && finish.call?.lines).toEqual(room.mission!.good);
    expect(onEnd).toHaveBeenCalledTimes(1);
  });
});

describe("alan adının sahibi", () => {
  it("sağdan iki parça, kurum uzantısında üç", () => {
    expect(ownerOf("cinarortaokulu.k12.tr.kayit-formu.xyz")).toBe("kayit-formu.xyz");
    expect(ownerOf("cinarortaokulu.k12.tr")).toBe("cinarortaokulu.k12.tr");
    expect(ownerOf("giris.postam.com")).toBe("postam.com");
    expect(ownerOf("www.okul.sch.uk")).toBe("okul.sch.uk");
  });
});
