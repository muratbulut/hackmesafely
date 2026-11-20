// Yönetimdeki önizleme ("Öğrenci gibi dene") için tarayıcıda çalışan sürücüler. Oynatıcı
// öğrencinin gördüğü oynatıcının aynısıdır; tek fark kararların sunucuya değil bu sürücüye
// gitmesidir. İçeriğin tamamı (doğru kararlar dahil) burada durur, çünkü onu zaten yazan
// yönetim ekibi görüyor; öğrencinin tarayıcısına bu dosya hiç gitmez. Hiçbir şey kaydedilmez.

import { opensForm, opensOrder, opensRequest, opensShop, sameTracking, usesTrapPage, type ScenarioContent, type ScenarioTemplate, type TrainingContent } from "@/lib/lab/content";
import { applyEvent, emptyState, type LabEventData } from "@/lib/lab/events";
import { missionDone, scoreScenario, type ScenarioReport } from "@/lib/lab/scoring";
import { almostStory, endingTalk, goodCall, hackedStory, leaveStory, linkPageFor, parcelResult, smsFor, talkReply } from "@/lib/lab/story";
import { afterInstall, canInstallFile, fileAlmost, installApp, openHomework, opensFile, permissionStep } from "@/lib/lab/install";
import { canCloseAd, canFinishSetup, connectWifi, installUpdate, openConnected } from "@/lib/lab/setup";
import { checkPlacement, checkQuiz, checkSpot, firstUnanswered, hintFor, isPlacement, quizOf, validHintRequest, validPicks } from "@/lib/lab/training";
import type { Fail, FailReason, LabDriver, TrainingDriver } from "../driver";

const fail = (reason: FailReason): Fail => ({ ok: false, reason });

/** Önizleme denemesinin kimliği; sunucuda böyle bir deneme yoktur. */
export const previewAttemptId = "onizleme";
export const previewVersion = 0;

