# Senaryo odası: Sahte kargo maili

| Alan | Değer |
| --- | --- |
| Mahalle | Oltalama Limanı |
| Açan eğitim | Sahte mesajı tanımak (temel eğitim, `oltalama-egitimi`) |
| Sahne | T2: bilgisayar (Postam, Tarayıcı, Yolda Kargo) ve masadaki telefon (Ayça'nın sesli mesajı) |
| Oda adresi | `/oda/sahte-kargo-maili` |
| Yazan | Murat |
| Durum | Yenilendi (20 Kasım 2026), yayındaki sürümün yerine geçer: `labs/rooms/oltalama-limani/sahte-kargo-maili.json` |
| Plan | `docs/labs/room-plan.md` içindeki "Senaryo: Sahte kargo maili" |

## Nasıl değişti

İlk sürüm (Ekim) tek bilgisayarlı (M1) sıradan bir gelen kutusuydu: "Kargo Takip" adına bir sahte mail, yanında okul, Market Puan ve Elif. Öğrencinin kargoyla bir işi yoktu, sahte maile tıklaması için bir sebep yoktu.

Murat'ın kararları:

- **18 Kasım, B seçeneği:** görevi ablası Ayça verir, sesli mesajla. Gelen kutusunda aynı firmadan (kurgusal "Yolda Kargo") bir gerçek ve bir sahte mail var.
- **18 Kasım, şablona giydirme:** sahne T2 (bilgisayar ve masadaki telefon); tuval https://claude.ai/artifact/ERXBvTZjaaeQ6fegmW47Tq.
- **20 Kasım, 12 maddelik yenileme listesi kabul:** tek telefon (`components/device/Phone.tsx`) ve tek bilgisayar (`Computer.tsx`); Yolda Kargo uygulaması yalnızca bilgisayarda; yeni oda eskisinin yerine doğrudan geçer (yeni sürüm olarak yayınlanır, eski denemelerin raporu kendi sürümüyle kalır).
- **20 Kasım, pencereler:** bilgisayardaki pencereler yeni bilgisayar gibi taşınır, kenarından boyutlanır, büyür (Kulaklık konusundaki ortak düzeltme).

## Kapak

- **Oda adı** (80): Sahte kargo maili
- **Esprili başlık** (80): Kargonuz kapıda... değil!
- **Kısa açıklama** (200): Ablan Ayça sana sürpriz bir paket yolladı. Gelen kutunda iki Yolda Kargo maili var: hangisi gerçek, hangisi tuzak?
- **Hikâye** (800): Ablan Ayça sabah sınava girmeden sana sesli mesaj bırakmış: sürpriz bir paket yollamış, Yolda Kargo'yla bugün gelecek. Takip numarası mailine düşecek, paketi takip etmek sende. Postam'da iki Yolda Kargo maili var; biri adresinin eksik olduğunu, 24 saat içinde güncellemezsen paketin geri döneceğini söylüyor. Görevi yaparken dikkatli ol: bir tanesi gerçek değil.
- **Zorluk:** Kolay
- **Süre (dk):** 10
- **Bu odada ne öğreneceksin:**
  1. **Gönderen adresine bakmak:** Görünen isim değil, @ işaretinden sonrası önemli.
  2. **Kargoyu kendi uygulamasından takip etmek:** Takip numarasını kargonun kendi uygulamasında sorgula, maildeki bağlantıdan değil.
  3. **Acele ettirme taktiğini fark etmek:** "24 saat içinde" gibi cümleler düşünmeni engellemek içindir.
- **Hatırlatmalar:** Gönderen adresine bak · Acele ettiriyorsa dur · Linke tıklamadan önce adresine bak · Kargoyu kargonun kendi uygulamasından takip et.
- **Kapak görseli:** bildirim telefonu (görevli odalarda da, 20 Kasım kararı).

## Açılış: Ayça'nın sesli mesajı

Oturum açılınca 1,2 saniye sonra masadaki telefon titrer, ekranında "Ayça · Sesli mesaj (0:11)" bildirimi ve üstünde "Telefonu al" çıkar. Arama yok; telefon Mesajlar'da Ayça'yla konuşmayı açar:

- Dün 21.14 Ayça: "Yarın sana bir şey gönderiyorum 🤫"
- 21.15 Sen: "Neee? Ne gönderiyorsun?"
- 21.16 Ayça: "Sürpriz 😌 Sabah sınavım var, telefonum kapalı olacak"
- Bugün 09.18: sesli mesaj (oynat, dalga, süre, "Yazıya dök"). Dinlerken kelimeler sırayla koyulaşır:
  1. "Selam! Sana sürpriz bir paket yolladım."
  2. "Yolda Kargo'yla gönderdim, bugün gelirmiş."
  3. "Takip numarası mailine düşer, bir bakar mısın?"
  4. "Uygulaması bilgisayarında var zaten. Kapıya gelince evde ol ha!"

Mesaj dinlenince alttan görev kartı çıkar: **AYÇA'NIN GÖREVİ · Ayça'nın paketini takip et** · Paket **Yolda Kargo** ile geliyor · Takip numarası **mailine** gelecek · Paket **bugün** kapıda · Takibi **Yolda Kargo uygulamasından** yap. Düğme: **Tamam abla, bakarım**. Basınca konuşmaya "Tamam abla, bakarım 👍" cevabı düşer, kart Görevler panelinin en üstüne yerleşir, "Görevi aldın. Telefonu masaya bırakıp bilgisayardan devam edebilirsin." bildirimi çıkar. Ses dosyası gelene kadar (ElevenLabs, Ayça'nın sesi) mesaj kendi hızında yazıyla oynar.

## Sahne: mailler

### Öğe 1 (Sahte): Yolda Kargo

- **Adres:** bildirim@yolda-kargo-teslimat.com · **Saat:** 09:22
- **Konu:** Gönderiniz teslim edilemedi!
- **Metin:** Sayın müşterimiz, Adres bilginiz eksik olduğu için gönderiniz dağıtıma çıkarılamadı. **24 saat içinde güncellemezseniz gönderiniz iade edilecektir.**
- **Alt bilgi:** Takip no: YK 9921 0034 17 · Bu mail otomatik gönderilmiştir, lütfen yanıtlamayınız.
- **Bağlantı:** "Adresi güncelle" → yolda-kargo-teslimat.com/adres-guncelle?id=88421
- **Takip numarası:** YK 9921 0034 17 (uygulamada bulunamaz)
- **İşaretler:**
  - Gönderen: Adres Yolda Kargo'nun değil: yolda-kargo-teslimat.com kimseye ait olabilir. Gerçek mail yoldakargo.com.tr'den geldi.
  - Metin: "24 saat içinde" diye acele ettiriyor. Gerçek firmalar paketini 24 saatte iade etmekle tehdit etmez.
  - Bağlantı: Bağlantı firmanın sitesine değil, benzer bir adrese gidiyor. Takip numarası da Ayça'nın gönderisininkiyle aynı değil.
- **Raporda "Neden?":** Gönderen adresi yolda-kargo-teslimat.com, gerçek firma yoldakargo.com.tr. "24 saat" baskısı, adres güncelleme bağlantısı ve Yolda Kargo uygulamasında bulunamayan takip numarası oltalama işaretleri.

### Öğe 2 (Gerçek): Yolda Kargo

- **Adres:** bilgi@yoldakargo.com.tr · **Saat:** 09:20 · **Konu:** Gönderin yola çıktı
- **Metin:** Merhaba, **Ayça Y.** sana bir gönderi yolladı. Takip no: **YK 4417 2093 58** · Tahmini teslimat: **bugün 14.00-18.00** · Gönderini Yolda Kargo uygulamasından takip edebilirsin.
- **Alt bilgi:** Yolda Kargo sana bağlantıyla adres, ödeme ya da şifre sormaz.
- **Bağlantı:** yok (bilerek: takip uygulamadan yapılır).
- **Raporda "Neden?":** Firmanın kendi adresinden (yoldakargo.com.tr) geliyor, bağlantı yok, senden bir şey istemiyor; takip numarası uygulamada Ayça'nın gönderisi olarak çıkıyor.

### Öğe 3 (Gerçek): Okul Duyuru

- duyuru@ornek-ortaokulu.k12.tr · 08:15 · "Veli toplantısı saati değişti": Çarşamba günkü veli toplantısı 17.00 yerine **18.00**'de. Bağlantı yok.
- **Neden?** Okulun bilinen adresinden geliyor, bağlantı yok, senden bir şey istemiyor.

### Öğe 4 (Gerçek): Elif

- elif.k@postam.com · Dün · "Ödev dosyası": "Selam! 👋 Fen ödevinin dosyasını ekledim, akşam bakarsın." Ek: fen-odevi.pdf (240 KB).
- **Neden?** Tanıdığın biri, beklediğin bir ödev dosyası. Beklemediğin bir ek gelseydi önce Elif'e sorardın.

## Yolda Kargo uygulaması (görev)

Bilgisayarda Postam ve Tarayıcı'nın yanında üçüncü uygulama (simgesi masaüstünde ve görev çubuğunda, kendi penceresinde). Öğrenci numara yazmaz: **açtığı maillerde bulduğu takip numaraları** listelenir, birini seçip **Sorgula**'ya basar. Hangi numaranın gerçek olduğu tarayıcıya gitmez; sonucu sunucu söyler ("parcel_tracked" olayı):

- **Gerçek numara (YK 4417 2093 58): Gönderin dağıtımda.** Tahmini teslimat: bugün 14.00-18.00 · Teslimat adresi kayıtlı, eksik bilgi yok. Adımlar: Gönderi alındı (Dün 17.20 · Gönderen: Ayça Y.) · Transfer merkezinde (Bugün 06.10) · Dağıtıma çıktı (Bugün 09.15) · Teslim edilecek (Bugün 14.00-18.00).
- **Sahte numara: Bu numarayla bir gönderi bulunamadı.** Yolda Kargo bağlantıyla adres, ödeme ya da şifre istemez.

Gerçek numara sorgulanınca görev biter.

## Tuzak: sahte sayfa

- **Adres:** yolda-kargo-teslimat.com/adres-guncelle
- **Başlık:** Paketiniz depoda bekliyor
- **Açıklama:** Teslimat adresinizi güncellemek için önce Postam hesabınızla kimliğinizi doğrulayın.
- **Ne istiyor?** Postam şifresi · **Verirse:** Hesap (Postam) · Sonuç sahnesi: hesap
- **Kayıtlı şifre önerisi (yeni, `trap.autofill`):** şifre kutusunun altında tarayıcının önerisi çıkar: "Kayıtlı şifreyi kullan · ben@postam.com · ••••••••" ve **Doldur**. Öğrenci şifre yazmaz; Doldur deyince noktalar kendiliğinden yazılır. Lab uyarı şeridi bu sayfada yok. Ders: tarayıcı kayıtlı şifreyi önerse bile adres çubuğuna bakılır.
- **Alarm:** "Postam hesabın ele geçirildi." Bildirimler: Şifren değiştirildi (Postam · yeni bir cihazdan) · Kişilerine 38 mail gönderildi (Konu: "Gönderiniz teslim edilemedi!") · Yeni mail: Ayça ("Bu maili sen mi gönderdin? 🤔")
- **Gerçek hayatta:** Saldırgan Postam'ına girdi, şifreni değiştirdi. Mailine giren kişi öbür hesaplarının (oyun, sosyal medya, okul) "şifremi unuttum" maillerini de alır. Senin adınla arkadaşlarına aynı sahte kargo maili gitti; sana güvendikleri için tıklayabilirler.
- **Ne yapmalısın:** Postam'ı kendin açıp şifreni hemen değiştir; giremiyorsan "hesabımı kurtar" yolunu kullan. · İki adımlı doğrulamayı aç, aynı şifreyi kullandığın her yerde şifreyi değiştir. · Arkadaşlarına haber ver: "Benden gelen kargo mailini açmayın." Sahte maili de bildir.

## Bitişler (sesli mesaj)

- **Hacklendi:** alarmdan sonra bilgisayara dokunulamaz, telefona Ayça'nın sesli mesajı düşer: "Az önce senden bir mail geldi, 'gönderiniz teslim edilemedi' diyor." · "Arkadaşlarıma da gitmiş! Sen mi tıkladın o linke?" · "Hemen Postam şifreni değiştir, ben de onlara haber vereyim." Dinleyince **Devam** → hesap sahnesi → rapor.
- **Odayı bitirdi:** ekranda "Öğleden sonra · 15.40 / Kapı zili çalıyor..." geçişi, sonra telefona saat 15.40'ta yeni sesli mesaj, dinleyince **Raporu gör**:
  - Görev yapıldıysa (iyi): "Uygulama kapıya bıraktık diyor, geldi mi? Açma ama, akşam birlikte açalım!" Sahte maili bildirdiyse mesaja "Bir de sahte bir kargo mailini bildirmişsin, aferin sana." satırı eklenir. Başlık: Ayça'nın paketi geldi.
  - Görev yapılmadıysa (kaçırdı): "Kurye gelmiş ama kimse kapıyı açmamış, paket şubeye dönmüş." · "Uygulamaya baksaydın saatini görürdün. Neyse, yarın şubeden alırız."

## Görevler ve puan (toplam 10)

| Görev | Tür | Puan |
| --- | --- | --- |
| Gelen kutunu aç, maillere göz at | Uygulamada yap | - |
| Ayça'nın paketini takip et (ipucu: takip numarasını Postam'daki maillerde bul, Yolda Kargo uygulamasında sorgula) | Görev | 1 |
| Gelen kutunu incele, şüpheli bulduklarını bildir | İnceleme | Sahte 4, üç gerçek mail 1'er |
| Kargo mailinin gerçek olup olmadığını en güvenli nasıl anlarsın? | Soru | 1 |
| Postam şifreni yanlış bir siteye kaptırdığını fark ettin. İlk ne yaparsın? | Soru | 1 |

- **Görev, raporda:** Doğrusu: Gerçek Yolda Kargo mailindeki takip numarasını (YK 4417 2093 58) Yolda Kargo uygulamasında sorgulamak. Neden: Takip numarasını kargonun kendi uygulamasında sorgulayınca paketin gerçekten nerede olduğunu görürsün. Sahte maildeki numara uygulamada bulunamaz. "Ne yaptın": Ayça'nın paketini Yolda Kargo uygulamasından takip ettin.
- **Soru 1:** Doğru "Firmanın uygulamasını kendim açıp takip numarama bakarım". Yanlışlar: "Maildeki düğmeye tıklayıp açılan siteye bakarım"; "Maile cevap yazıp sorarım". Neden: Maildeki düğme ve cevap adresi dolandırıcıya ait olabilir. Uygulamayı kendin açınca yalnızca gerçek firmanın bildiğini görürsün.
- **Soru 2:** Doğru "Postam'ı kendim açıp hemen şifremi değiştiririm". Yanlışlar: "Bir şey olmaz, bekleyip görürüm"; "Aynı siteye girip şifremi oradan değiştiririm". Neden: Şifre ne kadar erken değişirse saldırganın hesabında kalacağı süre o kadar kısalır. Sahte siteye yeniden girmek şifreni bir kez daha verir.

## Bir dahaki sefere (ipuçları)

- (bağlantıya tıkladıysa) Bağlantıya tıklamadan önce üzerine gel (telefonda basılı tut) ve adresi oku: yolda-kargo-teslimat.com Yolda Kargo'nun adresi değil.
- (hacklendiyse) Tarayıcın kayıtlı şifreni önerse bile adres çubuğuna bak. Şifreni yalnızca uygulamayı kendin açarak gir.
- (sahteyi kaçırdıysa) Gönderen adresinde @ işaretinden sonrasına bak: gerçek mail yoldakargo.com.tr'den geldi.
- (gerçeği bildirdiyse) Gerçek mailleri de tanı: bildiğin adresten geliyor ve senden bir şey istemiyorsa büyük ihtimalle güvenli.
- (her zaman) Kargo mailinde bir şey tuhafsa takip numarasını kargonun kendi uygulamasında sorgula.

## Bekleyenler

- Ayça'nın sesi (ElevenLabs; karakter ses tablosundaki Ayça): açılış 4 satır, iyi bitiş 1, kaçırdı 2, kötü bitiş 3 satır. Dosyalar `public/sesler/sahte-kargo-maili/`, oda dosyasında `mission.voice`.
- Ayça'nın kendi çizimi: şimdilik `look: "friend"`.
