// Senaryo labındaki öğrenci eylemleri (Lab SDK olayları) ve onlardan çıkan sahne durumu.
// Hem tarayıcı (yarım kalan labı kaldığı yerden açmak) hem sunucu (puanlama) aynı fonksiyonu
// kullanır. Olaylarda doğru/yanlış bilgisi yoktur, yalnızca öğrencinin ne yaptığı vardır.

import * as z from "@/lib/zod";
import type { MissionMode } from "./content";

export const folders = ["inbox", "spam", "trash"] as const;
export type Folder = (typeof folders)[number];

const ref = z.string().regex(/^[a-z0-9-]{1,32}$/);

/** Tarayıcının toplu gönderebildiği olaylar. Bağlantı, sahte form ve cevap ayrı eylemle gelir. */
export const batchEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("item_opened"), item: ref }),
  z.object({ type: z.literal("item_moved"), item: ref, to: z.enum(folders) }),
  z.object({ type: z.literal("attachment_opened"), item: ref }),
  z.object({ type: z.literal("review_done") }),
  z.object({ type: z.literal("answer"), task: ref, option: z.number().int().min(0).max(3) }),
  /**
   * Giriş görevi (mission.login): portalda "Giriş yap" (remember: "Beni hatırla" işaretliydi;
   * şifre hiç gelmez, kutu dokununca kendiliğinden dolar), kodu yazıp içeri girdi, tarayıcının
   * "Şifreyi kaydedeyim mi?" sorusu (saved), ödevi yükledi, portaldan çıkış yaptı.
   */
  z.object({ type: z.literal("login_submitted"), remember: z.boolean() }),
  z.object({ type: z.literal("login_verified") }),
  z.object({ type: z.literal("password_saved"), saved: z.boolean() }),
  z.object({ type: z.literal("homework_uploaded") }),
  z.object({ type: z.literal("logged_out") }),
]);
export type BatchEvent = z.infer<typeof batchEventSchema>;

/** Sunucunun kendi yazdığı olaylar (tarayıcı bunları toplu gönderemez). */
export type ServerEvent =
  | { type: "link_clicked"; item: string }
  | { type: "info_entered"; item: string }
  | { type: "reply_sent"; item: string; secret: boolean }
  /**
   * Görevli oda, onay kararı: alış görevinde SMS'teki onay kodunu yazdı ya da yazmadı (veliye
   * anlattı); satış görevinde bankanın ödeme isteğini onayladı ya da reddetti. İkisi de bir
   * ödemeye "evet" ya da "hayır" demektir.
   */
  | { type: "code_entered"; item: string }
  | { type: "code_refused"; item: string }
  /** Satış görevi: siparişi kargoya verdi; prepared: hazırlık maddelerinin hepsini yaptı (telefonu sıfırladı). */
  | { type: "item_shipped"; item: string; prepared: boolean }
  /** Kayıt görevi: görevdeki formu gönderdi (kutulara yazılan gelmez). */
  | { type: "form_sent"; item: string }
  /**
   * Giriş görevi: zil çalınca kalktı. open: o an portalda oturumu açıktı (sunucu olaylardan
   * bulur); closed: tarayıcıyı kapatmıştı (Az kalsın ekranının "Sen" kutusu için).
   */
  | { type: "desk_left"; open: boolean; closed: boolean }
  /** T3 konuşma: soru yüz yüze cevaplandı; sunucu yazar, çünkü karşıdakinin cevabını o söyler. */
  | { type: "talk_answered"; task: string; option: number };

export type LabEventData = BatchEvent | ServerEvent;

export type SceneState = {
  opened: string[];
  folders: Record<string, Folder>;
  /** Gelen kutusu: linke tıkladığı mailler. */
  clicked: string[];
  /** Mesajlaşma: cevap yazdığı konuşmalar; secret: kodu da gönderdiği. */
  replied: string[];
  secretSent: string[];
  /** Sahte sayfaya bilgi girdiği mailler (yazdığı metin hiç kaydedilmez). */
  infoEntered: string[];
  /** Görevli oda: mağazada ödeyince gelen onay kodunu yazdığı ve yazmadığı öğeler. */
  codeEntered: string[];
  codeRefused: string[];
  /** Satış görevi: kargoya verdiği siparişler ve bunlardan hazırlayarak (sıfırlayarak) gönderdikleri. */
  shipped: string[];
  prepared: string[];
  /** Kayıt görevi: formunu gönderdiği öğeler. */
  formSent: string[];
  answers: Record<string, number>;
  reviewDone: boolean;
  /**
   * Giriş görevi: "Beni hatırla" kararı (girişte; null: henüz girmedi), koda geçip içeri girdi,
   * şifreyi kaydetme kararı (null: sorulmadı), ödevi yükledi, çıkış yaptı. leftOpen: çıkış
   * yapmadan kaç kez kalktı (Az kalsın), leftClosed: o kalkışta tarayıcıyı kapatmıştı, left:
   * çıkış yapıp kalktı (görev biter).
   */
  remember: boolean | null;
  verified: boolean;
  passwordSaved: boolean | null;
  uploaded: boolean;
  loggedOut: boolean;
  leftOpen: number;
  leftClosed: boolean;
  left: boolean;
  /** Rapora yazılan karar sayısı: taşıma, bildirme, cevap. */
  decisions: number;
};

export const emptyState = (): SceneState => ({
  opened: [],
  folders: {},
  clicked: [],
  replied: [],
  secretSent: [],
  infoEntered: [],
  codeEntered: [],
  codeRefused: [],
  shipped: [],
  prepared: [],
  formSent: [],
  answers: {},
  reviewDone: false,
  remember: null,
  verified: false,
  passwordSaved: null,
  uploaded: false,
  loggedOut: false,
  leftOpen: 0,
  leftClosed: false,
  left: false,
  decisions: 0,
});

