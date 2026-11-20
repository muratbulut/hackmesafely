// Senaryo labının puanlaması ve rapor özeti (Rapor-Son ve Lab-Duzenle-Son tahtalarının mantığı).
// Öğrencinin raporunu sunucu hesaplar (lib/lab/actions.ts). Yönetimdeki "Öğrenci gibi dene" de
// aynı fonksiyonu kullanır; içeriği zaten gören yönetici içindir, öğrencinin tarayıcısına girmez.
//
// Puan: sahte her öğe en fazla 4, gerçek her öğe 1, her soru seçtiği seçeneğin puanı. Rapor
// yalnızca kodlar ve sayılar tutar; ekrandaki cümleler sözlükten ve içerikten gelir.

import { installChecks, loginPoints, maxScore, missionMode, missionPoints, reportScale, type CompromiseKind, type LoginChoice, type ScenarioContent } from "./content";
import { codeDecided, folderOf, permissionKey, type SceneState } from "./events";
import { homeConnected, openConnected } from "./setup";

export type RowState = "ok" | "part" | "bad" | "skip";

/**
 * Sahte öğe: hacklendi, önce tıklayıp sonra bildirdi, bildirdi, sildi, tıklayıp bıraktı, dokunmadı.
 * stopped: görevli odada sahte mağazaya kartla ödedi ama onay kodunu yazmadı (son anda durdu;
 * hacklenmiş sayılmaz ama kart bilgisi gitti, 0 puan). almost: "Az kalsın" odasında (trap.almost)
 * sahte sayfaya bilgi girdi; oda bitmedi, hacklenmiş sayılmaz ama 0 puan. Telefon kurulumundaki
 * reklamda (install.setup.ad) bildirmek yoktur: closed × ile kapattı (4), backedOut TEMİZLE'ye bastı
 * ama telefonun uyarısında vazgeçti (2), almost temizleyiciyi kurdu (0), ignored reklamı hiç görmedi.
 */
export type FakeOutcome = "hacked" | "almost" | "stopped" | "reportedAfterEngaging" | "reported" | "deleted" | "engagedLeft" | "ignored" | "closed" | "backedOut";
export type RealOutcome = "reported" | "deleted" | "kept";

/**
 * Sahte öğeye nasıl kandı: bağlantıyı açarak (ve sahte sayfaya yazarak), cevap yazarak (kodu
 * göndererek) ya da satış görevli odada bağlantıdaki ödeme isteğini açarak (ve onaylayarak).
 * Mesajlaşmada raporun cümlesini seçer; eski raporlarda yoktur. file: kurulum görevinde mesajdaki
 * dosyayı (.apk) indirerek (ve kurmaya çalışarak).
 */
export type EngagedBy = "link" | "reply" | "request" | "file" | "ad";

export type ReportRow =
  | { type: "fake"; item: string; outcome: FakeOutcome; by?: EngagedBy; state: RowState; points: number; max: number }
  | { type: "real"; item: string; outcome: RealOutcome; state: RowState; points: number; max: number }
  | { type: "question"; task: string; option: number | null; state: RowState; points: number; max: number }
  /** Görevli oda: işi doğru yerden yaptı mı (gerçek mağazadan aldı). */
  | { type: "mission"; task: string; done: boolean; state: RowState; points: number; max: number }
  /** Kurulum görevi: kopya uygulamayı kurmadı mı, puanlanan izinde doğru seçti mi (installChecks). */
  | { type: "check"; check: string; ok: boolean; state: RowState; points: number; max: number }
  /** Giriş görevi: kalkmadan önce çıkış, "Beni hatırla", şifreyi kaydetmek. */
  | { type: "login"; choice: LoginChoice; outcome: LoginOutcome; state: RowState; points: number; max: number };

/**
 * Giriş görevindeki kararların sonucu. Çıkış: çıkış yapıp kalktı, tarayıcıyı kapatıp kalktı
 * (oturum açık kaldı), hiçbir şeye dokunmadan kalktı, hiç kalkmadı. Beni hatırla: işareti
 * kaldırdı ya da bıraktı. Şifre: kaydetmedi ya da kaydettirdi. none: karar verilmedi.
 */
export type LoginOutcome = "loggedOut" | "leftClosed" | "leftOpen" | "cleared" | "kept" | "declined" | "saved" | "none";

export type ReportStatus = "safe" | "risky" | "hacked";
export type ReportTitle = "hacked" | "missed" | "caught" | "safeButMissed";

