import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { localDriver } from "@/components/lab/preview/local-driver";
import { defaultTryPath, fakeChoicesFor, reportForPath } from "@/lib/admin/try-path";
import { scenarioChecklist } from "@/lib/lab/checklist";
import { toClientScenario } from "@/lib/lab/client";
import { installChecks, maxScore, missionMode, parseScenario, rawTotal } from "@/lib/lab/content";
import { reduceEvents, taskProgress, type LabEventData } from "@/lib/lab/events";
import { installApp } from "@/lib/lab/install";
import { buildReportView } from "@/lib/lab/report";
import { missionDone, scoreScenario } from "@/lib/lab/scoring";
import { canCloseAd, canFinishSetup, connectWifi, homeConnected, installUpdate, setupReady } from "@/lib/lab/setup";

// Telefon kurulumu (Şehir Kapısı "Yeni telefonunu kur", 20 Kasım): Ayça eski telefonunu verir.
// Evin ağına defterdeki şifreyle bağlanılır, güncelleme Ayarlar'dan yüklenir, Harita ve El Feneri
// kurulur. El Feneri'ndeki "3 virüs" reklamı tuzaktır: × ile kapatmak 4, TEMİZLE'den sonra
// vazgeçmek 2, temizleyiciyi kurmak 0 ve "Az kalsın". Bitince Ayça'ya "Kurdum!" yazılır.

const file = JSON.parse(readFileSync("labs/rooms/sehir-kapisi/yeni-telefonunu-kur.json", "utf8"));
const room = parseScenario(file.content)!;

const home: LabEventData[] = [{ type: "wifi_connected", network: 0 }, { type: "update_installed" }];
const apps: LabEventData[] = [
  { type: "app_installed", app: "harita" },
  { type: "permission_answered", app: "harita", index: 0, choice: 0 },
  { type: "app_installed", app: "el-feneri" },
  { type: "permission_answered", app: "el-feneri", index: 0, choice: 2 },
];
const answers: LabEventData[] = [
  { type: "answer", task: "guncelleme", option: 0 },
  { type: "answer", task: "qr", option: 0 },
];
const best: LabEventData[] = [...home, ...apps, { type: "ad_closed", item: "temizleyici" }, { type: "setup_finished" }, ...answers];
const score = (events: LabEventData[]) => scoreScenario(room, reduceEvents(events));

describe("telefon kurulumu: oda dosyası", () => {
  it("şemaya uyuyor, puanı 10, yayına hazır, T1 telefonda ve Ayça arıyor", () => {
    expect(file.unlockedBy).toBe("telefonun-ve-internet");
    expect(room.stage?.type).toBe("PHONE");
    expect(room.mission?.caller).toBe("Ayça");
    expect(missionMode(room)).toBe("install");
    expect(maxScore(room)).toBe(rawTotal);
    expect(installChecks(room).map((c) => c.key)).toEqual(["wifi", "perm-harita-0", "perm-el-feneri-0"]);
    expect(scenarioChecklist(room, "MESSAGING").filter((c) => !c.ok)).toEqual([]);
  });

  it("tarayıcıya evin ağı, notlar, güncellemenin sonucu ve doğru seçenekler gitmez", () => {
    const client = toClientScenario(room, "MESSAGING");
    const json = JSON.stringify(client);
    expect(client.mission?.install?.setup?.networks.map((n) => n.name)).toEqual(["Ev_Wifi", "Bedava_Internet", "Komsu_5G"]);
    for (const leak of ['"home"', "Biri, bağlananların", "Ağı unut", "Bu ağın şifresini bilmiyorsun", "Güncelleme yüklendi", '"right"', "Bağlandığın ağ", "temizleyici reklamını ben de"]) {
      expect(json).not.toContain(leak);
    }
  });
});

describe("telefon kurulumu: kurallar", () => {
  it("evin ağı şifreyle bağlanır; açık ağ not getirir; bilinmeyen kilitli ağ kaydedilmez", () => {
    const empty = reduceEvents([]);
    expect(connectWifi(room, empty, 0, false)).toBeNull();
    expect(connectWifi(room, empty, 0, true)).toEqual({ result: { status: "joined" }, record: true });
    expect(connectWifi(room, empty, 1, false)).toMatchObject({ result: { status: "open", note: { title: "Bu ağ kimin?" } }, record: true });
    expect(connectWifi(room, empty, 2, true)).toMatchObject({ result: { status: "unknown" }, record: false });
    expect(connectWifi(room, empty, 9, true)).toBeNull();
    const joined = reduceEvents([{ type: "wifi_connected", network: 0 }]);
    expect(homeConnected(room, joined)).toBe(true);
    expect(connectWifi(room, joined, 1, false)).toBeNull();
  });

  it("güncelleme ve mağaza evin ağı olmadan açılmaz; güncelleme bir kez", () => {
    const open = reduceEvents([{ type: "wifi_connected", network: 1 }]);
    expect(installUpdate(room, open)).toBeNull();
    expect(installApp(room, open, "harita")).toBeNull();
    const joined = reduceEvents([{ type: "wifi_connected", network: 0 }]);
    expect(installUpdate(room, joined)).toBe("Güncelleme yüklendi. Telefonun güncel.");
    expect(installApp(room, joined, "harita")).toHaveLength(1);
    expect(installUpdate(room, reduceEvents(home))).toBeNull();
  });

  it("reklam El Feneri kurulunca kapatılabilir; Kurdum! her şey bitince ve bir kez", () => {
    expect(canCloseAd(room, reduceEvents(home), "temizleyici")).toBe(false);
    expect(canCloseAd(room, reduceEvents([...home, ...apps]), "temizleyici")).toBe(true);
    expect(canCloseAd(room, reduceEvents([...home, ...apps]), "baska")).toBe(false);
    expect(setupReady(room, reduceEvents([...home, ...apps.slice(0, 3)]))).toBe(false);
    expect(canFinishSetup(room, reduceEvents([...home, ...apps]))).toBe(true);
    expect(canFinishSetup(room, reduceEvents([...home, ...apps, { type: "setup_finished" }]))).toBe(false);
  });
});

