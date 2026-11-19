# Yeni oda nasıl eklenir

Arayüzde "lab" yerine **oda** denir (13 Ekim 2026). 1. kısım ekrandaki adları kullanır; 2. kısım kodu anlatır, orada kavramın adı `lab` kalır.

Bu kılavuz iki kısımdır:

- **1. kısım, oda yazanlar için.** Odanın alanları (kapak, kartlar, mailler, görevler, puan, rapor) ve kuralları. Odayı tasarlayan ekip arkadaşı okur; alanların dosyadaki adları 2.9'dadır.
- **2. kısım, geliştirici (Claude Code) için.** Yeni bir sahne türü (şablon) eklemek gerektiğinde hangi dosyalara dokunulacağı, hangi testlerin yazılacağı ve hangi güvenlik kurallarına uyulacağı; odanın depoya dosya olarak girmesi (2.9).

**Oda yalnızca depoda yazılır** (27 Ekim ve 17 Kasım, Murat): senaryo `docs/labs/rooms/` altında yazılır, onaylanınca `labs/rooms/<mahalle>/<oda-adresi>.json` olarak PR'la girer (2.9). Yönetim panelinde oda formu ve "Yeni oda" yoktur; Odalar sayfası odaları listeler, sırasını değiştirir, odayı öğrenci gibi denemeye açar, yayınlar ve gizler (1.3). 1. kısımdaki alan sınırları ve puan kuralları dosyanın kurallarıdır; `tests/unit/room-files.test.ts` bunları denetler.

Hangi odaların yazılacağı, her odanın hikâyesi, tuzağı ve ana sorusu `docs/labs/room-plan.md`'dedir; projeye yeni katılan önce `docs/guides/getting-started.md`'yi okur.

Kılavuz kodun bugünkü haline göre yazıldı (Faz 6). Odalar sayfası ya da şema değişirse bu dosya da aynı PR'da güncellenir. Platformun genel oda kuralları doküman Bölüm 4'tedir (`docs/platform-document.md`).

---

# 1. kısım: Oda yazanlar için

## 1.1 Kısaca

1. Odanın senaryosunu `docs/labs/rooms/<mahalle>/` altına yaz (şablonlar `templates/`), ekip arkadaşına okut.
2. Onaylanınca Claude Code odayı `labs/rooms/<mahalle>/<oda-adresi>.json` dosyasına çevirir ve `"status": "DRAFT"` ile PR açar.
3. PR birleşince oda sitede taslak olarak durur, öğrenciler görmez. **Yönetim > Odalar**'da (`/yonetim/odalar`) odanın **Dene** bağlantısıyla odayı öğrenci gibi baştan sona oyna.
4. Odanın sayfasındaki **Yayına hazır mı?** listesi tamamsa **Yayınla**. Kalıcı yayın için dosyada `"status": "PUBLISHED"` yapan küçük bir PR açılır (2.9).
5. Yayından sonra odayı bir kez öğrenci hesabıyla baştan sona oyna.

Gereken izinler (Yönetim > Kullanıcılar > Yönetim ekibi):

| İzin | Ne yaptırır |
| --- | --- |
| **Oda ekleme ve düzenleme** | Odalar sayfasını ve odaların sayfalarını görür, odayı dener; bir şey değiştiremez |
| **Oda yayınlama ve gizleme** | Yayınlar, gizler, geri alır, haritadaki sırayı değiştirir |

Yöneticide ikisi de vardır.

## 1.2 Oda türleri ve sahneler

Bir mahallede birden çok **eğitim odası** olabilir (15 Ekim, Murat). İlki **temel eğitim**dir: mahallenin girişidir ve her zaman açıktır. Sonrakiler **ileri eğitim**dir: temel eğitim bitince açılır. Her **senaryo odasını** bir eğitim açar: öğrenci o eğitimi bitirmeden senaryoyu açamaz. Örnek: Hesap Kalesi'nde "Şifre ve iki adımlı doğrulama" temel eğitimi "Kodu soran arkadaş" senaryosunu, "Sosyal medya ve mahremiyet" ileri eğitimi "Herkese açık profil" senaryosunu açar. Öğrenci sırayı kendisi seçer; isterse önce bütün eğitimleri bitirir.

Haritada mahallenin rotası şöyle görünür: her eğitim, hemen ardından onun açtığı senaryolar.

| Şablon | Öğrencinin gördüğü | Ne zaman kullanılır |
| --- | --- | --- |
| **Eğitim odası** | Kart kart ilerleyen kısa ders: Bilgi, Tıkla-bul, Mini test, Video, Eşleştirme, Kutulara ayırma, Boşluk doldurma kartları | Mahallenin konusunu öğretmek. İlk eğitim odası temel eğitimdir ve girişte durur; sonrakiler ileri eğitimdir. |
| **Gelen kutusu** | Kurgusal mail uygulaması **Postam**: mailler, klasörler (Gelen, Spam, Çöp), bağlantıya tıklayınca açılan sahte sayfa | Şüpheli e-posta: gönderen, istek, bağlantı |
| **Mesajlaşma** | **Mesajlar** uygulaması: konuşmalar, cevap kutusu, bildir ve engelle | SMS ya da sohbette kod, para, bilgi isteyen mesajlar |

Şablon dosyada yazılır ve oda eklendikten sonra **değişmez**. Yanlış şablon seçildiyse yeni bir adresle yeni bir dosya açılır.

