import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { localDriver } from "@/components/lab/preview/local-driver";
import { defaultTryPath, reportForPath } from "@/lib/admin/try-path";
import { scenarioChecklist } from "@/lib/lab/checklist";
import { toClientScenario } from "@/lib/lab/client";
import { maxScore, missionMode, parseScenario, rawTotal } from "@/lib/lab/content";
import { batchEventSchema, reduceEvents, taskProgress, type LabEventData } from "@/lib/lab/events";
import { buildReportView } from "@/lib/lab/report";
import { scoreScenario } from "@/lib/lab/scoring";
import { endingTalk, leaveStory, talkReply } from "@/lib/lab/story";

// Giriş görevli oda (Şehir Kapısı "Okul bilgisayarında giriş yap ve çık", 19 Kasım): ortak
// bilgisayarda portala giriş, SMS kodu, kodu isteyen arkadaş (Deniz, yüz yüze), ödev yükleme,
// zil çalınca kalkış. Çıkış yapmadan kalkmak "Az kalsın"dır; oda sürer.

const file = JSON.parse(readFileSync("labs/rooms/sehir-kapisi/okul-bilgisayarinda-giris.json", "utf8"));
const room = parseScenario(file.content)!;
const deniz = room.tasks.find((t) => t.id === "deniz")!;

const rightPath: LabEventData[] = [
  { type: "login_submitted", remember: false },
  { type: "talk_answered", task: "deniz", option: 0 },
  { type: "login_verified" },
  { type: "password_saved", saved: false },
  { type: "homework_uploaded" },
  { type: "logged_out" },
  { type: "desk_left", open: false, closed: false },
  { type: "answer", task: "evde", option: 0 },
];
const score = (events: LabEventData[]) => scoreScenario(room, reduceEvents(events));

describe("giriş görevi: şema ve oda dosyası", () => {
  it("oda dosyası şemaya uyuyor, Postam şablonunda, bilgisayar ve telefon sahnesi, puanı 10 ve yayına hazır", () => {
    expect(file.template).toBe("INBOX");
    expect(room.stage?.type).toBe("DESKTOP_PHONE");
    expect(room.items).toEqual([]);
    expect(missionMode(room)).toBe("login");
    expect(maxScore(room)).toBe(rawTotal);
    expect(scenarioChecklist(room, "INBOX").filter((c) => !c.ok)).toEqual([]);
  });

  it("giriş görevi masaüstü ve telefon sahnesi olmadan, Mesajlar'da ya da öğeyle hazır sayılmaz", () => {
    const ready = (content: typeof room, template: "INBOX" | "MESSAGING" = "INBOX") => scenarioChecklist(content, template).every((c) => c.ok);
    expect(ready({ ...room, stage: { ...room.stage!, type: "DESKTOP" } })).toBe(false);
    expect(ready(room, "MESSAGING")).toBe(false);
    expect(ready({ ...room, mission: { ...room.mission!, login: { ...room.mission!.login!, next: "" } } })).toBe(false);
  });

  it("Deniz'in her sesli satırının dosyası var", () => {
    const voice = deniz.talk!.voice!;
    const all = new Set([...voice.lines, ...voice.replies, ...voice.endings.flat()].filter(Boolean));
    expect(all.size).toBe(8);
    for (const src of all) expect(existsSync(`public${src}`), src!).toBe(true);
    expect(existsSync(`public${room.mission!.login!.homework.image}`)).toBe(true);
  });
});

describe("giriş görevi: tarayıcıya giden içerik", () => {
  const client = toClientScenario(room, "INBOX");
  const json = JSON.stringify(client);

  it("portal, not ve kod gider; Deniz'in cevapları, son sözleri, Az kalsın metni ve doğrular gitmez", () => {
    expect(client.mission?.login).toMatchObject({ site: "Okul Portalı", user: "2741", code: room.mission!.code });
    const talk = client.tasks.find((t) => t.id === "deniz")?.talk;
    expect(talk?.lines).toEqual(deniz.talk!.lines);
    for (const secret of [...deniz.talk!.replies, ...deniz.talk!.endings.flat(), room.mission!.login!.next, room.trap.realLife, deniz.right, deniz.why]) {
      expect(json).not.toContain(secret);
    }
    expect(json).not.toContain("cevap-1.mp3");
    expect(json).not.toContain("son-2-iyi.mp3");
  });

  it("öğrencinin gönderdiği olaylarda yüz yüze cevap ve kalkış yok (sunucu eylemiyle gelir)", () => {
    expect(batchEventSchema.safeParse({ type: "login_submitted", remember: true }).success).toBe(true);
    expect(batchEventSchema.safeParse({ type: "desk_left", open: false, closed: false }).success).toBe(false);
    expect(batchEventSchema.safeParse({ type: "talk_answered", task: "deniz", option: 0 }).success).toBe(false);
  });
});