export type ScenarioReport = {
  status: ReportStatus;
  title: ReportTitle;
  /** 10 üzerinden. */
  score: number;
  rows: ReportRow[];
  /** İçerikteki ipuçlarından seçilenlerin sırası; 3'e tamamlamak için kaç genel ipucu eklendiği. */
  tips: number[];
  genericTips: number;
  /** Sahte öğe(ler)i doğru yakaladı mı: işaretler "yakaladığın" mı "kaçırdığın" mı başlığıyla. */
  caught: boolean;
  compromise: CompromiseKind | null;
};

const fakeScores: Record<FakeOutcome, [RowState, number]> = {
  hacked: ["bad", 0],
  almost: ["bad", 0],
  stopped: ["bad", 0],
  reportedAfterEngaging: ["part", 2],
  reported: ["ok", 4],
  deleted: ["part", 2],
  engagedLeft: ["bad", 0],
  ignored: ["part", 1],
  closed: ["ok", 4],
  backedOut: ["part", 2],
};

/** Sahte öğe sonucunun puanı ("Öğrenci gibi dene" düğmelerindeki "+4"). */
export const fakeOutcomePoints = (outcome: FakeOutcome) => fakeScores[outcome][1];

const realScores: Record<RealOutcome, [RowState, number]> = {
  reported: ["bad", 0],
  deleted: ["part", 1],
  kept: ["ok", 1],
};

/**
 * Görevli odada (mission) sahte mağazaya kart bilgisi girmek tek başına ele geçirilme değildir;
 * ele geçirilme onay kodunu yazmaktır. Diğer odalarda bilgi girmek ele geçirilmedir; "Az kalsın"
 * odasında (almost) ele geçirilme değil, "az kalsın"dır.
 */
export function fakeOutcome(state: SceneState, item: string, mission = false, almost = false): FakeOutcome {
  if (mission) {
    if ((state.codeEntered ?? []).includes(item)) return "hacked";
    if (state.infoEntered.includes(item)) return "stopped";
  } else if (state.infoEntered.includes(item)) return almost ? "almost" : "hacked";
  if (state.secretSent.includes(item)) return "hacked";
  const engaged = state.clicked.includes(item) || state.replied.includes(item) || (state.filesOpened ?? []).includes(item);
  const folder = folderOf(state, item);
  if (folder === "spam") return engaged ? "reportedAfterEngaging" : "reported";
  if (folder === "trash") return "deleted";
  return engaged ? "engagedLeft" : "ignored";
}

/** Telefon kurulumundaki reklam: kurduysa az kalsın, TEMİZLE'den sonra vazgeçtiyse yarım, kapattıysa tam. */
export function adOutcome(state: SceneState, item: string): FakeOutcome {
  if (state.infoEntered.includes(item)) return "almost";
  if ((state.filesOpened ?? []).includes(item)) return "backedOut";
  if ((state.adsClosed ?? []).includes(item)) return "closed";
  return "ignored";
}

export function engagedBy(state: SceneState, item: string): EngagedBy | undefined {
  if ((state.filesOpened ?? []).includes(item)) return "file";
  if (state.infoEntered.includes(item)) return "link";
  if (state.secretSent.includes(item)) return "reply";
  if (state.clicked.includes(item)) return "link";
  return state.replied.includes(item) ? "reply" : undefined;
}

export function realOutcome(state: SceneState, item: string): RealOutcome {
  const folder = folderOf(state, item);
  return folder === "spam" ? "reported" : folder === "trash" ? "deleted" : "kept";
}

/**
 * Görevli oda: alışta gerçek bir mağazada onay kodu için karar verdiyse, satışta gerçek siparişi
 * hazırlayarak (telefonu sıfırlayarak) kargoya verdiyse iş doğru yapıldı.
 */
export function missionDone(content: Pick<ScenarioContent, "items" | "mission">, state: SceneState) {
  if (content.mission?.login) return !!state.uploaded;
  // Takip görevi: gerçek gönderinin numarasını kargonun kendi uygulamasında sorguladı.
  if (content.mission?.track) return !!state.parcelFound;
  if (content.mission?.signup) {
    const sent = state.formSent ?? [];
    return content.items.some((i) => i.kind === "real" && i.form && sent.includes(i.id));
  }
  if (content.mission?.install?.setup) return !!state.setupFinished;
  if (content.mission?.install) {
    const apps = content.mission.install.apps;
    return (state.homework ?? []).some((id) => apps.some((a) => a.id === id && !a.copy));
  }
  if (content.mission?.sale) {
    const prepared = state.prepared ?? [];
    return content.items.some((i) => i.kind === "real" && i.order && prepared.includes(i.id));
  }
  const decided = codeDecided(state);
  return content.items.some((i) => i.kind === "real" && decided.includes(i.id));
}