**Oda sahne şablonu (18 Kasım).** Senaryo odasının uygulaması (Postam, Mesajlar...) bir sahnenin içinde açılır: **M1** masaüstü (yalnız bilgisayar), **T1** masadaki telefon (yalnız telefon), **T2** bilgisayar ve telefon (ör. kod telefona gelir), **T3** karşılıklı konuşma (bir büyükle ya da yabancıyla yüz yüze). Odanı yazmadan önce `docs/labs/room-plan.md`'de odanın "Şablon:" alanına bak; kurallar `docs/design/room-scene-template.md`'de. Oda dosyasında sahne şöyle yazılır: `"stage": { "type": "DESKTOP" }` M1, `"PHONE"` T1 (yalnızca Mesajlar), `"DESKTOP_PHONE"` T2 (Postam; veli SMS'i masadaki telefona düşer). Bilgisayarın sahibi `owner` (boşsa kilitte "Sen"); şifreli kilit yalnızca ileri odalarda: `"password": { "value": "gunes2009", "hint": "...", "hintFrom": "Ayça" }`. T3 bir soru görevine yazılır: `"talk": { "speaker": "Annen", "look": "mother" }`; soru sırası gelince sahnenin üstünde konuşma olarak açılır. `stage` yazılmayan oda eski görünümüyle açılır. Geliştirici ayrıntısı 2.15.

Başka bir sahne gerekiyorsa (sahte giriş sayfası, indirme sayfası, sosyal medya gibi) bunu mevcut şablonlarla yapamazsın. Geliştiriciden yeni bir şablon iste (2. kısım).

## 1.3 Yönetimdeki Odalar sayfası

**Liste** (`/yonetim/odalar`, 17 Kasım R1.3): Her mahalle kendi başlığıyla gelir. Eğitimler numaralıdır (1, 2), her eğitimin açtığı senaryolar onun altında içeride durur (1.1, 1.2). Eğitim satırındaki ok, altındaki senaryoları katlar ya da açar. Sütunlar: oda, durum, bitiren, fark eden (sahte öğeyi ilk bakışta fark edenlerin oranı) ve düğmeler (**Dene**, **Gizle** ya da **Yayınla**). Üstteki durum kutuları listeyi süzer (yalnızca taslaklar gibi).

**Sıra:** Satırın solundaki yukarı ve aşağı okları odayı kendi grubunda bir üste ya da alta taşır: senaryo kendi eğitiminin senaryoları içinde, ileri eğitim ileri eğitimler içinde. Sıra **hemen kaydedilir**, ayrıca Kaydet yoktur; çıkan bildirimdeki **Geri al** eski sırayı geri getirir. Bu sıra öğrencinin haritasındaki sıradır. Temel eğitim hep ilk sıradadır (kilit işareti). Sıra oda ilk eklenirken dosyadan gelir; sonra yalnızca buradan değişir, dosya değişse de korunur.

**Odanın sayfası:** Listede odanın adına basınca açılır ve salt okunurdur. Mahalle, durum ve sürüm; zorluk, süre ve açan eğitim; odanın sayıları (bitiren, ilk bakışta ve sonunda fark eden, şu an odada olan, ödev verilen sınıf); **Öğrenci gibi dene**, gizle ya da yayınla düğmeleri; taslak hazır değilse **Yayına hazır mı?** listesinin eksik maddeleri; odanın depodaki dosyası ve "Dosyayı GitHub'da aç" bağlantısı. Dosyası olmayan (eski, panelden açılmış) odada "Depoda dosyası yok" yazar.

Panelden oda eklenmez, düzenlenmez ve silinmez.

## 1.5 Kapak (her odada aynı)

| Alan | Sınır | Nerede görünür |
| --- | --- | --- |
| **Oda adı** | 80 karakter, en az 4 | Yönetim, oda kartları, rapor. Ciddi ad: "Sahte kargo maili" |
| **Esprili başlık** (isteğe bağlı) | 80 | Oda sayfası ve oynatıcı: "Kargonuz kapıda... değil!" |
| **Kısa açıklama** | 200 | Oda kartlarında tek satır. Eğitim odasında zorunlu |
| **Hikâye** | 800 | Oda sayfasındaki kısa hikâye |
| **Zorluk** | Kolay, Orta, Zor | Oda kartı ve sayfası |
| **Süre (dk)** | 1–60 | Oda kartı ve sayfası |
| **Bu odada öğreneceklerin** | En fazla 3 madde; başlık 80, açıklama 240 | Oda sayfası: oda bitene kadar kilitli ("1. ders · odayı bitirince açılır"), bitince "Bu odada öğrendiklerin" olarak açılır (3 Kasım, 8. revize) |

Oda sayfasında (kapak) üstte adım yolu (Eğitim, Senaryo, Rapor), altta iki kutu durur: solda dersler, sağda odayı henüz bitirmeyene **"Seni neler bekliyor"** (kim arayacak, kaç mail ya da mesaj, hangi mağaza ya da ilan, kaç görev; hepsi odanın içeriğinden kendiliğinden), bitirene önceki denemesi. Tür, zorluk ve süre renkli çerçeveli etiketlerdir (15. revize): eğitim mavi, senaryo mor; kolay ya da 6 dakika ve altı yeşil, orta ya da 7-10 dakika sarı, zor ya da 11 dakika ve üstü kırmızı. Süreyi buna göre gerçekçi yaz.

**Odanın çizimi** (7.1. revize): her odanın kendi görseli olur, kataloğun kartında ve mahalledeki oda önizlemesinde görünür. Çizim `public/odalar/<oda-adresi>.svg` dosyasıdır (640 × 320, odanın karakteri ve ana nesnesi, yazısız), adresi `lib/lab/art.ts` listesine yazılır. Ailenin yüzleri (Ayşegül, Ayça, Lisa, İbrahim) bütün çizimlerde aynıdır; üretici `/mnt/project-files/oda-cizimleri/draw.cjs`. Çizimi olmayan odada mahallenin ikonu görünür.

Senaryo odasına girerken önce **perde** iner ve odanın adı harf harf yazılır, sonra **"Başlamadan önce" kutusu** gelir; görevli odada arama "Hazırım, başla"dan sonra çalar (18. revize). Kutudaki "Aklında olsun" listesi **odaya özel değildir**, herkes aynı üç genel hatırlatmayı görür (adrese bak, acele ettirene dur, para ya da kod istenince sor): tuzağı önceden söylemesin. Dosyadaki **hatırlatmalar** (en fazla 4, her biri 160 karakter) eski odalarla uyum için durur; öğrenciye görünmez, zorunlu değildir.

## 1.6 Eğitim odası: kartlar

Kartlar öğrenciye sırayla gösterilir. En az 3, en fazla 20 kart. Kartı yukarı ve aşağı taşıyarak sırasını değiştirebilirsin.

| Kart | Alanlar ve sınırlar | Öğrenci ne yapar |
| --- | --- | --- |
| **Bilgi** | Başlık (120); en fazla 4 paragraf (her biri 500); isteğe bağlı en fazla 4 başlıklı madde (başlık 80, açıklama 240, ikon listeden ya da varsayılan); **düzen**: Liste, Keşfet, Adım adım, Banka kartı (aşağıda) | Listede okur, ileri geçer. Diğer düzenlerde maddeleri açar; hepsini açmadan Devam edemez |
| **Tıkla-bul** | Başlık (120), ipucu satırı (160, ör. "Mailde 3 şüpheli yer var. Bul bakalım."); bir mail: gönderen adı (60), adres (80), konu (120), saat, en fazla 6 paragraf (her biri 400), düğme yazısı (40), alt satır (200); en fazla 5 **şüpheli parça** (her birinin açıklaması 300) | Maildeki şüpheli yerlere tıklar. Bulduğu her parça numarasıyla ve açıklamasıyla görünür |
| **Mini test** | Soru (240), 2–4 seçenek (her biri 160), doğru cevap, cevaptan sonra açıklama (400); isteğe bağlı üstteki çizim (hediye kutusu ya da oltadaki 1 TL), ya da üstte bir mail düğmesi (`link`: düğme yazısı ve gerçek adres; imleç ya da parmak basmadan adrese bakmayı gösterir, düğme hiçbir yere gitmez) ya da telefon bildirimi (`sms`: gönderen ve metin, kilit ekranında) ya da mesaj eki (`file`: gönderen, mesaj, dosya adı ve boyutu; cevaptan sonra son noktadan sonrası "soyadı" diye ayrılır, simge de gerçek türüne döner) ya da izin penceresi (`permission`: uygulama adı, ne istediği ve ikonu; düğmeler basılmaz) ya da Wi‑Fi listesi (`wifi`: 2–4 ağ adı, şifreli mi; dokunulmaz) ya da bir sitede açılan sahte pencere (`popup`: site, başlık, metin, düğme; düğme bir şey yapmaz); `guess: true` ise kural verilmeden önce sorulan soru: etiketi "Önce tahmin", geri bildirimi yumuşak | Seçer; doğru mu yanlış mı ve açıklamayı hemen görür (doğru şık yeşil yanar, yanlış seçilen sarsılır) |
| **Video** | Başlık (120), video dosyası (`/videolar/...`), süre (ör. "1:20"); isteğe bağlı "Videoyu durdurup soru sor": kaçıncı saniyede dursun, soru, seçenekler, doğru cevap, açıklama | İzler; soru varsa video durur ve cevaplar |
| **Eşleştirme** | Başlık (120), ipucu satırı (160); 2–6 **doğru eş** (sol 80, sağ 160, solun ikonu isteğe bağlı; yoksa numara); kontrol ettikten sonra açıklama (400) | İlk girişte "Nasıl oynanır" penceresini görür. Soldaki her bilgi ve yeri aynı hizadadır; seçili yere alttaki seçenek tepsisinden dokunarak seçer (ya da seçeneği tutup bir yere sürükler), sonra "Kontrol et". Her yer yeşil ya da kırmızı olur, kırmızının doğrusu yazar |
| **Kutulara ayırma** | Başlık (120), ipucu satırı (160, boşsa hazır satır); 2–4 **kutu** (ad 40, kısa not 80, renk: yeşil, sarı, kırmızı, mavi, mor; ikon listeden); en az 2, en fazla 8 **bilgi** (metin 80, ikon, doğru kutusu); açıklama (400) | İlk girişte "Nasıl oynanır" penceresini görür (bir kez; başlıktaki "Nasıl oynanır?" ile yeniden açılır). Bilgiyi tutup kutuya sürükler ya da önce bilgiye, sonra kutuya dokunur; kutudaki bilgiye dokununca geri gelir. Hepsi yerleşince "Kontrol et": her bilgide ✓ ya da ✗, yanlışın altında doğru kutu yazar |
| **Boşluk doldurma** | Başlık (120), ipucu satırı (160); en fazla 6 cümle (her biri 300), boşluğa gelecek kelime köşeli parantezde: `Kartın arkasındaki koda [CVV] denir.`; en fazla 6 yanıltıcı kelime (her biri 40); açıklama (400) | İlk girişte "Nasıl oynanır" penceresini görür. Cümleler tek tek gelir: kelimeye dokunur (ya da kelimeyi tutup boşluğa sürükler), cümle dolunca sıradakine geçer. Sonda özette cümleye dokunup geri dönebilir, sonra "Kontrol et" |

Tıkla-bul kartında şüpheli parça olarak şunlar seçilebilir: gönderen adı, gönderen adresi, konu, 1.–6. paragraf, düğme, alt satır.

Bilgi kartının düzenleri (Tur 7):

- **Liste** (varsayılan): paragraflar ve başlıklı maddeler alt alta. Eski kartlar böyle kalır.
- **Keşfet**: maddeler bir "Senin profilin" kartının alanlarıdır; öğrenci her alana dokunup açar. İlk paragraf girişte, ikinci paragraf bütün alanlar açılınca görünür. En az 2 madde.
- **Adım adım**: maddeler sırayla açılan adımlardır ("Dur, sor, kontrol et" gibi); açılmamış adım kilitlidir. Masaüstünde yan yana, eşit boyda durur. En az 2 madde.
- **Banka kartı**: örnek bir banka kartı çizimi (kurgusal "Örnek Banka"). Tam 4 madde ve sırası sabit: 1. kartın önü (numara ve tarih parlar), 2. kartın arkası (kart döner, CVV), 3. SMS kodu (telefon ve imza), 4. veli izni (kilit). İkinci paragraf 3. madde açılınca çıkar.

Liste dışındaki düzenlerde öğrenci **bütün maddeleri açmadan Devam edemez**. Maddenin ikonunu seçmezsen düzenin sıradaki varsayılan ikonu görünür.

Eşleştirme, kutulara ayırma ve boşluk doldurma:

- Eşleştirmede ve boşluk doldurmada öğrenci seçenekleri **alfabetik sırada** görür (eşleştirmede sağdakiler, boşluk doldurmada cevaplar ve yanıltıcı kelimeler birlikte). Senin yazdığın sıra cevabı ele vermez; doğruları sunucu bilir.
- Eşleştirmede aynı sağ birden çok kez yazılabilir. Bilgileri gruplara ayırtacaksan (Yeşil, Sarı, Kırmızı gibi) **Kutulara ayırma** kartını kullan: kutular renkli ve ikonlu, bilgiler sürüklenir. Sağdakiler hep farklıysa eşleştirmede her seçenek tek satıra gider.
- Kutulara ayırmada kutular ve bilgiler senin yazdığın sırayla görünür; hangi bilginin hangi kutuya gittiği tarayıcıya gitmez. Kutu adları birbirinden farklı olmalı ve kutu yalnızca rengiyle değil adıyla da anlaşılmalı ("Kırmızı kutu, Kimseye verilmez" gibi). Bir kutu silinirse içindeki bilgiler ilk kutuya geçer.
- Boşluk doldurmada bir boşluk en fazla 40 harftir. Aynı kelime iki boşluğa gelebilir; kutuda bir kez görünür. Yanıltıcı kelime yazmak isteğe bağlıdır ama alıştırmayı daha düşündürücü yapar.
- Öğrenci her kartı **bir kez** kontrol eder; sonra doğrular görünür. Yanlış yerleştirme de cevap sayılır.

Önemli kurallar:

- **Öğrenci eğitimi bitirmek için her mini testi, sorulu videoyu, eşleştirmeyi, kutulara ayırmayı ve boşluk doldurmayı cevaplamak zorundadır.** Yanlış cevap da sayılır; önemli olan cevaplamasıdır. Cevaplamadan "Bitir"e basarsa oynatıcı onu o soruya geri götürür.
- **Video dosyası panelden yüklenmez.** Video sitenin kendi dosyası olmalıdır (`/videolar/oltalama.mp4` gibi); YouTube ya da başka bir sitenin adresi kabul edilmez. Videoyu geliştiriciye ver, o siteye ekler ve sana adresini söyler.
- Eğitim odası **gizlenemez**; senaryolar ona bağlıdır. Temel eğitim mahallenin girişinden taşınamaz.
- Eğitim odasını bitiren öğrenci 100 puan alır.

## 1.7 Senaryo odası: sahne

### Mailler ve mesajlar

**Gelen kutusu** (Postam) ya da **Mesajlar** bölümünde öğeleri yazarsın. En fazla 8 öğe.

| Alan | Sınır | Not |
| --- | --- | --- |
| **Gönderen adı** / **Kişi adı** | 60 | Zorunlu |
| **Gönderen adresi** / **Numara ya da kullanıcı adı** | 80 | Öğrenci bakınca görür; sahte olanı ele veren yer çoğu zaman burasıdır |
| **Konu** (yalnızca gelen kutusu) | 120 | |
| **Saat** | 20 | "09:41", "Dün" gibi |
| **Bu mail / Bu mesaj** | Sahte (oltalama) ya da Gerçek | Öğrenci bunu görmez; puanlama buna göre yapılır |
| **Metin** | 1200 | Zorunlu. Paragrafları boş satırla ayır. `**kalın**` yazılabilir |
| **Alt satır** (yalnızca gelen kutusu) | 300 | Mailin altındaki küçük gri yazı |
| **Bağlantı** (isteğe bağlı) | Adres 120 (boşluk ve tırnak olmaz), düğme yazısı 40 | Gerçek bir siteye **gitmez** (aşağıda) |
| **Ek** (yalnızca gelen kutusu) | Dosya adı 60, boyut 20 | Açılmaz, indirilmez; "bu bir simülasyon" der |
| **İşaretler** (yalnızca sahte öğede) | Yer başına bir işaret; açıklama 300, maildeki kelimeler 120 | Raporda numaralı gösterilir |
| **Raporda "Neden?"** | 400 | Bu öğe neden sahte ya da neden güvenli |

**İşaretler:** Sahte öğede öğrencinin fark etmesi gereken yerler. Gelen kutusunda yerler **Gönderen**, **Metin**, **Bağlantı**; mesajlaşmada **Gönderen**, **Metin**, **İstek**. Her yere bir işaret konur, yani **en az 3 işaret = üç yerin üçü de**. Her işaretin açıklamasını yaz ("Adres kargo firmasına değil, garip bir siteye ait"). "Maildeki kelimeler" alanına mailde geçen birkaç kelimeyi aynen yazarsan raporda o kelimeler işaretlenir.

Raporun "işaretler" kartı **ilk sahte öğenin** işaretlerini gösterir.

**Bağlantılar ne yapar?**

- Gelen kutusunda **sahte maildeki** bağlantıya tıklayan öğrenciye **sahte sayfa** açılır (aşağıda). Mesajlaşmada da sahte mesajdaki bağlantı sahte sayfa açar, ama yalnızca **Tuzak anı**ndaki **Sahte sayfa** bölümünün başlığı yazılmışsa (aşağıda).
- **Gerçek öğedeki** bağlantı ve sahte sayfası olmayan mesajlaşma odasındaki bağlantı yalnızca adresi gösteren bir sayfa açar: "Bu odada gerçek siteler açılmaz. Bağlantı şu adrese gidiyordu: ..." Sahte mesajdaki bağlantıya tıklamak yine de "etkileşime girdi" sayılır.
- Öğrenci bağlantının üstüne gelince (telefonda basılı tutunca) adresi görür. Sahte öğede adresi ipucu olarak kullan.

### Sahte sayfa (gelen kutusu)

Sahte maildeki bağlantıya tıklanınca açılan sayfa:

| Alan | Sınır | Not |
| --- | --- | --- |
| **Sahte sayfanın adresi** | 120 | Adres çubuğunda "Güvenli değil" ile gösterilir. Zorunlu |
| **Sayfa başlığı** | 80 | "Postam ile doğrula", "Paketiniz depoda bekliyor". Zorunlu |
| **Sayfadaki kısa açıklama** | 300 | İsteğe bağlı |
| **Ne istiyor?** | 80 | Kutunun etiketi: "Postam şifresi". Zorunlu |
| **Verirse ne olur?** | Hesap, fidye, bilgi sızıntısı, para | Hacklendin ekranının türü |
| **Hangi hesap?** | 30 | Yalnızca "Hesabı ele geçirilir" türünde. Boşsa Postam. Örn. "Oyun". Gerçek marka adı yazılmaz |

Sayfanın üstünde sahte mailin gönderen adı yazar, bir geri sayım ve "Burada gerçek şifreni yazma" uyarısı vardır. "Hesabı ele geçirilir" türünde sayfa "Postam ile devam et" der (Hangi hesap? alanı doluysa o adla, ör. "Oyun ile devam et"), şifre kutusu ve **Giriş yap ve doğrula** düğmesi gösterir. Diğer türlerde tek bir kutu ve **Gönder ve devam et** düğmesi çıkar.

Öğrenci kutuya bir şey yazıp düğmeye basarsa **hacklenir**. Yazdığı metin hiçbir yere gönderilmez ve kaydedilmez; yalnızca "bilgi girdi" olayı kaydedilir. Sekmeyi kapatıp odaya dönerse hacklenmez ama tıklaması rapora yazılır.

### Tuzak anı (mesajlaşma)

| Alan | Sınır | Not |
| --- | --- | --- |
| **Ne istiyor?** | 80 | "Doğrulama kodu (6 hane)" ya da sahte sayfadaki kutunun etiketi. Zorunlu |
| **Öğrenci bunu gönderirse hacklenir** | 40 | Kod ya da kelime. Sahte sayfa yoksa zorunlu |
| **Sahte sayfa** (isteğe bağlı) | | Başlık (80), adres (120), kısa açıklama (300). Başlık yazılınca sahte mesajdaki bağlantı bu sayfayı açar; adres boşsa bağlantının adresi gösterilir |
| **Verirse ne olur?** | Hesap, fidye, bilgi sızıntısı, para | Hacklendin ekranının türü |
| **Hangi hesap?** | 30 | Yalnızca "Hesabı ele geçirilir" türünde. Boşsa Postam. Örn. "Oyun". Gerçek marka adı yazılmaz |

Öğrenci iki yoldan hacklenir; odada biri ya da ikisi olabilir:

- **Kod:** sahte konuşmaya yazdığı cevapta bu kodu gönderirse.
- **Sahte sayfa:** sahte mesajdaki bağlantıyı açıp sayfadaki kutuya bir şey yazıp gönderirse. Sayfa gelen kutusundaki sahte sayfa gibidir (yukarıda); kutunun etiketi **Ne istiyor?** alanıdır. Sahte sayfalı odada en az bir sahte mesajda bağlantı olmalıdır ("Yayına hazır mı?" listesi bakar). Hacklendin hikâyesi ve rapor bağlantıyla anlatılır: "Bağlantıyı açtın", "Sahte sayfaya bilgi girdin"; raporda doğru karar "Bağlantıyı açmadan bildirip engellemek" olur.

Kod yolu için:

- Kodda **4 ya da daha fazla rakam** varsa yalnızca rakamlara bakılır: "482 913", "482913" ve "4 8 2 9 1 3" aynı sayılır.
- Daha az rakam varsa metin büyük-küçük harfe bakılmadan aranır.
- Kodu **gerçek** bir konuşmaya (ör. annesine) göndermek hacklemez.
- Sahte konuşmaya kodu vermeden cevap yazmak "cevap yazdı" sayılır, puanı düşürür.

Kodu öğrencinin bulabileceği bir yere koy. Örnek odada kod gerçek "Postam" mesajının içinde gelir ("Doğrulama kodun: 482 913. Kimseyle paylaşma."), sahte arkadaş da o kodu ister.

### Hacklendin hikâyesi

Öğrenci hacklenince önce **alarm** ekranı, sonra **sonuç sahnesi** gelir, sonra rapor (3 Kasım, 19 ve 22. revize; "Adım adım ne oldu" açıklaması kalktı). Sahne, gerçek hayatta şimdi ne olacağını telefonun içinde canlandırır ve öğrenci **Devam** diyene kadar durur:

| Sahne (`trap.scene`) | Ne olur | Kendiliğinden ne zaman |
| --- | --- | --- |
| **Para** (`money`) | Bankanın uygulamasında ödeme ve hizmet bedeli düşer, bakiye azalır | Satış görevinde ödeme isteğini onaylayınca (tutar isteğin tutarı) |
| **Kart** (`card`) | Harcama bildirimleri arka arkaya düşer | Tür "Para" ise; tutarı olmayan odada Para sahnesi de buna döner |
| **Hesap** (`account`) | Profil fotoğrafı ve adı değişir, arkadaşlarına senin adınla mesaj gider | Tür "Hesap" ise |
| **Adres** (`home`) | Haritada bir nokta evine yaklaşır, kapıya varmadan durur | Tür "Kişisel veri" ise |

Dosyada (sahte sayfa ya da tuzak anı) **Sonuç sahnesi** alanı boşsa ("Türüne göre") tablodaki kural uygulanır; hikâyeye başka sahne uyuyorsa elle seç. **"Gerçek hayatta bu ne demek?"** cümlesi sahnenin altyazısıdır; boşsa sahnenin genel cümlesi çıkar. Dosyadaki "Ne yapardın?" adımları artık öğrenciye gösterilmez (eski odalar için şemada durur).

- **Hacklenme adımları** (linke tıkladın, sahte sayfaya bilgi girdin, kodu yazdın...) raporun "Odada ne oldu" adımında kararların içinde anlatılır.
- **Alarmdaki bildirimler** türe göre sabittir. Örneğin "Hesap" türünde "Postam hesabın ele geçirildi", "Şifren değiştirildi" ve bir gerçek öğenin göndereninden gelen "Bu linki sen mi gönderdin?" maili çıkar (hesabın kendi uygulamasından gelen öğe, ör. Postam'ın kod mesajı, seçilmez). "Para" türünde "Kartından 2.450 TL çekildi" yazar. Bu yüzden **türü hikâyeye uygun seç**.
- **"Hesap" türünde hesabın adı** "Hangi hesap?" alanından gelir; boşsa Postam. "Oyun" yazarsan alarm "Oyun hesabın ele geçirildi" der, bildirimler mail yerine mesaj der ("Arkadaşlarına 37 mesaj gönderildi"), "Bir dahaki sefere"nin ilk genel maddesi "Başka bir cihazdan Oyun şifreni hemen değiştirirdin" olur.
- **"Gerçek hayatta bu ne demek?"** (500 karakter, sahnenin altyazısı) ve **"Bir dahaki sefere" maddeleri** (en fazla 3, her biri 200) isteğe bağlıdır. Boş bırakırsan türün genel metni çıkar. Kendi odana özel yazarsan daha etkili olur.

## 1.8 Görevler ve doğru kararlar

Görev panelinde öğrenciye sırayla görev verilir. Biri bitmeden sonraki açılmaz. En az 4, en fazla 8 görev.

| Görev | Dosyada | Ne zaman biter | Puan |
| --- | --- | --- | --- |
| **EYLEM** | Bir tane: "Gelen kutunu aç" | Uygulamayı açınca | Puanı yok |
| **BİLDİR** | Bir tane: "Gelen kutunu incele, şüphelileri bildir" | Öğrenci bütün mailleri (mesajları) açıp **İncelemeyi bitirdim**'e basınca | Mail ve mesaj kararlarının puanı (aşağıda) |
| **SORU** | Birkaç tane | Bir seçenek seçince | Seçtiği seçeneğin puanı |
| **GÖREV** (yalnızca görevli odada) | Bir tane: "Kulaklığı doğru yerden al" (Postam), "Telefonu doğru alıcıya sat" (Mesajlar, satış görevi) | Alış görevinde öğrenci ödeyip onay kodu için karar verince; satış görevinde bir siparişi kargoya verince | 1 puan: gerçek mağazadan aldıysa (2.12) ya da gerçek siparişi hazırlayıp gönderdiyse (2.13) |

Görev metni en fazla 200 karakter. Sıra: önce EYLEM, sonra BİLDİR, sonra sorular. EYLEM ve BİLDİR görevinden birer tane olabilir, bu yüzden **en az 2 soru** gerekir.

**Soru görevi:** **3 ya da 4 seçenek** (her biri 160 karakter), her seçeneğe 0–4 puan. En az bir seçenek puanlı olmalı. En yüksek puanlı seçenek "doğru" sayılır; ara puan "kısmen" sayılır. Oda sırasında doğru ya da yanlış söylenmez.

**Raporda "Doğrusu" ve "Neden?":** Her soru görevinde iki alan zorunludur (Doğrusu 300, Neden 400 karakter); raporda o sorunun altında görünür. BİLDİR görevinde bu alanlar yoktur: raporda BİLDİR görevinin kendi satırı yok, her mail ya da mesajın satırı kendi metinlerini kullanır (1.9). EYLEM görevinde de yoktur.

### Öğrencinin kararları nasıl puanlanır

Sahte öğe için (en fazla 4 puan):

| Öğrencinin yaptığı | Puan | Raporda |
| --- | --- | --- |
| Tıklamadan / cevap yazmadan **bildirdi** (Spam'e taşıdı, mesajlaşmada bildirip engelledi) | 4 | Doğru |
| Önce linke tıkladı ya da cevap yazdı, **sonra bildirdi** | 2 | Kısmen |
| **Sildi** ama bildirmedi | 2 | Kısmen |
| Dokunmadı, bildirmedi de | 1 | Kısmen |
| Linke tıkladı ya da cevap yazdı, bildirmedi | 0 | Yanlış |
| Sahte sayfaya bilgi girdi ya da kodu gönderdi (**hacklendi**) | 0 | Yanlış |

Gerçek öğe için (1 puan):

| Öğrencinin yaptığı | Puan |
| --- | --- |
| Gelen kutusunda bıraktı / dokunmadı | 1 |
| Sildi | 1 (raporda "kısmen") |
| Yanlışlıkla bildirdi | 0 |

Öğrenci kararını geri alabilir; her öğe **son bulunduğu klasöre** göre puanlanır.

**Toplam puan tam 10 olmalı.** `tests/unit/room-files.test.ts` bunu denetler. Hesap: her sahte öğe 4 + her gerçek öğe 1 + her sorunun en yüksek seçeneği.

Öğrenci raporda puanı **100 üzerinden** görür: dosyadaki her puan × 10 (sahte öğe 40, gerçek öğe 10, 2 puanlı seçenek 20). Rapordaki satırlar da aynı ölçekle yazılır ("40/40"). Taslak denenirken toplam 10 değilse puan yine 100'e ölçeklenir (`lib/lab/scoring.ts`).

Pratikte bu şu demektir:

- Bir senaryo odasında **tek sahte öğe** olur. İki sahte öğe 8 puan eder; en az bir gerçek öğe ve en az iki puanlı soruyla toplam 10'u geçer.
- Sahte öğe 4 puan, kalan 6 puan gerçek öğeler ve sorular arasında paylaşılır:

| Gerçek öğe | Soruların en yüksek puanları toplamı | Örnek |
| --- | --- | --- |
| 1 | 5 | 3 + 2 |
| 2 | 4 | 2 + 2 |
| 3 | 3 | 2 + 1 (iki örnek oda da böyle) |
| 4 | 2 | 1 + 1 |

### Rapordaki durum ve başlık

| Durum | Ne zaman |
| --- | --- |
| **Hacklendin** | Sahte sayfaya bilgi girdi ya da kodu gönderdi |
| **Güvende kaldın** | Sahte öğede en az 2 puan aldı (bildirdi, sonradan bildirdi ya da sildi) |
| **Kıl payı** | Diğer durumlar (dokunmadı ya da tıklayıp bıraktı) |

"Güvende kaldın" durumunda puan 90 ya da üstüyse başlık "Oltalamayı yakaladın!" (mesajlaşmada "Tuzağı yakaladın!"), değilse "Güvende kaldın, ama gözden kaçanlar var." olur. Öğrenci rapor puanının 2 katını puan olarak alır (100/100 = 200 puan).

## 1.9 Rapor metinleri ve ipuçları

Rapor okunur, öğrenci bir şeye dokunmaz; adım adım gelir (3 Kasım, 14. revize): **1 Odada ne oldu** (kararlar; doğru olmayanın "Doğrusu" ve "Neden"i açık), **Sonraki** ile **2 Kaçırdığın an** (sahte öğedeki işaretler ve orada kalan puan), **3 Bir dahaki sefere** (ipuçları görselli kartlar; başlığı ipucunun anahtar kelimesinden gelir: "bildir" Silme, bildir; "adres" Adrese bak; "kendin" Kendin aç... `lib/lab/tip-kind.ts`). Tekrar dene ve sonraki oda düğmeleri son adımdadır.

Raporda her mail ya da mesaj için bir satır çıkar:

- **Ne yaptın:** Kendiliğinden yazılır ("Oltalama olarak bildirdin.", "Linke tıkladın, sahte sayfayı kapattın ama maili bildirmedin.").
- **Doğrusu:** Mail ve mesaj satırlarında sabittir. Sahte mailde "Linke hiç tıklamadan oltalama olarak bildirmek.", gerçek mailde "Gelen kutusunda bırakmak." yazar. Mesajlaşmada "Cevap yazmadan bildirip engellemek." ve "Dokunmadan olduğu gibi bırakmak." yazar.
- **Neden:** O öğenin **Raporda "Neden?"** alanı. Her öğe için yaz, gerçek öğeler için de ("Adres okulun gerçek alan adı, bir şey istemiyor").

Her soru için de bir satır çıkar: öğrencinin seçtiği, sorunun **Doğrusu** ve **Neden?** alanları.

**"Bir dahaki sefere" ipuçları** (Rapor bölümü): en fazla 8 ipucu (her biri 240 karakter), **en az 3** zorunlu. Her ipucunun ne zaman çıkacağını seçersin:

| Koşul | Gelen kutusunda | Mesajlaşmada |
| --- | --- | --- |
| `engaged` | Linke tıkladıysa | Cevap yazdıysa |
| `hacked` | Hacklendiyse | Hacklendiyse |
| `missedFake` | Sahte maili bildirmediyse | Sahte mesajı bildirmediyse |
| `reportedReal` | Gerçek maili bildirdiyse | Gerçek mesajı bildirdiyse |
| `always` | Her zaman | Her zaman |

Raporda **koşulu tutan ilk 3 ipucu** listedeki sırayla çıkar; 3'ten azsa genel ipuçlarıyla 3'e tamamlanır. "Her zaman" ipucunu en başa koyarsan her raporda bir yer kaplar; en sona koy.

## 1.10 "Öğrenci gibi dene"

Listedeki **Dene** ve odanın sayfasındaki **Öğrenci gibi dene**, odanın taslağını öğrencinin tam ekran oynatıcısında açar. Mailleri açıp bağlantılara tıklayabilir, sahte sayfaya bir şey yazıp hacklendin ekranını görebilir, sonunda raporu alabilirsin. Hiçbir şey kaydedilmez, kimsenin ilerlemesi değişmez. İşaretlerin kırmızı numaraları yalnızca raporda görünür, odada görünmez.

Her yayından önce odayı en az iki yoldan dene: her şeyi doğru yapan öğrenci (100/100) ve hacklenen öğrenci. Telefonda da bir kez aç.

## 1.11 Yayınlama, gizleme ve geri alma

**Yayınlamak** için listedeki ya da odanın sayfasındaki **Yayınla** düğmesine bas. Depodaki dosyadan gelen taslak yayınlanır. Oda yayındaysa ve dosya değiştiyse düğme **Yeni sürümü yayınla** olur; o zamana kadar öğrenciler eski sürümü görür.

Yayınlama penceresi kaç öğrencinin odanın ortasında olduğunu söyler. Senaryo odasında ortadaki öğrenciler eski sürümle bitirir, yeni başlayanlar yeni sürümle oynar. Eğitim odasında öğrenciler kaldıkları karttan yeni kartlarla devam eder. Bitirenlerin raporları ve puanları değişmez. Öğrencilere bildirim gitmez; oda haritaya sessizce eklenir.

**Yayına hazır mı?** listesi tamamlanmadan yayınlanamaz; eksikler odanın sayfasında listelenir. Bu denetim sunucuda da yapılır. Yayındaki sürümle aynı taslağı yayınlamaya çalışırsan "yayınlanacak değişiklik yok" der.

**Geri al:** Yayından hemen sonra çıkan bildirimde **Geri al** düğmesi birkaç saniye görünür. Oda önceki haline döner (ilk yayınsa yeniden taslak olur). Bu arada bir öğrenci yeni sürümle başladıysa geri alınamaz ("bu arada bir öğrenci yeni sürümle başladı"). O zaman düzeltmeyi yapıp yeni bir sürüm yayınla.

**Gizlemek:** Listede yayındaki senaryo odasını gizleyebilirsin. Oda haritadan kalkar; ilerlemeler, raporlar ve rozetler silinmez. Ödev olarak verildiği sınıflarda "şu an kapalı" görünür. İstersen neden gizlediğini yazarsın, onu yalnızca yöneticiler görür. Eğitim odası gizlenemez.

**Ödev:** Öğretmen ödevi mahalle mahalle değil oda oda verir. Seçtiği senaryoyu ya da ileri eğitimi açan eğitim ödeve kendiliğinden girer (`lib/classroom/homework.ts`). Odayı gizlersen ödevde "şu an kapalı" olur; açan eğitimini değiştirirsen yeni eğitim ödevlere kendiliğinden eklenir.

Bütün bu işlemler (yayınlama, geri alma, gizleme, taşıma) kayıt defterine yazılır.

### Taslak sen bakarken değişirse

Liste ve odanın sayfası, açıldıkları andaki taslağın sürüm numarasını bilir. Bu arada taslak değiştiyse (yeni bir yayınla dosya güncellendiyse) **Yayınla** yayınlamaz: "taslağı sen bakarken değişti, yayınlanmadı" der ve sayfayı yeniler. Yeni hali deneyip yeniden yayınla.

### "Taslak okunamadı" uyarısı

Odanın sayfasında **Taslak okunamadı** uyarısı görürsen kayıtlı taslak içerik şemasına uymuyor demektir. Örneğin kurallar sıkılaştı ve taslakta artık izin verilmeyen bir video adresi kaldı. Bu durumda:

- Yayınlama kapalıdır, taslağın üstüne yazılmaz.
- Öğrencilerin gördüğü yayındaki sürüm etkilenmez.
- Uyarıda "Uymayan alanlar" listelenir. Bunu **geliştiriciye ilet**, o oda dosyasını düzeltir.

Listede de bu oda "Taslak okunamadı" diye görünür.

## 1.12 Kurallar

**Gerçek marka, logo ve alan adı yok.**

- Mail uygulamasının adı **Postam**, mesajlaşmanınki **Mesajlar**. Gerçek bir mail ya da mesajlaşma uygulamasının adını yazma.
- Kargo firması, banka, oyun, sosyal medya, okul: hepsi **uydurma** isimle. "Kargo Takip", "Market Puan", "Okul Duyuru" gibi.
- Adresler ve alan adları da uydurma olsun. Var olan bir şirketin ya da kurumun alan adını, benzerini (ör. harfi değiştirilmiş bir banka adı) ya da logosunu kullanma. Yazdığın alan adının gerçek bir siteye ait olmadığından emin değilsen geliştiriciye sor.
- Gerçek kişi adı (ünlü, öğretmen, öğrenci) kullanma. Telefon numaralarını yıldızla gizle ("+90 5** *** ** 41").

**Gerçek bağlantı yok.** Odadaki hiçbir bağlantı gerçek bir siteye gitmez, hiçbir ek indirilmez. Yine de dosyadaki adreslere gerçek, açılabilir bir site yazma; öğrenci adresi kopyalayıp tarayıcıya yapıştırabilir.

**Çocuklara uygun dil.** Okuyucu ortaokul ve lise öğrencisi.

- Kısa cümle, günlük dil. Teknik terimi kullanıyorsan bir kere açıkla.
- Korkutma, utandırma, suçlama yok. Hacklenen öğrenciye "Bu sefer kandın. Ama artık biliyorsun." der; senin metinlerin de bu tonda olsun.
- Şiddet, kumar, yetişkin içeriği, siyaset, din, gerçek bir olaya ya da kişiye gönderme yok.
- Sahte mesajı yazarken gerçek dolandırıcıların taktiklerini (acele ettirme, ödül vaadi, korkutma) **göster**, ama öğrenciye nasıl dolandırıcılık yapılacağını öğreten adım adım tarif verme.
- Şifre, kod ya da kart numarası örneği uydurma olsun ve öğrencinin kendi bilgisini yazmasını gerektirmesin.

**Odada cevap verme.** Oda sırasında hiçbir metin (hatırlatma, görev metni, mail metni) "bu sahte" dememeli. Doğru ve yanlış raporda söylenir.

## 1.13 Yayından önce kontrol listesi

Odanın "Yayına hazır mı?" listesine ve `room-files` testine ek olarak:

- [ ] Örnek içerikten başladıysan örnekten kalan bütün metinleri değiştirdim (kapak, mailler, sahte sayfa, sorular, ipuçları).
- [ ] Oda adı düzgün; adres bu addan üretildi ve değişmeyecek.
- [ ] Hiçbir yerde gerçek marka, logo, alan adı, kişi adı, telefon numarası yok.
- [ ] Sahte öğenin adresinde, metninde ve bağlantısında ya da isteğinde öğrencinin bulabileceği gerçek işaretler var. İşaret açıklamaları bunlarla aynı şeyi söylüyor.
- [ ] Gerçek öğeler gerçekten güvenli görünüyor. Öğrenciyi haksız yere yanıltan bir "tuzak" gerçek öğe yok.
- [ ] Mesajlaşmada kod öğrencinin görebileceği bir mesajda geçiyor ve "Öğrenci bunu gönderirse hacklenir" alanıyla aynı.
- [ ] "Verirse ne olur?" türü hikâyeye uyuyor (alarm ekranındaki sabit metinlerle çelişmiyor).
- [ ] Her öğenin "Neden?" alanı ve her sorunun "Doğrusu" ve "Neden?" alanları dolu, cevabı açıklıyor.
- [ ] Hatırlatmalar ve görev metinleri cevabı söylemiyor.
- [ ] En az 3 ipucu var, koşulları doğru, "Her zaman" ipuçları sonda.
- [ ] Toplam 10 puan.
- [ ] **Öğrenci gibi dene** ile odayı baştan sona oynadım: doğru yol "Güvende kaldın" ve 100/100 diyor, hacklenme yolu "Hacklendin" diyor.
- [ ] Telefonda (dar ekranda) da açtım; uzun adresler ve metinler taşmıyor.
- [ ] Yazım ve noktalama kontrolü yaptım, ekip arkadaşım bir kez okudu.
- [ ] Eğitim odasında her mini testin ve sorulu videonun doğru cevabı ve açıklaması doğru; video adresi geliştiriciden geldi.

Yayından sonra: bir öğrenci hesabıyla haritadan odayı aç, oyna, raporu oku.

## 1.14 Sık hatalar

| Hata | Ne olur | Çözüm |
| --- | --- | --- |
| Toplam 10 değil | Yayınlanamaz | Soru seçeneklerinin puanlarını ya da gerçek öğe sayısını değiştir (1.8'deki tablo) |
| İki sahte öğe koymak | Toplam 10'u geçer | Odada tek sahte öğe olsun; ikinci sahteyi ayrı bir odada kullan |
| Sahte öğede 3'ten az işaret | "Her sahte mailde 3 işaret" eksik kalır | Üç yerin (Gönderen, Metin, Bağlantı / İstek) üçüne de işaret koy |
| Soruda 2 ya da 4 seçenek | "Her soruda 3 seçenek" eksik kalır | Tam 3 seçenek |
| Bütün seçenekler 0 puan | Yayınlanamaz | En iyi seçeneğe puan ver |
| Mesajlaşmada kod hiçbir mesajda yok | Öğrenci hacklenemez, oda anlamsızlaşır | Kodu gerçek bir mesajın içine koy |
| Kod 4 rakamdan kısa ve sıradan bir kelime ("tamam") | Öğrenci kazara hacklenebilir | Kod 6 rakamlı olsun |
| Sahte mailde bağlantı yok (gelen kutusu) | Öğrenci sahte sayfaya ulaşamaz, hacklenme yolu olmaz | Sahte maile bağlantı ekle |
| "Hesap" türü seçip hikâyeyi karta kurmak | Alarm "Postam hesabın ele geçirildi" der | Türü "Kartından para çekilir" yap |
| Oyun hesabı hikâyesinde "Hangi hesap?" boş | Alarm "Postam hesabın ele geçirildi" der | "Hangi hesap?" alanına "Oyun" yaz |
| "Her zaman" ipucunu başa koymak | Koşullu ipuçları rapora sığmaz | "Her zaman" ipuçlarını sona al |
| Örnek içerikten kalan metin | Öğrenci aynı maili iki odada görür | Yayından önce bütün metinleri değiştir |
| Video için YouTube adresi | Şema kabul etmez, test düşer | Videoyu geliştiriciye ver |

---

# 2. kısım: Geliştirici (Claude Code) için

Bu kısım, oda dosyası yazmanın ötesindeki işler içindir: yeni sahne türü (şablon), içerik şemasına alan eklemek, video dosyası eklemek, okunamayan taslağı düzeltmek.

## 2.1 Yapı ve veri akışı

```
Oda dosyası (labs/rooms/) ─ seed (prisma/rooms.ts) ─▶ Lab.draftContent
Odalar sayfası (components/admin/labs/)
  └─ publishLab (lib/admin/lab-actions.ts)
       ├─ validateContent (lib/admin/validate.ts) ← içerik şeması (lib/lab/content.ts)
       ├─ yayınlarken "Yayına hazır mı?" (lib/lab/checklist.ts)
       └─ Lab.draftContent  ──yayınla──▶  LabVersion.content (sürüm sürüm, değişmez)

Öğrenci (app/(focus)/oda/[oda]/oyna)
  └─ yayındaki içerik ─ toClientScenario / toClientCard (lib/lab/client.ts) ─▶ tarayıcı
  └─ oynatıcı (components/lab/frame/, inbox/, messaging/, training/)
       └─ LabDriver (components/lab/driver.ts)
            ├─ server-driver.ts → sunucu eylemleri (lib/lab/actions.ts)
            │    olaylar (events.ts), bağlantı ve hacklendin (story.ts),
            │    puan (scoring.ts), rapor (report.ts)
            └─ preview/local-driver.ts → yönetimdeki önizleme (aynı fonksiyonlar, tarayıcıda)
```

- `Lab.draftContent` taslaktır. Her yayın yeni bir `LabVersion` satırı yazar. Öğrencinin denemesi (`LabAttempt.labVersion`) başladığı sürüme bağlıdır.
- `Lab.draftRevision` taslağın sayısal sürümüdür. Taslağı yazan her işlem bunu koşullu günceller (2.6).
- Yönetimdeki önizleme ve "Öğrenci gibi dene" aynı puanlama ve hikâye fonksiyonlarını tarayıcıda çalıştırır. Taslağın tamamı yalnızca lab izni olan ekibe gider.

## 2.2 İçerik şemasını değiştirmek

`lib/lab/content.ts` hem taslakları hem yayındaki sürümleri okur. Okuyamadığı içerik için:

- **Taslak** "Taslak okunamadı" olur; yayınlama kapanır (güvenlik turu 2, D8).
- **Yayındaki sürüm** öğrenciye "lab bulunamadı" olur.

Bu yüzden şema değişikliği ya **geriye uyumlu** olur ya da **veri migration'ıyla** gelir:

- Yeni alan `.default(...)` ile eklenir; eski içerik o değerle okunur.
- Sınır daraltılacaksa (daha kısa metin, daha sıkı adres), önce veritabanındaki `Lab.draftContent` ve `LabVersion.content` içinde yeni sınıra uymayan satır olup olmadığına bakılır. Varsa aynı PR'da bir Prisma migration'ı (SQL) ile düzeltilir.
- Taslak okunamadığında odanın sayfası "Uymayan alanlar" yollarını gösterir (`draftIssues`, `lib/admin/validate.ts`). Düzeltme oda dosyasında yapılır.
- `labs/examples/*.json` ve `tests/fixtures/rooms/*.json` her zaman şemaya uymalı (`tests/unit/lab.test.ts` denetler). Motor testleri sabit kopyaları (`tests/fixtures/rooms/`) okur; gerçek oda değişince onlar değişmez.

## 2.3 Yeni sahne türü (şablon) eklemek

Örnek: "İndirme sayfası" (`DOWNLOAD`) şablonu. Aşağıdaki listeyi sırayla gez. `grep -rn "MESSAGING"` hepsini bulmaya yardım eder.

**Dikkat:** Kodda `template === "MESSAGING" ? "MESSAGING" : "INBOX"` biçiminde **sessiz geri düşmeler** var (`lib/lab/actions.ts`, `lib/admin/pulse-model.ts`, `app/(visitor)/oda/[oda]/page.tsx`). Yeni şablon bunlarda INBOX sayılır. Her birini açık bir `switch` ya da kayıt (`Record<ScenarioTemplate, ...>`) yap ki TypeScript eksik dalı yakalasın.

### Veri ve şema

| Dosya | Ne yapılır |
| --- | --- |
| `prisma/schema.prisma` (`enum SceneTemplate`) | Yeni değer; `npm run db:migrate` ile migration (`ALTER TYPE ... ADD VALUE`) |
| `lib/lab/content.ts` | `templates` listesi; şablona özgü alanlar varsa `itemSchema` / `trapSchema`'ya `.default` ile; gerekiyorsa yeni `signPlaces` |
| `lib/lab/route.ts` | `LabTemplate` tipi |
| `lib/admin/validate.ts` | `signPlacesFor` (şablonun işaret yerleri) |
| `lib/lab/checklist.ts` | Şablonun "Yayına hazır mı?" kuralları (özellikle `trap` maddesi) |
| `lib/admin/drafts.ts` + `labs/examples/<yeni>.json` | Şablonun örnek labı (testler ve seed için) |

### Lab motoru (sunucu)

| Dosya | Ne yapılır |
| --- | --- |
| `lib/lab/events.ts` | Yeni olay türü gerekiyorsa Zod şemasıyla (`ref` kimlikleri, sayı sınırları) ve `applyEvent` dalıyla |
| `lib/lab/scoring.ts` | "Etkileşime girdi" ve "hacklendi" bu şablonda neye karşılık geliyor (`fakeOutcome`) |
| `lib/lab/story.ts` | `linkPageFor` ve `hackedStory`: bağlantının açtığı sayfa, hikâyenin "ilk" ve "ikinci" anı |
| `lib/lab/actions.ts` | Şablona özgü eylem (ör. `submitTrap`, `sendReply` gibi); **şablonu denetle** (başka şablonun labında reddet), sırayı (`seq`) ve deneme sahipliğini denetle, istek sınırı uygula |
| `lib/lab/client.ts` | `toClientScenario`: tarayıcıya giden alanlar. Yeni alanın doğru kararı ele verip vermediğini düşün (2.5) |
| `lib/lab/report.ts` | Rapor satırlarının metinleri; `SignsCard` için işaretli parça |

### Oynatıcı ve sahne (tarayıcı)

| Dosya | Ne yapılır |
| --- | --- |
| `components/lab/<yeni>/` | Sahne bileşeni (`InboxScene`, `MessagingScene` örnek). Ortak parçalar `components/lab/scene/parts.tsx` |
| `components/lab/frame/ScenarioPlayer.tsx` | Şablona göre sahneyi seçen dal; `TaskPanel.tsx`, `StartDialog.tsx` |
| `components/lab/driver.ts` | Yeni eylem varsa `LabDriver` arayüzü |
| `components/lab/server-driver.ts` | Arayüzün sunucu eylemlerine bağlanması |
| `components/lab/preview/local-driver.ts` | Aynı davranışın önizlemedeki karşılığı (sunucuyla aynı fonksiyonlar) |
| `components/lab/hacked/` | Alarm ve açıklama metinleri şablona göre farklıysa |
| `components/lab/report/SignsCard.tsx` | Rapordaki mail ya da mesaj resmi |
| `components/lab/detail/PhoneMockup.tsx`, `types.ts` | Lab sayfasındaki telefon resmi |

### Yönetim

| Dosya | Ne yapılır |
| --- | --- |
| `components/admin/labs/LabList.tsx`, `RoomPage.tsx` | Listedeki ve odanın sayfasındaki şablon adı (`admin.list.kind`) |
| `lib/admin/try-path.ts` | Seçimleri olaylara çeviren kısım (etkileşim ve hacklenme olayı) |
| `lib/admin/pulse-model.ts` | Canlı nabızdaki lab satırları (şablona göre metin) |

### Metinler ve belgeler

- `lib/i18n/messages/tr.ts`: `admin.list`, `admin.room` (`checklist`), `lab.*` (sahne, `browser`, `hacked.explain.steps`, `report.titles`, `report.outcomes`, `report.defaults`, `report.genericTips`, `report.tags`). Bileşene sabit metin yazılmaz.
- `docs/glossary.md`: yeni şablonun Türkçe ve İngilizce adı.
- Bu kılavuz: 1.2'deki tablo, şablonun alanları, puanlama ve hacklenme yolu.

## 2.4 Yazılacak testler

Birim (`tests/unit/`):

- `lab.test.ts`: yeni örnek lab şemaya uyuyor ve yayına hazır (`it.each(examples)` kendiliğinden kapsar); puanlama yolları (doğru, kısmen, hacklendi); **tarayıcıya giden içerikte** sahte/gerçek, puan, işaret, "Neden?", sahte sayfa ve ipucu yok.
- `lab-report.test.ts`: rapor görünümü, hacklendin hikâyesi, önizleme sürücüsünün sunucuyla aynı raporu verdiği.
- `admin.test.ts`: `validateContent` (işaret yerleri, tekrar eden kimlikler), kontrol listesi, `try-path`.

Uçtan uca (`tests/e2e/`, masaüstü ve 390 px telefon):

- `admin.spec.ts` gibi: yeni şablonda örnek oda taslak olarak eklenir, yönetici listeden yayınlar; öğrenci oynar, rapor doğru.
- Öğrencinin güvenli yolu ve hacklenme yolu (alarm, sonuç sahnesi, adım adım rapor; yardımcılar `continueFromScene`, `reportStep` `tests/e2e/support/lab.ts`).
- `lab-security.spec.ts` gibi: öğrencinin sayfalarında doğru kararlar yok; yeni eylem başka şablonun labında, başkasının denemesinde ve bitmiş denemede reddediliyor.
- `lab-robustness.spec.ts`: taslak yarışları ve okunamayan taslak; şablon yeni eylem ekliyorsa aynı anda gelen isteklerde çift kayıt olmadığını gösteren bir test.

Her test eski kodda başarısız olmalı. Koşmak için: `npm run lint`, `npm run typecheck`, `npm test`, sonra `npm run build && npx playwright test <ilgili dosyalar>`.

## 2.5 Güvenlik kuralları

- **Doğru kararlar tarayıcıya gitmez.** Öğrencinin tarayıcısına içerik yalnızca `lib/lab/client.ts` üzerinden gider (`toClientScenario`, `toClientCard`). Orada öğenin sahte mi gerçek mi olduğu, işaretler, "Neden?", sahte sayfanın içeriği, seçenek puanları, eğitim kartlarının doğru cevabı ve açıklaması, ipuçları çıkarılır. Yeni alan eklerken "bu alan cevabı ele verir mi?" diye sor; verirse eklemezsin, sunucu eylemi gerektiği anda döner (ör. `openLink` sahte sayfayı yalnızca tıklanınca verir). Mesajlaşmadaki `secret` istisnadır: zaten gerçek bir mesajda görünür, hangi konuşmanın sahte olduğunu söylemez.
- `lib/admin/drafts.ts` ve örnek JSON'lar `server-only`dir; bir tarayıcı bileşeninden içe aktarılırsa derleme durur.
- **Puan sunucuda hesaplanır** (`scoreScenario`, `finishAttempt`). Tarayıcıdan puan, sonuç ya da "hacklendi" bilgisi alınmaz; yalnızca olaylar (`events.ts`, Zod ile denetlenir) gelir.
- **Gerçek ağ isteği yok.** Sahnede `href` ile dış bağlantı, dış `src` (resim, video, iframe) yok. Bağlantı adresi yalnızca metin olarak gösterilir. Video `^/(?!/)` ile sitenin kendi dosyasıyla sınırlıdır.
- **Sahte forma yazılan metin kaydedilmez ve sunucuya gönderilmez.** Yalnızca "bilgi girildi" (`info_entered`) ya da "kod gönderildi mi" (`reply_sent.secret: boolean`) olayı gider. Kutu gönderilince boşaltılır.
- **Her eylem kendini denetler:** oturum ve e-posta doğrulaması, denemenin sahibi (`openAttempt`), labın şablonu, olay sırası (`seq`), istek sınırı. Yönetim eylemleri izni kendisi yeniden sorar (`requirePermission`).
- **Taslak yazımı koşulludur.** `publishLab` ve seed, `draftRevision` eşleşmezse yazmaz; `publishLab` "conflict" döner (D9). Okunamayan taslağın üstüne hiçbir eylem yazmaz (D8).
- **Eğitim bitişi sunucuda denetlenir.** Bütün soru kartları cevaplanmadan eğitim bitmiş sayılmaz (`TrainingProgress.answeredCards`, `firstUnanswered`, B1).
- Gerçek marka, logo ve alan adı kodda da yok: sahne adları (Postam, Mesajlar) ve sabit metinler sözlükte, uydurma.
- "Hareketi azalt" ayarı açıksa alarm ekranında sarsıntı ve flaş olmaz.

## 2.6 Taslak sürümü ve çakışmalar

- `Lab.draftRevision` her taslak yazımında (seed dosyadan yazınca) bir artar. Liste ve odanın sayfası bunu açılışta alır.
- `publishLab(labId, { revision })`: kayıtlı taslağı yayınlar, yalnızca taslak sayfa açıldığından beri değişmediyse; değiştiyse "conflict" ve sayfa yenilenir.
- Denetim ve yazım tek bir `UPDATE ... WHERE draftRevision = ?` cümlesidir (`writeIfRevision`). Ayrı bir "önce oku sonra yaz" adımı yoktur.

## 2.7 Eğitimler ve kilitler

Kural tek yerde, saf hesap olarak durur: `lib/lab/gates.ts`. Sunucu (`getCity`, oynatıcı, `trainingCard`, `saveTrainingProgress`), yönetim listesi, ödev ve rozetler buradan okur; başka yerde kilit yazılmaz.

- **Temel eğitim:** mahallenin `sortOrder`'ı en küçük eğitimi (eşitlikte kimlik). Her zaman açık. Ziyaretçi yalnızca bunu açabilir.
- **İleri eğitim:** diğer eğitimler; temel eğitim bitince açılır.
- **Senaryo:** `Lab.unlockedById` eğitimi bitince açılır. Boşsa, eğitim yayında değilse ya da başka mahalleninse temel eğitim açar (`gateOf`). Mahallede hiç eğitim yoksa senaryo açıktır (yeni mahalle).
- **Rota:** her eğitim, ardından onun senaryoları (`routeOrder`). Harita, "sıradaki oda", ödev ve yönetim listesi bu sırayı kullanır.
- **Mahalle rozeti** temel yolu sayar: temel eğitimin senaryoları (`isBasicPath`). İleri eğitimin senaryoları rozet için gerekmez. Şehir turu henüz senaryosu olmayan mahalleyi beklemez.
- **Ödev:** `Assignment.labIds` öğretmenin seçtikleri ve açan eğitimleridir (`withGates`, `homeworkSelection`). Boş liste "mahallenin bütün odaları" demektir (oda seçimi gelmeden verilmiş eski ödevler). Ödevin odaları her ekranda `homeworkLabs` ile hesaplanır.

`20261015144935_multiple_trainings` migration'ı eski "mahallede tek eğitim" indeksini (`Lab_neighborhoodId_training_key`) kaldırır, `Lab.unlockedById` ve `Assignment.labIds` alanlarını ekler. Sunucudaki indeks durumu artık izlenmez; `docker/server/inspect.sh` yalnızca mahalle başına eğitim sayısını yazar.

Testler: `tests/unit/lab-gates.test.ts` (kilitler, rota, ödev seçimi), `tests/unit/lab-route.test.ts`, `tests/unit/student-class.test.ts` (ödev kutusu), `tests/e2e/lab-robustness.spec.ts` D10 (aynı anda açılan eğitimler), `tests/e2e/classroom-teacher.spec.ts` (ödevde oda seçimi).

## 2.8 Video eklemek

1. Dosyayı `public/videolar/` altına koy (küçük harf, tire, `.mp4`). Boyutu küçük tut; 2–3 dakikalık video için birkaç MB yeterli.
2. Oda dosyasındaki video kartının `src` alanına adresi yaz (`/videolar/oltalama.mp4`).
3. Dış adres (`https://...`, `//...`) şema tarafından reddedilir. Bu kural gevşetilmez.
4. Oda dosyasındaki video kartının dosyası `public/videolar/` altında yoksa `tests/unit/room-files.test.ts` düşer.
5. Küçültme için örnek (Para Çarşısı videoları 20 MB'tan 5 MB'a indi): `ffmpeg -i kaynak.mp4 -vf scale=1280:-2 -c:v libx264 -preset slow -crf 27 -pix_fmt yuv420p -c:a aac -b:a 96k -ac 1 -movflags +faststart public/videolar/ad.mp4`. `faststart` videonun hepsi inmeden oynamasını sağlar.
6. Soru saniyesi (`at`) tam sayıdır; video o saniyeye gelince durur. Soru ekranı o anda doğru kareyi göstermeli, cevap sorudan önce videoda görünmemeli.

## 2.9 Depodaki odalar (`labs/rooms/`)

27 Ekim (Murat): odalar depoda dosya olarak yazılır. 17 Kasım (Murat): yönetimdeki oda formu ve "Yeni oda" kaldırıldı; asıl yer tek olsun diye oda yalnızca dosyadır.

**Dosya.** `labs/rooms/<mahalle>/<oda-adresi>.json`. Biçim `labs/examples/` ile aynı:

```json
{
  "slug": "gece-gelen-giris-uyarisi",
  "neighborhood": "hesap-kalesi",
  "type": "SCENARIO",
  "template": "INBOX",
  "sortOrder": 2,
  "status": "DRAFT",
  "unlockedBy": "iki-adimli-dogrulama",
  "content": { "meta": { "...": "odanın içeriği, şema lib/lab/content.ts" } }
}
```

- `slug` dosya adıyla, `neighborhood` klasörle aynıdır. Adres sonradan değişmez: dosyanın adını değiştirmek yeni bir oda açar.
- `sortOrder`: mahalledeki sıra. Sırası en küçük eğitim temel eğitimdir (2.7); senaryolar kendi aralarında sıralanır.
- `status`: `"DRAFT"` ya da `"PUBLISHED"`. Gizlemek yönetimden yapılır (Gizle).
- `unlockedBy`: senaryoyu açan **ileri** eğitimin adresi (aynı mahallenin dosyası). Temel eğitim açıyorsa yazılmaz.
- `content`: odanın içeriği (şema `lib/lab/content.ts`). Puan toplamı 10 (1.8).

**Yayına nasıl girer.** Migration imajı her yüklemede `prisma db seed` çalıştırır (`docker/Dockerfile`); seed önce oda dosyalarını yansıtır (`prisma/rooms.ts`), sonra örnek odaları yalnızca yoksa ekler. Her odanın dosyasının parmak izi `Lab.sourceHash`'te durur:

- Dosya değişmediyse odaya dokunulmaz. Yönetimden gizleme ve sıra değişikliği kalır.
- Oda yoksa eklenir; `"PUBLISHED"` ise v1 olarak yayında.
- Dosya değiştiyse taslak dosyadaki içerik olur (`draftRevision` koşuluyla), zorluk, süre ve açan eğitim dosyadan yazılır. Sıra (`sortOrder`) yalnızca oda ilk eklenirken dosyadan gelir; sonra Odalar sayfasındaki sıra korunur. `"PUBLISHED"` dosyanın içeriği yayındakinden farklıysa yeni sürüm yayınlanır (yayınlayan boş); eski denemeler kendi sürümüyle biter. Gizlenmiş oda gizli kalır. `"DRAFT"` dosya yayındaki odayı yayından kaldırmaz, yalnızca taslağını değiştirir.
- Aynı adreste panelden açılmış eski bir oda varsa dosya onu devralır. Türü, şablonu ya da mahallesi farklıysa dokunulmaz; yayın kaydında "Oda atlandı" yazar.
- Dosyayı silmek odayı silmez (öğrenci denemeleri odaya bağlı); oda yönetimden gizlenir.
- Seed içeriği denetlemez (migration imajında `lib/` yok). Denetim PR'dadır.

**Taslağı sitede görmek.** Oda önce `"DRAFT"` ile birleşir; sitede taslak olarak durur, öğrenciler görmez. Yönetim > Odalar'da **Dene** ile bakılır. Hazır olunca `"status": "PUBLISHED"` yapan küçük bir PR açılır. Yerelde: dosyayı yaz, `npm run db:seed`, `npm run dev`.

**Odanın sayfası.** Dosyadan gelen odanın sayfasında "Bu oda depoda yazılır" kutusu, dosyanın yolu ve "Dosyayı GitHub'da aç" bağlantısı görünür.

**Testler.**

- `tests/unit/room-files.test.ts`: her dosya şemaya ve içerik kurallarına uyar (`validateContent`), `"PUBLISHED"` olan yayına hazır ve senaryoda puan 10, adres dosya adıyla ve mahalle klasörle aynı, adresler tekrarsız ve örnek odalarla çakışmaz, açan eğitim aynı mahallenin ileri eğitim dosyası. Seed'in karar kuralı (`planRoom`) de burada.
- `tests/e2e/room-files.spec.ts`: seed geçici bir oda klasörüyle (`ROOMS_DIR`) gerçekten çalıştırılır: ekleme, değişmeyen dosya, yeni sürüm, gizli oda, taslak dosya, açan eğitim, çakışan adres, odanın sayfasındaki dosya kutusu, korunan sıra.
- İçerik şeması değişirse oda dosyaları da aynı PR'da güncellenir; birim testi düşer.

## 2.10 Eşleştirme, kutulara ayırma ve boşluk doldurma kartları

Üçü aynı etkileşimi paylaşır ("yerleştirme"): öğrenci her yere (eşleştirmede sol satırlar, kutulara ayırmada bilgiler, boşluk doldurmada boşluklar) bir seçenek (kutulara ayırmada bir kutu) koyar.

- **Şema** (`lib/lab/content.ts`): `match` (`pairs`), `sort` (`bins`: ad, not, renk, ikon; `items`: metin, ikon, doğru kutunun sırası `bin`), `fill` (`sentences`, `extra`); boşluklar `fillParts` ile köşeli parantezden çıkar. Renk ve ikon adları listededir (`sortColors`, `cardIcons`); kodda karşılıkları `components/lab/training/card-icons.ts` (tema renkleri, lucide ikonları). Yeni ikon önce listeye, sonra haritaya eklenir.
- **Tarayıcıya giden** (`toClientCard`): eşleştirmede `lefts` ve `bank`, kutulara ayırmada `bins` ve `items` (metin ve ikon; `bin` yok), boşluk doldurmada boşluklarla bölünmüş `sentences` ve `bank`. Eşleştirme ve boşluk doldurmada `bank` tekrarsız ve alfabetiktir (`placementBank`, `lib/lab/training.ts`), kutulara ayırmada kutuların kendisidir (yazarın sırası); doğru eşler, parantezdeki kelimelerin yeri, bilgilerin kutusu ve açıklama gitmez. Doğrular kutudaki numarayla `placementAnswer`'dan çıkar.
- **Denetim**: öğrenci kutudaki sıra numaralarını gönderir (`checkTrainingPlacement`, `lib/lab/actions.ts`; önizlemede `localTrainingDriver.place`). `validPicks` biçimi denetler (her yere bir numara), `checkPlacement` her yerin doğru olup olmadığını, doğrularını ve açıklamayı döner; kart `TrainingProgress.answeredCards`'a yazılır (`needsAnswer`, B1).
- **Oynatıcı** (Tur 7, Murat 1 Kasım): eşleştirme `MatchView` (`components/lab/training/MatchView.tsx`: soldaki bilgi ve yeri aynı hizada ve aynı boyda, satır renkleri `rowTones`, altta seçenek tepsisi; seçili yer hep vardır, seçenek oraya gider, sonra sıradaki boş yer seçilir), boşluk doldurma `FillView` (`FillView.tsx`: cümleler tek tek, üstte cümle düğmeleri ve Özet; cümle dolunca 650 ms sonra boş yeri olan sıradaki cümleye, yoksa özete geçer; "Kontrol et" özettedir; boşluk durağan kesik çizgidir, kayan çizgi yok). Ortak düğme ve sonuç kutusu `placement.tsx`. Kutulara ayırma kendi bileşeninde: `SortView` (`components/lab/training/SortView.tsx`, Tur 6 "Kutulara ayırma · yeni hali"). Üçünde de iki yol vardır:
  - Dokunarak: kutulara ayırmada bilgiye, sonra kutuya (kutunun üstünü kaplayan düğme; bilgi seçili değilken kapalı); eşleştirme ve boşluk doldurmada yere, sonra seçeneğe. Klavyeyle de aynı yol çalışır.
  - Sürükleyerek (`useDragDrop`, `components/lab/training/drag.tsx`): kutulara ayırmada bilgi kutuya, eşleştirme ve boşluk doldurmada seçenek yere sürüklenir. Pointer olaylarıyla çalışır: farede birkaç piksel kımıldayınca, dokunmada kısa basılı tutunca (180 ms) başlar; basılı tutmadan kayan parmak sayfayı kaydırır. Sürüklerken sayfa kaymaz (`touchmove` engellenir), parmak ekranın kenarına gelince sayfa kendiliğinden kayar, kartlar arası kaydırma çalışmaz (`rootProps`). Bırakılan yer `elementFromPoint` ile `data-drop`'tan okunur (kutu ya da yer sırası); parmağın altındaki kopya `DragGhost`. Bırakınca sürüklenen öğeye düşen tıklama sayılmaz (`quiet`).
  - "Nasıl oynanır" penceresi (`components/lab/training/help.tsx`: `useHelp`, `HelpDialog`): öğrencinin karşısına her kart türünde bu tarayıcıda bir kez çıkar (`localStorage` `lab-help-sort`, `lab-help-match`, `lab-help-fill`; yalnızca "gösterildi"); kontrol edilmiş kartta açılmaz, başlıktaki "Nasıl oynanır?" yeniden açar. Sahne `DemoStage`: el genel bir öğeyi ("Bir bilgi", "Seçenek", "Bir kelime") yerine taşır, cevabı ele vermez. Kutulara ayırmanın sahnesi kartın kutularıyla (`SortDemo`), eşleştirme ve boşluk doldurmanınki sabit (`MatchDemo`, `FillDemo`). Animasyon `globals.css`'teki `drag-demo-*` sınıflarında; temel stil son haldir, "Hareketi azalt" açıksa öğe yerinde durur. Yeni bir sürükle bırak kartı aynı ikisini kullanır; metinleri `lab.training.help.<tür>`.
- **Testler**: `tests/unit/training-info-layouts.test.tsx` (Tur 7: açılan düzenlerin Devam kilidi, 4 şıklı test, cümle cümle boşluk doldurma, yeni alanların şeması ve yayına hazırlığı), `tests/unit/lab-placement.test.ts` (şema, tarayıcıya giden içerik, denetim, bitiş kuralı, yayına hazırlık, Para Çarşısı oda dosyası), `tests/unit/lab-sort.test.ts` (kutulara ayırmanın şeması, gizliliği, denetimi, yayına hazırlığı), `tests/unit/training-placement.test.tsx`, `tests/unit/training-placement-drag.test.tsx` ve `tests/unit/training-sort.test.tsx` (oynatıcı: pencereler, dokunarak ve sürükleyerek yerleştirme, kontrol), `tests/e2e/mobile-layout.spec.ts` (oynatıcıda üç kart ve pencereleri, telefon).

## 2.11 Bilgi kartı düzenleri ve test çizimi (Tur 7)

- **Şema** (`lib/lab/content.ts`), hepsi isteğe bağlı ve geriye uyumlu: bilgi kartında `layout` (`infoLayouts`: `list`, `explore`, `steps`, `bankCard`; yazılmazsa `list`), maddelerde `points[].icon`, eşleştirmede `pairs[].icon`, mini testte `art` (`quizArts`: `gift`, `coin`; yazılmazsa çizim yok). İkon adları `cardIcons` (kutulara ayırmayla ortak liste), karşılıkları `components/lab/training/card-icons.ts`.
- **Tarayıcıya giden**: bilgi kartı olduğu gibi gider (doğru cevabı yok); eşleştirmede `icons` (soldakilerin ikonu ya da `null`), mini testte `art` (ya da `null`). Doğru cevap yine gitmez.
- **Oynatıcı**: `InfoCardView` (`cards.tsx`) düzene göre `ExploreInfo`, `StepsInfo`, `BankCardInfo`'yu (`InfoLayouts.tsx`) açar. Açılan maddeler oynatıcıda tutulur (`seen`, `TrainingPlayer.tsx`): bütün maddeler açılmadan Devam kapalıdır; kaldığı yerden devam eden öğrencinin daha önce geçtiği kartlar kilitlenmez (`startIndex`). Banka kartı ve dört adımlı kart masaüstünde 940 px genişlikte açılır. Kilit yalnızca tarayıcıdadır: bu kartlarda puan ya da doğru cevap yoktur, sunucunun denetleyeceği bir şey yoktur.
- **Çizimler**: banka kartı sahnesi `BankStage` (`InfoLayouts.tsx`), mini test çizimi `QuizArtView` (`art.tsx`). Kart, telefon ve SMS metinleri dil sözlüğündedir (`lab.training.bankCard`), kurgusaldır. Renkler tema değişkenlerinden (`--art-*`, `globals.css`), animasyonlar `globals.css`'teki Tur 7 anahtar kareleri; "Hareketi azalt" açıksa durur (imza çizgisi ve parlayan kutu son haliyle görünür).
- **Oda dosyası**: bilgi kartının `layout`, maddelerin ve eşlerin `icon`, mini testin `art` alanı. Yayına hazırlık: banka kartı 4, keşfet ve adım adım en az 2 dolu madde ister (`lib/lab/checklist.ts`).
- **Yeni düzen ya da çizim** eklemek: listeye (`infoLayouts`, `quizArts`) ekle, `InfoCardView`'da ya da `QuizArtView`'da çiz, bu bölümü güncelle, `tests/unit/training-info-layouts.test.tsx`'e testini yaz, yeni ekranı `tests/e2e/mobile-layout.spec.ts` listesine ekle.

## 2.12 Görevli oda (Postam + görev, 2 Kasım)

İlk örneği Para Çarşısı "Kulaklık için veli kartı" (`labs/rooms/para-carsisi/kulaklik-icin-veli-karti.json`, senaryo `docs/labs/rooms/para-carsisi/scenario/kulaklik-icin-veli-karti.md`). Öğrenciye birinin (annesinin) verdiği bir iş vardır; öğrenci işi yaparken tuzaktan kaçmaya çalışır. Yalnızca Postam (INBOX) şablonunda.

- **Şema** (`lib/lab/content.ts`), hepsi isteğe bağlı ve geriye uyumlu:
  - `scenario.mission` (`missionSchema`): arayan ve görevin sahibi (`caller`, `owner`), açılış aramasının altyazı satırları (`lines`), görev kartı (`title`, en çok 5 madde `points`, `accept`; maddede önemli kısım `**kalın**` yazılır, her maddenin ikonu isteğe bağlı olarak aynı sırayla `pointIcons`'ta, `cardIcons` adlarıyla; ikonu olmayan maddede onay işareti çıkar, `components/lab/mission/MissionPoints.tsx`. Maddeler aramanın altındaki kartta sırayla belirir, kabul düğmesi en son gelir; Görevler panelindeki istek kutusunda aynı maddeler durur. 3 Kasım, 10. revize), sahte sitede kodu yazmayınca gelen cevap (`refuse`), kart (`card`: numara ve son kullanma; CVV hiç yazılmaz), mağaza (`shop`: ad, ürün, fiyat, not, ikon), SMS'teki kod (`code`), iyi bitiş aramasının satırları (`good`, sahte mail bildirildiyse `goodReported`), başlığı (`goodTitle`), rapordaki görev cümlesi (`done`), kötü bitiş araması (`bad`).
  - Mail öğesinde `payment` (`shop`, `amount`, `note`, `refused`): bu mailin bağlantısı mağaza sayfasını açar (`opensShop`); SMS'teki mağaza adı ve tutar buradan gelir. Gerçek ve sahte mailin mağaza sayfası aynıdır, fark adrestir; görevli odada "Güvenli değil" uyarısı ve tuzak sayfası yoktur (`usesTrapPage` false).
  - Tuzakta `alarm` (`line`, en çok 3 `notifications`): hacklendin alarmının satırı ve bildirimleri ("Annenin kartından 4.850 TL çekildi.").
  - Görev türü `mission` (`taskTypes`), puanı `missionPoints` (1). Tam bir tane olur.
- **Olaylar** (`lib/lab/events.ts`): mağazada ödeyince `info_entered` (kart bilgisi kaydedilmez), SMS kararı `code_entered` ya da `code_refused`. Görev görevi bir kod kararıyla biter.
- **Sonuç ve puan** (`lib/lab/scoring.ts`): görevli odada sahte mailde hacklenmek kodu yazmaktır; yalnızca ödeyip kodu yazmayan **son anda durdu** (`stopped`): hacklenmez, ama sahte mailin puanını alamaz (0). Gerçek mağazadan alan görev puanını alır (`missionDone`). Raporda görev satırı (`mission`): "{SAHİBİ} GÖREVİ" etiketi, `mission.done` ya da "Görev yarım kaldı".
- **Sunucu eylemleri** (`lib/lab/actions.ts`): `payShop` (bağlantı tıklanmış, mağaza açan mail; SMS'i döner: tutar yalnızca burada tarayıcıya gider, çünkü hangi mailin sahte olduğunu ele verir), `answerCode` (önce ödeme; sahte mailde kodu yazmak `compromise(..., "code")`, yoksa annenin cevabı), `finishAttempt` iyi bitiş aramasının satırlarını döner (`goodCall`, `lib/lab/story.ts`). Kötü bitişin satırları hacklendin hikâyesiyle gelir (`HackedStory.call`, `alarm`, `amount`). Tarayıcıya giden görev (`ClientMission`, `lib/lab/client.ts`) bitiş satırlarını, kodu ve `payment`'ı taşımaz.
- **Oynatıcı**: açılış aşaması `call` (`ScenarioPlayer.tsx`); görüntülü arama `components/lab/mission/MissionCall.tsx` (kararan oda, telefonun arkasında çalarken nabız gibi atan yumuşak sahne ışığı (3 Kasım, 9B), gelen arama, kelime kelime altyazı, "Geç", alttan çıkan kart, iyi bitişte konfeti, kötü bitişte sarsıntı; "Hareketi azalt" açıksa konfeti, sarsıntı, flaş ve ağız oynaması yok). Annenin çizimi `CallerAvatar.tsx` (DiceBear Notionists, CC0; parçalar `caller-rig.ts`, üretici `/mnt/project-files/para-carsisi/oda-kod/caller-rig.cjs`, siyah `currentColor`, beyaz `.cr-paper` olur). Görev paneli üstündeki istek ve kart `MissionBox` (`TaskPanel.tsx`, "Tekrar dinle"), mağaza `ShopSite` (`components/lab/inbox/BrowserPage.tsx`); ödeyince velinin mesajı ortaya gelen telefonda açılır, karar düğmeleri telefonun ekranındadır (`MissionSms.tsx`, Murat 2 Kasım). Telefon çalarken zil sesi, SMS bildirimi ve yeni rozet sesi dosyasızdır, tarayıcıda üretilir (`components/lab/mission/tones.ts`); ses kapalıysa çalmaz. Renkler `--call-*`, `--scene-shop*` (`globals.css`).
- **Arayanın sesi** (isteğe bağlı, `mission.voice`: `lines`, `good`, `goodReported`, `bad`; satırlarla aynı sırada, yalnızca sitenin kendi mp3'ü, `public/sesler/<oda-adresi>/`). Satırın sesi varsa `MissionCall` onu çalar, altyazı kelimeleri sesin süresine yayılır, sonraki satıra ses bitince geçilir; ses kapalıysa ("Sesi kapat", alarmla aynı ayar `components/lab/sound.ts`), dosya yoksa ya da tarayıcı çalmazsa altyazı kendi süresiyle geçer. Açılışın sesleri tarayıcıya içerikle gider (`ClientMission.voice`), bitişlerinki bitişin satırlarıyla (`goodCall`, `HackedStory.call`). Satırlar ve sesler `voicedLines` ile birlikte süzülür. İlk odada annenin sesi ElevenLabs'ten tek dosya geldi, sessizlik aralarından on parçaya kesildi (2 Kasım).
- **Önizleme**: tarayıcıdaki sürücü aynı kuralları uygular (`local-driver.ts`); `lib/admin/try-path.ts` sahte mail için "kodu yazdı" ve "son anda durdu" yollarını olaylara çevirir (testlerde).
- **Yayına hazırlık** (`lib/lab/checklist.ts`, "Görev"): görev alanları dolu, tek görev görevi, en az bir gerçek ve bir sahte mağaza maili, şablon Postam. Görevi olmayan odada görev görevi ve `payment` olmaz.
- **Testler**: `tests/unit/lab-mission.test.ts` (şema, tarayıcıya giden içerik, olaylar, puan ve sonuçlar, eylemlerin sırası, yayına hazırlık, oda dosyası), `tests/e2e/lab-mission.spec.ts` (iyi bitiş 100/100, kodu yazınca hacklendin, son anda durma; masaüstü ve telefon), `tests/e2e/mobile-layout.spec.ts` (önizlemede arama, görüşme, kart, görev kutusu, mağaza, SMS).

## 2.13 Satış görevi (Mesajlar + görev, 2 Kasım)

İlk örneği Para Çarşısı "Eski telefonunu sat" (`labs/rooms/para-carsisi/eski-telefonunu-sat.json`, senaryo `docs/labs/rooms/para-carsisi/scenario/eski-telefonunu-sat.md`). 2.12'deki görevin ikinci türü: öğrenci bu sefer alıcı değil satıcıdır. Görev, arama, panel ve bitiş aramaları 2.12'deki gibi çalışır; farkları aşağıda. Yalnızca Mesajlar (MESSAGING) şablonunda.

- **Şema** (`lib/lab/content.ts`), hepsi isteğe bağlı ve geriye uyumlu:
  - `mission.look`: arayanın çizimi, `mother` (varsayılan) ya da `father` (`callerLooks`). Baba `components/lab/mission/father-rig.ts` (Notionists: kısa saç, bıyık; üretici `/mnt/project-files/para-carsisi/oda-kod/father-rig.cjs`), `CallerAvatar.tsx` çizimi `look`'a göre seçer.
  - `mission.sale` (alış görevindeki `card` ve `shop` yerine; ikisi artık isteğe bağlı): ilan (`product`, `price`, `platform`, `icon`), kargodan önceki hazırlık maddeleri (`prep`, en çok 4) ve hazırlamadan gönderince alıcının mesajı (`unprepared`; tarayıcıya gitmez, gönderince sunucudan gelir).
  - Mesaj öğesinde `request` (`bank`, `from`, `amount`, `refused`): bağlantısı bankanın ödeme isteği ekranını açar (`opensRequest`). `order` (`buyer`): bağlantısı pazar yerindeki siparişi açar (`opensOrder`).
- **Olaylar** (`lib/lab/events.ts`): ödeme isteğinde Onayla/Reddet kod kararıyla aynı olaydır (`code_entered`, `code_refused`). Siparişi gönderince yeni olay `item_shipped` (`prepared`: hazırlık kutularının hepsi işaretli miydi; işaretlerin kendisi kaydedilmez). Satış görevi bir siparişin gönderilmesiyle biter (`taskProgress(..., sale)`).
- **Sonuç ve puan** (`lib/lab/scoring.ts`): sahte mesajın ödeme isteğini onaylamak hacklenmektir (`by: "request"`, Para türü). Yalnızca açıp reddetmek hacklenmek değildir; bağlantı açıldığı için sahte mesaj en çok "bildirdi ama önce açtı" puanını alır. "Son anda durdu" yoktur. Görev puanı gerçek siparişi hazırlayıp gönderene gelir (`missionDone`); hazırlamadan gönderen hacklenmez ama görev yarım kalır.
- **Sunucu eylemleri** (`lib/lab/actions.ts`): `answerCode` ödeme isteğini de karara bağlar (bağlantı tıklanmış, `opensRequest`; sahtede onay `compromise(..., "request")`, yoksa bankanın cevabı `request.refused`). `shipOrder` (bağlantı tıklanmış, `opensOrder`, bir kez) `item_shipped` yazar, hazırlamadan gönderildiyse `unprepared`'ı döner. Tarayıcıya giden görevde (`ClientMission.sale`) `unprepared` yoktur; hangi mesajın ödeme isteği ya da sipariş olduğu bağlantı açılınca sunucudan gelir (`linkPageFor`).
- **Oynatıcı**: Görevler panelinde kart yerine ilan (`ListingCard`, `TaskPanel.tsx`). Bankanın ekranı `RequestSite`, sipariş `OrderSite` (`components/lab/inbox/BrowserPage.tsx`); hazırlık kutuları yalnızca ekranda tutulur. Hacklenince alarmda "Hesabından para çıktı", sonra bankanın uygulamasında bakiye düşer (Para sahnesi, `components/lab/hacked/HackedScene.tsx`).
- **Telefon görünümü** (Murat 2 Kasım: Mesajlar Postam'a benzemesin): satış görevli odada sahne masaüstünde de bir telefonun içinde açılır (`components/lab/frame/PhoneFrame.tsx`; çentik, durum çubuğu, yan tuşlar; telefonda sahne zaten tam ekran). Çerçeve `data-device="phone"` taşır; Mesajlar ve tarayıcı sayfası ekran kırılımı için `lg:`/`sm:` yerine `desk:`/`wide:` (ve `max-desk:`/`max-wide:`) kullanır, bunlar `app/globals.css`'te tanımlı ve çerçevenin içinde her genişlikte telefon düzenini seçer. `MessagingScene` `phone` alır (masaüstünde ilk sohbeti kendiliğinden açmaz). Bu iki sahneye yeni sınıf eklerken `lg:`/`sm:` değil `desk:`/`wide:` yazılır.
- **Önizleme ve testlerdeki deneme yolları**: aynı kurallar `local-driver.ts` ve `lib/admin/try-path.ts`'te (sahte mesajda "onayladı", görev yapıldıysa ilk gerçek sipariş hazırlanıp gönderilir).
- **Yayına hazırlık** (`lib/lab/checklist.ts`, "Görev"): satış görevinde şablon Mesajlar, kart ve mağaza yok, ilan ve hazırlık dolu, en az bir sahte ödeme isteği ve bir gerçek sipariş, `payment` yok. Alış görevinde `request` ve `order` olmaz.
- **Testler**: `tests/unit/lab-sale.test.ts` (şema ve hazırlık, tarayıcıya giden içerik, bağlantı sayfaları, puan, önizleme sürücüsü, rapor, "Öğrenci gibi dene"), `tests/e2e/lab-sale.spec.ts` (iyi bitiş 100/100, onaylayınca hacklendin, reddedip hazırlamadan gönderme; masaüstü ve telefon), `tests/e2e/mobile-layout.spec.ts` (önizlemede babanın araması, ilan kutusu, ödeme isteği, sipariş).

## 2.14 Görevli odanın kapağı (3 Kasım)

Oda kapağının (`/oda/[oda]`) sağı görevli odada bildirim telefonu değil, odanın hikâyesidir (Murat 3 Kasım; tuvalde seçilen "3 sade": https://claude.ai/artifact/H1Ts3gJyVeTb3i2Yi5AKMp). Sol taraf her odada aynıdır. Kapak oda dosyasından kendiliğinden çıkar; yeni görevli oda için çizim gerekmez.

- **Ne görünür** (`components/lab/detail/MissionCover.tsx`, hareketler `MissionCover.css`, sınıflar `mc-`): telefonda yalnızca gelen arama ekranı (arayanın yüzü `CallerAvatar`, adı, "arıyor…", Reddet ve Aç; konuşma yok). Çevresine yazısız kartlar sırayla düşer: ürün ya da ilanın ikonu ve fiyatı (alışta bütçe çubuğu), ilk iki mail ya da mesaj (gönderenin baş harfi ve çizgiler, "?"; alışta üstünde büyüteç gezer), alışta annenin onay kodu (kilit ve noktalar), satışta kargodan önceki hazırlık (ikon ve tik), en son etiket. Yazı olarak yalnızca arayanın adı ve fiyat vardır (Murat: yazı göz yoruyor). Döngü 14 saniye; "Hareketi azalt" açıksa her parça son hâliyle durur. Telefonda aynı görsel üstteki alanda küçültülmüş durur ("Postam ile" etiketi çıkmaz).
- **Veri** (`lib/lab/cover.ts`, `coverOf`; `LabDetailData.cover`): arayan, `look`, alış (`shop`) ya da satış (`sale`), ikon ve fiyat, ilk iki öğenin gönderen baş harfi (aynı gönderen aynı renk), hazırlık maddesi sayısı (en çok 3), etiket ikonu. Hangi öğenin sahte olduğu, adresler, SMS tutarı ve bitişler kapağa gitmez. Görevi olmayan ya da ne alış ne satış olan odada `cover` null'dır, bildirim telefonu (`PhoneMockup`) kalır.
- **Şema**: `mission.coverIcon` (isteğe bağlı, `cardIcons`): alış görevinde etiketin ikonu (Kulaklık odasında `gift`, doğum günü). Boşsa alışta etiket çıkmaz; satışta etiket hep iki cüzdan arasında gidip gelen paradır.
- **Testler**: `tests/unit/lab-mission.test.ts` ve `lab-sale.test.ts` (`coverOf`: alış, satış, görevsiz oda, gizli bilgi gitmez), `tests/e2e/lab-mission.spec.ts` ve `lab-sale.spec.ts` (`checkMissionCover`: kapak görünür, bildirim telefonu yok, sayfa yana kaymaz, gizli metin yok; masaüstü ve telefon, `LAYOUT_SHOTS` ile `0-kapak`). Oda dosyaları taslak olduğu için kapak `mobile-layout.spec.ts`'te değil bu testlerde denetlenir.

## 2.15 Oda sahnesi (M1, T1, T2, T3; 18 Kasım)

Tasarım ve kararlar `docs/design/room-scene-template.md` (tuval https://claude.ai/artifact/FUZhpRbnDoWiu25f845vfe; koddan alınmış ekranlar https://claude.ai/artifact/KZuc9b6jDJ2dEwg2pEh2y2). Odanın uygulaması (Postam, Mesajlar) ve bağlantıdan açılan sayfa bir sahnenin içinde çizilir; sahne yalnızca görünüştür, her eylem yine oynatıcıdan sürücüye gider. Puan, olay ve rapor değişmez.

- **Şema** (`lib/lab/content.ts`), isteğe bağlı ve geriye uyumlu:
  - `scenario.stage` (`stageSchema`): `type` `DESKTOP` (M1), `PHONE` (T1), `DESKTOP_PHONE` (T2) (`stageKinds`); `owner` (kilitteki ad, en çok 30), `password` (`value`, `hint`, `hintFrom`). Alanın adı `type`'tır: tarayıcıya giden JSON'da `kind` sızıntı testine takılır. Sahne şablona uymalı (`stageFits`: `PHONE` yalnızca Mesajlar, diğerleri yalnızca Postam); uymayan sahne oynatıcıda yok sayılır.
  - Soru görevinde `talk` (`speaker`, `look`: `mother` ya da `father`, `callerLooks`): T3 karşılıklı konuşma. Ayrı bir sahne türü değildir; soru sırası gelince sahnenin üstünde açılır, cevap yine `answer` ile sunucuda puanlanır ve rapora yazılır. Böylece herhangi bir odanın ortasında konuşma olabilir.
- **Tarayıcıya giden içerik** (`lib/lab/client.ts`): `ClientScenario.stage` (şifre ve ipucu dahil: kilit tarayıcıda açılır, puanla ilgisi yoktur), `ClientTask.talk` (yalnızca soru görevinde).
- **Yayına hazırlık** (`lib/lab/checklist.ts`, "Sahne şablona uyuyor"): yalnızca sahnesi ya da konuşması olan odada görünür; sahne şablona uyar, şifre varsa değeri dolu, konuşma yalnızca soru görevinde ve konuşanı yazılı.
- **Sahneler** (`components/lab/stage/`, sınıflar `st-`, stiller `stage.css`, renkler `--stage-*` `globals.css`'te iki tema bloğunda da; görseller `public/stage/*.webp`, `public/lab/` olmaz çünkü `/lab/*` adresleri `/oda/*`'ya yönlenir):
  - `StageView.tsx`: türe göre sahneyi seçer. T1 `PhoneDesk` (ahşap masa, defter, kupa, kalem, kulaklık; ilk mesaj kilit ekranında bildirim), T2 `DesktopPhone` (monitör, kupa, masadaki telefon; telefonun ekranı `StagePhoneContext` ile verilir).
  - `Desktop.tsx` (M1): kilit ekranı (`Oturum aç` ya da şifre ve ipucu; yanlışta sallanır), pencereler (sürükle, küçült, büyüt, kapat; dar ekranda hep tam boy), masaüstü simgeleri, başlat menüsü (gözlü a; "Oturumu kapat" kilide döner), görev çubuğu ve gerçek saat. Bağlantıdan açılan sayfa "Tarayıcı" penceresinde açılır.
  - `DeskPhone.tsx`: masada ekranı kararmış telefon (saat, tarih, bildirim kartı; bildirimde titrer ve parlar), dokununca ele gelir, "Telefonu masaya bırak" ile geri. Bu düğme telefonun içinde olmaz (bütün odalarda): masaüstünde eldeki telefonun altında (`st-handrow`), telefon genişliğinde oynatıcının şeridinde "Bırak" (`LabBar` `slotRef`, portal). Masadayken ekran `inert`. Ekran `data-device="phone"` taşır, Mesajlar ve tarayıcı sayfası telefon düzenini seçer (2.13).
  - `TalkScene.tsx` (T3, S1 sinema şeritleri): bulanık oda, silik silüet (anne topuzlu, baba kısa saçlı), sehpa ve kupa (dokununca bir yudum), üst şeritte altyazı, alt şeritte seçenekler (1, 2, 3 tuşları), "Telefona bak" (konuşma kapanır, görev panelindeki "Konuşmaya dön" geri açar). Doğru cevap burada bilinmez.
  - `common.tsx`: saat (`useClock`), gri duvar ve sarı ağ (`StageWall`), uygulama simgeleri.
- **Oynatıcı** (`ScenarioPlayer.tsx`): sahnesi olan odada ana alan `scenario-stage`'dir ve `StageView` çizilir; tarayıcı sayfası sahnenin içinde açılır, ayrı örtü olmaz. Yarım kalan denemeye dönülünce bilgisayar açık, telefon elde başlar. T2'de velinin SMS'i (`MissionSms.tsx`) masadaki telefona çizilir (`useStagePhone`), sahnesiz odada eski ortadaki telefon kalır. Satış görevinde `PHONE` sahnesi `PhoneFrame`'in yerini alır.
- **Hareketi azalt**: titreşim, sallanma, nefes ve yudum durur (`globals.css`'teki genel kural ve `prefersReducedMotion()`).
- **Testler**: uçtan uca testlerde sahneli odada önce `signInDesktop` (M1, T2) ya da `pickUpPhone` (T1, T2'de SMS) çağrılır (`tests/e2e/support/lab.ts`); `tests/e2e/mobile-layout.spec.ts` kilit ekranını, masadaki telefonu ve SMS'i denetler.

## 2.16 Kayıt görevi ve "Az kalsın" (Postam + görev, 18 Kasım)

İlk örneği Şehir Kapısı "Bağlantı nereye gidiyor?" (`labs/rooms/sehir-kapisi/baglanti-nereye-gidiyor.json`, senaryo `docs/labs/rooms/sehir-kapisi/scenario/baglanti-nereye-gidiyor.md`). Görevin üçüncü türü: öğrenci bir şey almaz ya da satmaz, bir forma kaydolur. Arama, görev kartı, panel ve iyi bitiş araması 2.12'deki gibidir; farkları aşağıda. Yalnızca Postam (INBOX) şablonunda. Oda M1 masaüstü sahnesinde açılır (`"stage": { "type": "DESKTOP" }`, 2.15): okulun formu ve sahte giriş "Tarayıcı" penceresinde, Az kalsın penceresi sahnenin üstünde.

- **Şema** (`lib/lab/content.ts`), hepsi isteğe bağlı ve geriye uyumlu:
  - `mission.look: "friend"`: arayan arkadaş (Deniz). Çizim `components/lab/mission/friend-rig.ts` (Notionists: kıvırcık saç, kapüşonlu; üretici `/mnt/project-files/para-carsisi/oda-kod/deniz-rig.cjs`, `fill="#fff"` `.cr-paper`, `fill="#000"` `currentColor` olur).
  - `mission.signup`: formun sitesi (`site`), başlığı, kutuları (`fields`, en çok 3), düğmesi ve gönderince yazan cümle (`done`; tarayıcıya gitmez, gönderince sunucudan gelir). `card`, `shop` ve `sale` yazılmaz; kötü bitiş araması (`bad`) gerekmez.
  - Mail öğesinde `form: true`: bu gerçek mailin bağlantısı formu açar (`opensForm`). Diğer gerçek maillerin bağlantısı yine yalnızca adresi gösterir.
  - `trap.almost: true` ("Az kalsın"): sahte sayfaya bilgi girmek odayı bitirmez. Hacklendin alarmı yerine Az kalsın penceresi açılır: `trap.realLife` (ne olabilirdi), düğmenin yazısı ile gerçek adres yan yana (sahibi kalın, `ownerOf` sağdan iki parça, `k12.tr` gibi kurum uzantısında üç), `trap.actions` ("Bir dahaki sefere"). Şimdilik yalnızca sahte sayfada (bağlantı); mesajlaşmada kodu cevapta göndermek yine hacklendir. Az kalsın odasında öğrenci şifre yazmaz: şifre kutusu salt okunurdur, dokununca noktalar kendiliğinden yazılır (`LinkPage.tapFill`), pencerenin altındaki "gerçek şifreni yazma" şeridi çıkmaz. Pencerenin hareketi hafiftir (el bir kez sallanır, sahibi fosforla işaretlenir, maddeler sırayla gelir; `almost-*` keyframes, hareketi azaltta yok).
- **Kayıt görevinde sahte sayfa açıktır** (`usesTrapPage`): alış ve satış görevinde sahte bağlantı mağaza ya da banka ekranını açar, kayıt görevinde diğer odalardaki gibi sahte giriş sayfasını.
- **Olaylar** (`lib/lab/events.ts`): formu gönderince yeni olay `form_sent` (kutulara yazılan kaydedilmez). Kayıt görevi formun gönderilmesiyle biter. `taskProgress` artık görevin türünü alır (`missionMode`: `shop`, `sale`, `signup`).
- **Sonuç ve puan** (`lib/lab/scoring.ts`): Az kalsın odasında sahte sayfaya bilgi girmenin sonucu `almost`: 0 puan, durum "riskli" (hacklendi değil), raporda Az kalsın cümlesi; "hacked" ipucu yine çıkar (şifreni değiştir). Sonradan bildirmek puanı geri getirmez. Görev puanı formu gerçek mailden gönderene gelir (`missionDone`), Az kalsın'dan sonra da.
- **Sunucu eylemleri** (`lib/lab/actions.ts`): `submitTrap` Az kalsın odasında denemeyi kapatmaz, `{ almost }` döner (`almostStory`, `lib/lab/story.ts`). `sendForm` (bağlantı tıklanmış, `opensForm`) `form_sent` yazar ve `done` cümlesini döner. Önizleme sürücüsü (`local-driver.ts`) ve "Öğrenci gibi dene" (`lib/admin/try-path.ts`, sahte öğede "az kalsın" seçeneği) aynı kurallarla.
- **Oynatıcı**: form `FormSite` (`components/lab/inbox/BrowserPage.tsx`; okulun yeşil şeridi, kutular boş da gönderilebilir, gönderince kutular boşalır). Az kalsın penceresi `components/lab/almost/AlmostDialog.tsx` (sarsıntı ve flaş yok; masaüstünde ortada, telefonda alttan). Görev panelindeki not `mission.signupNote`.
- **Yayına hazırlık** (`lib/lab/checklist.ts`, "Görev"): kayıt görevinde şablon Postam, kart, mağaza ve ilan yok, form dolu, `form` yazılan en az bir gerçek ve bağlantılı mail, ödeme, istek ve sipariş yok. Tuzak satırı sahte sayfanın adresini ve başlığını ister.
- **Kapak**: kayıt görevinde `coverOf` null'dır, bildirim telefonu kalır.
- **Testler**: `tests/unit/lab-signup.test.ts` (oda dosyası, bağlantı sayfaları, tarayıcıya giden içerik, puan ve Az kalsın, "Öğrenci gibi dene", önizleme sürücüsü, `ownerOf`), `tests/e2e/lab-signup.spec.ts` (Az kalsın'dan sonra formla kaydolup 60/100; masaüstü ve telefon, `LAYOUT_SHOTS`), `tests/e2e/mobile-layout.spec.ts` (önizlemede Deniz'in araması, sahte okul girişi, Az kalsın, form).

## 2.17 Giriş görevi ve yüz yüze konuşma (bilgisayar ve telefon, 19 Kasım)

İlk örneği Şehir Kapısı "Okul bilgisayarında giriş yap ve çık" (`labs/rooms/sehir-kapisi/okul-bilgisayarinda-giris.json`, senaryo `docs/labs/rooms/sehir-kapisi/scenario/okul-bilgisayarinda-giris.md`). Görevin dördüncü türü: öğrenci ortak bir bilgisayarda okulun portalına girer, ödevini yükler, zil çalınca bilgisayarı sıradakine bırakır. Arama yok, görevi masaüstündeki not verir. Mail yok (`items` boş). Postam (INBOX) şablonunda, T2 sahnesinde (`"stage": { "type": "DESKTOP_PHONE" }`, 2.15): giriş kodu masadaki telefona gelir, kodu isteyen arkadaş T3 konuşmasıyla (okulda) gelir.

- **Şema** (`lib/lab/content.ts`), hepsi isteğe bağlı ve geriye uyumlu:
  - `mission.login`: portalın adı, okulu ve adresi (`site`, `school`, `url`), kullanıcı adı ve sınıfı (`user`, `group`), bilgisayarın adı (`computer`, kilit ekranında), not penceresi (`note`), ödev (`homework`: adı, dosyası, boyutu, görüntüleyicideki resim `image`, seçicideki yanlış türde dosya `other`), portalın duyurusu (`news`), zil (`bell`: metin, düğme, doğru kalkınca bildirim `left`) ve Az kalsın'daki "Sıradaki" kutusu (`next`; tarayıcıya gitmez). Giriş kodu `mission.code`. Arama satırları (`lines`, `good`, `bad`) boş kalabilir.
  - Yeni görev türü `leave` ("Zil çaldı: bilgisayarı sıradakine bırak"): kalkınca biter. Görevlerde `hint`: panelde sıradaki görevin altındaki kısa yol tarifi.
  - T3 konuşmasında (`task.talk`) yeni alanlar: `place` (`home` sehpa, `school` sıra; okulda oda soğuk tonda, önde klavye ve telefon `public/stage/talk-desk.webp`), `lines` (sorudan önce söylenenler, "Devam" ile), `replies` (seçenekten sonra karşıdakinin cevabı), `endings` (oda bitince son sözler, seçeneğe göre) ve `voice` (aynı sırayla mp3; sitenin kendi dosyası). `look: "friend"` arkadaşın silüeti (kıvırcık saç, kapüşonlu).
  - İpucu koşulları: `leftOpen`, `remembered`, `savedPassword`, `wrongAnswer` (`task` yazılırsa yalnızca o soruda).
- **Olaylar** (`lib/lab/events.ts`): öğrenciden topluca gelenler `login_submitted` (`remember`: "Beni hatırla" işaretliydi), `login_verified` (kod yazıldı), `password_saved` (tarayıcının "Şifre kaydedilsin mi?" sorusu), `homework_uploaded`, `logged_out`. Her karar bir kez sayılır (ilk giriş, ilk soru). Çıkış yapıp yeniden giren kodsuz girer ve oturum yine açılır. Sunucu eylemiyle gelenler `talk_answered` ve `desk_left` (`open`: oturum açıkken kalktı, `closed`: tarayıcıyı kapatmıştı). Şifre kutusuna yazılmaz: dokununca noktalar kendiliğinden gelir, hiçbir metin kaydedilmez.
- **Puan** (`lib/lab/scoring.ts`, `loginPoints`): kalkmadan önce çıkış 4, "Beni hatırla"yı kaldırmak 1, şifreyi kaydetmemek 1 (rapor satırı türü `login`, etiketi "GİRİŞ VE ÇIKIŞ"); ödevi yüklemek görev puanı 1; sorular kendi puanları. Oturum açık kalkınca durum "riskli" (hacklendi değil), raporda "Kıl payı". `maxScore` giriş kararlarını da sayar (toplam yine 10).
- **Sunucu eylemleri** (`lib/lab/actions.ts`): `answerTalk` (yüz yüze sorunun cevabı; her soru bir kez, karşıdakinin cevabını `talkReply` ile döner; T3 sorusunun cevabı topluca gelmez), `leaveDesk` (ödev yüklenmiş olmalı; oturum açıksa `{ almost: leaveStory }` döner ve oda sürer, kapalıysa kalkış biter). `finish` yüz yüze son sözleri `talk` olarak döner (`endingTalk`), oynatıcı rapordan önce son konuşmayı açar. Önizleme sürücüsü (`local-driver.ts`) ve "Öğrenci gibi dene" (`lib/admin/try-path.ts`; giriş görevinde doğru yol, ödevi yüklememe seçilebilir) aynı kurallarla.
- **Oynatıcı** (`components/lab/login/`): `LoginStage` sahnenin bütün akışı (kilit, not, tarayıcı, kod, telefon, ödev, zil, kalkış), `LoginDesktop` pencereli masaüstü (sürükle, boyutlandır, küçült; 760 px altında pencereler tam ekran; başlat menüsü yok), `SchoolPortal` portalın sayfaları (giriş, kod, ana sayfa, ödev, çıkış). Konuşma kod telefona gelip telefon masaya bırakılınca (ya da kod kutusuna dokununca) açılır, cevaptan sonra "Ekranına dön"e kadar açık kalır. Kalkış Az kalsın'ı `LeaveAlmostDialog` (`components/lab/almost/AlmostDialog.tsx`; "Sen" ve "Sıradaki" kutuları). Zil sesi `bellTone` (`components/lab/mission/tones.ts`). Görev panelinde not kutusu `lab.login.noteBox`, tekrar dinle düğmesi yok.
- **Tarayıcıya giden içerik** (`lib/lab/client.ts`): portal, not, ödev ve kod gider (kod öğrencinin kendi telefonuna geldiği için sır değil). Konuşmanın yalnızca soru öncesi satırları ve onların sesleri gider; `replies`, `endings`, onların sesleri ve `login.next` gitmez.
- **Yayına hazırlık** (`lib/lab/checklist.ts`, "Görev"): giriş görevinde şablon Postam, sahne bilgisayar ve telefon, mail yok, kart, mağaza, ilan ve form yok, portalın, notun, ödevin, zilin ve `next`in alanları dolu, kod yazılı.
- **Oda kapağı**: arayan yok; anlaşma satırı "Ortak bilgisayardan girip ödevini yükleyeceksin" (`detail.ahead.loginText`), "Sesli" işareti konuşma seslerinden de gelir.
- **Testler**: `tests/unit/lab-login.test.ts` (oda dosyası, sesler, tarayıcıya giden içerik, olaylar, puan 100 ve 20, önizleme sürücüsünde `answerTalk` ve `leaveDesk`, "Öğrenci gibi dene"), `tests/e2e/lab-login.spec.ts` (doğru yol 100; yanlış yol: kodu söyler, şifreyi kaydeder, tarayıcıyı kapatıp kalkar, Az kalsın, döner, çıkar, 20; masaüstü ve telefon, `LAYOUT_SHOTS`), `tests/e2e/mobile-layout.spec.ts` (önizlemede kilit, not, portal, kod, konuşma, şifreyi kaydet, zil, Az kalsın).

## 2.18 Kurulum görevi ve tek telefon (Mesajlar ve Mağaza, 19 Kasım)

İlk örneği Şehir Kapısı "Bu uygulama nereden geliyor?" (`labs/rooms/sehir-kapisi/uygulama-nereden-geliyor.json`, senaryo `docs/labs/rooms/sehir-kapisi/scenario/uygulama-nereden-geliyor.md`). Görevin beşinci türü: öğrenci ödevin oyununu mağazadan kurar, izin pencerelerine cevap verir, oyunu açıp ödevi açar. Arama, görev kartı, panel ve iyi bitiş araması 2.12'deki gibidir. Yalnızca Mesajlar (MESSAGING) şablonunda, T1 sahnesinde (`"stage": { "type": "PHONE" }`, 2.15): telefonun ana ekranında Mesajlar ve Mağaza durur.

- **Şema** (`lib/lab/content.ts`), hepsi isteğe bağlı ve geriye uyumlu:
  - `mission.install`: mağazanın adı (`store`), arama önerisi (`query`, mağazanın ilk ekranındaki öneri kartı), uygulamalar (`apps`, en çok 3), oyunun ödev ekranı (`game`: başlık, ödev satırı, düğme, ödevi açınca yazan `done`; `done` tarayıcıya gitmez) ve mesajdaki dosyayı kurmak isteyince "Az kalsın"daki karşılaştırma (`fileCompare`: iki yan, her yanda `label`, `value`, `note`).
  - Mağazadaki uygulama (`storeAppSchema`): ad, yayıncı, puan, indirme sayısı, tür, açıklama, simge. `copy: true` kopya uygulamadır (adı benzer, yayıncısı başka); kopyanın ödev listesi yoktur (`empty`, "Kaldır" düğmesi), rapor satırı `report` ister, `almost` yazılırsa (gerçek hayat, adımlar, karşılaştırma) tehlikeli izne "evet" demek "Az kalsın" getirir.
  - İzin penceresi (`installPermissionSchema`): metin ("konumuna erişmek istiyor"), neden (`note`), simge, 2-3 seçenek. `right` puanlanan izinde doğru seçenektir (yazılmazsa izin puansızdır, hepsi olur), puanlıysa `report` ister. `almost` kopyada Az kalsın getiren seçenektir.
  - Mesajdaki ek (`attachment: { name, size }`): kurulum görevinde eki olan her mesajın eki dosyadır (`opensFile`). İpucu koşulları: `wrongApp` (kopyayı kurdu), `extraPermission` (puanlanan izinde yanlış seçti).
- **Dosya** (`.apk`): eke dokununca telefonun uyarıları sırayla gelir (indirilsin mi, "Yükleme engellendi: bilinmeyen kaynak", Ayarlar'da "Bu kaynaktan izin ver", "Yüklemek istiyor musun?"). Hiçbir şey inmez ve kurulmaz. İlk "İndir" sahte mesajda dokunmak sayılır (`file_opened`), son "Yükle" bilgi girmek (`info_entered`): `trap.almost` olan odada sonuç `almost` (hacklenme yolu `file`), Az kalsın açılır, oda sürer.
- **Olaylar** (`lib/lab/events.ts`): `file_opened`, `app_installed`, `permission_answered` (`app`, izin sırası `index`, seçenek `choice`; anahtar `permissionKey`), `homework_opened`. Görev gerçek oyunda ödev açılınca biter. Hepsi sunucu eylemiyle gelir, topluca gelmez.
- **Puan** (`lib/lab/scoring.ts`): görev 1; `installChecks` her denetim için 1 puan ve bir rapor satırı (tür `check`, etiketi "KURULUM"): kopyayı kurmamak, her puanlanan izinde doğru seçmek. Gerçek oyun hiç kurulmadıysa izin satırı "cevaplanmadı" olur. `maxScore` denetimleri de sayar (toplam yine 10).
- **Sunucu eylemleri** (`lib/lab/actions.ts`, kurallar `lib/lab/install.ts`): `openFile`, `installFile` (önce indirilmiş olmalı; Az kalsın döner), `installApp` (her uygulama bir kez; izin pencereleri kurulunca söylenir, kopya olduğu söylenmez), `answerPermission` (sıradaki izin; Az kalsın ya da son izinden sonra ne açılacağı), `openHomework` (bütün izinleri cevaplanmış gerçek oyun; `done` cümlesi döner). Önizleme sürücüsü (`local-driver.ts`) ve "Öğrenci gibi dene" (`lib/admin/try-path.ts`: doğru yol gerçek oyunu kurar, izinlerde doğrusunu seçer, ödevi açar; sahte öğede "az kalsın" dosyayı kurmaktır) aynı kurallarla.
- **Oynatıcı** (`components/lab/install/InstallPhone.tsx`): ana ekran (saat, süs simgeler, altta Mesajlar ve Mağaza), Mesajlar (`MessagingScene`, ek dosyası), Mağaza (öneri kartı odakta, altında süs vitrin; arama, uygulama sayfası, izin pencereleri), oyun ekranı. Az kalsın `AlmostDialog` ("Telefona dön"). Mağazanın vitrini ve ana ekranın süs simgeleri dil sözlüğünde (`lab.install.showcase`, `homeApps`), kurgusal adlarla.
- **Tarayıcıya giden içerik** (`lib/lab/client.ts`): mağaza, öneri, uygulamaların adı, yayıncısı, puanı, indirme sayısı, türü, açıklaması ve simgesi, oyunun ödev ekranı. Kopya olduğu, izinler, doğru seçenekler, rapor satırları, kopyanın boş ekranı, Az kalsın metinleri ve `game.done` gitmez.
- **Yayına hazırlık** (`lib/lab/checklist.ts`, "Görev"): şablon Mesajlar, kart, mağaza, ilan ve form yok, `trap.almost` açık, mağazanın ve oyunun alanları ve `fileCompare` dolu, en az bir gerçek uygulama, kopyanın rapor satırı ve boş ekranı, izinlerin seçenekleri (puanlıysa rapor satırı), eki olan en az bir sahte mesaj; ödeme, istek, sipariş ve form yok.
- **Oda kapağı**: `coverOf` null'dır (bildirim telefonu kalır); "Seni neler bekliyor"da "Mağaza · Kesir Kulesi" satırı (`detail.ahead.installText`).
- **Tek telefon (19 Kasım, Murat):** sitede tek telefon vardır, `components/device/Phone.tsx` (`Phone`, `PhoneStatus`, `PhoneLock`; ölçüler `phone.css`, masadaki telefondan, yalnızca boy `--dv-h` değişir). Masadaki telefon, gelen arama ve SMS, oda kapakları, hacklendin ekranı, T3 sehpası, tanıtım ve öğretmenler sayfası bunu kullanır; yeni telefon çizilmez. Telefonun içinde kaydırma çubuğu görünmez, yana kaydırma olmaz; içerik parmakla, tekerlekle ya da fareyle sürükleyerek kayar (`components/device/drag-scroll.ts`). Telefona sığmayan düğme sırası küçülerek sığar.
- **Tek bilgisayar (19 Kasım, Murat):** gövdesi T2 monitörü, ekranı M1 masaüstü: `components/device/Computer.tsx` (`Computer` gövde ve isteğe bağlı ayak, `ComputerDesktop` süs masaüstü, `ComputerWindow` pencere, `WindowBar` başlık, `Taskbar` görev çubuğu; ölçüler `computer.css`, ölçek `--pc-k`). `Desktop.tsx` (M1), T2 monitörü (`StageView`) ve okul bilgisayarı (`LoginDesktop`) başlığı, görev çubuğunu ve gövdeyi buradan alır; öğretmenler turu ve eğitim kartlarındaki mail (`components/lab/training/MailComputer.tsx`) da bunu kullanır. "Basmadan adrese bak" kartı dokunmatik cihazda maili tek telefonda açar. Yeni bilgisayar ya da pencere çizilmez; tanıtım sayfasının sahneleri bilerek kendi çizimleriyle kalır.
- **Testler**: `tests/unit/lab-install.test.ts` (oda dosyası, tarayıcıya giden içerik, kurallar, puan 100 ve 60, Az kalsın, "Öğrenci gibi dene", önizleme sürücüsü), `tests/e2e/lab-install.spec.ts` (doğru yol 100; .apk'yı kurmak Az kalsın, telefona dön, mağazadan kur; masaüstü ve telefon, `LAYOUT_SHOTS`), `tests/e2e/mobile-layout.spec.ts` (önizlemede ana ekran, Mesajlar, dosya uyarısı, Mağaza, izin penceresi, Az kalsın).
