import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { localDriver } from "@/components/lab/preview/local-driver";
import { defaultTryPath, fakeChoicesFor, reportForPath } from "@/lib/admin/try-path";
import { scenarioChecklist } from "@/lib/lab/checklist";
import { toClientScenario } from "@/lib/lab/client";
import { maxScore, missionMode, parseScenario, rawTotal, sameTracking, usesTrapPage, type ScenarioContent } from "@/lib/lab/content";
import { reduceEvents, taskProgress, type LabEventData } from "@/lib/lab/events";
import { missionDone, scoreScenario } from "@/lib/lab/scoring";
import { goodCall, linkPageFor, parcelResult } from "@/lib/lab/story";

// Takip görevli oda (Oltalama Limanı "Sahte kargo maili", 20 Kasım yenilemesi): Ayça sesli mesajla
// paketini takip etmeni ister; maillerdeki takip numarasını Yolda Kargo uygulamasında sorgularsın.
// Hangi numaranın gerçek olduğu tarayıcıya gitmez. Sahte sayfa kayıtlı şifreyi önerir.

const file = JSON.parse(readFileSync("labs/rooms/oltalama-limani/sahte-kargo-maili.json", "utf8"));
const room = parseScenario(file.content)!;
const track = room.mission!.track!;

const opened: LabEventData[] = ["kargo", "gonderi", "okul", "elif"].map((item) => ({ type: "item_opened", item }));
const best: LabEventData[] = [
  { type: "item_moved", item: "kargo", to: "spam" },
  { type: "review_done" },
  { type: "answer", task: "kargo-sorusu", option: 0 },
  { type: "answer", task: "sifre-sorusu", option: 0 },
];
const tracked = (item: string, found: boolean): LabEventData => ({ type: "parcel_tracked", item, found });
const score = (events: LabEventData[]) => scoreScenario(room, reduceEvents(events));

describe("takip görevi: oda dosyası", () => {
  it("şemaya uyuyor, T2 sahnesinde, puanı 10 ve yayına hazır", () => {
    expect(file.status).toBe("PUBLISHED");
    expect(room.stage?.type).toBe("DESKTOP_PHONE");
    expect(missionMode(room)).toBe("track");
    expect(maxScore(room)).toBe(rawTotal);
    expect(scenarioChecklist(room, "INBOX").filter((c) => !c.ok)).toEqual([]);
    expect(usesTrapPage(room, "INBOX")).toBe(true);
  });

  it("gerçek numara tek bir gerçek mailde; sahte maildeki numara başka", () => {
    const withNumber = room.items.filter((i) => i.tracking && sameTracking(i.tracking, track.number));
    expect(withNumber.map((i) => [i.id, i.kind])).toEqual([["gonderi", "real"]]);
    const fake = room.items.find((i) => i.kind === "fake")!;
    expect(fake.tracking && sameTracking(fake.tracking, track.number)).toBe(false);
    expect(sameTracking(" yk4417 2093 58", "YK 4417 2093 58")).toBe(true);
  });

  it("yazılmazsa görevin numarası olmayan gerçek mail ya da aynı numaralı sahte mail yayına hazır değil", () => {
    const broken: ScenarioContent = { ...room, items: room.items.map((i) => (i.id === "kargo" ? { ...i, tracking: track.number } : i)) };
    expect(scenarioChecklist(broken, "INBOX").find((c) => c.key === "mission")?.ok).toBe(false);
    const noReal: ScenarioContent = { ...room, items: room.items.map((i) => (i.id === "gonderi" ? { ...i, tracking: "YK 1" } : i)) };
    expect(scenarioChecklist(noReal, "INBOX").find((c) => c.key === "mission")?.ok).toBe(false);
    // Sesli mesaj masadaki telefona düşer: T2 olmayan sahnede "Sahne" satırı eksik.
    const desk: ScenarioContent = { ...room, stage: { ...room.stage!, type: "DESKTOP" } };
    expect(scenarioChecklist(desk, "INBOX").find((c) => c.key === "stage")?.ok).toBe(false);
  });
});

describe("takip görevi: bağlantı ve tarayıcıya giden içerik", () => {
  it("sahte bağlantı kayıtlı şifre önerili sahte girişi açar", () => {
    const fake = room.items.find((i) => i.id === "kargo")!;
    const page = linkPageFor(room, "INBOX", { ...fake, link: fake.link! });
    expect(page).toMatchObject({ kind: "trap", autofill: true, tapFill: false, compromise: "account" });
  });

  it("takip numaraları ve uygulamanın adı gider; gerçek numara, sonuçlar ve bitiş mesajları gitmez", () => {
    const client = toClientScenario(room, "INBOX");
    const json = JSON.stringify(client);
    expect(client.items.map((i) => i.tracking)).toEqual(["YK 9921 0034 17", "YK 4417 2093 58", "", ""]);
    expect(client.mission?.track).toEqual({ app: "Yolda Kargo", sub: "Gönderi takip" });
    expect(client.mission?.voicemail?.reply).toBe(room.mission!.voicemail!.reply);
    expect(json).not.toContain('"number"');
    for (const secret of [track.found.title, track.found.steps[0].note, track.missing.title, ...room.mission!.good, ...room.mission!.bad, ...room.mission!.missed]) {
      expect(json).not.toContain(secret);
    }
  });
});

