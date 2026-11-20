// Lab düzenlemedeki "Öğrenci gibi dene" sekmesi: yönetici her öğe ve her soru için öğrencinin
// ne yaptığını seçer; seçimler gerçek lab olaylarına çevrilir (lib/lab/events.ts) ve öğrencinin
// raporunu hesaplayan aynı fonksiyonla puanlanır (lib/lab/scoring.ts). Hepsi tarayıcıda çalışır;
// yönetici cevapları zaten görür, sunucuya bir şey gitmez.

import type { ScenarioContent, ScenarioTemplate } from "@/lib/lab/content";
import { reduceEvents, type LabEventData, type SceneState } from "@/lib/lab/events";
import { fakeOutcomePoints, scoreScenario, type FakeOutcome, type RealOutcome } from "@/lib/lab/scoring";

/** Seçim listesindeki sıra (en iyiden en kötüye). */
export const fakeChoices = ["reported", "deleted", "ignored", "reportedAfterEngaging", "engagedLeft", "hacked"] as const satisfies readonly FakeOutcome[];
/** Görevli odada bir seçenek daha: sahte mağazaya ödedi ama onay kodunu yazmadı. */
export const missionFakeChoices = ["reported", "deleted", "ignored", "reportedAfterEngaging", "engagedLeft", "stopped", "hacked"] as const satisfies readonly FakeOutcome[];

/** "Az kalsın" odasında sahte sayfaya bilgi girmek "hacklendi" değil "az kalsın"dır. */
export const almostFakeChoices = ["reported", "deleted", "ignored", "reportedAfterEngaging", "engagedLeft", "almost"] as const satisfies readonly FakeOutcome[];

/** Telefon kurulumundaki reklam: bildirmek yok; kapattı, TEMİZLE'den sonra vazgeçti, görmedi, kurdu. */
export const adFakeChoices = ["closed", "backedOut", "ignored", "almost"] as const satisfies readonly FakeOutcome[];

export function fakeChoicesFor(content: Pick<ScenarioContent, "mission"> & { trap?: Pick<ScenarioContent["trap"], "almost"> }): readonly FakeOutcome[] {
  if (content.mission?.install?.setup) return adFakeChoices;
  if (content.trap?.almost) return almostFakeChoices;
  // Satış, kayıt ve takip görevinde "son anda durma" yok: ödeme isteği ya onaylanır ya reddedilir, kayıtta ve takipte ödeme yok.
  return content.mission && !content.mission.sale && !content.mission.signup && !content.mission.track ? missionFakeChoices : fakeChoices;
}
export const realChoices = ["kept", "deleted", "reported"] as const satisfies readonly RealOutcome[];

export type TryPath = {
  /** Öğe kimliği -> öğrencinin yaptığı (sahte öğede FakeOutcome, gerçekte RealOutcome). */
  items: Record<string, FakeOutcome | RealOutcome>;
  /** Soru görevi kimliği -> seçilen seçenek; null: cevaplamadı. */
  answers: Record<string, number | null>;
  /** Görevli oda: gerçek mağazadan aldı mı (yazılmazsa aldı). */
  missionDone?: boolean;
};

/** Varsayılan yol: her şeyi doğru yapan öğrenci (sahteleri bildirir, en yüksek puanlı seçenek). */
export function defaultTryPath(content: ScenarioContent): TryPath {
  const items: TryPath["items"] = {};
  const ad = content.mission?.install?.setup?.ad.item;
  for (const item of content.items) items[item.id] = item.kind === "fake" ? (item.id === ad ? "closed" : "reported") : "kept";
  const answers: TryPath["answers"] = {};
  for (const task of content.tasks) {
    if (task.type !== "question") continue;
    if (task.options.length === 0) {
      answers[task.id] = null;
      continue;
    }
    const best = Math.max(...task.options.map((o) => o.points));
    answers[task.id] = task.options.findIndex((o) => o.points === best);
  }
  return { items, answers };
}

