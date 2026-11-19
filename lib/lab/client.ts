// Öğrencinin tarayıcısına giden lab içeriği. Doğru kararlar ve puanlama alanları burada çıkarılır
// (CLAUDE.md, "Lab güvenliği"): öğenin sahte mi gerçek mi olduğu, işaretler, sahte sayfa, soru
// puanları, doğru cevaplar, açıklamalar, rapor metinleri ve ipuçları gitmez.

import { fillParts, type Card, type Mission, type LabMeta, type SortColor, type CardIcon, type QuizArt, type ScenarioContent, type ScenarioTemplate, type Setup, type Stage, type StoreApp, type Task, type TaskType, type TrainingContent, iconedPoints, voicedLines } from "./content";
import { placementBank } from "./training";

export type ClientItem = {
  id: string;
  sender: string;
  address: string;
  subject: string;
  time: string;
  body: string;
  footer: string;
  /** Gösterilen adres; tıklanınca ne açılacağını sunucu söyler. */
  link: { url: string; text: string } | null;
  attachment: { name: string; size: string } | null;
};

export type ClientTask = {
  id: string;
  type: TaskType;
  text: string;
  options: string[];
  /** Paneldeki kısa yol tarifi (boşsa yok). */
  hint: string;
  /**
   * T3: soru yüz yüze sorulur (konuşanın adı, çizimi, yeri, sorudan önceki satırlar ve sesleri);
   * puanları, karşıdakinin cevapları ve son sözler gitmez (cevaplayınca ve bitince sunucudan gelir).
   */
  talk: ClientTalk | null;
};

export type ClientTalk = Pick<NonNullable<Task["talk"]>, "speaker" | "look" | "place" | "lines"> & { voice: (string | null)[] };

/** Oda sahne şablonu; şifre ve ipucu sahnede zaten görünür (puanlama alanı değildir). */
export type ClientStage = Stage;

export type ClientScenario = {
  template: ScenarioTemplate;
  meta: Pick<LabMeta, "name" | "title">;
  reminders: string[];
  items: ClientItem[];
  tasks: ClientTask[];
  /**
   * Mesajlaşma: gönderilince ele geçirilen kod. Sahnede zaten görünür (gerçek bir mesajın
   * içinde); hangi konuşmanın sahte olduğunu söylemez. Gönderilen metin tarayıcıda kalır.
   */
  secret: string;
  /**
   * Görevli oda: açılış araması, görev kartı, kart ve mağaza. Bitiş aramaları (iyi ve kötü) ve
   * öğelerin ödeme SMS'i gitmez: bitişte ve ödeyince sunucudan gelir.
   */
  mission: ClientMission | null;
  /** Oda sahne şablonu; yazılmamışsa null (uygulama doğrudan açılır). */
  stage: ClientStage | null;
};

export type ClientMission = Pick<Mission, "caller" | "look" | "owner" | "lines" | "title" | "points" | "accept" | "refuse"> & {
  /** Açılış satırlarının sesleri (aynı sırayla; sesi olmayan satır null). */
  voice: (string | null)[];
  /** Görev kartı maddelerinin ikonları (aynı sırayla; ikonu olmayan madde null). */
  pointIcons: (CardIcon | null)[];
  /** Alış görevi: kart ve mağaza. Satış görevi: ilan (hazırlamadan gönderince gelen mesaj gitmez). */
  card: Mission["card"] | null;
  shop: Mission["shop"] | null;
  sale: Omit<NonNullable<Mission["sale"]>, "unprepared"> | null;
  /** Kayıt görevi mi (formun kendisi bağlantı açılınca sunucudan gelir). */
  signup: boolean;
  /**
   * Giriş görevi: portal, bilgisayar, not, ödev, zil ve telefona gelen giriş kodu. Kod sahnede
   * zaten görünür (telefonda); "Az kalsın" metinleri gitmez, kalkınca sunucudan gelir.
   */
  login: (Omit<NonNullable<Mission["login"]>, "next"> & { code: string }) | null;
  /**
   * Kurulum görevi: mağaza, arama önerisi, uygulamalar (kopya olduğu, izinleri ve rapor satırları
   * gitmez) ve oyunun ödev ekranı ("açıldı" cümlesi ödevi açınca gelir).
   */
  install: ClientInstall | null;
};