describe("telefon kurulumu: puan ve rapor", () => {
  it("her şeyi doğru yapan 100 alır; görev Kurdum! ile biter", () => {
    const state = reduceEvents(best);
    expect(missionDone(room, state)).toBe(true);
    expect(missionDone(room, reduceEvents([...home, ...apps]))).toBe(false);
    expect(taskProgress(room.tasks, reduceEvents([{ type: "wifi_connected", network: 0 }]), "install").done[0]).toBe(true);
    const report = score(best);
    expect(report.score).toBe(100);
    expect(report.status).toBe("safe");
    expect(report.rows.map((r) => r.type)).toEqual(["fake", "mission", "check", "check", "check", "question", "question"]);
    expect(buildReportView(room, "MESSAGING", report).title).toBe("Sahte uyarıyı yakaladın!");
  });

  it("TEMİZLE'den sonra vazgeçmek 2 puan, temizleyiciyi kurmak Az kalsın", () => {
    const rest = best.filter((e) => e.type !== "ad_closed");
    const backed = score([...rest, { type: "file_opened", item: "temizleyici" }]);
    const fake = backed.rows.find((r) => r.type === "fake");
    expect(fake && fake.type === "fake" && fake.outcome).toBe("backedOut");
    expect(backed.score).toBe(80);

    const almost = score([...rest, { type: "file_opened", item: "temizleyici" }, { type: "info_entered", item: "temizleyici" }]);
    const row = almost.rows.find((r) => r.type === "fake");
    expect(row && row.type === "fake" && row.outcome).toBe("almost");
    expect(almost.status).not.toBe("hacked");
    expect(almost.score).toBe(60);
    expect(buildReportView(room, "MESSAGING", almost).title).toBe("Sahte uyarıya kandın.");
  });

  it("açık ağa bağlanmak ağ puanını alır ve ipucu çıkarır; fazla izin ayrı satır", () => {
    const events: LabEventData[] = [
      { type: "wifi_connected", network: 1 },
      ...best.map((e) => (e.type === "permission_answered" && e.app === "el-feneri" ? { ...e, choice: 0 } : e)),
    ];
    const report = score(events);
    expect(report.score).toBe(80);
    const view = buildReportView(room, "MESSAGING", report);
    expect(view.rows.filter((r) => r.kind === "check").map((r) => r.state)).toEqual(["bad", "ok", "bad"]);
    expect(view.tips).toEqual(expect.arrayContaining(["Bağlanmadan önce sor: bu ağ kimin?"]));
  });
});

describe("telefon kurulumu: önizleme sürücüsü", () => {
  it("Wi‑Fi, güncelleme, reklam ve Kurdum! öğrencidekiyle aynı kurallarla çalışır; bitişte Ayça arar", async () => {
    const onEnd = vi.fn();
    const driver = localDriver(room, "MESSAGING", onEnd);
    const start = await driver.start();
    const id = start.ok ? start.attemptId : "";
    const open = await driver.connectWifi(id, 0, 1, false);
    expect(open.ok && open.result.status).toBe("open");
    const joined = await driver.connectWifi(id, 1, 0, true);
    expect(joined.ok && joined.result.status).toBe("joined");
    const update = await driver.installUpdate(id, 2);
    expect(update.ok && update.done).toBe("Güncelleme yüklendi. Telefonun güncel.");
    expect(await driver.finishSetup(id, 3)).toEqual({ ok: false, reason: "invalid" });
    let seq = 4;
    for (const app of ["harita", "el-feneri"]) {
      const installed = await driver.installApp(id, seq++, app);
      expect(installed.ok).toBe(true);
      expect((await driver.answerPermission(id, seq++, app, 0, app === "harita" ? 0 : 2)).ok).toBe(true);
    }
    expect(await driver.closeAd(id, seq++, "temizleyici")).toEqual({ ok: true });
    expect(await driver.finishSetup(id, seq++)).toEqual({ ok: true });
    await driver.send(id, answers.map((event, i) => ({ seq: seq + i, event: event as never })));
    const finish = await driver.finish(id);
    expect(finish.ok && finish.call?.caller).toBe("Ayça");
    // Açık ağa bağlandığı için Ayça bir satır daha söyler.
    expect(finish.ok && finish.call?.lines.at(-1)).toContain("şifresiz ağlara bağlanma");
    expect(onEnd).toHaveBeenCalledOnce();
  });
});

describe("telefon kurulumu: Öğrenci gibi dene", () => {
  it("doğru yol 100; reklam seçenekleri kapat, vazgeç, görmezden gel, Az kalsın", () => {
    const path = defaultTryPath(room);
    expect(reportForPath(room, "MESSAGING", path).score).toBe(100);
    expect(fakeChoicesFor(room)).toEqual(["closed", "backedOut", "ignored", "almost"]);
    const almost = reportForPath(room, "MESSAGING", { ...path, items: { ...path.items, temizleyici: "almost" } });
    expect(almost.score).toBe(60);
  });
});
