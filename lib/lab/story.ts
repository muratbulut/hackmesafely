// Bağlantının açacağı sayfa ve hacklendin hikâyesi (alarm ve sonuç sahnesi). Öğrencide sunucu eylemleri
// (lib/lab/actions.ts), yönetimdeki önizlemede tarayıcıdaki sürücü (components/lab/preview/)
// aynı fonksiyonları kullanır. Veritabanına ve oturuma dokunmaz.

import { getMessages } from "@/lib/i18n";
import { siteTimeZone } from "@/lib/site";
import { domainOf, opensForm, opensOrder, opensRequest, opensShop, usesTrapPage, voicedLines, type CallerLook, type CardIcon, type CompromiseKind, type HackedScene, type Item, type Mission, type ScenarioContent, type ScenarioTemplate, type StoreApp, type Task, type TalkPlace } from "./content";

export type LinkPage =
  /**
   * tapFill: "Az kalsın" odasında öğrenci şifre yazmaz, kutuya dokununca şifre noktalarla kendiliğinden
   * yazılır (Murat 18 Kasım); "gerçek şifreni yazma" uyarısı da çıkmaz.
   */
  | { kind: "trap"; url: string; site: string; title: string; text: string; ask: string; compromise: CompromiseKind; account: CompromisedAccount; tapFill: boolean }
  | { kind: "site"; url: string }
  /**
   * Görevli odada mağaza sayfası. Gerçek ve sahte bağlantıda aynıdır (fark adres çubuğunda);
   * hangisinin sahte olduğunu söylemez. Ödeme sonrası SMS ayrıca, ödeyince gelir.
   */
  | { kind: "shop"; url: string; shop: NonNullable<Mission["shop"]> }
  /**
   * Satış görevli odada bankanın ödeme isteği ekranı (bankanın kendi ekranı, sahte site yok):
   * kimden, ne kadar. Onaylamak öğrencinin hesabından para çıkarır.
   */
  | { kind: "request"; url: string; bank: string; from: string; amount: string }
  /** Satış görevli odada pazar yerindeki sipariş: ilan, alıcı ve kargodan önceki hazırlık. */
  | { kind: "order"; url: string; sale: NonNullable<Mission["sale"]>; buyer: string }
  /**
   * Kayıt görevli odada görevdeki form (okulun kulüp kayıt formu): site adı, başlık, kutular ve
   * düğme. Gönderince yazan "Kaydın alındı" cümlesi göndermeden sonra sunucudan gelir.
   */
  | { kind: "form"; url: string; form: Omit<NonNullable<Mission["signup"]>, "done"> };

/**
 * "Az kalsın" ekranı (trap.almost): sahte sayfaya bilgi girince hacklendin alarmı yerine çıkar.
 * Bilgi girildikten sonra söylenir; o an hangi mailin sahte olduğu zaten bellidir.
 */
export type AlmostStory = {
  /** Düğmede yazan ve bağlantının gerçek adresi (yan yana). */
  linkText: string;
  url: string;
  /** Alan adının sahibi: adres sağdan okununca ("kayit-formu.xyz"). */
  owner: string;
  realLife: string;
  steps: string[];
  /**
   * Kurulum görevinde bağlantı yerine iki şey yan yana: "Kurmak üzere olduğun" .apk ile ödevin
   * oyunu ya da kopya oyun ile gerçeği. Yazılmışsa düğme ve adres yerine bu gösterilir.
   */
  compare?: { left: CompareSide; right: CompareSide };
};

/**
 * Giriş görevinde "Az kalsın" (mission.login): çıkış yapmadan kalkınca açılır. closed: tarayıcıyı
 * kapatıp kalktı ("Sen" kutusu); next: sıradakinin yaptığı; realLife ve steps tuzaktan. Kalkınca
 * söylenir; o an doğrusunun çıkış olduğu zaten bellidir.
 */
export type LeaveStory = { kind: "leave"; closed: boolean; next: string; realLife: string; steps: string[] };

export function leaveStory(content: ScenarioContent, closed: boolean): LeaveStory {
  return {
    kind: "leave",
    closed,
    next: content.mission?.login?.next ?? "",
    realLife: content.trap.realLife,
    steps: content.trap.actions.filter((a) => a.trim()),
  };
}

