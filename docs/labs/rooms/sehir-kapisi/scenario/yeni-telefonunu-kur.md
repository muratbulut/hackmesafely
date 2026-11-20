# Senaryo odası: Yeni telefonunu kur

| Alan | Değer |
| --- | --- |
| Mahalle | Şehir Kapısı |
| Açan eğitim | Telefonun ve internet |
| Sahne | Telefon kurulumu: Wi‑Fi, bildirim çubuğu, Ayarlar, Mağaza, izin pencereleri, uygulamadaki reklam (`docs/guides/new-lab.md` 2.19) |
| Şablon | T1 masadaki telefon (`stage: PHONE`) |
| Oda adresi | `/oda/yeni-telefonunu-kur` |
| Yazan | Murat |
| Durum | Oda dosyası hazır (20 Kasım, Murat oynanabilir tuvali onayladı); Ayça'nın sesi ve çizimi bekleniyor |
| Oda dosyası | `labs/rooms/sehir-kapisi/yeni-telefonunu-kur.json` |
| Akış şeması | https://claude.ai/artifact/T48PkUUfy8C7EsFDm5YNNP (kaynak `/mnt/project-files/sehir-kapisi/yeni-telefonunu-kur/akis.html`) |
| Oynanabilir tuval | https://claude.ai/artifact/4228oU2gw4GgSM3aj9e3Lb (tarif `/mnt/project-files/sehir-kapisi/yeni-telefonunu-kur/oynanabilir/`) |

Tuzak avı değil, "yapmayı öğren" görevi: sıfırlanmış telefonu baştan kurmak. Tek tuzak El Feneri'nin içindeki geri sayımlı "3 virüs" reklamıdır; temizleyiciyi kurmak "Hacklendin" değil **"Az kalsın"**dır, oda sürer. Açık ağa bağlanmak Az kalsın değil, küçük bir nottur.

## Kapak

- **Oda adı:** Yeni telefonunu kur
- **Esprili başlık:** Kutudan çıktı, sıra sende
- **Kısa açıklama:** Ablan Ayça eski telefonunu sıfırlayıp sana verdi. Evin ağına bağlan, güncelle, iki uygulama kur.
- **Zorluk:** Kolay · **Süre:** 6 dk
- **Bu odada ne öğreneceksin:** Ağın sahibini bil · Güncelleme Ayarlar'dan gelir · Reklam telefonun değil
- **"Bu odada şunlara dikkat et":** Bu ağ kimin? · Bu uyarı nereden geliyor? · Ne istiyor?

## Görev (Ayça'nın araması)

Ayça arar (ses metni `/mnt/project-files/sehir-kapisi/ses/yeni-telefonunu-kur-seslendirme.md`, ElevenLabs "Ayça - Young and Energetic"; ses gelene kadar altyazı):

1. "Yeni telefonum geldi! Eskisi artık senin. Sıfırladım, içi bomboş."
2. "Wi‑Fi şifresi annemin defterinde yazıyor, masanın üstünde duruyor."
3. "Kurunca bana yaz, bakalım becerebilecek misin!"

Görev kartı: **Telefonunu kur** · Evin Wi‑Fi'ına bağlan, şifre defterde · Telefonu güncelle · Harita ve El Feneri'ni kur · Bitince Ayça'ya haber ver · "Tamam, kuruyorum".

## Sahne

1. **Kurulum:** "Merhaba" → "Wi‑Fi ağı seçin" (SIM yok, mobil veri yok): Ev_Wifi (kilitli), Bedava_Internet (açık), Komsu_5G (kilitli).
   - Ev_Wifi: şifre kutusu, "Deftere bak" ile annenin notu (`mavi-kapi-42`, "Annen"), "Şifreyi yaz" kutuyu doldurur (klavye yok, yazılan gitmez), Bağlan.
   - Bedava_Internet: hemen bağlanır, not gelir: "Bu ağ kimin? Şifresiz ağı kimin kurduğunu bilemezsin..." · "Ağı unut, Ev_Wifi'ya geç". Kurulum evin ağı olmadan sürmez.
   - Komsu_5G: "Bu ağın şifresini bilmiyorsun." Kaydedilmez.
