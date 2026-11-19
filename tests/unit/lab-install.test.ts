import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { localDriver } from "@/components/lab/preview/local-driver";
import { defaultTryPath, fakeChoicesFor, reportForPath } from "@/lib/admin/try-path";
import { scenarioChecklist } from "@/lib/lab/checklist";
import { toClientScenario } from "@/lib/lab/client";
import { installChecks, maxScore, missionMode, parseScenario, rawTotal } from "@/lib/lab/content";
import { reduceEvents, taskProgress, type LabEventData } from "@/lib/lab/events";
import { canInstallFile, installApp, openHomework, permissionStep } from "@/lib/lab/install";
import { buildReportView } from "@/lib/lab/report";
import { missionDone, scoreScenario } from "@/lib/lab/scoring";

// Kurulum görevli oda (Şehir Kapısı "Bu uygulama nereden geliyor?", 19 Kasım): Deniz arar, oyun
// mağazadan kurulur. Gruptaki .apk'yı kurmak ve kopya oyunun SMS iznine evet demek "Az kalsın"
// getirir; kopyayı kurmamak ve konum iznini reddetmek ayrı puandır.

const file = JSON.parse(readFileSync("labs/rooms/sehir-kapisi/uygulama-nereden-geliyor.json", "utf8"));
const room = parseScenario(file.content)!;

const opened: LabEventData[] = ["kerem", "elif"].map((item) => ({ type: "item_opened", item }));
const installReal: LabEventData[] = [
  { type: "app_installed", app: "kesir-kulesi" },
  { type: "permission_answered", app: "kesir-kulesi", index: 0, choice: 0 },
  { type: "permission_answered", app: "kesir-kulesi", index: 1, choice: 2 },
  { type: "homework_opened", app: "kesir-kulesi" },
];
const best: LabEventData[] = [
  { type: "item_moved", item: "kerem", to: "spam" },
  { type: "review_done" },
  { type: "answer", task: "apk", option: 0 },
  { type: "answer", task: "izin", option: 0 },
];
const score = (events: LabEventData[]) => scoreScenario(room, reduceEvents(events));

describe("kurulum görevi: oda dosyası", () => {
  it("şemaya uyuyor, puanı 10, yayına hazır, T1 telefonda ve Deniz arıyor", () => {
    expect(file.unlockedBy).toBe("dosya-ve-uygulama");
    expect(room.stage?.type).toBe("PHONE");
    expect(room.mission?.look).toBe("friend");
    expect(missionMode(room)).toBe("install");
    expect(maxScore(room)).toBe(rawTotal);
    expect(installChecks(room).map((c) => c.key)).toEqual(["perm-kesir-kulesi-1", "copy-sinirsiz-elmas"]);
    expect(scenarioChecklist(room, "MESSAGING").filter((c) => !c.ok)).toEqual([]);
  });

  it("tarayıcıya kopya olduğu, izinler, doğru seçenek ve rapor satırları gitmez", () => {
    const client = toClientScenario(room, "MESSAGING");
    const json = JSON.stringify(client);
    expect(client.mission?.install?.apps.map((a) => a.id)).toEqual(["kesir-kulesi", "sinirsiz-elmas"]);
    for (const leak of ['"copy"', "konumuna", "SMS mesajlarını", '"right"', "FunFreeGamez · SMS", "3. bölüm açıldı", "ödev listesi yok"]) {
      expect(json).not.toContain(leak);
    }
  });
});