export type ClientStoreApp = Pick<StoreApp, "id" | "name" | "publisher" | "rating" | "downloads" | "category" | "text" | "icon">;
export type ClientInstall = {
  store: string;
  query: string;
  apps: ClientStoreApp[];
  game: { title: string; homework: string; open: string } | null;
  setup: ClientSetup | null;
};

/**
 * Telefon kurulumu: ağların adı ve kilidi (hangisinin evin ağı olduğu gitmez), defterdeki şifre,
 * güncellemenin ekranı ("yüklendi" cümlesi gitmez), reklamın görünüşü ve görevi bitiren bildirim.
 * Açık ağın notu, bilinmeyen şifre cümlesi ve rapor satırı seçince sunucudan gelir.
 */
export type ClientSetup = {
  networks: { name: string; locked: boolean }[];
  password: string;
  notebook: { title: string; from: string };
  update: { title: string; text: string; version: string; size: string };
  ad: { item: string; app: string; title: string; text: string; button: string; source: string };
  finish: { text: string; reply: string };
};

export function toClientScenario(content: ScenarioContent, template: ScenarioTemplate): ClientScenario {
  return {
    template,
    meta: { name: content.meta.name, title: content.meta.title },
    reminders: content.reminders.filter((r) => r.trim()),
    items: content.items.map((item) => ({
      id: item.id,
      sender: item.sender,
      address: item.address,
      subject: item.subject,
      time: item.time,
      body: item.body,
      footer: item.footer,
      link: item.link,
      attachment: item.attachment,
    })),
    tasks: content.tasks.map((task) => ({
      id: task.id,
      type: task.type,
      text: task.text,
      options: task.type === "question" ? task.options.map((o) => o.text) : [],
      hint: task.hint?.trim() ?? "",
      talk:
        task.type === "question" && task.talk
          ? {
              speaker: task.talk.speaker,
              look: task.talk.look,
              place: task.talk.place,
              ...voicedLines(task.talk.lines, task.talk.voice?.lines),
            }
          : null,
    })),
    secret: template === "MESSAGING" ? content.trap.secret : "",
    mission: content.mission
      ? {
          caller: content.mission.caller,
          look: content.mission.look,
          owner: content.mission.owner,
          ...voicedLines(content.mission.lines, content.mission.voice?.lines),
          title: content.mission.title,
          ...iconedPoints(content.mission.points, content.mission.pointIcons),
          accept: content.mission.accept,
          refuse: content.mission.refuse,
          card: content.mission.card ?? null,
          shop: content.mission.shop ?? null,
          sale: content.mission.sale
            ? {
                product: content.mission.sale.product,
                price: content.mission.sale.price,
                platform: content.mission.sale.platform,
                icon: content.mission.sale.icon,
                prep: content.mission.sale.prep.filter((p) => p.trim()),
              }
            : null,
          signup: !!content.mission.signup,
          login: content.mission.login ? { ...withoutNext(content.mission.login), code: content.mission.code } : null,
          install: content.mission.install
            ? {
                store: content.mission.install.store,
                query: content.mission.install.query,
                apps: content.mission.install.apps.map((a) => ({
                  id: a.id,
                  name: a.name,
                  publisher: a.publisher,
                  rating: a.rating,
                  downloads: a.downloads,
                  category: a.category,
                  text: a.text,
                  icon: a.icon,
                })),
                game: content.mission.install.game
                  ? { title: content.mission.install.game.title, homework: content.mission.install.game.homework, open: content.mission.install.game.open }
                  : null,
                setup: content.mission.install.setup ? clientSetup(content.mission.install.setup) : null,
              }
            : null,
        }
      : null,
    stage: content.stage ?? null,
  };
}

