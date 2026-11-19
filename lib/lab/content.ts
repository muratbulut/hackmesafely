// Lab içeriğinin biçimi (doküman Bölüm 4, Tur 4 Lab düzenleme formu). Lablar kod değil içeriktir:
// bu biçimde JSON olarak veritabanında durur (Lab.draftContent, yayınlanınca LabVersion.content)
// ve yönetimdeki formla yazılır. Odalar labs/rooms/, örnekleri labs/examples/, testlerin sabit kopyaları tests/fixtures/rooms/.
//
// Şema biçimi denetler; taslak eksik olabilir (boş metin geçerlidir). Yayına çıkmak için
// eksiksiz olması gerekir, onu lib/lab/checklist.ts denetler.
//
// Bu dosyada doğru kararlar da vardır (sahte/gerçek, puanlar). Öğrencinin tarayıcısına içerik
// her zaman lib/lab/client.ts'ten geçerek, bu alanlar çıkarılmış olarak gider.

import { smartQuotes } from "@/lib/typography";
import * as z from "@/lib/zod";

export const templates = ["TRAINING", "INBOX", "MESSAGING"] as const;
export type Template = (typeof templates)[number];
export type ScenarioTemplate = Exclude<Template, "TRAINING">;

export const difficulties = ["EASY", "MEDIUM", "HARD"] as const;
export type Difficulty = (typeof difficulties)[number];

// Ele geçirilme türleri (Hacklendin-Turler): hesap, fidye, veri sızıntısı, para.
export const compromiseKinds = ["account", "ransom", "data_leak", "financial"] as const;
export type CompromiseKind = (typeof compromiseKinds)[number];
/**
 * Alarmdan sonraki sonuç sahnesi (3 Kasım, 22. revize): money bankada bakiye düşer, card harcama
 * bildirimleri yağar, account profilin değişir ve arkadaşlarına senin adınla mesaj gider, home
 * haritada biri evine yaklaşır. Odada boşsa türden seçilir (lib/lab/story.ts sceneFor).
 */
export const hackedScenes = ["money", "card", "account", "home"] as const;
export type HackedScene = (typeof hackedScenes)[number];

const line = (max = 200) => z.string().trim().max(max);
const id = z
  .string()
  .regex(/^[a-z0-9-]{1,32}$/, "id küçük harf, rakam ve tire olmalı");

