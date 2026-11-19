// "Yayına hazır mı?" listesi. Liste tamamlanmadan oda yayınlanamaz; aynı denetim yayınla eyleminde,
// odanın sayfasında (eksikler) ve oda dosyalarının testinde çalışır. Maddelerin yazısı sözlükte:
// t.admin.room.checklist[anahtar].

import { fillParts, maxScore, rawTotal, stageFits, usesTrapPage, type ScenarioContent, type ScenarioTemplate, type TrainingContent } from "./content";

export type EditorSection = "cover" | "items" | "trap" | "tasks" | "report" | "cards";

export type ScenarioCheck = "cover" | "items" | "signs" | "trap" | "mission" | "tasks" | "options" | "rightWhy" | "total" | "tips" | "stage";
export type TrainingCheck = "cover" | "cards" | "cardText" | "answers";

export type CheckItem<K extends string> = { key: K; ok: boolean; section: EditorSection };

const filled = (value: string) => value.trim().length > 0;

export function scenarioChecklist(content: ScenarioContent, template: ScenarioTemplate): CheckItem<ScenarioCheck>[] {
  const fakes = content.items.filter((i) => i.kind === "fake");
  const reals = content.items.filter((i) => i.kind === "real");
  const questions = content.tasks.filter((t) => t.type === "question");
  const trap = content.trap;
  const mission = content.mission;
  const missionTasks = content.tasks.filter((t) => t.type === "mission");
  // Görevli odaya özgü bağlantılar: mağaza ödemesi, ödeme isteği, sipariş.
  const linked = content.items.filter((i) => i.payment || i.request || i.order || i.form);
  // Giriş görevli odada mail yok, tuzak sahte sayfa değil çıkış yapmadan kalkmaktır (Az kalsın).
  const login = !!mission?.login;

  const checks: CheckItem<ScenarioCheck>[] = [
    // Odanın kendi hatırlatmaları artık zorunlu değil: öğrenci odaya girerken genel hatırlatmaları görür (18. revize).
    { key: "cover", section: "cover", ok: content.meta.name.trim().length >= 4 },
    {
      key: "items",
      section: "items",
      ok: login ? content.items.length === 0 : fakes.length >= 1 && reals.length >= 1 && content.items.every((i) => filled(i.sender) && filled(i.body)),
    },
    {
      key: "signs",
      section: "items",
      ok: fakes.length >= 1 && fakes.every((i) => i.signs.length >= 3 && i.signs.every((s) => filled(s.text))),
    },
    // Gelen kutusunda sahte sayfa; mesajlaşmada gönderilince hackleyen kod ya da (M1) sahte
    // mesajdaki bağlantının açtığı sahte sayfa.
    {
      key: "trap",
      section: "trap",
      ok: login
        ? trap.almost && filled(trap.realLife) && trap.actions.some(filled)
        : filled(trap.ask) &&
        // Görevli odada tuzak sahte mağazadır: sayfası mağaza sayfası, adresi sahte maildeki bağlantı.
        // Kayıt görevinde tuzak yine sahte sayfadır.
        (mission && !mission.signup
          ? true
          : template === "INBOX"
          ? filled(trap.url) && filled(trap.title)
          : filled(trap.secret) || (usesTrapPage(content, template) && fakes.some((i) => i.link !== null))),
    },
    // Görevli oda (Para Çarşısı): görev ve mağaza dolu, en az bir gerçek ve bir sahte bağlantının
    // ödemesi yazılı, tek "görev" maddesi. Görev maddesi yalnızca görevli odada olur; görevsiz odada
    // bu satır listede görünmez (aşağıda), ama görev maddesi ya da ödeme yazılmışsa eksik görünür.
    {
      key: "mission",
      section: "tasks",
      ok: mission ? missionReady(content, template) : missionTasks.length === 0 && linked.length === 0,
    },
    { key: "tasks", section: "tasks", ok: content.tasks.length >= 4 && content.tasks.every((t) => filled(t.text)) },
    {
      key: "options",
      section: "tasks",
      // 3 ya da 4 seçenek (Para Çarşısı soruları 4 seçenekli, Murat 2 Kasım).
      ok: questions.every((t) => t.options.length >= 3 && t.options.every((o) => filled(o.text)) && t.options.some((o) => o.points > 0)),
    },
    // BİLDİR görevinin raporda kendi satırı yok (mail ve mesaj satırları); "Doğrusu" ve "Neden?" yalnızca soruda.
    { key: "rightWhy", section: "tasks", ok: [...questions, ...missionTasks].every((t) => filled(t.right) && filled(t.why)) },
    { key: "total", section: "tasks", ok: maxScore(content) === rawTotal },
    { key: "tips", section: "report", ok: content.tips.filter((t) => filled(t.text)).length >= 3 },
    // Oda sahne şablonu: sahne şablona uyar (masaüstü gelen kutusunda, masadaki telefon
    // mesajlaşmada), şifre yazıldıysa dolu, konuşma yalnızca soru görevinde ve konuşanın adı dolu.
    { key: "stage", section: "tasks", ok: stageReady(content, template) },
  ];
  const talks = content.tasks.some((t) => t.talk);
  return checks.filter(
    (c) =>
      (c.key !== "mission" || mission || missionTasks.length > 0 || linked.length > 0) &&
      (c.key !== "stage" || content.stage || talks) &&
      // Giriş görevinde sahte öğe ve işaret yok.
      (c.key !== "signs" || !login),
  );
}