function clientSetup(setup: Setup): ClientSetup {
  return {
    networks: setup.wifi.networks.map((n) => ({ name: n.name, locked: n.locked })),
    password: setup.wifi.password,
    notebook: setup.wifi.notebook,
    update: { title: setup.update.title, text: setup.update.text, version: setup.update.version, size: setup.update.size },
    ad: setup.ad,
    finish: setup.finish,
  };
}

function withoutNext(login: NonNullable<Mission["login"]>) {
  const { next: _next, ...rest } = login;
  void _next;
  return rest;
}

export type ClientCard =
  | Extract<Card, { type: "info" }>
  | (Omit<Extract<Card, { type: "clickFind" }>, "spots"> & { spotCount: number })
  | { id: string; type: "quiz"; question: string; options: string[]; art: QuizArt | null; link: { text: string; url: string } | null; sms: { from: string; text: string } | null; file: { from: string; text: string; name: string; size: string } | null; permission: { app: string; text: string; icon: CardIcon } | null; guess: boolean }
  | {
      id: string;
      type: "video";
      title: string;
      src: string;
      duration: string;
      question: { at: number; question: string; options: string[] } | null;
    }
  /** Eşleştirme: sol sütun yazarın sırasıyla, sağ sütun (bank) alfabetik; doğru eşler gitmez. */
  | { id: string; type: "match"; title: string; hint: string; lefts: string[]; icons: (CardIcon | null)[]; bank: string[] }
  /** Boşluk doldurma: her cümle boşluklarla bölünmüş metinler; kelimeler yalnızca alfabetik kutuda. */
  | { id: string; type: "fill"; title: string; hint: string; sentences: string[][]; bank: string[] }
  /** Kutulara ayırma: kutular ve bilgiler yazarın sırasıyla; hangi bilginin hangi kutuya gittiği gitmez. */
  | {
      id: string;
      type: "sort";
      title: string;
      hint: string;
      bins: { label: string; note: string; color: SortColor; icon: CardIcon }[];
      items: { text: string; icon: CardIcon }[];
    };

export function toClientCard(card: Card): ClientCard {
  switch (card.type) {
    case "info":
      return card;
    case "clickFind": {
      const { spots, ...rest } = card;
      return { ...rest, spotCount: spots.length };
    }
    case "quiz":
      return { id: card.id, type: "quiz", question: card.question, options: card.options, art: card.art ?? null, link: card.link ?? null, sms: card.sms ?? null, file: card.file ?? null, permission: card.permission ?? null, guess: card.guess ?? false };
    case "video":
      return {
        id: card.id,
        type: "video",
        title: card.title,
        src: card.src,
        duration: card.duration,
        question: card.question ? { at: card.question.at, question: card.question.question, options: card.question.options } : null,
      };
    case "match":
      return {
        id: card.id,
        type: "match",
        title: card.title,
        hint: card.hint,
        lefts: card.pairs.map((p) => p.left),
        icons: card.pairs.map((p) => p.icon ?? null),
        bank: placementBank(card),
      };
    case "fill":
      return {
        id: card.id,
        type: "fill",
        title: card.title,
        hint: card.hint,
        sentences: card.sentences.map((s) => fillParts(s).texts),
        bank: placementBank(card),
      };
    case "sort":
      return {
        id: card.id,
        type: "sort",
        title: card.title,
        hint: card.hint,
        bins: card.bins.map((b) => ({ label: b.label, note: b.note, color: b.color, icon: b.icon })),
        items: card.items.map((i) => ({ text: i.text, icon: i.icon })),
      };
  }
}

export function toClientTraining(content: TrainingContent): ClientCard[] {
  return content.cards.map(toClientCard);
}