/** Konuşmada bir satır ve sesi (sesi yoksa null). */
export type TalkLine = { text: string; voice: string | null };

/** T3: seçenekten sonra karşıdakinin cevabı (seçilince sunucu söyler); yazılmamışsa null. */
export function talkReply(task: Pick<Task, "talk">, option: number): TalkLine | null {
  const text = task.talk?.replies[option]?.trim();
  if (!text) return null;
  return { text, voice: task.talk?.voice?.replies[option]?.trim() || null };
}

/** Odanın sonundaki yüz yüze konuşma: konuşan, çizimi, yeri ve satırları (seçilen cevaba göre). */
export type EndingTalk = { speaker: string; look: CallerLook; place: TalkPlace; lines: string[]; voice: (string | null)[] };

/**
 * Oda bitince son konuşma: son sözleri yazılmış yüz yüze sorunun, öğrencinin seçtiği cevaba
 * göre satırları. Cevaplanmadıysa ya da satır yoksa null. Rapor hesaplandıktan sonra döner.
 */
export function endingTalk(content: Pick<ScenarioContent, "tasks">, answers: Record<string, number>): EndingTalk | null {
  for (const task of content.tasks) {
    const talk = task.talk;
    const option = answers[task.id];
    if (task.type !== "question" || !talk || option === undefined || !talk.endings[option]) continue;
    const pairs = voicedLines(talk.endings[option], talk.voice?.endings[option]);
    if (pairs.lines.length === 0) continue;
    return { speaker: talk.speaker, look: talk.look, place: talk.place, ...pairs };
  }
  return null;
}

export type CompareSide = { label: string; value: string; note: string };

/** Kurulum görevinde uygulama kurulunca çıkan izin pencereleri (doğru seçenek ve "Az kalsın" gitmez). */
export type InstallPrompt = { text: string; note: string; icon: CardIcon; choices: string[] };

/**
 * Kurulum görevinde izinlerden sonra: gerçek oyun açılır (ödev ekranı), kopya oyunun ödev listesi
 * yoktur (boş ekran ve "Kaldır").
 */
export type InstallAfter = { homework: true } | { homework: false; text: string };

/** Görevli odada ödeyince veliden gelen SMS (sunucu ödeme anında söyler). */
export type ShopSms = { shop: string; amount: string; code: string; note: string };

/** Hesap türünde ele geçirilen hesap. mail: Postam hesabı (bildirimler "mail", sahte sayfa Postam girişi). */
export type CompromisedAccount = { name: string; mail: boolean };

/** Lab yazarının "Hangi hesap?" alanı; boşsa Postam (sabah soruları 25d). */
export function compromisedAccount(name: string): CompromisedAccount {
  const mailApp = getMessages().lab.hacked.defaultAccount;
  const trimmed = name.trim();
  return { name: trimmed || mailApp, mail: !trimmed || trimmed.toLocaleLowerCase("tr") === mailApp.toLocaleLowerCase("tr") };
}

/**
 * Nasıl hacklendi: sahte sayfaya bilgi girerek, mesajlaşmada kodu cevapta göndererek, görevli
 * odada sahte mağazaya ödeyip onay kodunu yazarak ya da (satış görevi) ödeme isteğini onaylayarak.
 */
export type HackedVia = "link" | "reply" | "code" | "request";

/** Alarmın odaya özgü satırı ve bildirimleri (tuzaktaki `alarm`); yoksa türün genel metinleri. */
export type AlarmText = { line: string; notifications: { title: string; text: string }[] };

/** Hacklendin hikâyesi: alarmın ve sonuç sahnesinin metinleri (saatler eski açıklama ekranından, kullanılmıyor). */
export type HackedStory = {
  kind: CompromiseKind;
  template: ScenarioTemplate;
  via: HackedVia;
  sender: string;
  linkText: string;
  domain: string;
  ask: string;
  account: CompromisedAccount;
  /** Alarmdaki "yeni mail" bildirimi için gerçek bir öğenin göndereni. */
  contact: string;
  times: [string, string, string];
  realLife: string;
  actions: string[];
  reportPath: string;
  /** Görevli oda: SMS'teki tutar ("4.850 TL"), kötü bitiş aramasının satırları ve arayan. */
  amount?: string;
  call?: { caller: string; lines: string[]; voice: (string | null)[] };
  alarm?: AlarmText;
  /** Alarmdan sonraki sonuç sahnesi (22. revize); sceneFor. */
  scene: HackedScene;
};

