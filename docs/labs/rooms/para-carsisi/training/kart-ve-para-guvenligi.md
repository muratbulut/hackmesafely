# Eğitim odası: Kart ve para güvenliği

| Alan | Değer |
| --- | --- |
| Mahalle | Para Çarşısı |
| Tür | İleri eğitim ("Kişisel veri" bitince açılır) |
| Oda adresi | `/oda/kart-ve-para-guvenligi` |
| Yazan | Murat |
| Durum | Yayında (`labs/rooms/para-carsisi/kart-ve-para-guvenligi.json`, `PUBLISHED`) |
| Açtığı odalar | "Kulaklık için veli kartı"; "Eski telefonunu sat" ("Online alışveriş ve ikinci el" yazılana kadar) |
| Plan | `docs/labs/room-plan.md` içindeki "İleri eğitim: Kart ve para güvenliği" |

17 Kasım'da "Kişisel veri ve para güvenliği" eğitiminden ayrıldı (Murat, A yolu): kartlar oradan geldi, yeni kart yazılmadı. Kartların eski numaraları başlıklarda parantez içinde.

## Kapak

- **Oda adı** (80): Kart ve para güvenliği
- **Esprili başlık** (80, isteğe bağlı): Bedava peynir sadece fare kapanında
- **Kısa açıklama** (200): Kartın önü, arkası ve SMS kodu neden kimseye verilmez, "bedava ama 1 TL" tuzağı nasıl işler ve şüphelendiğinde atacağın adımlar.
- **Hikâye** (800): Oyunlar "bedava elmas", mailler "bedava hediye" diyor; karşılığında yalnızca kartın arkasındaki üç rakamı ya da telefona gelen kodu istiyor. Bu bilgiler ailenin hesabından para çekilmesine yeter. Bu odada kart bilgilerinin neden değerli olduğunu, sahte bir hediye mailinin nasıl anlaşıldığını ve para istendiğinde ne yapacağını öğreneceksin.
- **Zorluk:** Kolay
- **Süre (dk):** 5
- **Çizim:** `public/odalar/kart-ve-para-guvenligi.svg`: Ayşegül ve Ayça, aralarında kalkanlı banka kartı (eğitim bölünmeden önceki çizim).
- **Bu odada ne öğreneceksin** (en fazla 3; başlık 80, açıklama 240):
  1. **Kart bilgisi ve SMS kodu:** Kart numarası, son kullanma tarihi, CVV ve onay kodu neden kimseye verilmez?
  2. **"Bedava ama küçük bir ücret":** 1 TL'lik "doğrulama" neden aslında kartın tamamını ister?
  3. **Dur, sor, kontrol et:** Para ya da bilgi istendiğinde atacağın adımlar.

## Kartlar

### 1. Video: Ayşegül ve Ayça: bedava elmas (eski 6)

- **Video dosyası:** `/videolar/kartin-onu-arkasi-sms-kodu.mp4` (1:33). Ayça kartın önünü, arkasını ve SMS kodunu anlatıyor; bir oyun "Bedava elmas!" diyerek kartın arkasındaki 3 rakamı istiyor.
- **Soru** (64. saniyede video durur): Bir oyun "Bedava elmas!" diyor ve kartın arkasındaki 3 rakamı istiyor. Ne yaparsın?
  - Yazarım, elmas bedava
  - **Yazmam, önce ailemle konuşurum** (doğru)
  - Sadece iki rakamını yazarım
- **Açıklama:** Kartın arkasındaki 3 rakam CVV'dir; bilen biri kart elinde olmadan alışveriş yapabilir. Hiçbir oyun onu istemez, iki rakamı bile verilmez. Önce ailenle konuş.

### 2. Bilgi: Kartın önü, arkası ve SMS kodu (eski 7)

- **Düzen:** Banka kartı. Örnek kart çizimi: 1. madde kartın önünü (numara ve tarih parlar), 2. madde arkasını (kart döner, CVV), 3. madde SMS kodunu (telefon ve imza), 4. madde veli iznini (kilit) gösterir. Dördü gezilmeden Devam yok; ikinci paragraf SMS maddesinden sonra çıkar (Tur 7, 1 Kasım).

> Videodan (1. kart) sonra gelir; video anlatır, bu kart dört parçayı tek tek gezdirir (1 Kasım, Murat).

Bir banka kartıyla internetten alışveriş yapmak için üç şey yeter: kartın önündeki 16 haneli numara, son kullanma tarihi ve arkadaki 3 haneli güvenlik kodu (CVV). Bu üçünü bilen biri, kart elinde olmasa da alışveriş yapabilir.

Çoğu ödemede bir de karta bağlı telefona SMS onay kodu gelir. Bu kod "Bu ödemeyi ben yapıyorum" demektir; bir imza gibidir. Kodu söylediğin kişi, senin adına imza atmış olur.