describe("takip görevi: olaylar ve puan", () => {
  it("gerçek numarayı sorgulayınca görev biter; her şeyi doğru yapan 100 alır", () => {
    const state = reduceEvents([...opened, tracked("kargo", false), tracked("gonderi", true), ...best]);
    expect(state.tracked).toEqual(["kargo", "gonderi"]);
    expect(missionDone(room, state)).toBe(true);
    const progress = taskProgress(room.tasks, state, "track");
    expect(progress.done[room.tasks.findIndex((t) => t.id === "gorev")]).toBe(true);
    expect(scoreScenario(room, state).score).toBe(100);
  });

  it("yalnızca sahte numarayı sorgulayan görevi yapmamış olur: 90", () => {
    const state = reduceEvents([...opened, tracked("kargo", false), ...best]);
    expect(missionDone(room, state)).toBe(false);
    const report = scoreScenario(room, state);
    expect(report.score).toBe(90);
    expect(report.rows.find((r) => r.type === "mission")).toMatchObject({ done: false, points: 0 });
  });

  it("aynı sorgu iki kez karar sayılmaz", () => {
    const once = reduceEvents([tracked("gonderi", true)]);
    const twice = reduceEvents([tracked("gonderi", true), tracked("gonderi", true)]);
    expect(twice.tracked).toEqual(["gonderi"]);
    expect(twice.decisions).toBe(once.decisions);
  });

  it("sahte sayfaya kayıtlı şifreyi vermek hacklenmedir (görev sayılmaz)", () => {
    const report = score([...opened, { type: "link_clicked", item: "kargo" }, { type: "info_entered", item: "kargo" }]);
    expect(report.status).toBe("hacked");
    expect(report.compromise).toBe("account");
    expect(report.rows[0]).toMatchObject({ item: "kargo", outcome: "hacked", points: 0 });
  });

  it("sonuç metinleri: bulundu adımlarıyla, bulunamadı kısa", () => {
    expect(parcelResult(track, true)).toMatchObject({ found: true, title: track.found.title, steps: track.found.steps });
    expect(parcelResult(track, false)).toEqual({ found: false, title: track.missing.title, text: track.missing.text });
  });

  it("bitiş mesajı: görev yapıldıysa teşekkür (bildirdiyse bir satır daha), yapılmadıysa kaçırdın", () => {
    expect(goodCall(room, true, false)).toMatchObject({ lines: room.mission!.good, missed: false, title: room.mission!.goodTitle });
    expect(goodCall(room, true, true)?.lines).toEqual([...room.mission!.good, room.mission!.goodReported]);
    expect(goodCall(room, false, true)).toMatchObject({ lines: room.mission!.missed, missed: true });
  });

  it("öğrenci gibi dene: doğru yol gerçek numarayı sorgular; son anda durma yok", () => {
    expect(fakeChoicesFor(room)).toContain("hacked");
    expect(fakeChoicesFor(room)).not.toContain("stopped");
    const path = defaultTryPath(room);
    expect(reportForPath(room, "INBOX", path).score).toBe(100);
    expect(reportForPath(room, "INBOX", { ...path, missionDone: false }).score).toBe(90);
  });
});

describe("takip görevi: önizleme sürücüsü", () => {
  it("numarayı sorgular, bitince teşekkür mesajı gelir", async () => {
    const onEnd = vi.fn();
    const driver = localDriver(room, "INBOX", onEnd);
    const { attemptId } = (await driver.start()) as { attemptId: string };
    // Numarası olmayan mail sorgulanamaz.
    expect(await driver.trackParcel(attemptId, 0, "okul")).toEqual({ ok: false, reason: "invalid" });
    expect(await driver.trackParcel(attemptId, 1, "kargo")).toEqual({ ok: true, result: parcelResult(track, false) });
    expect(await driver.trackParcel(attemptId, 2, "gonderi")).toEqual({ ok: true, result: parcelResult(track, true) });
    const finish = await driver.finish(attemptId);
    expect(finish.ok && finish.call).toMatchObject({ lines: room.mission!.good, missed: false });
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it("bağlantıdan hacklenince Ayça'nın kötü bitiş mesajı da gelir", async () => {
    const driver = localDriver(room, "INBOX", () => undefined);
    const { attemptId } = (await driver.start()) as { attemptId: string };
    await driver.openLink(attemptId, 0, "kargo");
    const trap = await driver.submitTrap(attemptId, 1, "kargo");
    expect(trap.ok && "hacked" in trap && trap.hacked?.call).toMatchObject({ caller: "Ayça", lines: room.mission!.bad });
  });
});
