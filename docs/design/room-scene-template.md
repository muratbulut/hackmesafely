# Oda sahne şablonu (M1, T1, T2, T3)

18 Kasım 2026'da Murat onayladı: "Genel template artık budur." Bundan sonra bütün senaryo odaları bu dört sahneden biriyle açılır; eğitim odalarında da kullanılabilir. Masanın rengi, odanın yeri, masadaki eşyalar gibi ayrıntılar ileride değişebilir, sahnelerin yapısı aynı kalır.

Tuval (oynanabilir, bütün sahneler ve 390 px telefon hâli): [Odalar için masaüstü şablonu](https://claude.ai/artifact/FUZhpRbnDoWiu25f845vfe) (10. tur). Tuvalin kaynağı ve 3B eşyaların üretici sayfaları proje dosyalarında, `masaustu-sablonu/` klasöründe.

Durum: tasarım onaylı, **kod henüz yok**. Bugünkü odalar Postam'ı ve Mesajlar'ı doğrudan açıyor; şablon kodlanınca aynı uygulamalar bu sahnelerin içinde açılır (aşağıda "Koda geçerken").

## Hangi oda hangi şablonu kullanır

| Şablon | Öğrencinin gördüğü | Ne zaman |
| --- | --- | --- |
| **M1** Masaüstü | Kurgusal bilgisayar masaüstü: altta görev çubuğu, uygulama simgeleri (Postam, tarayıcı, Yolda Kargo gibi ayrı uygulamalar), sağda görev paneli | Yalnızca bilgisayarda geçen odalar: mail, tarayıcı, indirme, USB bellek |
| **T1** Masadaki telefon | Üstten görülen ahşap masa; ortada telefon, çevresinde defter, kalem, kahve kupası, kulaklık kutusu | Yalnızca telefonda geçen odalar: Mesajlar, sosyal medya akışı, telefon ayarları, QR, Wi‑Fi |
| **T2** Bilgisayar ve telefon | M1 masaüstü ve yanında masadaki telefon; bildirim gelince telefon titrer | Bir adımın telefona düştüğü bilgisayar odaları: SMS kodu, veliye giden onay kodu, "telefondan tüm cihazlardan çık" |
| **T3** Karşılıklı konuşma | Sinema şeritleri: bulanık oda, karşıda silik bir silüet (anne, babaanne; ileride yabancı), önde sehpa ve üstünde telefon | Bir büyükle ya da biriyle yüz yüze konuşulan anlar; sosyal mühendislikte karşıdaki yabancı |

Her senaryonun şablonu `docs/labs/room-plan.md`'de "Şablon:" alanında yazılıdır. "(+T3)" doğru kararın bir büyüğe anlatmak olduğu odalardır: oda T1'de geçer, sonunda kısa bir T3 konuşması önerilir.

## Bütün sahnelerde ortak kurallar

- Telefon hiçbir zaman doğrudan ekranı kaplamaz: öğrenci telefonu masadan alır, işi bitince masaya bırakır. Bildirim gelince masadaki telefon titrer ve parlar.
- **Temel eğitimin** odalarında bilgisayar şifresizdir: kilit ekranında yalnızca "Oturum aç" düğmesi var. Şifre yalnızca **ileri eğitimlerin** odalarında sorulur ve odadan odaya değişmez (deterministik; tuvaldeki örnek `gunes2009`), yazılan şifre kaydedilmez.
- Başlat düğmesi maskot gözlü a'dır; menüde "Oturumu kapat" küçük bir sürprizdir (easter egg). Görev çubuğundaki saat gerçek saattir.
- Duvar gri, üstünde sitedeki sarı ağ (iplikler) yarı saydam (%50).
- Bütün uygulamalar kurgusaldır (Postam, Mesajlar, Yolda Kargo); gerçek marka, logo ve alan adı yok.
- Metinler dil sözlüğüne girer, renkler tema değişkenlerinden gelir, "Hareketi azalt" açıkken titreşim ve parlama durur.

## M1 Masaüstü

- Altta görev çubuğu (başlat, açık uygulamalar, saat), sağda görev paneli: odanın görevleri ve ilerleme. Görev paneli dar ekranda alttan açılan bir çekmeceye dönüşür.
- Postam, tarayıcı, kargo uygulaması gibi uygulamalar ayrı pencerelerde açılır; masaüstündeki simgeden ya da görev çubuğundan geçilir.

## T1 Masadaki telefon

- Masa ahşap dokusu sayfada çizilir. Eşyalar (defter, kalem, kahve kupası, kulaklık kutusu) gerçek ışık ve gölgeyle 3B çizilmiş görsellerdir; boyutları telefonun masadaki boyuna göre ayarlanır.
- Yerleşim: defter sol üstte, kupa sağ üstte, kalem sol altta, kulaklık kutusu sağ altta; kalem ve kulaklık telefondan ve birbirinden uzak durur. Çiçek yok, defterde logo yok.

## T2 Bilgisayar ve telefon

- M1 masaüstü; telefon masanın sağında durur. Kod ya da onay telefona gelince telefon titrer, öğrenci telefonu alır, kodu görür, bırakır.

## T3 Karşılıklı konuşma (S1 sinema şeritleri)

- Üstte ve altta siyah sinema şeritleri. Karşıdakinin sözü üst şeritte ortada altyazı olarak durur ve sabit kalır; öğrencinin seçenekleri alt şeritte, 1, 2, 3 tuşlarıyla da seçilir.
- Arkada oda bulanıktır; karşıdaki kişi silik bir silüettir (yüzü görünmez, nefes alır, konuşurken başını sallar). Bu silüet kesin kalır (Murat).
- Önde 3B çizilmiş sehpa: üstünde telefon (kalınlığı görünür, kâğıt gibi ince değil), kahve kupası ve mandalina kâsesi. Kupaya tıklayınca bir yudum alınıp geri bırakılır (sürpriz); kupa bulanıklaşmaz, buharı kalır.
- Telefon alınınca küçük kalır ve sağda, iki şeridin arasında durur; altyazı ve seçenekler yerinden oynamaz, uzun yazı sıkışmaz.

## 390 px telefon hâli

- 390 px telefon genişliğidir. M1 ve T2'de pencereler tam ekran açılır, görev paneli alttan çekmece olur.
- T3'te altyazı üstte siyah bir şeritte (sola yaslı), seçenekler en altta yatay kayan bir şeritte; sehpa ve telefon ikisinin arasında. Dokunma alanları en az 40 px.

## Koda geçerken

Kod ayrı bir işte (yeni konu) yapılır. Plan:

1. Oda dosyasına geriye uyumlu bir sahne alanı (`stage`: `DESKTOP` M1, `PHONE` T1, `DESKTOP_PHONE` T2, `TALK` T3) eklenir; alan yoksa oda bugünkü gibi açılır. Şema `lib/lab/content.ts`, sahneler `components/lab/stage/`.
2. Postam, Mesajlar ve tarayıcı bu sahnelerin içinde uygulama olarak açılır; 3B eşyaların görselleri `public/` altında durur.
3. T3'teki seçimler de diğer kararlar gibi sunucuda puanlanır ve rapora yazılır; doğru seçenek tarayıcıya gönderilmez.
4. İlk taşınacak odalar: Sahte kargo maili (M1), Kulaklık için veli kartı (T2), Eski telefonunu sat (T1).
5. Yeni odalar `docs/labs/room-plan.md`'deki şablonla yazılır.

Ayrıntılı dosya listesi ve testler kod işiyle birlikte `docs/guides/new-lab.md` 2. kısma yazılır.