- **Kart numarası ve son kullanma tarihi:** Kartın önünde. Fotoğrafını bile paylaşma.
- **CVV:** Kartın arkasındaki 3 hane. Hiçbir oyun, çekiliş ya da "doğrulama" bunu istemez.
- **SMS onay kodu:** İmzadır. Banka, mağaza, öğretmen, arkadaş; kim sorarsa sorsun söylenmez.
- **Kart ailenin ise:** Velinin izni olmadan hiçbir yere girilmez, "sonra söylerim" de olmaz.

### 3. Tıkla-bul: Bu "hediye" mailindeki 4 şüpheli yeri bul (eski 9)

- **İpucu satırı** (160): Mailde 4 şüpheli yer var. Bul bakalım.
- **Mail:**
  - Gönderen adı (60): Mega Kampanya
  - Adres (80): hediye@mega-kampanya-odul.xyz
  - Konu (120): TEBRİKLER! Kablosuz kulaklık kazandınız 🎧
  - Saat: 16:05
  - Metin (en fazla 6 paragraf, her biri 400):
    1. Merhaba,
    2. Bu ayın şanslı kazananı sizsiniz! Kablosuz kulaklığınız depomuzda sizi bekliyor.
    3. Hediyeniz tamamen ücretsizdir. Sadece kargo için 1 TL'lik kart doğrulaması yapmanız gerekir.
    4. Formda kart numaranızı, son kullanma tarihini, CVV kodunu ve telefonunuza gelecek onay kodunu yazmanız yeterli.
    5. Ödül 2 saat içinde alınmazsa sıradaki kişiye verilecektir.
  - Düğme yazısı (40): Hediyemi al
  - Alt satır (200): Mega Kampanya · Bu mail kampanyaya katılan kullanıcılara gönderilmiştir.
- **Şüpheli parçalar** (en fazla 5; yer: gönderen adı, adres, konu, 1.–6. paragraf, düğme, alt satır):
  1. Yer: adres · Açıklama (300): "mega-kampanya-odul.xyz" bilinen bir mağazanın adresi değil. Hiç katılmadığın bir kampanyanın seni bulması da tuhaf.
  2. Yer: 3. paragraf · Açıklama (300): "Ücretsiz ama 1 TL." Bedava bir şey için kart istenmez. 1 TL sadece bahane, asıl istenen kartın kendisi.
  3. Yer: 4. paragraf · Açıklama (300): CVV ve SMS onay kodu bir arada istenmiş. Bu ikisini alan kişi karttan istediği kadar harcama yapabilir.
  4. Yer: 5. paragraf · Açıklama (300): "2 saat içinde" diye acele ettiriyor. Acele, düşünüp birine sormanı engellemek içindir.

### 4. Mini test: "Bedava hediye, sadece 1 TL doğrulama" diyen bir sayfa ne ister aslında? (eski 10)

- [ ] Sadece 1 TL, başka bir şey değil
- [x] Kartın bütün bilgilerini; sonra çok daha fazlasını çekebilir
- [ ] Kartın gerçek olup olmadığını kontrol etmek ister
- [ ] Sonraki alışverişinde sana indirim yapmak ister
- **Çizim:** oltadaki 1 TL
- **Açıklama** (400): 1 TL'yi çekmek için de kart numarası, son kullanma tarihi, CVV ve SMS kodu gerekir. Bunları alan kişi 1 TL ile durmaz. Gerçek mağazalar hediye vermek için kart "doğrulamaz".

### 5. Bilgi: Dur, sor, kontrol et (eski 11)

- **Düzen:** Adım adım. Dört adım sırayla açılır, açılmamış adım kilitli; dördü açılmadan Bitir yok (Tur 7, 1 Kasım).

Para ya da bilgi isteyen bir mesaj, mail ya da sayfa gördüğünde acele etme. Dolandırıcının en büyük silahı, düşünmeden hareket etmendir.

- **Dur:** Formu doldurma, bağlantıya dokunma, kodu kimseye söyleme. Beklemekle hiçbir şey kaybetmezsin.
- **Sor:** Ailene ya da öğretmenine göster. Kart ailenindir, karar da onlarındır.
- **Kontrol et:** Oyunun, okulun ya da mağazanın resmî uygulamasını kendin aç. Gerçek bir hediye ya da duyuru varsa orada da görürsün.
- **Bildir:** Postam'da "Oltalama olarak bildir", Mesajlar'da "Bildir ve engelle". Kart bilgisi girildiyse aile hemen bankayı arar.

## Notlar

- 17 Kasım (Murat): eğitim ikiye bölündü; bu oda yeni. Kartların 1 Kasım kararları (Tur 7 düzenleri, videonun yazılı kartın önünde olması, mini test çizimleri) [`kisisel-veri-ve-para-guvenligi.md`](kisisel-veri-ve-para-guvenligi.md) notlarında.
- Tıkla-bul maili elmas senaryosuyla çakışmasın diye oyun yerine kulaklık hediyesi seçildi.
- Kart sayısı 5; istenirse sonra bir mini test eklenebilir (ör. oyun içi satın almada kimin izni gerekir).