// Bağlantı ve adresler yalnızca gösterilir, hiçbir zaman açılmaz. Şema ve boşluk yok, kısa.
const fakeUrl = z
  .string()
  .trim()
  .max(120)
  .regex(/^[^\s<>"']*$/, "adreste boşluk ve tırnak olmaz");

// --- Ortak: kapak --------------------------------------------------------------------

export const metaSchema = z.object({
  /** Ciddi ad; yönetimde ve kartlarda: "Sahte kargo maili". */
  name: line(80),
  /** Esprili başlık, isteğe bağlı: "Kargonuz kapıda... değil!". */
  title: line(80).default(""),
  /** Kartlardaki tek satır. */
  summary: line(200).default(""),
  /** Lab detayındaki kısa hikâye. */
  story: line(800).default(""),
  /** "Bu odada ne öğreneceksin": en fazla 3 madde. */
  learn: z.array(z.object({ title: line(80), text: line(240) })).max(3).default([]),
  difficulty: z.enum(difficulties).default("EASY"),
  durationMin: z.number().int().min(1).max(60).default(5),
});
export type LabMeta = z.infer<typeof metaSchema>;

// --- Eğitim labı: kartlar ------------------------------------------------------------

/** Tıkla-bul maili: her parça tıklanabilir; hangilerinin şüpheli olduğu `spots`ta. */
export const clickMailSchema = z.object({
  sender: line(60),
  address: line(80),
  subject: line(120),
  time: line(20).default(""),
  paragraphs: z.array(line(400)).max(6).default([]),
  button: line(40).default(""),
  footer: line(200).default(""),
});

/** Mailin tıklanabilir parçası: "sender", "address", "subject", "p0".."p5", "button", "footer". */
export const mailPart = z.string().regex(/^(sender|address|subject|button|footer|p[0-5])$/);

/**
 * Kartlardaki renkler ve ikonlar (temadaki renkler, lucide ikonları; kodda karşılıkları
 * `components/lab/training/card-icons.ts`). Kutulara ayırmada kutular yalnızca renkle değil adı ve
 * ikonuyla da ayırt edilir; ikonlar bilgi kartının maddelerinde ve eşleştirmenin sol satırlarında da
 * kullanılır.
 */
export const sortColors = ["green", "yellow", "red", "blue", "purple"] as const;
export type SortColor = (typeof sortColors)[number];
export const cardIcons = [
  "globe", "users", "lock", "eye", "shield", "ban",
  "gamepad", "school", "camera", "house", "key", "phone", "card", "mail", "user", "id", "pin", "calendar", "message", "image", "heart", "tag",
  "call", "flip", "stop", "ask", "search", "flag", "gift", "pen",
  "headphones", "file", "cog", "download",
] as const;
export type CardIcon = (typeof cardIcons)[number];

const quizSchema = z.object({
  question: line(240),
  options: z.array(line(160)).min(2).max(4),
  answer: z.number().int().min(0).max(3),
  explain: line(400).default(""),
});

/**
 * Bilgi kartının düzeni (Tur 7). list: başlıklı maddeler alt alta (eski kartlar böyle kalır).
 * explore: maddeler bir profil kartının alanlarıdır, öğrenci dokunup açar; ikinci paragraf hepsi
 * açılınca görünür. steps: maddeler sırayla açılan adımlardır ("Dur, sor, kontrol et"). bankCard:
 * örnek banka kartı çizimi; dört madde sırasıyla kartın önü, arkası (CVV), SMS kodu ve veli izni,
 * ikinci paragraf üçüncü madde açılınca görünür. list dışındakilerde bütün maddeler açılmadan Devam yok.
 * Yazılmazsa list (alan isteğe bağlı; eski odalar değişmeden okunur).
 */
export const infoLayouts = ["list", "explore", "steps", "bankCard"] as const;
export type InfoLayout = (typeof infoLayouts)[number];

/** Mini testin üstündeki hareketli çizim (Tur 7): hediye kutusu ya da oltadaki 1 TL; yazılmazsa çizim yok. */
export const quizArts = ["gift", "coin"] as const;
export type QuizArt = (typeof quizArts)[number];

export const cardSchema = z.discriminatedUnion("type", [
  z.object({
    id,
    type: z.literal("info"),
    title: line(120),
    paragraphs: z.array(line(500)).max(4).default([]),
    /** Başlıklı maddeler ("Tıklama, cevap verme" gibi), isteğe bağlı; ikon yazılmazsa düzenin varsayılanı. */
    points: z
      .array(z.object({ title: line(80), text: line(240), icon: z.enum(cardIcons).optional() }))
      .max(4)
      .default([]),
    layout: z.enum(infoLayouts).optional(),
  }),
  z.object({
    id,
    type: z.literal("clickFind"),
    title: line(120),
    hint: line(160).default(""),
    mail: clickMailSchema,
    /**
     * Şüpheli parçalar ve açıklamaları; bulunan her parça numarasıyla gösterilir. `hint`: "İpucu al"
     * deyince söylenen, yeri göstermeden nereye bakılacağını anlatan cümle (boşsa parçaya göre genel
     * bir cümle; Murat, 3 Kasım). İpucu da doğrusu gibi sunucudan gelir.
     */
    spots: z.array(z.object({ part: mailPart, text: line(300), hint: line(160).optional() })).max(5).default([]),
  }),
  z.object({
    id,
    type: z.literal("quiz"),
    ...quizSchema.shape,
    art: z.enum(quizArts).optional(),
    /**
     * Sorunun üstünde bir mail düğmesi (Şehir Kapısı, 18 Kasım): düğmede `text` yazar; üstüne gelince
     * (telefonda basılı tutunca) gerçek adres `url` görünür. Açılışta bir kez kendisi gösterir, sonra
     * öğrenci dener. Gerçek bağlantı değildir, hiçbir yere gitmez. Yazılırsa `art` yerine çıkar.
     */
    link: z.object({ text: line(60), url: line(120) }).optional(),
    /**
     * Sorunun üstünde bir telefon bildirimi (Şehir Kapısı, Hesap ve giriş): sorunun anlattığı SMS,
     * gönderen ve metin. Yalnızca gösterilir. Yazılırsa `art` yerine çıkar; `link` varsa o çıkar.
     */
    sms: z.object({ from: line(40), text: line(160) }).optional(),
    /**
     * Sorunun üstünde bir mesaj eki (Şehir Kapısı, Dosya ve uygulama): grupta ya da sohbette gelen
     * dosya; gönderen, mesaj, dosya adı ve boyutu. Cevaptan sonra adın son noktadan sonrası (uzantı,
     * "soyadı") sarıyla ayrılır. Yalnızca gösterilir, indirilmez. `link` ve `sms` yoksa çıkar.
     */
    file: z.object({ from: line(40), text: line(160).default(""), name: line(60), size: line(20).default("") }).optional(),
    /**
     * Sorunun üstünde bir izin penceresi (Şehir Kapısı, Dosya ve uygulama): uygulamanın adı, ne
     * istediği ve ikonu. "İzin ver" ve "Reddet" yalnızca çizimdir, basılmaz. `link`, `sms`, `file` yoksa çıkar.
     */
    permission: z.object({ app: line(40), text: line(120), icon: z.enum(cardIcons).default("camera") }).optional(),
    /**
     * Kuraldan önce gelen soru (Şehir Kapısı, 18 Kasım, Murat): etiketi "Mini test" yerine "Önce
     * tahmin", geri bildirimi yumuşak ("Tahminin doğru!", "İyi tahmin, ama doğrusu B."). Puanlama aynı.
     */
    guess: z.boolean().optional(),
  }),
  z.object({
    id,
    type: z.literal("video"),
    title: line(120),
    /** Yalnızca sitenin kendi dosyası (/videolar/...); dış adres yok ("//site" de dış adrestir). */
    src: z.string().trim().max(200).regex(/^(\/(?!\/)[\w\-./]*)?$/, "video sitenin kendi dosyası olmalı"),
    duration: line(10).default(""),
    /** Video bu saniyede durur ve soru sorulur; soru yoksa izlemek yeter. */
    question: quizSchema.extend({ at: z.number().int().min(0).max(3600) }).nullable().default(null),
  }),
  z.object({
    id,
    type: z.literal("match"),
    title: line(120),
    hint: line(160).default(""),
    /**
     * Doğru eşler. Öğrenci sağdakileri tekrarsız ve alfabetik bir kutuda görür, soldakilere dağıtır.
     * Aynı sağ birden çok kez yazılabilir (gruplar); renkli kutularla gruplamak için "sort" kartı var.
     * Sol satırın ikonu isteğe bağlı; yazılmazsa satır numarasıyla görünür.
     */
    pairs: z
      .array(z.object({ left: line(80), right: line(160), icon: z.enum(cardIcons).optional() }))
      .max(6)
      .default([]),
    explain: line(400).default(""),
  }),
  z.object({
    id,
    type: z.literal("sort"),
    title: line(120),
    hint: line(160).default(""),
    /** Kutular (2-4): "Yeşil kutu", "Herkesle paylaşılabilir", renk ve ikon. Öğrenci bu sırayla görür. */
    bins: z
      .array(z.object({ label: line(40), note: line(80).default(""), color: z.enum(sortColors), icon: z.enum(cardIcons) }))
      .max(4)
      .default([]),
    /** Yerleştirilecek bilgiler ve doğru kutuları (`bins` içindeki sırası). Doğru kutu tarayıcıya gitmez. */
    items: z
      .array(z.object({ text: line(80), icon: z.enum(cardIcons).default("tag"), bin: z.number().int().min(0).max(3) }))
      .max(8)
      .default([]),
    /**
     * Kutular açıktan kapalıya sıralıysa (yeşil, sarı, kırmızı): bir bilgiyi doğrusundan daha
     * kapalı bir kutuya koymak hata sayılmaz, anlayışlı bir notla doğru sayılır ("paylaşmamak da
     * senin tercihin"). Daha açık kutuya koymak yine yanlıştır (Murat, 3 Kasım).
     */
    lenient: z.boolean().optional(),
    explain: line(400).default(""),
  }),
  z.object({
    id,
    type: z.literal("fill"),
    title: line(120),
    hint: line(160).default(""),
    /** Cümleler; boşluğa gelecek kelime köşeli parantezde: "Kartın arkasındaki koda [CVV] denir." */
    sentences: z.array(line(300)).max(6).default([]),
    /** Kelime kutusundaki yanıltıcı kelimeler (cevaplarla birlikte alfabetik sırada görünür). */
    extra: z.array(line(40)).max(6).default([]),
    explain: line(400).default(""),
  }),
]);
export type Card = z.infer<typeof cardSchema>;
export type CardType = Card["type"];

/** Boşluk doldurma cümlesindeki boşluk: köşeli parantez içindeki kelime (en fazla 40 harf). */
const blankPattern = /\[([^[\]]{1,40})\]/g;

/**
 * Boşluk doldurma cümlesini parçalarına ayırır: boşluklar arasındaki metinler (boşluk sayısından
 * bir fazla) ve boşluklara gelecek kelimeler. "A [b] c" -> { texts: ["A ", " c"], answers: ["b"] }.
 */
export function fillParts(sentence: string) {
  const texts: string[] = [];
  const answers: string[] = [];
  let last = 0;
  for (const match of sentence.matchAll(blankPattern)) {
    texts.push(sentence.slice(last, match.index));
    answers.push(match[1].trim());
    last = match.index + match[0].length;
  }
  texts.push(sentence.slice(last));
  return { texts, answers };
}

export const trainingSchema = z.object({
  meta: metaSchema,
  cards: z.array(cardSchema).max(20).default([]),
});
export type TrainingContent = z.infer<typeof trainingSchema>;

// --- Senaryo labı: gelen kutusu ve mesajlaşma ----------------------------------------

/** İşaretin yeri. Gelen kutusunda Gönderen/Metin/Bağlantı, mesajlaşmada Gönderen/Metin/İstek. */
export const signPlaces = ["sender", "text", "link", "ask"] as const;
export type SignPlace = (typeof signPlaces)[number];

export const signSchema = z.object({
  at: z.enum(signPlaces),
  text: line(300),
  /** Rapordaki mail resminde işaretlenecek parça (mailde geçen birkaç kelime), isteğe bağlı. */
  quote: line(120).default(""),
});

export const itemSchema = z.object({
  id,
  kind: z.enum(["fake", "real"]),
  sender: line(60),
  /** Mail adresi, telefon numarası ya da kullanıcı adı. */
  address: line(80),
  /** Yalnızca gelen kutusunda. */
  subject: line(120).default(""),
  time: line(20).default(""),
  /** Paragraflar boş satırla ayrılır; **kalın** yazılabilir. */
  body: line(1200).default(""),
  /** Gelen kutusu: mailin altındaki küçük gri satırlar. */
  footer: line(300).default(""),
  /** Gelen kutusu: mavi düğme. Sahte maildeki bağlantı sahte sayfayı açar. */
  link: z.object({ url: fakeUrl, text: line(40) }).nullable().default(null),
  attachment: z.object({ name: line(60), size: line(20) }).nullable().default(null),
  /** Sahte olanlarda 3 işaret; raporda numaralı gösterilir. */
  signs: z.array(signSchema).max(5).default([]),
  /** Raporda "Neden?". */
  why: line(400).default(""),
  /**
   * Görevli odada (mission.shop) bu bağlantının açtığı mağazada ödeme yapınca veliye gelen SMS:
   * mağaza adı ve tutar ("TKNPZR*ODEME", "4.850 TL"), velinin notu ("Sen 1.199 TL demiştin?") ve
   * "Yazma, anneme anlat" denince velinin cevabı. Sahteyi ele verdiği için tarayıcıya önceden
   * gitmez; öğrenci "Öde"ye basınca sunucu söyler (lib/lab/actions.ts payShop). İsteğe bağlı.
   */
  payment: z
    .object({ shop: line(40), amount: line(20), note: line(160).default(""), refused: line(200).default("") })
    .optional(),
  /**
   * Satış görevli odada (mission.sale, Mesajlar) bu mesajın bağlantısı bankanın "ödeme isteği"
   * ekranını açar: kimden, ne kadar ("Selin K.", "4.000 TL"), banka adı ve "Reddet" denince gelen
   * cevap. İstek, öğrencinin hesabından para çıkarır; onaylamak ele geçirilmedir (sahte öğede).
   * Ekranın içeriği bağlantıya dokununca sunucudan gelir (lib/lab/story.ts linkPageFor).
   */
  request: z.object({ bank: line(30), from: line(40), amount: line(20), refused: line(200).default("") }).optional(),
  /**
   * Satış görevli odada bu mesajın bağlantısı pazar yerindeki siparişi açar: alıcının adı. Sipariş
   * sayfasında kargodan önceki hazırlık (mission.sale.prep) ve "Kargoya ver" durur.
   */
  order: z.object({ buyer: line(40) }).optional(),
  /**
   * Kayıt görevli odada (mission.signup, Şehir Kapısı) bu bağlantı görevdeki formu açar (okulun
   * kulüp kayıt formu). Formu gönderince görev biter. Gerçek öğede yazılır; isteğe bağlı.
   */
  form: z.boolean().optional(),
});
export type Item = z.infer<typeof itemSchema>;

export const trapSchema = z.object({
  /**
   * Sahte sayfanın adresi ve başlığı ("Postam ile doğrula"). Gelen kutusunda zorunlu; mesajlaşmada
   * isteğe bağlı: başlık yazılırsa sahte mesajdaki bağlantı bu sayfayı açar (usesTrapPage).
   */
  url: fakeUrl.default(""),
  title: line(80).default(""),
  /** Sahte sayfadaki kısa açıklama ("Teslimat adresinizi güncellemek için..."). */
  text: line(300).default(""),
  /** Ne istiyor: "Postam şifresi", "Doğrulama kodu (6 hane)". */
  ask: line(80).default(""),
  /** Mesajlaşma: öğrenci bu kodu (ya da metni) gönderirse ele geçirilir. */
  secret: line(40).default(""),
  kind: z.enum(compromiseKinds).default("account"),
  /** Hesap türünde ele geçirilen hesabın adı (ör. "Oyun"); boşsa Postam. Sahte sayfa ve alarm bu adı söyler. */
  account: line(30).default(""),
  /** Sonuç sahnesi; boşsa türden seçilir (hackedScenes). */
  scene: z.enum(["", ...hackedScenes]).default(""),
  /** Sonuç sahnesinin üstündeki "Gerçek hayatta" cümlesi; boşsa sahnenin genel metni. */
  realLife: line(500).default(""),
  /**
   * Eskiden hacklendin açıklamasındaki "Bir dahaki sefere" maddeleri. Açıklama ekranı kalktı
   * (3 Kasım, 19. revize); alan eski odalar okunabilsin diye duruyor, gösterilmiyor.
   */
  actions: z.array(line(200)).max(3).default([]),
  /**
   * Alarmdaki satır ve bildirimler ("Annenin kartından 4.850 TL çekildi"); boşsa türün genel
   * metinleri. İsteğe bağlı (Para Çarşısı, 2 Kasım).
   */
  alarm: z
    .object({ line: line(80).default(""), notifications: z.array(z.object({ title: line(60), text: line(80) })).max(3).default([]) })
    .optional(),
  /**
   * "Az kalsın" (Şehir Kapısı, 18 Kasım): sahte sayfaya bilgi girmek odayı bitirmez. Hacklendin
   * alarmı yerine yumuşak bir ekran çıkar: `realLife` ne olabileceğini, `actions` "Bir dahaki
   * sefere" maddelerini söyler, düğmenin yazısı ile gerçek adres yan yana durur. Öğrenci gelen
   * kutusuna döner, görevi bitirebilir; sahte öğenin puanı yine 0'dır. Yalnızca sahte sayfada
   * (bağlantı) geçerlidir.
   */
  almost: z.boolean().default(false),
});
export type Trap = z.infer<typeof trapSchema>;

/** Görevli odadaki arama ve konuşma sesleri: yalnızca sitenin kendi dosyası ("//site" dış adrestir). */
const voiceSrc = z.string().trim().max(200).regex(/^(\/(?!\/)[\w\-./]*\.mp3)?$/, "ses sitenin kendi mp3 dosyası olmalı");

/** Konuşmanın yeri (T3): evde sehpa (anne, baba) ya da okulda sıra (sınıf arkadaşı). */
export const talkPlaces = ["home", "school"] as const;
export type TalkPlace = (typeof talkPlaces)[number];

/** Arayanın çizimi: anne, baba ya da arkadaş (Deniz) (components/lab/mission/CallerAvatar.tsx). */
export const callerLooks = ["mother", "father", "friend"] as const;
export type CallerLook = (typeof callerLooks)[number];

export const taskTypes = ["action", "review", "question", "mission", "leave"] as const;
export type TaskType = (typeof taskTypes)[number];

export const taskSchema = z.object({
  id,
  /**
   * action: uygulamayı aç; review: incele, şüphelileri bildir; question: 3 seçenekli soru;
   * mission: görevli odada velinin işi (mağazadan al), doğru mağazadan alınca 1 puan; leave:
   * giriş görevinde (mission.login) zil çalınca bilgisayarı sıradakine bırakmak, kalkınca biter.
   */
  type: z.enum(taskTypes),
  text: line(200),
  /** Panelde, sıradaki görevin altındaki kısa yol tarifi ("Tarayıcıyı aç..."), isteğe bağlı. */
  hint: line(200).optional(),
  options: z.array(z.object({ text: line(160), points: z.number().int().min(0).max(4) })).max(4).default([]),
  /** Raporda "Doğrusu" ve "Neden?"; yalnızca soru görevinde. Eski BİLDİR görevlerinde dolu olabilir, kullanılmaz. */
  right: line(300).default(""),
  why: line(400).default(""),
  /**
   * T3 karşılıklı konuşma (oda sahne şablonu, 18 Kasım, Murat): soru görevi panelde değil yüz yüze
   * sorulur. Sinema şeritli sahnede karşıdakinin silüeti, sözü (görevin metni) üstte altyazı,
   * seçenekler altta 1, 2, 3. Puanı ve raporu diğer sorularla aynıdır; yalnızca soru görevinde.
   */
  talk: z
    .object({
      speaker: line(40),
      look: z.enum(callerLooks).default("mother"),
      /** Sahnenin yeri: evde sehpa, okulda sıra (klavye ve telefon). */
      place: z.enum(talkPlaces).default("home"),
      /**
       * Sorudan önce söylenenler (Şehir Kapısı, okul bilgisayarı), sırayla "Devam" ile; son satırdan
       * sonra seçenekler gelir. Boşsa görevin metni söylenir (eski odalar böyle kalır).
       */
      lines: z.array(line(200)).max(4).default([]),
      /**
       * Seçenekten sonra karşıdakinin cevabı, seçeneklerin sırasıyla. Cevap doğrusunu ele verdiği
       * için tarayıcıya önceden gitmez; seçilince sunucu söyler (lib/lab/actions.ts answerTalk).
       */
      replies: z.array(line(200)).max(4).default([]),
      /**
       * Oda bitince karşıdakiyle son konuşma, seçeneğe göre (seçeneklerin sırasıyla, her biri birkaç
       * satır). Odayı bitirince sunucudan gelir; boşsa son konuşma yok.
       */
      endings: z.array(z.array(line(200)).max(3)).max(4).default([]),
      /** Satırların sesleri, aynı sırayla (sesi olmayan satır yalnızca altyazıyla geçer). */
      voice: z
        .object({
          lines: z.array(voiceSrc).max(4).default([]),
          replies: z.array(voiceSrc).max(4).default([]),
          endings: z.array(z.array(voiceSrc).max(3)).max(4).default([]),
        })
        .optional(),
    })
    .optional(),
});
export type Task = z.infer<typeof taskSchema>;

/**
 * Rapordaki "Bir dahaki sefere" ipucunun ne zaman çıkacağı. engaged: sahte maildeki linke
 * tıkladıysa (mesajlaşmada cevap yazdıysa), hacked: hacklendiyse ("Az kalsın" odasında sahte
 * sayfaya bilgi girdiyse), missedFake: sahte olanı
 * bildirmediyse, reportedReal: gerçek olanı bildirdiyse, always: her zaman. Giriş görevinde
 * (mission.login): leftOpen: çıkış yapmadan kalktıysa, remembered: "Beni hatırla"yı işaretli
 * bıraktıysa, savedPassword: şifreyi tarayıcıya kaydettirdiyse, wrongAnswer: bir soruda tam puan
 * almadıysa.
 */
export const tipConditions = ["engaged", "hacked", "missedFake", "reportedReal", "always", "leftOpen", "remembered", "savedPassword", "wrongAnswer"] as const;
export type TipCondition = (typeof tipConditions)[number];

/** Görevli odanın görev puanı: doğru yerden alınca 1. */
export const missionPoints = 1;

/**
 * Giriş görevindeki kararların puanı (Şehir Kapısı, okul bilgisayarı): kalkmadan önce çıkış 4,
 * "Beni hatırla"nın işaretini kaldırmak 1, şifreyi kaydetmemek 1.
 */
export const loginPoints = { logout: 4, remember: 1, save: 1 } as const;
export type LoginChoice = keyof typeof loginPoints;

/**
 * Görevli oda (Para Çarşısı "Kulaklık için veli kartı", 2 Kasım): oda bir görüntülü aramayla
 * açılır, arayan (anne) bir iş ister; Görevler panelinin üstünde isteği ve kartı durur. Mailin
 * bağlantıları mağaza sayfasını açar (gerçek ve sahte aynı sayfa, fark adres); ödeyince veliye
 * gelen SMS'i (öğedeki `payment`) sunucu söyler, öğrenci kodu yazar ya da yazmaz. Bitiş aramaları
 * (`good`, `bad`) yalnızca bittiğinde sunucudan gelir. Kişi adları içerikte: "Annem", "Annenin".
 */
export const missionSchema = z.object({
  /** Arayanın telefondaki adı: "Annem". */
  caller: line(40),
  look: z.enum(callerLooks).default("mother"),
  /** İyelik hâli: "Annenin" ("Annenin isteği", "Annenin kartı", "ANNENİN GÖREVİ"). */
  owner: line(40),
  /** Açılış aramasının altyazıları, sırayla. */
  lines: z.array(line(160)).max(6).default([]),
  /**
   * Görev kartı: başlık, maddeler, kabul düğmesi ("Tamam anne, anladım"). Maddede **kalın** yazılabilir
   * (önemli kısım); her maddenin ikonu isteğe bağlı, aynı sırayla `pointIcons`'ta (3 Kasım, 10. revize).
   */
  title: line(80),
  points: z.array(line(120)).max(5).default([]),
  pointIcons: z.array(z.enum(cardIcons)).max(5).optional(),
  accept: line(40).default(""),
  /** SMS'teki "kodu yazma" düğmesi: "Yazma, anneme anlat". */
  refuse: line(40).default(""),
  /** Alış görevi (Postam): görev panelindeki kart (kurgusal, maskeli): "4821 •••• •••• 3307", "08/29". */
  card: z.object({ number: line(30), expiry: line(10) }).optional(),
  /** Alış görevi: bağlantıların açtığı mağaza sayfası; gerçek ve sahte bağlantıda aynıdır. */
  shop: z
    .object({
      name: line(40),
      product: line(80),
      price: line(20),
      note: line(80).default(""),
      icon: z.enum(cardIcons).default("tag"),
    })
    .optional(),
  /**
   * Satış görevi (Mesajlar, "Eski telefonunu sat"): görev panelindeki ilan (ürün, fiyat, pazar
   * yeri), sipariş sayfasındaki kargodan önceki hazırlık maddeleri ve hazırlamadan gönderince
   * alıcıdan gelen mesaj. Alış görevinde card ve shop, satışta sale yazılır.
   */
  sale: z
    .object({
      product: line(80),
      price: line(20),
      platform: line(40),
      icon: z.enum(cardIcons).default("phone"),
      prep: z.array(line(80)).max(4).default([]),
      unprepared: line(200).default(""),
    })
    .optional(),
  /**
   * Kayıt görevi (Postam, Şehir Kapısı "Bağlantı nereye gidiyor?"): `form: true` yazılan öğenin
   * bağlantısı bu formu açar (gerçek site; başlık, kutular, düğme), gönderince `done` yazar.
   * Kutulara yazılan hiçbir yere gitmez; yalnızca "form gönderildi" olayı kaydedilir. Bu görevde
   * sahte öğenin bağlantısı yine sahte sayfayı (trap) açar.
   */
  signup: z
    .object({
      site: line(60),
      title: line(80),
      fields: z.array(line(30)).max(3).default([]),
      button: line(30),
      done: line(120),
    })
    .optional(),
  /**
   * Giriş görevi (Şehir Kapısı "Okul bilgisayarında giriş yap ve çık"): ortak bir bilgisayarda
   * okulun portalına girilir, ödev yüklenir, zil çalınca bilgisayar sıradakine bırakılır. Görevi
   * masaüstündeki not verir (arama yok; maddeleri `points`). Kararlar (Beni hatırla, şifreyi
   * kaydetmek, çıkış) sunucuda puanlanır; çıkış yapmadan kalkınca "Az kalsın" açılır (trap.realLife
   * ve trap.actions), oda sürer. Telefona gelen giriş kodu `code`. Postam ve mail yok (items boş).
   */
  login: z
    .object({
      /** Portalın adı, sahibi ve adresi: "Okul Portalı", "Çınar Ortaokulu", "portal.cinarortaokulu.k12.tr". */
      site: line(40),
      school: line(60),
      url: fakeUrl,
      /** Kullanıcı adı (okul numarası, kutuda hazır yazılı) ve sınıfı: "2741", "7-B". */
      user: line(30),
      group: line(30).default(""),
      /** Bilgisayarın adı, kilit ekranında ve masaüstünde: "Bilişim Sınıfı · PC 12". */
      computer: line(60),
      /** Görevi veren not penceresi: başlık, üst satır ve kimden ("Emre Hoca'nın notu", "Bilişim · 7-B", "Emre Tunç · bugün"). */
      note: z.object({ title: line(60), heading: line(60).default(""), from: line(60).default("") }),
      /**
       * Ödev: adı, alt satırı, teslim edilecek dosya (masaüstünde), boyutu, görüntüleyicide açılan
       * resmi (sitenin kendi dosyası) ve dosya seçicideki yanlış türde ikinci dosya.
       */
      homework: z.object({
        title: line(60),
        meta: line(120).default(""),
        file: line(40),
        size: line(20).default(""),
        image: z.string().trim().max(200).regex(/^(\/(?!\/)[\w\-./]*\.(svg|png|webp|jpg))?$/, "resim sitenin kendi dosyası olmalı").default(""),
        other: line(40).default(""),
      }),
      /** Portalın ana sayfasındaki duyuru satırı (süs), isteğe bağlı. */
      news: line(120).default(""),
      /** Zil: kartın metni, "Kalk" düğmesi ve doğru kalkınca çıkan bildirim. */
      bell: z.object({ text: line(120), button: line(40), left: line(120) }),
      /** Az kalsın ekranında "Sıradaki" kutusu: sıradakinin ne yaptığı. */
      next: line(120),
    })
    .optional(),
  /** SMS'teki onay kodu: "481 920". Giriş görevinde telefona gelen giriş kodu. */
  code: line(20).default(""),
  /**
   * Oda kapağındaki (/oda/[oda]) yuvarlak etiketin ikonu, isteğe bağlı: hikâyenin anı ("gift":
   * doğum günü). Boşsa alış görevinde etiket çıkmaz; satış görevinde etiket hep para gidip
   * gelen cüzdanlardır (components/lab/detail/MissionCover.tsx).
   */
  coverIcon: z.enum(cardIcons).optional(),
  /** İyi bitiş araması (doğru yerden aldıysa, odayı bitirince) ve kartın başlığı. */
  good: z.array(line(160)).max(4).default([]),
  /** Sahte maili bildirdiyse iyi bitişe eklenen satır. */
  goodReported: line(160).default(""),
  goodTitle: line(80).default(""),
  /** Raporun görev satırında "Ne yaptın": "Ege'nin kulaklığını doğru mağazadan aldın." */
  done: line(160).default(""),
  /** Kötü bitiş araması (kodu sahte siteye yazınca), ardından alarm. */
  bad: z.array(line(160)).max(4).default([]),
  /**
   * Arayanın sesi, isteğe bağlı: her altyazı satırının ses dosyası, aynı sırayla (yalnızca sitenin
   * kendi dosyası, /sesler/...). Boş ya da eksik satır yalnızca altyazıyla geçer.
   */
  voice: z
    .object({
      lines: z.array(voiceSrc).max(6).default([]),
      good: z.array(voiceSrc).max(4).default([]),
      goodReported: voiceSrc.default(""),
      bad: z.array(voiceSrc).max(4).default([]),
    })
    .optional(),
});
export type Mission = z.infer<typeof missionSchema>;

/** Altyazı satırları ve sesleri birlikte: boş satır sesiyle birlikte düşer, sesi olmayan satır null. */
export function voicedLines(lines: string[], voice: string[] = []) {
  const pairs = lines.map((text, i) => ({ text, src: voice[i]?.trim() || null })).filter((p) => p.text.trim());
  return { lines: pairs.map((p) => p.text), voice: pairs.map((p) => p.src) };
}

/** Görev kartının maddeleri ve ikonları birlikte: boş madde ikonuyla birlikte düşer, ikonu olmayan madde null. */
export function iconedPoints(points: string[], icons: CardIcon[] = []) {
  const pairs = points.map((text, i) => ({ text, icon: icons[i] ?? null })).filter((p) => p.text.trim());
  return { points: pairs.map((p) => p.text), pointIcons: pairs.map((p) => p.icon) };
}

/**
 * Oda sahne şablonu (docs/design/room-scene-template.md, 18 Kasım, Murat). Odanın uygulaması
 * (Postam, Mesajlar) hangi sahnenin içinde açılır: DESKTOP M1 kurgusal bilgisayar masaüstü
 * (gelen kutusu), PHONE T1 masadaki telefon (mesajlaşma), DESKTOP_PHONE T2 bilgisayar ve yanında
 * masadaki telefon (gelen kutusu; velinin SMS'i telefona düşer). T3 konuşma oda değil soru
 * görevinin sahnesidir (`task.talk`). Alan yazılmazsa oda eskisi gibi doğrudan uygulamayla açılır.
 */
export const stageKinds = ["DESKTOP", "PHONE", "DESKTOP_PHONE"] as const;
export type StageKind = (typeof stageKinds)[number];

export const stageSchema = z.object({
  type: z.enum(stageKinds),
  /** Bilgisayarın ya da telefonun sahibi, kilit ekranında ve başlat menüsünde: "Ayça". Boşsa "Sen". */
  owner: line(30).default(""),
  /**
   * İleri eğitimin odalarında bilgisayarın şifresi (temel eğitimde yazılmaz: "Oturum aç" yeter).
   * Odadan odaya değişmez, ipucu kilit ekranındaki mesajdadır; yazılan şifre kaydedilmez.
   */
  password: z.object({ value: line(40), hint: line(200).default(""), hintFrom: line(60).default("") }).optional(),
});
export type Stage = z.infer<typeof stageSchema>;

/** Sahne bu şablonla açılabilir mi: masaüstü gelen kutusunda, masadaki telefon mesajlaşmada. */
export function stageFits(type: StageKind, template: ScenarioTemplate) {
  return type === "PHONE" ? template === "MESSAGING" : template === "INBOX";
}

export const scenarioSchema = z.object({
  meta: metaSchema,
  /** "Bu odada şunlara dikkat et" başlangıç kartı. */
  reminders: z.array(line(160)).max(4).default([]),
  items: z.array(itemSchema).max(8).default([]),
  trap: trapSchema.default(trapSchema.parse({})),
  tasks: z.array(taskSchema).max(8).default([]),
  /** İpuçları; wrongAnswer'da `task` yazılırsa yalnızca o soruda tam puan alınmadıysa çıkar. */
  tips: z.array(z.object({ text: line(240), when: z.enum(tipConditions), task: id.optional() })).max(8).default([]),
  /** Görevli oda, isteğe bağlı: alış görevi gelen kutusunda, satış görevi (sale) mesajlaşmada. */
  mission: missionSchema.optional(),
  /** Oda sahne şablonu, isteğe bağlı (stageSchema). */
  stage: stageSchema.optional(),
});
export type ScenarioContent = z.infer<typeof scenarioSchema>;

export type LabContent = TrainingContent | ScenarioContent;

export function schemaFor(template: Template) {
  return template === "TRAINING" ? trainingSchema : scenarioSchema;
}

export function isScenario(template: Template): template is ScenarioTemplate {
  return template !== "TRAINING";
}

/**
 * Sahte öğedeki bağlantı sahte sayfayı açar mı? Gelen kutusunda hep açar. Mesajlaşmada sayfa
 * başlığı yazılmışsa açar (M1, 28 Ekim): o zaman tuzak sahte sayfadır, yazılmamışsa yalnızca
 * cevapta gönderilen koddur (eski odalar böyle kalır).
 */
export function usesTrapPage(content: Pick<ScenarioContent, "trap"> & { mission?: Mission }, template: ScenarioTemplate) {
  // Kayıt görevinde sahte bağlantı sahte sayfayı açar; mağaza, satış ve giriş görevinde açmaz.
  if (content.mission) return !!content.mission.signup && template === "INBOX";
  return template === "INBOX" || content.trap.title.trim().length > 0;
}

/** Görevli odada bu öğenin bağlantısı mağaza sayfasını açar mı (ödemesi yazılmış öğe)? */
export function opensShop(content: Pick<ScenarioContent, "mission">, item: Pick<Item, "link" | "payment">) {
  return !!content.mission?.shop && !!item.link && !!item.payment;
}

/** Kayıt görevli odada bu öğenin bağlantısı görevdeki formu açar mı? */
export function opensForm(content: Pick<ScenarioContent, "mission">, item: Pick<Item, "link" | "form" | "kind">) {
  return !!content.mission?.signup && !!item.link && item.form === true && item.kind === "real";
}

/** Görevli odanın türü: alış (mağaza), satış, kayıt ya da giriş; görevli değilse null. */
export type MissionMode = "shop" | "sale" | "signup" | "login";

export function missionMode(content: { mission?: { sale?: unknown; signup?: unknown; login?: unknown } | null }): MissionMode | null {
  const mission = content.mission;
  if (!mission) return null;
  return mission.sale ? "sale" : mission.signup ? "signup" : mission.login ? "login" : "shop";
}

/** Satış görevli odada bu öğenin bağlantısı bankanın ödeme isteğini açar mı? */
export function opensRequest(content: Pick<ScenarioContent, "mission">, item: Pick<Item, "link" | "request">) {
  return !!content.mission?.sale && !!item.link && !!item.request;
}

/** Satış görevli odada bu öğenin bağlantısı pazar yerindeki siparişi açar mı? */
export function opensOrder(content: Pick<ScenarioContent, "mission">, item: Pick<Item, "link" | "order">) {
  return !!content.mission?.sale && !!item.link && !!item.order;
}

/** Veritabanındaki içeriği okur; biçim bozuksa null (sayfa labı "bulunamadı" sayar). */
export function parseTraining(json: unknown): TrainingContent | null {
  const result = trainingSchema.safeParse(json);
  return result.success ? { ...result.data, meta: displayMeta(result.data.meta) } : null;
}

export function parseScenario(json: unknown): ScenarioContent | null {
  const result = scenarioSchema.safeParse(json);
  return result.success ? { ...result.data, meta: displayMeta(result.data.meta) } : null;
}

/** Öğrenciye giden ad ve başlıkta Türkçe tırnak (başlık yazı tipi düz tırnağı ” gibi çiziyor). */
function displayMeta<T extends { name: string; title: string }>(meta: T): T {
  return { ...meta, name: smartQuotes(meta.name), title: smartQuotes(meta.title) };
}

/**
 * Senaryo labının en yüksek puanı: her sahte 4, her gerçek 1, her soru en yüksek seçeneği, görev 1;
 * giriş görevinde kararlar (loginPoints, toplam 6).
 */
export function maxScore(content: Pick<ScenarioContent, "items" | "tasks"> & { mission?: { login?: unknown } }) {
  const items = content.items.reduce((sum, item) => sum + (item.kind === "fake" ? 4 : 1), 0);
  const questions = content.tasks
    .filter((task) => task.type === "question")
    .reduce((sum, task) => sum + Math.max(0, ...task.options.map((o) => o.points)), 0);
  const missions = content.tasks.filter((task) => task.type === "mission").length * missionPoints;
  const login = content.mission?.login ? loginPoints.logout + loginPoints.remember + loginPoints.save : 0;
  return items + questions + missions + login;
}

/** Formdaki ham puanların toplamı: yayına hazırlık listesi her senaryo labında 10 ister. */
export const rawTotal = 10;

/** Öğrencinin gördüğü rapor puanı 100 üzerindendir (Murat onayladı, 15 Ekim): ham puan × 10. */
export const reportScale = 100;

/** Mail metnini paragraflara böler (boş satırla ayrılmış). */
export function paragraphs(body: string) {
  return body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** "kargo-teslimat-tr.xyz/adres-guncelle" -> "kargo-teslimat-tr.xyz" */
export function domainOf(url: string) {
  return url.replace(/^[a-z]+:\/\//i, "").split(/[/?#]/)[0];
}