function stageReady(content: ScenarioContent, template: ScenarioTemplate) {
  const stage = content.stage;
  const stageOk = !stage || (stageFits(stage.type, template) && (!stage.password || filled(stage.password.value)));
  // Giriş görevi bilgisayar ve masadaki telefonla (T2) açılır: kod telefona gelir.
  const loginOk = !content.mission?.login || stage?.type === "DESKTOP_PHONE";
  return (
    stageOk &&
    loginOk &&
    content.tasks.every(
      (t) =>
        !t.talk ||
        (t.type === "question" &&
          filled(t.talk.speaker) &&
          t.talk.lines.length <= t.talk.lines.filter(filled).length &&
          t.talk.replies.length <= t.options.length &&
          t.talk.endings.length <= t.options.length),
    )
  );
}

/**
 * Görevli oda hazır mı: arama, görev ve bitişler dolu, tek "görev" maddesi. Alış görevi (Postam):
 * kart, mağaza ve onay kodu; en az bir gerçek ve bir sahte bağlantının ödemesi yazılı. Satış görevi
 * (Mesajlar): ilan ve hazırlık maddeleri; bir sahte mesajda ödeme isteği, bir gerçek mesajda sipariş.
 * Kayıt görevi (Postam): form dolu; bir gerçek mailin bağlantısı formu açar, ödeme ve sipariş yok.
 */
function missionReady(content: ScenarioContent, template: ScenarioTemplate) {
  const mission = content.mission!;
  const common =
    content.tasks.filter((t) => t.type === "mission").length === 1 &&
    [mission.caller, mission.owner, mission.title, mission.accept, mission.goodTitle, mission.done].every(filled) &&
    mission.lines.some(filled) &&
    mission.good.some(filled) &&
    // Kayıt görevinde kötü bitiş araması yok: yanlış yol "Az kalsın"a gider, oda sürer.
    (!!mission.signup || mission.bad.some(filled));
  if (mission.login) return loginReady(content, template);
  if (!common) return false;
  if (mission.signup) {
    const forms = content.items.filter((i) => i.form);
    return (
      template === "INBOX" &&
      !mission.shop &&
      !mission.card &&
      !mission.sale &&
      [mission.signup.site, mission.signup.title, mission.signup.button, mission.signup.done].every(filled) &&
      forms.length >= 1 &&
      forms.every((i) => i.kind === "real" && i.link !== null) &&
      content.items.every((i) => !i.payment && !i.request && !i.order)
    );
  }
  if (mission.sale) {
    const requests = content.items.filter((i) => i.request);
    const orders = content.items.filter((i) => i.order);
    return (
      template === "MESSAGING" &&
      !mission.shop &&
      !mission.card &&
      [mission.sale.product, mission.sale.price, mission.sale.platform, mission.sale.unprepared].every(filled) &&
      mission.sale.prep.length >= 1 &&
      mission.sale.prep.every(filled) &&
      requests.some((i) => i.kind === "fake") &&
      requests.every((i) => i.link !== null && filled(i.request!.bank) && filled(i.request!.from) && filled(i.request!.amount)) &&
      orders.some((i) => i.kind === "real") &&
      orders.every((i) => i.link !== null && filled(i.order!.buyer)) &&
      content.items.every((i) => !i.payment)
    );
  }
  const paid = content.items.filter((i) => i.payment);
  return (
    template === "INBOX" &&
    !!mission.card &&
    !!mission.shop &&
    [mission.refuse, mission.code, mission.card.number, mission.card.expiry, mission.shop.name, mission.shop.product, mission.shop.price].every(filled) &&
    paid.some((i) => i.kind === "real") &&
    paid.some((i) => i.kind === "fake") &&
    paid.every((i) => i.link !== null && filled(i.payment!.shop) && filled(i.payment!.amount)) &&
    content.items.every((i) => !i.request && !i.order)
  );
}