describe("kurulum görevi: kurallar", () => {
  it("dosya önce indirilir, sonra kurulmak istenir; bir kez", () => {
    const kerem = room.items.find((i) => i.id === "kerem")!;
    expect(canInstallFile(room, reduceEvents([]), kerem)).toBe(false);
    expect(canInstallFile(room, reduceEvents([{ type: "file_opened", item: "kerem" }]), kerem)).toBe(true);
    expect(
      canInstallFile(room, reduceEvents([{ type: "file_opened", item: "kerem" }, { type: "info_entered", item: "kerem" }]), kerem),
    ).toBe(false);
  });

  it("izinler sırayla sorulur; kopyanın SMS iznine evet Az kalsın getirir", () => {
    expect(installApp(room, reduceEvents([]), "yok")).toBeNull();
    const prompts = installApp(room, reduceEvents([]), "kesir-kulesi")!;
    expect(prompts.map((p) => p.choices.length)).toEqual([2, 3]);
    const installed = reduceEvents([{ type: "app_installed", app: "kesir-kulesi" }]);
    expect(installApp(room, installed, "kesir-kulesi")).toBeNull();
    expect(permissionStep(room, installed, "kesir-kulesi", 1, 0)).toBeNull();
    expect(permissionStep(room, installed, "kesir-kulesi", 0, 5)).toBeNull();
    expect(permissionStep(room, installed, "kesir-kulesi", 0, 1)).toEqual({ almost: null, after: null });
    expect(openHomework(room, installed, "kesir-kulesi")).toBeNull();

    const copy = reduceEvents([{ type: "app_installed", app: "sinirsiz-elmas" }]);
    const yes = permissionStep(room, copy, "sinirsiz-elmas", 0, 0)!;
    expect(yes.almost?.compare?.left.value).toBe("Kesir Kulesi: Sınırsız Elmas");
    expect(yes.after).toEqual({ homework: false, text: "Bu oyunda öğretmenin ödev listesi yok. Ödevin bu oyunda değil." });
    expect(permissionStep(room, copy, "sinirsiz-elmas", 0, 1)?.almost).toBeNull();
  });

  it("ödevi yalnızca bütün izinleri cevaplanmış gerçek oyun açar", () => {
    expect(openHomework(room, reduceEvents(installReal.slice(0, 3)), "kesir-kulesi")).toBe("3. bölüm açıldı!");
    const copy = reduceEvents([
      { type: "app_installed", app: "sinirsiz-elmas" },
      { type: "permission_answered", app: "sinirsiz-elmas", index: 0, choice: 1 },
    ]);
    expect(openHomework(room, copy, "sinirsiz-elmas")).toBeNull();
  });
});

describe("kurulum görevi: puan ve rapor", () => {
  it("her şeyi doğru yapan 100 alır; görev ödev açılınca biter", () => {
    const events = [...opened, ...installReal, ...best];
    const state = reduceEvents(events);
    expect(missionDone(room, state)).toBe(true);
    expect(taskProgress(room.tasks, reduceEvents([...opened, ...installReal.slice(0, 3)]), "install").done[1]).toBe(false);
    expect(taskProgress(room.tasks, state, "install").finished).toBe(true);
    const report = score(events);
    expect(report.score).toBe(100);
    expect(report.status).toBe("safe");
    expect(report.rows.map((r) => r.type)).toEqual(["fake", "real", "mission", "check", "check", "question", "question"]);
  });

  it(".apk'yı kurmak Az kalsın: sahte mesaj 0, oda sürer, ipucu çıkar", () => {
    const events = [...opened, { type: "file_opened", item: "kerem" } as const, { type: "info_entered", item: "kerem" } as const, ...installReal, ...best.slice(1)];
    const report = score(events);
    const fake = report.rows.find((r) => r.type === "fake");
    expect(fake && fake.type === "fake" && fake.outcome).toBe("almost");
    expect(fake && fake.type === "fake" && fake.by).toBe("file");
    expect(report.status).not.toBe("hacked");
    expect(report.score).toBe(60);
    const view = buildReportView(room, "MESSAGING", report);
    expect(view.rows[0].did).toContain("Dosyayı indirip kurmak istedin");
    expect(view.tips).toContain("Gerçek hayatta mesajla gelen bir uygulamayı kurduysan hemen sil ve bir büyüğüne söyle.");
  });

  it("indirip vazgeçip bildirmek 2 puan; kopya ve konum izni ayrı satır", () => {
    const events: LabEventData[] = [
      ...opened,
      { type: "file_opened", item: "kerem" },
      { type: "app_installed", app: "sinirsiz-elmas" },
      { type: "permission_answered", app: "sinirsiz-elmas", index: 0, choice: 1 },
      { type: "app_installed", app: "kesir-kulesi" },
      { type: "permission_answered", app: "kesir-kulesi", index: 0, choice: 1 },
      { type: "permission_answered", app: "kesir-kulesi", index: 1, choice: 0 },
      { type: "homework_opened", app: "kesir-kulesi" },
      ...best,
    ];
    const report = score(events);
    // 2 (sahte) + 1 (Elif) + 1 (görev) + 0 + 0 + 1 + 1 = 6
    expect(report.score).toBe(60);
    const view = buildReportView(room, "MESSAGING", report);
    const checks = view.rows.filter((r) => r.kind === "check");
    expect(checks.map((r) => r.state)).toEqual(["bad", "bad"]);
    expect(checks[1].title).toBe("Mağazadaki kopya oyun (FunFreeGamez)");
    expect(view.tips).toEqual(expect.arrayContaining(["Mağazada da yayıncıya bak: öğretmenin söylediği ad mı?", "Oyunun işine yaramayan izni reddet, oyun yine çalışır."]));
  });

  it("gerçek oyun hiç kurulmadıysa izin satırı cevaplanmadı yazar", () => {
    const report = score([...opened, ...best]);
    const perm = report.rows.find((r) => r.type === "check" && r.check.startsWith("perm-"));
    expect(perm?.state).toBe("skip");
    expect(report.rows.find((r) => r.type === "mission")?.state).toBe("bad");
  });
});