/**
 * Odada sahne seçilmediyse türden: ödeme isteği onaylandıysa bakiye düşer (tutar gerekir), kart
 * ya da parada harcama bildirimleri, bilgi sızıntısında biri evine yaklaşır, hesap ve fidyede
 * profilin değişir. Bakiye sahnesi tutarsız açılamaz; o zaman harcama bildirimleri gelir.
 */
export function sceneFor(chosen: HackedScene | "", kind: CompromiseKind, via: HackedVia, amount: string): HackedScene {
  const scene: HackedScene = chosen || (via === "request" ? "money" : kind === "financial" ? "card" : kind === "data_leak" ? "home" : "account");
  return scene === "money" && !amountValue(amount) ? "card" : scene;
}

/** "4.000 TL" -> 4000; okunamazsa 0. */
export function amountValue(amount: string): number {
  const digits = amount.replace(/[^\d,]/g, "").replace(",", ".");
  const value = Number.parseFloat(digits);
  return Number.isFinite(value) ? Math.round(value) : 0;
}

/**
 * Mail ya da mesaj içindeki bağlantı: sahte öğedeyse (ve odada sahte sayfa varsa) sahte sayfa,
 * gerçekteyse yalnızca adres gösterilir.
 */
export function linkPageFor(content: ScenarioContent, template: ScenarioTemplate, item: Item & { link: NonNullable<Item["link"]> }): LinkPage {
  const trap = content.trap;
  if (content.mission?.shop && opensShop(content, item)) return { kind: "shop", url: item.link.url, shop: content.mission.shop };
  if (content.mission?.sale && item.request && opensRequest(content, item)) {
    return { kind: "request", url: item.link.url, bank: item.request.bank, from: item.request.from, amount: item.request.amount };
  }
  if (content.mission?.signup && opensForm(content, item)) {
    const { site, title, fields, button } = content.mission.signup;
    return { kind: "form", url: item.link.url, form: { site, title, fields: fields.filter((f) => f.trim()), button } };
  }
  if (content.mission?.sale && item.order && opensOrder(content, item)) {
    // Hazırlamadan gönderince gelen mesaj kargoya verince söylenir (shipOrder).
    return { kind: "order", url: item.link.url, sale: { ...content.mission.sale, unprepared: "" }, buyer: item.order.buyer };
  }
  return item.kind === "fake" && usesTrapPage(content, template)
    ? {
        kind: "trap",
        url: trap.url || item.link.url,
        site: item.sender,
        title: trap.title,
        text: trap.text,
        ask: trap.ask,
        compromise: trap.kind,
        account: compromisedAccount(trap.account),
        tapFill: trap.almost,
      }
    : { kind: "site", url: item.link.url };
}

const clock = (d: Date) => new Intl.DateTimeFormat("tr-TR", { timeZone: siteTimeZone, hour: "2-digit", minute: "2-digit" }).format(d);

/**
 * first: bağlantıya tıkladığı (cevapla hacklendiyse cevabı gönderdiği) an, second: bilgiyi girdiği
 * an. Üçüncü adım (hesabın ele geçirilmesi) bir dakika sonra gösterilir.
 */
export function hackedStory(
  content: ScenarioContent,
  template: ScenarioTemplate,
  item: Item,
  via: HackedVia,
  times: { first: Date; second: Date },
  reportPath: string,
): HackedStory {
  const account = compromisedAccount(content.trap.account);
  const mission = via === "code" || via === "request" ? content.mission : undefined;
  const amount = mission ? (item.payment?.amount ?? item.request?.amount ?? "") : "";
  return {
    kind: content.trap.kind,
    template,
    via,
    sender: item.sender,
    linkText: item.link?.text ?? "",
    domain: domainOf(content.trap.url || item.link?.url || ""),
    ask: content.trap.ask,
    account,
    // Hesabın kendi uygulamasından gelen gerçek öğe (ör. Postam'ın kod mesajı) "Bu linki sen mi
    // gönderdin?" diye yazamaz; ondan başka bir gerçek gönderen seçilir.
    contact: content.items.find((i) => i.kind === "real" && i.sender.trim() !== account.name)?.sender ?? "",
    times: [clock(times.first), clock(times.second), clock(new Date(times.second.getTime() + 60_000))],
    realLife: content.trap.realLife,
    actions: content.trap.actions.filter((a) => a.trim()),
    reportPath,
    scene: sceneFor(content.trap.scene, content.trap.kind, via, amount),
    ...(mission
      ? {
          amount,
          call: { caller: mission.caller, ...voicedLines(mission.bad, mission.voice?.bad) },
        }
      : {}),
    ...(content.trap.alarm && (content.trap.alarm.line.trim() || content.trap.alarm.notifications.length > 0)
      ? { alarm: { line: content.trap.alarm.line, notifications: content.trap.alarm.notifications } }
      : {}),
  };
}

