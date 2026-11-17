<p align="center">
  <img src="public/icon-512.png" alt="Hack Me Safely" width="96">
</p>

<h1 align="center">Hack Me Safely</h1>

<p align="center"><b>Tıklamadan önce bir dur.</b></p>

<p align="center">
  Ortaokul ve lise öğrencileri için, hacklenmeyi güvenli bir ortamda yaşatarak öğreten dijital güvenlik eğitim platformu.
</p>

<p align="center">
  <a href="https://hackmesafely.com">Site</a> ·
  <a href="docs/platform-document.md">Platform dokümanı</a> ·
  <a href="docs/guides/getting-started.md">Başlarken</a> ·
  <a href="#lisans">Lisans</a>
</p>

---

## Nedir?

Öğrenciler oltalama mailini, sahte çekilişi ya da dolandırıcı alıcıyı çoğu zaman ilk kez gerçek hayatta, bedel ödeyerek tanır. Hack Me Safely bu ilk karşılaşmayı güvenli bir ortama taşır:

1. **Öğren.** Kısa bir eğitim odasında kartlarla, "tıkla, bul" alıştırmalarıyla ve mini testle konuyu öğrenir.
2. **Karar ver.** Senaryo odasında gerçek uygulamalara benzeyen ama tamamen kurgusal ekranlarda (Postam mail kutusu, Mesajlar, ikinci el satış) bir görevi tamamlar.
3. **Hacklen ya da kurtul.** Yanlış kararda "hacklendin" ekranını görür: ne olduğunu, saldırganın neyi ele geçirdiğini ve hangi işareti kaçırdığını adım adım anlatır.
4. **Raporunu al.** Oda sonunda kararlarının, yakaladığı ve kaçırdığı işaretlerin raporunu alır; puan, seviye ve rozet kazanır.

Öğretmenler sınıf açıp ödev verir ve sınıfın ilerlemesini izler; yönetim ekibi odaları, gündemi ve günün ipucunu yönetir.

Murat Bulut'un bitirme projesidir.

## Siber şehir

Odalar beş mahalleli bir yol haritasında durur. Her mahallede önce temel eğitim açıktır; senaryo odalarını kendi eğitimleri açar.

| Mahalle | Konu |
| --- | --- |
| Hesap Kalesi | Hesap güvenliği: şifreler, doğrulama kodları, hesap ele geçirme |
| Oltalama Limanı | Oltalama ve sahte içerik: sahte mailler, bağlantılar, giriş sayfaları |
| Yazılım Ormanı | Zararlı yazılım: uygulamalar, izinler, dosyalar |
| Para Çarşısı | Kişisel veri ve para: alışveriş, çekilişler, ikinci el satış |
| Dostluk Parkı | Güvenli iletişim: siber zorbalık, yabancılar, mahremiyet |

Plan 5 mahallede 19 eğitim ve 43 senaryo, toplam 62 oda. Bütün odaların planı (hikâye, tuzak, doğru karar): [docs/labs/room-plan.md](docs/labs/room-plan.md).

## Özellikler

**Öğrenci**
- Yol haritası, odalar kataloğu ve oda kapakları
- Eğitim odaları: bilgi kartları, "tıkla, bul", mini test
- Senaryo odaları: Postam (kurgusal mail), Mesajlar, satış ve tarayıcı sahneleri; telefon görünümünde de çalışır
- "Hacklendin" alarmı ve açıklaması, oda raporu
- Seviyeler, rozetler, seviyeye göre avatar çerçevesi ve profil kartı arka planı
- Günün ipucu ve gündem (güncel siber güvenlik haberleri)

**Öğretmen ve okul**
- Profilden öğretmenlik talebi (belgeyle), yönetimin onayı
- Sınıflar, katılma bağlantısı, ödev verme, sınıf ilerlemesi (yalnızca bitirdi / bitirmedi)
- Okulum: okulun toplu tablosu ve yazdırılabilir okul bülteni

**Yönetim paneli**
- Özet ve Canlı nabız (yalnızca toplam sayılar)
- Öğretmen talepleri, kullanıcılar, yönetim ekibi ve izinler, okullar
- Oda düzenleme formu ve "öğrenci gibi dene" önizlemesi
- Günün ipucu ve gündem yönetimi
- Silinemez kayıt defteri

