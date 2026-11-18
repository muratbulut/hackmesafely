# Senaryo odası: Bağlantı nereye gidiyor?

| Alan | Değer |
| --- | --- |
| Mahalle | Şehir Kapısı |
| Açan eğitim | Mesajı okumak (temel eğitim) |
| Sahne | Postam + görev (kayıt görevi, `docs/guides/new-lab.md` 2.16) |
| Şablon | M1 masaüstü (`stage: DESKTOP`) |
| Oda adresi | `/oda/baglanti-nereye-gidiyor` |
| Yazan | Murat |
| Durum | Oda dosyası ve Deniz'in sesi hazır (18 Kasım, Murat onayladı) |
| Oda dosyası | `labs/rooms/sehir-kapisi/baglanti-nereye-gidiyor.json` |
| Akış şeması | https://claude.ai/artifact/41pwGyrM6MzGL76kG2wSwm |

Şehir Kapısı'nın simülasyonları tuzak avı değil, "yapmayı öğren" görevleridir: öğrenciye bir iş verilir, işi yaparken eğitimde öğrendiğini kullanır. Yanlış karar "Hacklendin" yerine yumuşak bir **"Az kalsın"** ekranı getirir ve oda sürer (Murat, 18 Kasım).

## Kapak

- **Oda adı:** Bağlantı nereye gidiyor?
- **Esprili başlık:** Yazıda bir şey, içinde başka bir şey
- **Kısa açıklama:** Okulun Kodlama Kulübü'ne kayıt bugün bitiyor. Gelen kutunda kulübün adıyla iki mail var. Doğru bağlantıyı bul ve kaydol.
- **Hikâye:** Sınıf arkadaşın Deniz arıyor: okulun Kodlama Kulübü'ne kayıtlar bugün bitiyormuş ve seninle birlikte gitmek istiyor. Kulübün öğretmeni kayıt formunu öğrencilere mail atmış. Postam'da kulübün adıyla iki mail var, ikisinde de bir kayıt düğmesi var ama ikisi aynı yere gitmiyor. Düğmelere basmadan önce gerçek adreslerine bak, doğru olanla kaydol.
- **Zorluk:** Kolay · **Süre:** 5 dk
- **Bu odada ne öğreneceksin:** Ad değil adres · Yazı değil bağlantı · Adresi sağdan oku
- **"Bu odada şunlara dikkat et":**
  1. **Kimden geldi?** Görünen ada değil, @ işaretinden sonrasına bak.
  2. **Nereye gidiyor?** Düğmeye basmadan önce üstüne gel ya da basılı tut.

## Görev (Deniz arar)

Görevi Ayça yerine sınıf arkadaşı **Deniz** verir (Ayça eğitimin videosunda var; her odada aynı yüz olmasın). Kulaklık odasındaki gibi görüntülü arama, altyazılı; sesler `public/sesler/baglanti-nereye-gidiyor/` (açılış 3, iyi bitiş 3). Deniz'in sesi: ElevenLabs **Asım** (Yayıncının çekilişi'ndeki Deniz).

- "Selam! Kodlama Kulübü'nün kaydı bugün bitiyormuş, haberin var mı?"
- "Emre Hoca formu herkese mail atmış. Ben kaydoldum, sen de gel, birlikte gideriz."
- "Mailindeki bağlantıdan kaydol, olunca bana yaz!"

Görev kartı: **Kodlama Kulübü'ne kaydol** · Kayıt formu okulun mailinde · Kayıtlar bugün 17.00'de kapanıyor · Kaydolunca Deniz'e haber ver · "Tamam, hemen bakıyorum".

## Sahne: mailler

| Mail | Tür | Adres | Düğmede yazan | Gerçek adres |
| --- | --- | --- | --- | --- |
| Kodlama Kulübü Kayıt · SON GÜN: Kodlama Kulübü kaydı · 08:41 | Sahte | kayit@cinarortaokulu-kulup.xyz | cinarortaokulu.k12.tr/kayit | cinarortaokulu.k12.tr.kayit-formu.xyz/giris |
| Çınar Ortaokulu Kodlama Kulübü · Kodlama Kulübü'ne kayıtlar bugün bitiyor · 08:15 | Gerçek (form) | kulup@cinarortaokulu.k12.tr | Kayıt formu | cinarortaokulu.k12.tr/kulup/kayit |
| Annem · Akşam · 07:30 | Gerçek | lisa@postam.com | bağlantı yok | |
| Market Puan · Hafta sonuna özel kırtasiye indirimi · Dün | Gerçek | kampanya@marketpuan.com | Kampanyayı gör | marketpuan.com/kirtasiye |