/** İçerik değişince (öğe silindi, türü değişti) eski seçimleri geçerli olanlarla birleştirir. */
export function mergeTryPath(content: ScenarioContent, previous: TryPath): TryPath {
  const base = defaultTryPath(content);
  for (const item of content.items) {
    const chosen = previous.items[item.id];
    const valid = item.kind === "fake" ? (fakeChoicesFor(content) as readonly string[]) : (realChoices as readonly string[]);
    if (chosen && valid.includes(chosen)) base.items[item.id] = chosen;
  }
  for (const task of content.tasks) {
    if (task.type !== "question" || !(task.id in previous.answers)) continue;
    const option = previous.answers[task.id];
    base.answers[task.id] = option === null || (option !== undefined && option < task.options.length) ? option : base.answers[task.id];
  }
  if (previous.missionDone !== undefined) base.missionDone = previous.missionDone;
  return base;
}

function itemEvents(item: string, outcome: FakeOutcome | RealOutcome, template: ScenarioTemplate, mission: "buy" | "sale" | "signup" | "install" | "track" | null): LabEventData[] {
  const opened: LabEventData = { type: "item_opened", item };
  // Satış görevinde sahte mesaja kanmak bağlantıdaki ödeme isteğini açmaktır, kurulum görevinde
  // mesajdaki eki indirmek (kurmak istemek "bilgi girildi" olur, Az kalsın).
  const engage: LabEventData =
    mission === "install"
      ? { type: "file_opened", item }
      : template === "INBOX" || mission === "sale"
        ? { type: "link_clicked", item }
        : { type: "reply_sent", item, secret: false };
  switch (outcome) {
    case "reported":
      return [opened, { type: "item_moved", item, to: "spam" }];
    case "reportedAfterEngaging":
      return [opened, engage, { type: "item_moved", item, to: "spam" }];
    case "deleted":
      return [opened, { type: "item_moved", item, to: "trash" }];
    case "engagedLeft":
      return [opened, engage];
    case "almost":
      return [opened, engage, { type: "info_entered", item }];
    case "hacked":
      if (mission === "sale") return [opened, engage, { type: "code_entered", item }];
      if (mission === "buy") return [opened, engage, { type: "info_entered", item }, { type: "code_entered", item }];
      return template === "INBOX"
        ? [opened, engage, { type: "info_entered", item }]
        : [opened, { type: "reply_sent", item, secret: true }];
    case "stopped":
      return [opened, engage, { type: "info_entered", item }, { type: "code_refused", item }];
    case "ignored":
    case "kept":
      return [opened];
    // Telefon kurulumundaki reklam (stateFromPath reklamda adEvents'i kullanır).
    case "closed":
    case "backedOut":
      return [opened];
  }
}

/** Telefon kurulumundaki reklam: kapatmak, TEMİZLE'den sonra vazgeçmek ya da temizleyiciyi kurmak. */
function adEvents(item: string, outcome: FakeOutcome | RealOutcome): LabEventData[] {
  switch (outcome) {
    case "closed":
      return [{ type: "ad_closed", item }];
    case "backedOut":
      return [{ type: "file_opened", item }];
    case "almost":
      return [{ type: "file_opened", item }, { type: "info_entered", item }];
    default:
      return [];
  }
}