describe("giriş görevi: olaylar, puan ve görevler", () => {
  it("işareti kaldırıp kodu vermeyen, şifreyi kaydetmeyen, çıkış yapıp kalkan: 100, güvende", () => {
    const report = score(rightPath);
    expect(report.score).toBe(100);
    expect(report.status).toBe("safe");
    const state = reduceEvents(rightPath);
    expect(taskProgress(room.tasks, state, "login").finished).toBe(true);
  });

  it("her karar bir kez sayılır; çıkış yapıp yeniden giren kodsuz girer, açık oturumla kalkar", () => {
    const state = reduceEvents([
      { type: "login_submitted", remember: false },
      { type: "login_submitted", remember: true },
      { type: "login_verified" },
      { type: "password_saved", saved: false },
      { type: "password_saved", saved: true },
      { type: "logged_out" },
      { type: "login_verified" },
    ]);
    expect(state).toMatchObject({ remember: false, passwordSaved: false, verified: true, loggedOut: false, decisions: 2 });
  });

  it("işaretli bırakan, kodu söyleyen, şifreyi kaydeden, tarayıcıyı kapatıp kalkan sonra çıkan: 20, kıl payı", () => {
    const report = score([
      { type: "login_submitted", remember: true },
      { type: "talk_answered", task: "deniz", option: 1 },
      { type: "login_verified" },
      { type: "password_saved", saved: true },
      { type: "homework_uploaded" },
      { type: "desk_left", open: true, closed: true },
      { type: "logged_out" },
      { type: "desk_left", open: false, closed: false },
      { type: "answer", task: "evde", option: 0 },
    ]);
    expect(report.score).toBe(20);
    expect(report.status).toBe("risky");
    const view = buildReportView(room, "INBOX", report);
    expect(view.rows.find((r) => r.kind === "login" && r.tag === "GİRİŞ VE ÇIKIŞ")?.did).toBe("Tarayıcıyı kapatıp kalktın, hesabın açık kaldı.");
  });

  it("ödevi yüklemeden kalkmak görevi bitirmez", () => {
    const report = score(rightPath.filter((e) => e.type !== "homework_uploaded"));
    expect(report.score).toBe(90);
  });
});

describe("giriş görevi: önizleme sürücüsü (sunucuyla aynı kurallar)", () => {
  it("yüz yüze cevap bir kez; cevabı ve son sözleri sunucu söyler", async () => {
    const driver = localDriver(room, "INBOX", () => {});
    expect(await driver.answerTalk("x", 0, "evde", 0)).toEqual({ ok: false, reason: "invalid" });
    expect(await driver.answerTalk("x", 0, "deniz", 0)).toEqual({ ok: true, reply: talkReply(deniz, 0) });
    expect(await driver.answerTalk("x", 1, "deniz", 1)).toEqual({ ok: false, reason: "invalid" });
    const result = await driver.finish("x");
    if (!result.ok) throw new Error("bitmeliydi");
    expect(result.talk).toEqual(endingTalk(room, { deniz: 0 }));
    expect(result.talk?.lines.at(-1)).toBe(deniz.talk!.endings[0].at(-1));
  });

  it("ödev yüklenmeden kalkılmaz; açık oturumla kalkınca Az kalsın, çıkınca kalkış biter", async () => {
    const driver = localDriver(room, "INBOX", () => {});
    expect(await driver.leaveDesk("x", 0, false)).toEqual({ ok: false, reason: "invalid" });
    await driver.send("x", [
      { seq: 0, event: { type: "login_submitted", remember: false } },
      { seq: 1, event: { type: "login_verified" } },
      { seq: 2, event: { type: "homework_uploaded" } },
    ]);
    expect(await driver.leaveDesk("x", 3, true)).toEqual({ ok: true, almost: leaveStory(room, true) });
    await driver.send("x", [{ seq: 4, event: { type: "logged_out" } }]);
    expect(await driver.leaveDesk("x", 5, false)).toEqual({ ok: true, almost: null });
    expect(await driver.leaveDesk("x", 6, false)).toEqual({ ok: false, reason: "invalid" });
  });
});

describe("giriş görevi: Öğrenci gibi dene", () => {
  it("varsayılan yol 100; ödevi yüklememe seçilebilir", () => {
    const path = defaultTryPath(room);
    expect(reportForPath(room, "INBOX", path).score).toBe(100);
    expect(reportForPath(room, "INBOX", { ...path, missionDone: false }).score).toBe(90);
  });
});