describe("kurulum görevi: önizleme sürücüsü", () => {
  it("dosya, mağaza, izin ve ödev öğrencidekiyle aynı kurallarla çalışır; bitişte Deniz arar", async () => {
    const onEnd = vi.fn();
    const driver = localDriver(room, "MESSAGING", onEnd);
    const start = await driver.start();
    const id = start.ok ? start.attemptId : "";
    expect(await driver.installFile(id, 0, "kerem")).toEqual({ ok: false, reason: "invalid" });
    expect(await driver.openFile(id, 1, "kerem")).toEqual({ ok: true });
    const almost = await driver.installFile(id, 2, "kerem");
    expect(almost.ok && almost.almost.compare?.left.value).toBe("KesirKulesi_hizli.apk");
    const app = await driver.installApp(id, 3, "kesir-kulesi");
    expect(app.ok && app.prompts.length).toBe(2);
    expect((await driver.answerPermission(id, 4, "kesir-kulesi", 0, 0)).ok).toBe(true);
    const last = await driver.answerPermission(id, 5, "kesir-kulesi", 1, 2);
    expect(last.ok && last.after).toEqual({ homework: true });
    const hw = await driver.openHomework(id, 6, "kesir-kulesi");
    expect(hw.ok && hw.done).toBe("3. bölüm açıldı!");
    await driver.send(id, best.map((event, i) => ({ seq: 7 + i, event: event as never })));
    const finish = await driver.finish(id);
    expect(finish.ok && finish.call?.caller).toBe("Deniz");
    expect(onEnd).toHaveBeenCalledOnce();
  });
});

describe("kurulum görevi: Öğrenci gibi dene", () => {
  it("doğru yol 100; .apk'yı kurmak Az kalsın; mağazadan kurmamak görev puanını alır", () => {
    const path = defaultTryPath(room);
    expect(reportForPath(room, "MESSAGING", path).score).toBe(100);
    expect(fakeChoicesFor(room)).toContain("almost");
    const almost = reportForPath(room, "MESSAGING", { ...path, items: { ...path.items, kerem: "almost" } });
    const fake = almost.rows.find((r) => r.type === "fake");
    expect(fake && fake.type === "fake" && fake.outcome).toBe("almost");
    expect(fake && fake.type === "fake" && fake.by).toBe("file");
    // Görev yapılmazsa görev puanı ve konum izni gider (izin hiç sorulmadı).
    expect(reportForPath(room, "MESSAGING", { ...path, missionDone: false }).score).toBe(80);
  });
});
