# Senaryo odası: Bu uygulama nereden geliyor?

| Alan | Değer |
| --- | --- |
| Mahalle | Şehir Kapısı |
| Açan eğitim | Dosya ve uygulama |
| Sahne | Kurulum görevi: Mesajlar ve Mağaza, telefonun indirme uyarıları, izin pencereleri (`docs/guides/new-lab.md` 2.18) |
| Şablon | T1 masadaki telefon (`stage: PHONE`) |
| Oda adresi | `/oda/uygulama-nereden-geliyor` |
| Yazan | Murat |
| Durum | Oda dosyası ve Deniz'in sesi hazır (19 Kasım, Murat oynanabilir tuvali ve sesi onayladı) |
| Oda dosyası | `labs/rooms/sehir-kapisi/uygulama-nereden-geliyor.json` |
| Akış şeması | https://claude.ai/artifact/Hqrd3xNYdReNnh3pauZ18T (kaynak `/mnt/project-files/sehir-kapisi/uygulama-nereden-akis/`) |
| Oynanabilir tuval | https://claude.ai/artifact/KM8VeVFtFHiC9BLHasf6Qk (tarif `/mnt/project-files/sehir-kapisi/uygulama-nereden-oynanabilir/`) |

Şehir Kapısı'nın simülasyonu tuzak avı değil, "yapmayı öğren" görevidir: oyunu doğru yerden kurmak. İki tuzak var: sınıf grubuna atılan `.apk` ve mağazadaki adı benzeyen kopya oyun. İkisi de "Hacklendin" değil **"Az kalsın"**dır, oda sürer. Eski fikir (`odev.pdf.exe`, M1) Yazılım Ormanı ile çakıştığı için yedekte.

## Kapak

- **Oda adı:** Bu uygulama nereden geliyor?
- **Esprili başlık:** Aynı oyun, iki kapı
- **Kısa açıklama:** Matematik öğretmenin ödev için bir oyun verdi. Oyunu doğru yerden kur, izinlerine bak, ödevi aç.
- **Hikâye:** Sınıf arkadaşın Deniz arıyor: matematik öğretmeni hafta sonu için Kesir Kulesi oyununu ödev vermiş, 3. bölümü bitirmeniz gerekiyor. Öğretmen oyunu mağazadan kurun demiş. Telefonuna bakınca sınıf grubunda birinin "daha hızlı" diye bir dosya attığını görüyorsun. Mağazada da adı Kesir Kulesi olan iki oyun var.
- **Zorluk:** Kolay · **Süre:** 5 dk
- **Bu odada ne öğreneceksin:** Mağazadan kur · Yayıncıya bak · İzni oku
- **"Bu odada şunlara dikkat et":** Nereden geliyor? · Yayıncı kim? · Ne istiyor?

## Görev (Deniz'in araması)

Deniz arar (sesli, ElevenLabs **Asım**; dosyalar `public/sesler/uygulama-nereden-geliyor/`):

1. "Selam! Matematik hocası hafta sonu için Kesir Kulesi'ni ödev verdi. Üçüncü bölümü bitirmemiz lazım."
2. "Hoca mağazadan kurun dedi. Yayıncısı Bilge Oyun Atölyesi."
3. "Kurunca bana yaz, akşam birlikte oynarız!"

Görev kartı: **Kesir Kulesi'ni kur, ödevi aç** · Oyunu mağazadan kur · Yayıncısı Bilge Oyun Atölyesi · Kurunca Deniz'e haber ver · "Tamam, hemen kuruyorum".

## Sahne

T1 masası: telefon masada, öğrenci alır, telefonun altındaki "Telefonu masaya bırak" ile bırakır. Telefonun ana ekranında saat, süs simgeler ve altta **Mesajlar** ile **Mağaza**.

- **Mesajlar, 7-B Sınıfı grubu:**
  - **Kerem** (sahte): "Kesir Kulesi mağazadan çok yavaş iniyor 😩 Bunu kurun, **daha hızlı**, hem bütün bölümler açık 👇" · ek `KesirKulesi_hizli.apk` (48 MB).
  - **Elif** (gerçek): "Kesir Kulesi'nin 3. bölümü zor mu, bakan var mı? Ben daha ikideyim 🙈"
- **Eke dokununca** telefonun uyarıları sırayla gelir: "indirilsin mi? Bu tür dosyalar cihazına zarar verebilir" (İndir / İptal) → "Yükleme engellendi: bilinmeyen kaynak" (Ayarlar / İptal) → Ayarlar: "Bu kaynaktan izin ver" → "Bu uygulamayı yüklemek istiyor musun?" (Yükle). Her adımda vazgeçebilir. Dosya inmez, hiçbir şey kurulmaz.
- **Mağaza:** en üstte öneri kartı "Kesir Kulesi" (odak), altında süs vitrin (kategoriler, öne çıkanlar, öğrenciler için). Arama iki sonuç verir:
  - **Kesir Kulesi** · Bilge Oyun Atölyesi · 4,6 · 500 B+ · Eğitim · Matematik · "Reklam yok."
  - **Kesir Kulesi: Sınırsız Elmas** · FunFreeGamez · 3,1 · 1 B+ · "Tüm bölümler açık! Elmas sınırsız!"