const add = (list: string[], value: string) => (list.includes(value) ? list : [...list, value]);

export function applyEvent(state: SceneState, event: LabEventData): SceneState {
  switch (event.type) {
    case "item_opened":
      return { ...state, opened: add(state.opened, event.item) };
    case "item_moved":
      return { ...state, folders: { ...state.folders, [event.item]: event.to }, decisions: state.decisions + 1 };
    case "attachment_opened":
      return state;
    case "review_done":
      return state.reviewDone ? state : { ...state, reviewDone: true, decisions: state.decisions + 1 };
    case "answer":
      return { ...state, answers: { ...state.answers, [event.task]: event.option }, decisions: state.decisions + 1 };
    case "link_clicked":
      return { ...state, clicked: add(state.clicked, event.item) };
    case "info_entered":
      return { ...state, infoEntered: add(state.infoEntered, event.item) };
    case "code_entered":
      return { ...state, codeEntered: add(state.codeEntered, event.item), decisions: state.decisions + 1 };
    case "code_refused":
      return { ...state, codeRefused: add(state.codeRefused, event.item), decisions: state.decisions + 1 };
    case "item_shipped":
      return {
        ...state,
        shipped: add(state.shipped ?? [], event.item),
        prepared: event.prepared ? add(state.prepared ?? [], event.item) : (state.prepared ?? []),
        decisions: state.decisions + 1,
      };
    case "form_sent":
      return { ...state, formSent: add(state.formSent ?? [], event.item), decisions: state.decisions + 1 };
    // Giriş görevinde her karar bir kez sayılır: ilk "Giriş yap" ve tarayıcının ilk sorusu.
    case "login_submitted":
      return state.remember !== null ? state : { ...state, remember: event.remember, decisions: state.decisions + 1 };
    // İçeri girince oturum açılır; çıkış yaptıktan sonra yeniden giren yine açık oturumla kalkabilir.
    case "login_verified":
      return { ...state, verified: true, loggedOut: false };
    case "password_saved":
      return state.passwordSaved !== null ? state : { ...state, passwordSaved: event.saved, decisions: state.decisions + 1 };
    case "homework_uploaded":
      return state.uploaded ? state : { ...state, uploaded: true, decisions: state.decisions + 1 };
    case "logged_out":
      return { ...state, loggedOut: true };
    case "desk_left":
      if (state.left) return state;
      return event.open
        ? { ...state, leftOpen: state.leftOpen + 1, leftClosed: state.leftOpen === 0 ? event.closed : state.leftClosed, decisions: state.decisions + 1 }
        : { ...state, left: true, decisions: state.decisions + 1 };
    case "talk_answered":
      return { ...state, answers: { ...state.answers, [event.task]: event.option }, decisions: state.decisions + 1 };
    case "reply_sent":
      return {
        ...state,
        replied: add(state.replied, event.item),
        secretSent: event.secret ? add(state.secretSent, event.item) : state.secretSent,
      };
  }
}

/** Veritabanındaki olay satırı (LabEvent: type + data) -> olay. */
export function rowToEvent(row: { type: string; data: unknown }): LabEventData {
  return { type: row.type, ...(row.data as object) } as LabEventData;
}

export function reduceEvents(events: readonly LabEventData[]): SceneState {
  return events.reduce(applyEvent, emptyState());
}

/** Eski kayıtlarda (görevli odadan önce) olmayan alanlar boş liste sayılır. */
export const codeDecided = (state: Pick<SceneState, "codeEntered" | "codeRefused">) => [...(state.codeEntered ?? []), ...(state.codeRefused ?? [])];

export const folderOf = (state: SceneState, item: string): Folder => state.folders[item] ?? "inbox";

/**
 * Görevlerin durumu: sırayla açılır, biri bitmeden sonraki kilitlidir. mode: görevli odanın türü
 * (lib/lab/content.ts missionMode); görev türüne göre farklı anda biter.
 */
export function taskProgress(
  tasks: readonly { id: string; type: "action" | "review" | "question" | "mission" | "leave" }[],
  state: SceneState,
  mode: MissionMode | null = null,
) {
  const done = tasks.map((task) => {
    // Giriş görevinde "uygulamada yap" portala giriş yapınca ("Giriş yap"), "bırak" kalkınca biter.
    if (task.type === "action") return mode === "login" ? state.remember !== null : state.opened.length > 0;
    if (task.type === "leave") return !!state.left;
    if (task.type === "review") return state.reviewDone;
    // Alış görevi: mağazada ödeyip onay kodu için bir karar verince (yazdı ya da yazmadı) biter.
    // Satış görevi: siparişi kargoya verince biter (ödeme isteğini reddetmek görevi bitirmez).
    // Kayıt görevi: formu gönderince biter.
    if (task.type === "mission") {
      if (mode === "sale") return (state.shipped ?? []).length > 0;
      if (mode === "signup") return (state.formSent ?? []).length > 0;
      // Giriş görevi: ödevi yükleyince biter.
      if (mode === "login") return !!state.uploaded;
      return codeDecided(state).length > 0;
    }
    return task.id in state.answers;
  });
  const current = done.indexOf(false);
  return { done, current: current < 0 ? tasks.length : current, finished: current < 0 };
}

/** Kod gönderildi mi? Rakamlı kodda rakamlar, diğerinde metin aranır (yazılan metin saklanmaz). */
export function containsSecret(text: string, secret: string) {
  const digits = secret.replace(/\D/g, "");
  if (digits.length >= 4) return text.replace(/\D/g, "").includes(digits);
  const needle = secret.trim().toLocaleLowerCase("tr");
  return needle.length > 0 && text.toLocaleLowerCase("tr").includes(needle);
}