Sahte mailin işaretleri: **Gönderen** (adres okulun değil, cinarortaokulu-kulup.xyz) · **Metin** (kulübe kaydolmak için okul hesabının şifresi gerekmez) · **Bağlantı** (yazısı okulun adresi gibi, sahibi kayit-formu.xyz). Metinlerin tamamı oda dosyasında.

Okul adresi `k12.tr` Türkçe odada kalır (Murat 18 Kasım): Türk öğrenci okulundan bunu görür. İngilizce sürüm kendi okul adresini kullanır (ör. `cinarschool.org`); "Mesajı okumak"taki okul adresi sorusunun açıklaması ülkelere göre okul adreslerini anlatır (k12.tr, sch.uk, edu.au, ed.jp; üniversitelerde edu.tr).

## Yollar

- **Doğru yol:** gerçek kulüp mailindeki "Kayıt formu" okulun formunu açar (Çınar Ortaokulu · Kodlama Kulübü kayıt formu: Adın, Sınıfın; boş da gönderilebilir). Gönder: "Kaydın alındı, perşembe 15.30'da bilgisayar sınıfında görüşürüz!" Görev biter. Yazılanlar kaydedilmez, yalnızca "form gönderildi".
- **Tuzak:** sahte maildeki düğme sahte okul girişini açar (`cinarortaokulu.k12.tr.kayit-formu.xyz/giris`, "Okul hesabı girişi", Okul hesabının şifresi). Geri dönerse "açtı" yazılır. Şifre yazarsa yazılan kaydedilmez, yalnızca "bilgi girildi"; ardından Az kalsın.
- **Az kalsın:** "Bu sayfa okulun değildi. Şifreni yazdığın için gerçek hayatta okul hesabın başkasının eline geçebilirdi: ödevlerin, notların, mesajların." Düğmede yazan ile gerçek adres yan yana (sahibi kayit-formu.xyz). Bir dahaki sefere: basmadan önce üstüne gel ya da basılı tut · adresi sağdan oku · gerçek hayatta şifreni yazdıysan hemen değiştir, bir büyüğüne söyle. "Gelen kutusuna dön": oda sürer, görev yine yapılabilir.
- **Bitiş:** kaydolduysa Deniz arar: "Listede adını gördüm, süper! Perşembe 15.30'da bilgisayar sınıfında buluşuyoruz." Sahteyi bildirdiyse: "Sahte maili de bildirmişsin, Emre Hoca'ya söyleyeyim, herkesi uyarsın." Kaydolmadıysa arama yok.

## Görevler ve puan

1. Gelen kutunu aç, maillere göz at (eylem)
2. Kodlama Kulübü'ne kaydol (görev, 1 puan)
3. Gelen kutunu incele, şüpheli bulduklarını bildir
4. Bir bağlantının gerçekten nereye gittiğini nasıl anlarsın? (Üstüne gelir ya da basılı tutar, gerçek adresi okurum · 1)
5. `cinarortaokulu.k12.tr.kayit-formu.xyz` adresinin sahibi kim? (kayit-formu.xyz · 1)

Sahte 4 + gerçekler 3 + görev 1 + sorular 1 + 1 = **10**. Görevi puanlı yapınca toplam 11 oluyordu; ilk soru 2 puandan 1 puana indi (Murat onayladı, 18 Kasım).

## Rapor: "Bir dahaki sefere"

- Sahte sayfayı açtıysa: basmadan önce gerçek adrese bak, sayfaya hiç gitmene gerek kalmasın.
- Şifre yazdıysa: gerçek hayatta şifreni hemen değiştir ve bir büyüğüne haber ver.
- Sahteyi bildirmediyse: adresi okulun olmayan bir mail okul adına yazıyorsa bildir.
- Gerçeği bildirdiyse: adresi sağdan oku, sonu beklediğin yer ise mail gerçektir.
- Her zaman: Ad değil adres, yazı değil bağlantı.