/** "Az kalsın" ekranının metinleri (sahte sayfaya bilgi girilince). */
export function almostStory(content: ScenarioContent, item: Item): AlmostStory {
  const url = content.trap.url || item.link?.url || "";
  return {
    linkText: item.link?.text ?? "",
    url,
    owner: ownerOf(domainOf(url)),
    realLife: content.trap.realLife,
    steps: content.trap.actions.filter((a) => a.trim()),
  };
}

/** Kurulum görevi: mesajdaki .apk kurulmak istenince "Az kalsın" (metin ve maddeler tuzaktan). */
export function fileAlmostStory(content: ScenarioContent): AlmostStory {
  const compare = content.mission?.install?.fileCompare;
  return {
    linkText: "",
    url: "",
    owner: "",
    realLife: content.trap.realLife,
    steps: content.trap.actions.filter((a) => a.trim()),
    ...(compare ? { compare } : {}),
  };
}

/** Kurulum görevi: kopya oyunun "Az kalsın" getiren iznine evet denince. */
export function copyAlmostStory(app: StoreApp): AlmostStory {
  return {
    linkText: "",
    url: "",
    owner: "",
    realLife: app.almost?.realLife ?? "",
    steps: (app.almost?.steps ?? []).filter((a) => a.trim()),
    ...(app.almost ? { compare: app.almost.compare } : {}),
  };
}

/** Uygulama kurulunca sorulan izinler, tarayıcıya giden hâliyle. */
export function installPrompts(app: StoreApp): InstallPrompt[] {
  return app.permissions.map((p) => ({ text: p.text, note: p.note, icon: p.icon, choices: p.choices }));
}

/** Son izinden sonra ne açılır. */
export function installAfter(app: StoreApp): InstallAfter {
  return app.copy ? { homework: false, text: app.empty } : { homework: true };
}

/**
 * Alan adının sahibi: sağdan iki parça, ülke ve kurum uzantılarında (k12.tr, com.tr, co.uk) üç.
 * "cinarortaokulu.k12.tr.kayit-formu.xyz" -> "kayit-formu.xyz".
 */
export function ownerOf(domain: string) {
  const parts = domain.toLowerCase().split(".").filter(Boolean);
  const second = new Set(["com", "net", "org", "edu", "gov", "k12", "gen", "co", "ac", "sch", "bel", "av"]);
  const n = parts.length >= 3 && parts[parts.length - 1].length === 2 && second.has(parts[parts.length - 2]) ? 3 : 2;
  return parts.slice(-n).join(".");
}

/** Ödeme sonrası veliye gelen SMS; öğede ödeme yazılı değilse null. */
export function smsFor(content: ScenarioContent, item: Item): ShopSms | null {
  if (!content.mission?.shop || !item.payment) return null;
  return { shop: item.payment.shop, amount: item.payment.amount, code: content.mission.code, note: item.payment.note };
}

/**
 * İyi bitiş araması: görevli odada iş doğru yerden yapıldıysa odayı bitirince gösterilir. Sahte
 * maili bildirdiyse teşekkür satırı eklenir. Rapor hesaplandıktan sonra döner (doğrusu artık açık).
 */
export function goodCall(content: ScenarioContent, done: boolean, reportedFake: boolean) {
  const mission = content.mission;
  if (!mission || !done) return null;
  const voice = mission.voice;
  const call = voicedLines(
    [...mission.good, ...(reportedFake ? [mission.goodReported] : [])],
    [...mission.good.map((_, i) => voice?.good[i] ?? ""), ...(reportedFake ? [voice?.goodReported ?? ""] : [])],
  );
  return { caller: mission.caller, ...call, title: mission.goodTitle };
}