/** Seçilen yolu öğrencinin olaylarına, olayları sahne durumuna çevirir. */
export function stateFromPath(content: ScenarioContent, template: ScenarioTemplate, path: TryPath): SceneState {
  const events: LabEventData[] = [];
  const mission = content.mission
    ? content.mission.sale
      ? "sale"
      : content.mission.signup
        ? "signup"
        : content.mission.install
          ? "install"
          : content.mission.track
            ? "track"
            : "buy"
    : null;
  const setup = content.mission?.install?.setup;
  // Telefon kurulumu: doğru yol önce evin ağına bağlanır, güncellemeyi yükler (mağaza ağı ister).
  if (setup) {
    const home = setup.wifi.networks.findIndex((n) => n.home);
    if (home >= 0) events.push({ type: "wifi_connected", network: home });
    events.push({ type: "update_installed" });
  }
  for (const item of content.items) {
    if (setup && item.id === setup.ad.item) {
      events.push(...adEvents(item.id, path.items[item.id] ?? "closed"));
      continue;
    }
    const fallback = item.kind === "fake" ? "reported" : "kept";
    events.push(...itemEvents(item.id, path.items[item.id] ?? fallback, template, mission));
  }
  // Görev: gerçek mağazadan aldıysa ilk ödemeli gerçek öğede ödeme ve onay kodu; satışta ilk
  // gerçek siparişi hazırlayarak kargoya verme.
  const shop = content.items.find((i) => i.kind === "real" && i.payment);
  const order = content.items.find((i) => i.kind === "real" && i.order);
  if (mission === "sale" && order && path.missionDone !== false) {
    events.push({ type: "link_clicked", item: order.id }, { type: "item_shipped", item: order.id, prepared: true });
  }
  const form = content.items.find((i) => i.kind === "real" && i.form);
  if (mission === "signup" && form && path.missionDone !== false) {
    events.push({ type: "link_clicked", item: form.id }, { type: "form_sent", item: form.id });
  }
  // Takip görevi: gerçek gönderinin numarasını kargo uygulamasında sorgular.
  const parcel = content.items.find((i) => i.kind === "real" && i.tracking);
  if (mission === "track" && parcel && path.missionDone !== false) {
    events.push({ type: "parcel_tracked", item: parcel.id, found: true });
  }
  if (mission === "buy" && shop && path.missionDone !== false) {
    events.push({ type: "link_clicked", item: shop.id }, { type: "info_entered", item: shop.id }, { type: "code_entered", item: shop.id });
  }
  // Kurulum görevi: doğru yol (gerçek oyunu mağazadan kurar, izinlerde doğrusunu seçer, ödevi açar).
  const realApp = content.mission?.install?.apps.find((a) => !a.copy);
  if (setup) {
    // Telefon kurulumu: bütün gerçek uygulamalar, izinlerde doğrusu; görev "Kurdum!" ile biter.
    for (const app of content.mission?.install?.apps.filter((a) => !a.copy) ?? []) {
      events.push({ type: "app_installed", app: app.id });
      app.permissions.forEach((p, index) => events.push({ type: "permission_answered", app: app.id, index, choice: p.right ?? 0 }));
    }
    if (path.missionDone !== false) events.push({ type: "setup_finished" });
  } else if (mission === "install" && realApp && path.missionDone !== false) {
    events.push({ type: "app_installed", app: realApp.id });
    realApp.permissions.forEach((p, index) => events.push({ type: "permission_answered", app: realApp.id, index, choice: p.right ?? 0 }));
    events.push({ type: "homework_opened", app: realApp.id });
  }
  // Giriş görevi: doğru yol (işareti kaldırıp girer, şifreyi kaydetmez, ödevi yükler, çıkıp kalkar).
  if (content.mission?.login) {
    events.push({ type: "login_submitted", remember: false }, { type: "login_verified" }, { type: "password_saved", saved: false });
    if (path.missionDone !== false) events.push({ type: "homework_uploaded" });
    events.push({ type: "logged_out" }, { type: "desk_left", open: false, closed: false });
  }
  events.push({ type: "review_done" });
  for (const task of content.tasks) {
    if (task.type !== "question") continue;
    const option = path.answers[task.id];
    if (option !== null && option !== undefined && option >= 0 && option < task.options.length) {
      events.push({ type: "answer", task: task.id, option });
    }
  }
  return reduceEvents(events);
}

/** Bu yolla çıkacak rapor (öğrencinin gerçek raporuyla aynı hesap). */
export function reportForPath(content: ScenarioContent, template: ScenarioTemplate, path: TryPath) {
  return scoreScenario(content, stateFromPath(content, template, path));
}

/** Seçimin puanı (düğmelerdeki "+4"); puan tablosu lib/lab/scoring.ts'ten okunur. */
export function outcomePoints(kind: "fake" | "real", outcome: FakeOutcome | RealOutcome, template: ScenarioTemplate): number {
  // Reklamın sonuçları kendi kuralıyla puanlanır (bildirmek yok): puan tablosundan okunur.
  if (kind === "fake" && (outcome === "closed" || outcome === "backedOut")) return fakeOutcomePoints(outcome);
  const item = { id: "x", kind, sender: "", address: "", subject: "", time: "", body: "", footer: "", link: null, attachment: null, signs: [], why: "" };
  const content = {
    meta: { name: "", title: "", summary: "", story: "", learn: [], difficulty: "EASY", durationMin: 5 },
    reminders: [],
    items: [item],
    trap: { url: "", title: "", text: "", ask: "", secret: "", kind: "account", account: "", scene: "", realLife: "", actions: [], almost: outcome === "almost", autofill: false },
    tasks: [],
    tips: [],
  } satisfies ScenarioContent;
  const report = scoreScenario(content, stateFromPath(content, template, { items: { x: outcome }, answers: {} }));
  return report.rows[0]?.points ?? 0;
}