- **İzin pencereleri** (kurulunca sırayla): gerçek oyunda bildirim ("Ödev hatırlatmaları için"; İzin ver / İzin verme, ikisi de olur) ve konum ("Yakındaki oyuncuları göstermek için"; Uygulamayı kullanırken / Yalnızca bu sefer / **İzin verme**). Kopyada "SMS mesajlarını okumak ve kişilerine erişmek istiyor" (İzin ver / İzin verme).
- **Oyun:** gerçek oyunda ödev ekranı "Öğretmeninin ödevi: 3. bölüm, kulenin üçüncü katı" · "Ödevi aç" → "3. bölüm açıldı!". Kopyada ödev listesi yok: "Bu oyunda öğretmenin ödev listesi yok. Ödevin bu oyunda değil." · "Kaldır".

## Yollar

- **Doğru yol:** Kerem'in dosyasına dokunmaz (ya da bildirir), Mağaza'da yayıncıya bakıp Bilge Oyun Atölyesi'nin oyununu kurar, konuma "İzin verme" der, oyunu açar, "Ödevi aç". Deniz yeniden arar: "Süper! Akşam kim kuleyi daha hızlı çıkacak, görürüz." Kerem'in mesajını bildirdiyse: "Kerem'in dosyasını bildirmişsin, iyi ki. Ona da mağazadan kurmasını söyleyelim."
- **Az kalsın (.apk):** uyarıları geçip dosyayı kurmak ister. "Bu dosya mağazadan gelmedi, içini kimse kontrol etmedi. Adı Kesir Kulesi olsa da gerçek hayatta telefonuna gizlice reklam basabilir, mesajlarını okuyabilir, hesaplarını ele geçirebilirdi." Karşılaştırma: Kurmak üzere olduğun `KesirKulesi_hizli.apk` (sınıf grubundan · kontrol eden yok) · Ödevin Kesir Kulesi (Mağaza · Bilge Oyun Atölyesi). Bir dahaki sefere: yalnızca mağazadan kur · "bilinmeyen kaynak" diyorsa dur · kurduysan sil ve bir büyüğüne söyle. "Telefona dön" ile oda sürer.
- **Az kalsın (kopya oyun):** kopyayı kurup SMS iznine "İzin ver" der. "Bu oyun öğretmeninin söylediği oyun değildi. Bir matematik oyununun SMS'lerine ihtiyacı yok..." Karşılaştırma: Kurduğun Kesir Kulesi: Sınırsız Elmas (FunFreeGamez · SMS ve kişilerini istiyor) · Ödevin Kesir Kulesi (Bilge Oyun Atölyesi · SMS istemiyor). Kopyayı kurup izni reddederse Az kalsın yok, ama kopyayı kurmak raporda ayrı satırdır.

## Görevler ve puan

1. Telefonunu al, mesajlarına göz at (eylem)
2. Kesir Kulesi'ni kur, ödevi aç (görev, 1 puan; gerçek oyunda ödev açılınca biter)
3. Mesajlarını incele, şüpheli bulduklarını bildir (inceleme)
4. Arkadaşın gruba "mağazadakinden hızlı" diye bir .apk attı. Ne yaparsın? (Açmam, oyunu mağazadan kurarım · 1; Arkadaşım attıysa güvenlidir, kurarım · 0; Kurarım, izin pencerelerinde hayır derim · 0)
5. Oyun konumunu istedi, sen "İzin verme" dedin. Ne olur? (Oyun yine açılır, yalnızca konumunu bilmez · 1; Oyun açılmaz · 0; Oyun telefondan silinir · 0)

Kerem'in mesajı 4 + Elif'in mesajı 1 + görev 1 + kopyayı kurmamak 1 + konum izninde "İzin verme" 1 + iki soru 2 = **10**. Kerem'in dosyasını indirip vazgeçip bildirmek 2, kurmak istemek 0 (Az kalsın).

## Rapor: "Bir dahaki sefere"

- Dosyaya dokunduysa: Mağazadan gelmeyen dosyaya hiç dokunmana gerek yok; doğrudan mağazaya git.
- .apk'yı kurmak istediyse: Gerçek hayatta mesajla gelen bir uygulamayı kurduysan hemen sil ve bir büyüğüne söyle.
- Kopyayı kurduysa: Mağazada da yayıncıya bak: öğretmenin söylediği ad mı?
- Konuma izin verdiyse: Oyunun işine yaramayan izni reddet, oyun yine çalışır.
- Kerem'in mesajını bildirmediyse: Gruba atılan .apk'yı bildir, başkası kurmasın.
- Her zaman: Mağazadan kur, yayıncıya bak, izni oku.