/** Senaryo labı: olayları bellekte tutar, lab bitince (ya da hacklenince) raporu onEnd'e verir. */
export function localDriver(content: ScenarioContent, template: ScenarioTemplate, onEnd: (report: ScenarioReport) => void): LabDriver {
  let state = emptyState();
  let ended = false;
  let report: ScenarioReport | null = null;
  const clicked = new Map<string, Date>();

  const apply = (event: LabEventData) => {
    state = applyEvent(state, event);
  };
  const end = () => {
    if (ended) return report!;
    ended = true;
    report = scoreScenario(content, state);
    onEnd(report);
    return report;
  };
  const itemOf = (id: string) => content.items.find((i) => i.id === id);

  return {
    async start() {
      return { ok: true, attemptId: previewAttemptId, version: previewVersion };
    },
    // Önizleme hiçbir şey kaydetmez; oynatıcı yeniden açılınca sürücü de baştan kurulur.
    async restart() {
      return { ok: true };
    },
    async send(_attemptId, batch) {
      if (ended) return fail("ended");
      for (const { event } of batch) apply(event);
      return { ok: true };
    },
    async openLink(_attemptId, _seq, itemId) {
      const item = itemOf(itemId);
      if (ended) return fail("ended");
      if (!item?.link) return fail("invalid");
      apply({ type: "link_clicked", item: item.id });
      clicked.set(item.id, new Date());
      return { ok: true, page: linkPageFor(content, template, { ...item, link: item.link }) };
    },
    async submitTrap(_attemptId, _seq, itemId) {
      const item = itemOf(itemId);
      if (ended) return fail("ended");
      if (!item || item.kind !== "fake" || !usesTrapPage(content, template) || !state.clicked.includes(item.id)) return fail("invalid");
      apply({ type: "info_entered", item: item.id });
      if (content.trap.almost) return { ok: true, almost: almostStory(content, item) };
      end();
      const now = new Date();
      return { ok: true, hacked: hackedStory(content, template, item, "link", { first: clicked.get(item.id) ?? now, second: now }, "") };
    },
    async sendReply(_attemptId, _seq, itemId, withSecret) {
      const item = itemOf(itemId);
      if (ended) return fail("ended");
      if (!item || template !== "MESSAGING") return fail("invalid");
      const secret = withSecret && content.trap.secret.trim().length > 0;
      apply({ type: "reply_sent", item: item.id, secret });
      if (item.kind !== "fake" || !secret) return { ok: true, hacked: null };
      end();
      const now = new Date();
      return { ok: true, hacked: hackedStory(content, template, item, "reply", { first: now, second: now }, "") };
    },
    async payShop(_attemptId, _seq, itemId) {
      const item = itemOf(itemId);
      if (ended) return fail("ended");
      if (!item || template !== "INBOX" || !opensShop(content, item) || !state.clicked.includes(item.id)) return fail("invalid");
      apply({ type: "info_entered", item: item.id });
      return { ok: true, sms: smsFor(content, item)! };
    },
    async answerCode(_attemptId, _seq, itemId, enter) {
      const item = itemOf(itemId);
      if (ended) return fail("ended");
      const decided = state.codeEntered.includes(itemId) || state.codeRefused.includes(itemId);
      const shopCode = !!item?.payment && template === "INBOX" && !!content.mission?.shop && state.infoEntered.includes(item.id);
      const request = !!item && template === "MESSAGING" && opensRequest(content, item) && state.clicked.includes(item.id);
      if (!item || !(shopCode || request) || decided) return fail("invalid");
      apply({ type: enter ? "code_entered" : "code_refused", item: item.id });
      if (item.kind === "fake" && enter) {
        end();
        const now = new Date();
        return { ok: true, hacked: hackedStory(content, template, item, request ? "request" : "code", { first: clicked.get(item.id) ?? now, second: now }, "") };
      }
      const refused = (request ? item.request?.refused : item.payment?.refused) ?? "";
      return { ok: true, hacked: null, reply: enter ? "" : refused, done: shopCode && item.kind === "real" };
    },
    async shipOrder(_attemptId, _seq, itemId, prepared) {
      const item = itemOf(itemId);
      const sale = content.mission?.sale;
      if (ended) return fail("ended");
      if (!item || !sale || template !== "MESSAGING" || !opensOrder(content, item) || !state.clicked.includes(item.id) || state.shipped.includes(item.id)) return fail("invalid");
      apply({ type: "item_shipped", item: item.id, prepared });
      return { ok: true, reply: prepared ? "" : sale.unprepared, done: prepared && item.kind === "real" };
    },
    async sendForm(_attemptId, _seq, itemId) {
      const item = itemOf(itemId);
      const signup = content.mission?.signup;
      if (ended) return fail("ended");
      if (!item || !signup || template !== "INBOX" || !opensForm(content, item) || !state.clicked.includes(item.id)) return fail("invalid");
      apply({ type: "form_sent", item: item.id });
      return { ok: true, done: signup.done };
    },
    async answerTalk(_attemptId, _seq, taskId, option) {
      const task = content.tasks.find((t) => t.id === taskId);
      if (ended) return fail("ended");
      if (!task || task.type !== "question" || !task.talk || !task.options[option] || taskId in state.answers) return fail("invalid");
      apply({ type: "talk_answered", task: task.id, option });
      return { ok: true, reply: talkReply(task, option) };
    },
    async leaveDesk(_attemptId, _seq, closed) {
      if (ended) return fail("ended");
      if (!content.mission?.login || template !== "INBOX" || !state.uploaded || state.left) return fail("invalid");
      const open = state.verified && !state.loggedOut;
      apply({ type: "desk_left", open, closed: open && closed });
      return { ok: true, almost: open ? leaveStory(content, closed) : null };
    },
    async openFile(_attemptId, _seq, itemId) {
      const item = itemOf(itemId);
      if (ended) return fail("ended");
      if (!item || template !== "MESSAGING" || !opensFile(content, item)) return fail("invalid");
      apply({ type: "file_opened", item: item.id });
      return { ok: true };
    },
    async installFile(_attemptId, _seq, itemId) {
      const item = itemOf(itemId);
      if (ended) return fail("ended");
      if (!item || !canInstallFile(content, state, item)) return fail("invalid");
      apply({ type: "info_entered", item: item.id });
      return { ok: true, almost: fileAlmost(content) };
    },
    async installApp(_attemptId, _seq, appId) {
      if (ended) return fail("ended");
      const prompts = installApp(content, state, appId);
      if (!prompts) return fail("invalid");
      apply({ type: "app_installed", app: appId });
      return { ok: true, prompts, after: afterInstall(content, appId) };
    },
    async answerPermission(_attemptId, _seq, appId, index, choice) {
      if (ended) return fail("ended");
      const step = permissionStep(content, state, appId, index, choice);
      if (!step) return fail("invalid");
      apply({ type: "permission_answered", app: appId, index, choice });
      return { ok: true, ...step };
    },
    async openHomework(_attemptId, _seq, appId) {
      if (ended) return fail("ended");
      const done = openHomework(content, state, appId);
      if (done === null) return fail("invalid");
      apply({ type: "homework_opened", app: appId });
      return { ok: true, done };
    },
    async connectWifi(_attemptId, _seq, network, password) {
      if (ended) return fail("ended");
      if (template !== "MESSAGING") return fail("invalid");
      const step = connectWifi(content, state, network, password);
      if (!step) return fail("invalid");
      if (step.record) apply({ type: "wifi_connected", network });
      return { ok: true, result: step.result };
    },
    async installUpdate() {
      if (ended) return fail("ended");
      const done = installUpdate(content, state);
      if (done === null) return fail("invalid");
      apply({ type: "update_installed" });
      return { ok: true, done };
    },
    async closeAd(_attemptId, _seq, itemId) {
      if (ended) return fail("ended");
      if (!canCloseAd(content, state, itemId)) return fail("invalid");
      apply({ type: "ad_closed", item: itemId });
      return { ok: true };
    },
    async finishSetup() {
      if (ended) return fail("ended");
      if (!canFinishSetup(content, state)) return fail("invalid");
      apply({ type: "setup_finished" });
      return { ok: true };
    },
    async trackParcel(_attemptId, _seq, itemId) {
      if (ended) return fail("ended");
      const track = content.mission?.track;
      const item = itemOf(itemId);
      if (!track || !item?.tracking || template !== "INBOX") return fail("invalid");
      const found = sameTracking(item.tracking, track.number);
      apply({ type: "parcel_tracked", item: item.id, found });
      return { ok: true, result: parcelResult(track, found) };
    },
    async finish() {
      const done = missionDone(content, state);
      const openWifi = openConnected(content, state);
      const result = end();
      const reportedFake = result.rows.some((r) => r.type === "fake" && (r.outcome === "reported" || r.outcome === "reportedAfterEngaging"));
      const almost = result.rows.some((r) => r.type === "fake" && r.outcome === "almost");
      return { ok: true, reportPath: "", call: goodCall(content, done, reportedFake, { almost, openWifi }), talk: endingTalk(content, state.answers) };
    },
  };
}