/**
 * Giriş görevi hazır mı: arama yok, görevi not verir (başlık, maddeler, kabul düğmesi); portal,
 * bilgisayar, ödev, zil ve giriş kodu dolu; görevlerde bir "uygulamada yap" (portala giriş), bir
 * "görev" (ödev), bir "bırak" (kalk) var. Alış, satış ve kayıt alanları yazılmaz.
 */
function loginReady(content: ScenarioContent, template: ScenarioTemplate) {
  const mission = content.mission!;
  const login = mission.login!;
  const count = (type: string) => content.tasks.filter((t) => t.type === type).length;
  return (
    template === "INBOX" &&
    !mission.shop &&
    !mission.card &&
    !mission.sale &&
    !mission.signup &&
    [mission.owner, mission.title, mission.accept, mission.done, mission.code].every(filled) &&
    mission.points.some(filled) &&
    [login.site, login.school, login.url, login.user, login.computer, login.note.title, login.homework.title, login.homework.file, login.bell.text, login.bell.button, login.bell.left, login.next].every(filled) &&
    count("action") === 1 &&
    count("mission") === 1 &&
    count("leave") === 1 &&
    count("review") === 0
  );
}

export function trainingChecklist(content: TrainingContent): CheckItem<TrainingCheck>[] {
  const cards = content.cards;
  const cardOk = cards.every((card) => {
    switch (card.type) {
      case "info":
        // Açılan maddeli düzenlerde (keşfet, adım adım, banka kartı) maddeler dolu olmalı; banka
        // kartının çizimi dört maddeye göredir.
        if (card.layout && card.layout !== "list")
          return (
            filled(card.title) &&
            card.points.length >= (card.layout === "bankCard" ? 4 : 2) &&
            card.points.every((p) => filled(p.title) && filled(p.text))
          );
        return filled(card.title) && (card.paragraphs.some(filled) || card.points.some((p) => filled(p.title)));
      case "clickFind":
        return filled(card.title) && filled(card.mail.sender) && card.spots.length >= 1 && card.spots.every((s) => filled(s.text));
      case "quiz":
        return filled(card.question) && card.options.every(filled) && filled(card.explain);
      case "video":
        return filled(card.title) && filled(card.src) && (!card.question || (filled(card.question.question) && card.question.options.every(filled)));
      case "match":
        // Aynı sağ birden çok kez yazılabilir: sağdakiler o zaman gruplardır.
        return filled(card.title) && card.pairs.length >= 2 && card.pairs.every((p) => filled(p.left) && filled(p.right));
      case "sort": {
        // 2-4 kutu, adları dolu ve farklı; en az 2 bilgi, her biri var olan bir kutuda.
        const labels = card.bins.map((b) => b.label.trim().toLocaleLowerCase("tr"));
        return (
          filled(card.title) &&
          card.bins.length >= 2 &&
          labels.every(Boolean) &&
          new Set(labels).size === labels.length &&
          card.items.length >= 2 &&
          card.items.every((i) => filled(i.text) && i.bin < card.bins.length)
        );
      }
      case "fill": {
        const answers = card.sentences.flatMap((s) => fillParts(s).answers);
        return (
          filled(card.title) &&
          card.sentences.length >= 1 &&
          card.sentences.every(filled) &&
          answers.length >= 1 &&
          answers.every(filled) &&
          card.extra.every(filled)
        );
      }
    }
  });
  const answersOk = cards.every((card) => {
    const quiz = card.type === "quiz" ? card : card.type === "video" ? card.question : null;
    return !quiz || quiz.answer < quiz.options.length;
  });
  return [
    { key: "cover", section: "cover", ok: content.meta.name.trim().length >= 4 && filled(content.meta.summary) },
    { key: "cards", section: "cards", ok: cards.length >= 3 },
    { key: "cardText", section: "cards", ok: cards.length > 0 && cardOk },
    { key: "answers", section: "cards", ok: answersOk },
  ];
}

export const isReady = (items: { ok: boolean }[]) => items.every((i) => i.ok);