**Herkes için**
- Koyu ve gri tema, 390 px telefonda kendi düzeni
- "Hareketi azalt" desteği (cihazdan ya da profilden)
- Gözünü fareyle gezdiren canlı logo ve maskot

## Güvenlik ve gizlilik ilkeleri

Platformun kendisi de öğrettiğini uygular:

- **Cevaplar tarayıcıya gitmez.** Doğru kararlar ve puanlama yalnızca sunucuda durur; puan ve geri bildirim sunucuda hesaplanır.
- **Sahneler kurgudur.** Oda sahneleri gerçek ağ isteği yapmaz, gerçek site açmaz, dosya indirmez; gerçek marka, logo ve alan adı kullanılmaz.
- **Sahte formlara yazılan kaydedilmez.** Yalnızca "bilgi girildi" olayı kaydedilir.
- **Toplu ekranlarda ad yok.** Özet, Canlı nabız, Okulum ve herkese açık sayfalar yalnızca toplam sayı gösterir; öğretmen öğrencisinin yalnızca bitirip bitirmediğini görür.
- **İz bırakan erişim.** Yönetimin öğrenci profiline bakması silinemez kayıt defterine yazılır.
- **Sıkı CSP ve güvenlik başlıkları**, istek sınırları, hatalı girişte hangi alanın yanlış olduğunu söylemeyen mesajlar.

Faz faz yapılan güvenlik turları: [docs/security/](docs/security/).

## Teknoloji

| Katman | Araçlar |
| --- | --- |
| Uygulama | Next.js 16 (App Router), React 19, TypeScript |
| Arayüz | Tailwind CSS, shadcn/ui, lucide ikonları |
| Veri | PostgreSQL 16, Prisma, Zod |
| Hesap ve mail | Better Auth, Resend |
| Test | Vitest, Playwright, k6 (yük testi) |
| Yayın | Docker Compose, Caddy, nginx, Cloudflare, GitHub Actions |

## Çalıştırma

Gerekenler: Node.js, Docker.

```bash
cp .env.example .env            # değerleri düzenle
docker compose up -d db         # yalnızca veritabanı
npm install                     # bağımlılıklar + prisma generate
npm run db:migrate              # şemayı uygula
npm run db:seed                 # 5 mahalle ve odalar
npm run dev                     # http://localhost:3000
```

Testler:

```bash
npm run lint
npm run typecheck
npm test                        # birim testleri
npm run build && npm run test:e2e   # uçtan uca testler
```

Bütün komutlar, kod düzeni ve kurallar: [CLAUDE.md](CLAUDE.md).

## Depo düzeni

```
app/          sayfalar (ziyaretçi, hesap, oda oynatıcısı, yönetim)
components/   arayüz bileşenleri (lab/ oda sahneleri, mascot/ maskot ve canlı logo)
lib/          sunucu mantığı (lab/ oda motoru ve puanlama, i18n/ dil sözlüğü)
labs/rooms/   odaların kendisi: mahalle başına JSON dosyaları
prisma/       veri modeli, migration'lar, başlangıç verisi
tests/        birim, uçtan uca ve yük testleri
docker/       sunucu kurulumu ve yayın betikleri
docs/         platform dokümanı, oda senaryoları, tasarım ve güvenlik notları
```

Odalar kod değil içeriktir: yeni oda `labs/rooms/` altına yeni bir dosyadır. Nasıl yazılacağı: [yeni oda kılavuzu](docs/guides/new-lab.md).

## Belgeler

- [Platform dokümanı](docs/platform-document.md): amaç, roller, ekranlar, oda yapısı, mimari, veri modeli, güvenlik, faz planı
- [Başlarken](docs/guides/getting-started.md) ve [yeni oda kılavuzu](docs/guides/new-lab.md)
- [Oda planı](docs/labs/room-plan.md) ve [oda senaryoları](docs/labs/rooms/)
- [Tasarım notları](docs/design/) ve [güvenlik turları](docs/security/)
- [Sözlük](docs/glossary.md): Türkçe terimlerin koddaki İngilizce adları

## Lisans

- Kod: [GNU AGPL-3.0](LICENSE)
- İçerik (odalar, senaryolar, sesler, videolar, belgeler): [CC BY-NC-SA 4.0](LICENSE-CONTENT)
- "Hack Me Safely" adı, logosu ve maskotu bu lisansların dışındadır.
- Sesler ElevenLabs ile üretildi. Diğer bildirimler: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