/** Giriş görevinin üç karar satırı (çıkış, Beni hatırla, şifre); eski kayıtlarda alanlar boş sayılır. */
export function loginRows(state: SceneState): Extract<ReportRow, { type: "login" }>[] {
  const leftOpen = (state.leftOpen ?? 0) > 0;
  const logout: LoginOutcome = leftOpen ? (state.leftClosed ? "leftClosed" : "leftOpen") : state.left ? "loggedOut" : "none";
  const remember: LoginOutcome = state.remember === undefined || state.remember === null ? "none" : state.remember ? "kept" : "cleared";
  const save: LoginOutcome = state.passwordSaved === undefined || state.passwordSaved === null ? "none" : state.passwordSaved ? "saved" : "declined";
  const row = (choice: LoginChoice, outcome: LoginOutcome, ok: boolean) => ({
    type: "login" as const,
    choice,
    outcome,
    state: (outcome === "none" ? "skip" : ok ? "ok" : "bad") as RowState,
    points: ok ? loginPoints[choice] : 0,
    max: loginPoints[choice],
  });
  return [row("logout", logout, logout === "loggedOut"), row("remember", remember, remember === "cleared"), row("save", save, save === "declined")];
}

export function scoreScenario(content: ScenarioContent, state: SceneState): ScenarioReport {
  const rows: ReportRow[] = [];
  // Kayıt görevinde sahte sayfa diğer odalardaki gibidir: ele geçirilme bilgi girmektir.
  const mode = missionMode(content);
  const mission = mode === "shop" || mode === "sale";

  const adItem = content.mission?.install?.setup?.ad.item ?? null;
  for (const item of content.items) {
    if (item.kind === "fake" && item.id === adItem) {
      const outcome = adOutcome(state, item.id);
      const [rowState, points] = fakeScores[outcome];
      rows.push({ type: "fake", item: item.id, outcome, by: "ad", state: rowState, points, max: 4 });
      continue;
    }
    if (item.kind === "fake") {
      const outcome = fakeOutcome(state, item.id, mission, content.trap.almost);
      const [rowState, points] = fakeScores[outcome];
      const by = engagedBy(state, item.id);
      const via = by === "link" && item.request && content.mission?.sale ? "request" : by;
      rows.push({ type: "fake", item: item.id, outcome, ...(via ? { by: via } : {}), state: rowState, points, max: 4 });
    } else {
      const outcome = realOutcome(state, item.id);
      const [rowState, points] = realScores[outcome];
      rows.push({ type: "real", item: item.id, outcome, state: rowState, points, max: 1 });
    }
  }

  // Giriş görevinde karar satırları görevlerin önünde: önce kapı, sonra sorular.
  const login = mode === "login" ? loginRows(state) : [];
  rows.push(...login);

  for (const task of content.tasks) {
    if (task.type === "mission") {
      const done = missionDone(content, state);
      rows.push({ type: "mission", task: task.id, done, state: done ? "ok" : "bad", points: done ? missionPoints : 0, max: missionPoints });
      continue;
    }
    if (task.type !== "question") continue;
    const max = Math.max(0, ...task.options.map((o) => o.points));
    const option = state.answers[task.id];
    if (option === undefined || !task.options[option]) {
      rows.push({ type: "question", task: task.id, option: null, state: "skip", points: 0, max });
      continue;
    }
    const points = task.options[option].points;
    const rowState: RowState = points >= max ? "ok" : points === 0 ? "bad" : "part";
    rows.push({ type: "question", task: task.id, option, state: rowState, points, max });
  }

  // Kurulum görevi: kopya uygulamayı kurmamak ve puanlanan izinde doğru seçmek, her biri 1 puan.
  // Gerçek uygulama hiç kurulmadıysa izin sorusu çıkmamıştır: cevaplanmamış soru gibi yazılır.
  const installed = state.installed ?? [];
  const permissions = state.permissions ?? {};
  let wrongApp = false;
  let extraPermission = false;
  const checkRows: ReportRow[] = [];
  for (const check of installChecks(content)) {
    if (check.kind === "wifi") {
      const joined = homeConnected(content, state);
      const open = openConnected(content, state);
      const ok = joined && !open;
      checkRows.push({ type: "check", check: check.key, ok, state: !joined && !open ? "skip" : ok ? "ok" : "bad", points: ok ? 1 : 0, max: 1 });
      continue;
    }
    if (check.kind === "copy") {
      const ok = !installed.includes(check.app);
      wrongApp ||= !ok;
      checkRows.push({ type: "check", check: check.key, ok, state: ok ? "ok" : "bad", points: ok ? 1 : 0, max: 1 });
      continue;
    }
    const app = content.mission?.install?.apps.find((a) => a.id === check.app);
    const chosen = permissions[permissionKey(check.app, check.index)];
    const ok = chosen !== undefined && chosen === app?.permissions[check.index]?.right;
    if (chosen !== undefined && !ok) extraPermission = true;
    checkRows.push({ type: "check", check: check.key, ok, state: chosen === undefined ? "skip" : ok ? "ok" : "bad", points: ok ? 1 : 0, max: 1 });
  }
  // Satırlar görevin hemen ardından gelir (yoksa soruların önüne).
  const missionAt = rows.findIndex((r) => r.type === "mission");
  const questionAt = rows.findIndex((r) => r.type === "question");
  rows.splice(missionAt >= 0 ? missionAt + 1 : questionAt >= 0 ? questionAt : rows.length, 0, ...checkRows);

  const fakes = rows.filter((r) => r.type === "fake");
  const hacked = fakes.some((r) => r.outcome === "hacked");
  // Giriş görevinde kapıyı açık bırakıp kalkmak (Az kalsın) odayı riskli yapar.
  const leftOpen = login.some((r) => r.choice === "logout" && r.state !== "ok");
  const status: ReportStatus = hacked ? "hacked" : fakes.every((r) => r.points >= 2) && !leftOpen ? "safe" : "risky";

  const raw = rows.reduce((sum, r) => sum + r.points, 0);
  const max = maxScore(content);
  // Yayına çıkan labda ham toplam 10'dur (puan = ham × 10); taslağı denerken farklıysa yine 100'e ölçeklenir.
  const score = max > 0 ? Math.round((raw / max) * reportScale) : 0;

  const title: ReportTitle =
    status === "hacked" ? "hacked" : status === "risky" ? "missed" : score >= 90 ? "caught" : "safeButMissed";

  const engaged =
    hacked ||
    content.items.some((i) => i.kind === "fake" && (state.clicked.includes(i.id) || state.replied.includes(i.id) || (state.filesOpened ?? []).includes(i.id)));
  const conditions = {
    engaged,
    // "Az kalsın" odasında sahte sayfaya bilgi girmek de bu ipucunu açar (şifreni değiştir).
    hacked: hacked || fakes.some((r) => r.outcome === "almost"),
    missedFake: fakes.some((r) => r.state !== "ok"),
    reportedReal: rows.some((r) => r.type === "real" && r.outcome === "reported"),
    always: true,
    leftOpen,
    remembered: login.some((r) => r.choice === "remember" && r.outcome === "kept"),
    savedPassword: login.some((r) => r.choice === "save" && r.outcome === "saved"),
    wrongAnswer: rows.some((r) => r.type === "question" && r.state !== "ok"),
    wrongApp,
    extraPermission,
    openWifi: openConnected(content, state),
  };
  const missedQuestion = (task: string) => rows.some((r) => r.type === "question" && r.task === task && r.state !== "ok");
  const tips = content.tips
    .flatMap((tip, index) => ((tip.when === "wrongAnswer" && tip.task ? missedQuestion(tip.task) : conditions[tip.when]) ? [index] : []))
    .slice(0, 3);

  return {
    status,
    title,
    score,
    rows,
    tips,
    genericTips: 3 - tips.length,
    caught: fakes.length > 0 && fakes.every((r) => r.state === "ok"),
    compromise: hacked ? content.trap.kind : null,
  };
}

/** Puan ve seviye için: senaryo labı rapor puanı × 2 (en çok 200), eğitim labı 100 (lib/progress/levels.ts). */
export const pointsForScore = (score: number) => Math.max(0, Math.min(reportScale, score)) * 2;
