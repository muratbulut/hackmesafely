# Senaryo odası: Okul bilgisayarında giriş yap ve çık

| Alan | Değer |
| --- | --- |
| Mahalle | Şehir Kapısı |
| Açan eğitim | Hesap ve giriş |
| Sahne | Giriş görevi: ortak bilgisayar, okul portalı, telefona gelen kod, yüz yüze konuşma (`docs/guides/new-lab.md` 2.17) |
| Şablon | T2 bilgisayar ve telefon (`stage: DESKTOP_PHONE`), Deniz'le konuşma T3 (okulda) |
| Oda adresi | `/oda/okul-bilgisayarinda-giris` |
| Yazan | Murat |
| Durum | Oda dosyası ve Deniz'in sesi hazır (19 Kasım, Murat oynanabilir tuvali onayladı) |
| Oda dosyası | `labs/rooms/sehir-kapisi/okul-bilgisayarinda-giris.json` |
| Oynanabilir tuval | https://claude.ai/artifact/PZUaaNJHLE29si2Uj1ojJj (kaynak `/mnt/project-files/sehir-kapisi/okul-bilgisayari/`) |

Şehir Kapısı'nın simülasyonu tuzak avı değil, "yapmayı öğren" görevidir. Bu odada mail ve sahte site yok: tuzak ortak bilgisayarın kendisi. Çıkış yapmadan kalkmak "Hacklendin" değil **"Az kalsın"**dır, oda sürer.

## Kapak

- **Oda adı:** Okul bilgisayarında giriş yap ve çık
- **Esprili başlık:** Zil çaldı, kapı açık kaldı
- **Kısa açıklama:** Bilişim dersinde sınıfın ortak bilgisayarından Okul Portalı'na gir, afiş ödevini yükle. Zil çalınca bilgisayarı sıradakine bırakacaksın.
- **Hikâye:** Bilişim dersindesin. Emre Hoca herkesten afiş ödevini Okul Portalı'na yüklemesini istiyor. Sınıfın bilgisayarları ortak: her ders başka bir sınıf oturuyor. Portala gir, ödevini yükle, kalkmadan kapıyı kapat.
- **Zorluk:** Kolay · **Süre:** 5 dk
- **Bu odada ne öğreneceksin:** Ortak bilgisayar senin değil · Sekmeyi kapatmak çıkış değil · Kod sende kalır
- **"Bu odada şunlara dikkat et":** Bu bilgisayar kimin? · Kapı açık kalmasın.

## Görev (Emre Hoca'nın notu)

Arama yok. Kilit ekranında "Bilişim Sınıfı · PC 12 · herkesin ortak hesabı" yazar, öğrenci "Oturum aç"a basar. Masaüstünde Emre Hoca'nın notu açılır: **Afiş ödevini portala yükle** · Afişini Okul Portalı'ndaki ödeve yükle · Dosyan masaüstünde: afis.png · Zil 10.40'ta, sonra 7-C geliyor · "Tamam, başlıyorum". Not küçülür, tarayıcı açılır.

## Sahne

- **Okul Portalı** (`portal.cinarortaokulu.k12.tr`, Çınar Ortaokulu, yeşil şerit): kullanıcı adı 2741 hazır yazılı, şifreye dokununca noktalar gelir (yazılan kaydedilmez). **"Beni hatırla" işaretli gelir.**
- **Kod:** "Giriş yap"tan sonra telefona SMS gelir: "Okul Portalı giriş kodun: 527 104. Bu kodu kimseyle paylaşma." Telefona bakmadan kod kutusuna dokunursa "Kod telefonuna geldi" uyarısı.
- **Deniz** (yan sıradaki arkadaş, yüz yüze, sesli): "Pst! Benim telefon evde kaldı, kod gelmiyor." · "Senin hesabından girip benim afişi de yükleyeyim mi? Kodu bir söylesene." Deniz'in sesi: ElevenLabs **Asım**; dosyalar `public/sesler/okul-bilgisayarinda-giris/`.
- **Şifre kaydedilsin mi?** Kodu yazınca tarayıcı sorar (Hayır / Kaydet).
- **Ödev:** Ödevler › Afiş ödevi › Dosya seç (afis.png ya da yanlış tür ders-programi.pdf) › Yükle. "Ödevin teslim edildi."
- **Zil:** "Teneffüs! 2 dakika sonra 7-C geliyor." · "Kalk, sıradakine bırak".