2. **Ana ekran:** saat, süs simgeler, altta Ayarlar ve Mağaza; üstte bildirim çubuğu tutamağı. Birkaç saniye sonra "Sistem güncellemesi hazır" bildirimi.
3. **Güncelleme:** bildirim çubuğundan ya da Ayarlar → Sistem güncellemesi → "Şimdi yükle" → "Telefonun güncel".
4. **Mağaza:** iki öneri (Harita, El Feneri). İzin pencereleri: Harita konum (Uygulamayı kullanırken doğru), El Feneri konum (İzin verme doğru).
5. **Tuzak:** El Feneri açılınca tam ekran kırmızı reklam: "UYARI! Telefonunda 3 virüs bulundu · Pilin %87 hasarlı..." · geri sayım 00:09 (biter, baştan başlar) · TEMİZLE · × · "Reklam · telefon-temizle.xyz". Ayarlar → Pil ve cihaz bakımı: "Sorun bulunmadı".
   - × ile kapatır: doğru.
   - TEMİZLE: telefonun uyarıları (`Temizleyici.apk`, "Yükleme engellendi: bilinmeyen kaynak", Ayarlar'da El Feneri'nin izni, "Yükle"). Vazgeçerse 2 puan; kurarsa Az kalsın: "O uyarı telefonundan değil, El Feneri'ndeki bir reklamdan geliyordu..." Karşılaştırma: Kurmak üzere olduğun `Temizleyici.apk` (reklamdan · telefon-temizle.xyz) · Telefonunun uyarısı Ayarlar (Pil ve cihaz bakımı · Sorun bulunmadı).
6. **Kurdum!:** her şey bitince ana ekranda Ayça'nın bildirimi "Kurabildin mi? 😄" · hazır cevap "Kurdum!".

## Görevler ve puan

1. Telefonu al, evin ağına bağlan (eylem; bir ağa bağlanınca biter)
2. Telefonu kur, Ayça'ya haber ver (görev, 1 puan; "Kurdum!" ile biter)
3. Telefonunun gerçek güncellemesi nereden gelir? (Ayarlar'dan ve bildirim çubuğundan · 1; Bir sitedeki ya da reklamdaki uyarıdan · 0; Mesajla gelen dosyadan · 0)
4. Okulun kapısındaki afişte bir QR var. Okutunca cinarortaokulu-menu.xyz çıktı. Ne yaparsın? (Açmam; okulun adresi bu değil, öğretmenime sorarım · 1; Açarım, okulun afişinde duruyor · 0; Açarım ama bir şey yazmam · 0)

Reklam 4 (TEMİZLE'den sonra vazgeçmek 2, kurmak 0) + görev 1 + ağ 1 (açık ağa hiç bağlanmadan Ev_Wifi) + Harita izni 1 + El Feneri izni 1 + iki soru 2 = **10**.

## Bitiş araması

"Süper, telefon tıkır tıkır çalışıyor! El Feneri senden de konum istedi mi? Ben hiç vermedim." Temizleyiciyi kurduysa: "O temizleyici reklamını ben de gördüm. Bir dahakine kapat geç, telefonun gerçek uyarısı Ayarlar'da olur." Açık ağa bağlandıysa: "Bu arada şifresiz ağlara bağlanma, annem duyarsa kızar."

## Rapor: "Bir dahaki sefere"

- Reklama dokunduysa: Telefonunun sesi Ayarlar'dadır, reklamın içinde değil. Geri sayımlı uyarıyı × ile kapat.
- Temizleyiciyi kurduysa: Gerçek hayatta reklamdan bir uygulama kurduysan hemen sil ve bir büyüğüne söyle.
- Açık ağa bağlandıysa: Bağlanmadan önce sor: bu ağ kimin?
- El Feneri'ne konum verdiyse: İzni ihtiyaca göre ver: el fenerinin konumuna ihtiyacı yok.
- Her zaman: Ağın sahibini bil, güncellemeyi Ayarlar'dan yükle, reklamı kapat.