/**
 * Eğitim labı: tıkla-bul ve soruların doğrusu taslaktan; ilerleme kaydedilmez. Bitiş kuralı
 * öğrencidekiyle aynıdır: cevaplanmamış soru varken eğitim bitmez (lib/lab/actions.ts).
 */
export function localTrainingDriver(content: TrainingContent): TrainingDriver {
  const cardOf = (id: string) => content.cards.find((c) => c.id === id);
  const answered: string[] = [];
  return {
    async spot(cardId, part) {
      const card = cardOf(cardId);
      if (card?.type !== "clickFind") return fail("invalid");
      return { ok: true, spot: checkSpot(card, part) };
    },
    async hint(cardId, found, n) {
      const card = cardOf(cardId);
      if (card?.type !== "clickFind" || !validHintRequest(found, n)) return fail("invalid");
      return { ok: true, hint: hintFor(card, found, n) };
    },
    async answer(cardId, option) {
      const card = cardOf(cardId);
      const quiz = card ? quizOf(card) : null;
      if (!card || !quiz || !quiz.options[option]) return fail("invalid");
      if (!answered.includes(card.id)) answered.push(card.id);
      return { ok: true, result: checkQuiz(quiz, option) };
    },
    async place(cardId, picks) {
      const card = cardOf(cardId);
      if (!card || !isPlacement(card) || !validPicks(card, picks)) return fail("invalid");
      if (!answered.includes(card.id)) answered.push(card.id);
      return { ok: true, result: checkPlacement(card, picks) };
    },
    // Önizleme hiçbir şey kaydetmez; oynatıcı yeniden açılınca sürücü de baştan kurulur.
    async restart() {
      answered.length = 0;
      return { ok: true };
    },
    async save(cardIndex) {
      const card = cardIndex >= content.cards.length ? firstUnanswered(content.cards, answered) : null;
      return card === null ? { ok: true } : { ok: false, reason: "unanswered", card };
    },
  };
}