## Yollar

- **Doğru yol:** "Beni hatırla"nın işaretini kaldırır, kodu Deniz'e vermez, şifreyi kaydetmez, ödevi yükler, profil menüsünden **Çıkış yap**, kalkar. "Kalktın. PC 12 artık 7-C'nin."
- **Az kalsın:** çıkış yapmadan kalkarsa (sekmeyi ya da tarayıcıyı kapatsa da): "7-C'den biri PC 12'ye oturdu, tarayıcıyı açtı. Portal onu **"Hoş geldin, 2741"** diye karşıladı. Gerçek hayatta ödevini silebilir, öğretmenine senin adına mesaj yazabilirdi." Sen: "Tarayıcıyı kapattın, kalktın." Sıradaki: "Tarayıcıyı açtı: **senin hesabın**, şifresiz." Bir dahaki sefere: Beni hatırla'yı kaldır, şifreyi kaydetme · menüden Çıkış yap, sekmeyi kapatmak çıkış değildir · unuttuysan kendi telefonundan "Tüm cihazlardan çıkış yap". "Bilgisayara dön": tarayıcıyı yeniden açınca portal hâlâ içeride; çıkış yapıp yine kalkabilir.
- **Bitiş:** Deniz'in son sözleri, cevabına göre. Kodu vermediyse: "Emre Hoca benimkini yarına uzattı, sorun yok." · "Kodu vermemen iyi oldu bu arada, hoca da öyle dedi. Hadi, teneffüs bitmeden kantine!" Verdiyse ya da ekranını gösterdiyse ikinci satır: "Kodunu bana söyledin ya, hoca "bir daha kimseye söyleme" dedi. Hadi, kantine!" Sonra rapor.

## Görevler ve puan

1. Okul Portalı'na giriş yap (eylem)
2. Deniz senden kodunu istiyor. Ne dersin? (yüz yüze: Kod bende kalır. Emre Hoca'ya söyleyelim, sana başka yol bulur · 2; Söylerim, arkadaşımsın sonuçta · 0; Ekranımı sana çevireyim, sen bak yaz · 0)
3. Kodu yaz, afiş ödevini yükle (görev, 1 puan)
4. Zil çaldı: bilgisayarı sıradakine bırak (kalkış)
5. Diyelim ki okuldan çıktın ve portaldan çıkmayı unuttun. Evdesin. Ne yaparsın? (Kendi telefonumdan portala girer, "Tüm cihazlardan çıkış yap"a basarım · 1)

Kalkmadan önce çıkış 4 + Beni hatırla'yı kaldırmak 1 + şifreyi kaydetmemek 1 + görev 1 + Deniz 2 + son soru 1 = **10**.

## Rapor: "Bir dahaki sefere"

- Çıkış yapmadan kalktıysa: İşin bitince menüden Çıkış yap. Sekmeyi kapatmak kapıyı kapatmaz.
- Beni hatırla işaretli kaldıysa: Ortak bilgisayarda Beni hatırla'nın işaretini kaldır.
- Şifreyi kaydettiyse: Ortak bilgisayarda şifreyi kaydetme. Kaydettiysen tarayıcının ayarlarından sil.
- Kodu verdiyse ya da gösterdiyse: Doğrulama kodu yalnız sende kalır, en yakın arkadaşın bile istese.
- Son soruyu kaçırdıysa: Açık kalan kapıyı uzaktan da kapatabilirsin: kendi telefonundan "Tüm cihazlardan çıkış yap".
- Her zaman: Kapıyı açtın, kapatmayı unutma.
