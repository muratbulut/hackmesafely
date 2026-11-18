# Test odaları

Birim testlerinin, `tests/e2e/room-files.spec.ts`'in ve uçtan uca testlerin geçici odalarının (`tests/e2e/support/admin.ts`) kullandığı sabit oda içerikleri. Testler motoru (şema, puanlama, rapor, görevler) sınadığı için içerik burada sabit kalır: gerçek oda değişince bu dosyalar değişmez, testler düşmez.

- `sahte-kargo-maili.json`: 18 Kasım'da gerçek oda oldu (`labs/rooms/oltalama-limani/`, Murat); bu kopya o günkü hâlidir.
- `oltalama-egitimi.json`, `kodu-soran-arkadas.json`: örnek odaların (`labs/examples/`) kopyası.

Sitede görünmezler; başlangıç verisi bu klasörü okumaz. Odayı oynayan uçtan uca testler ise gerçek oda dosyasını okur; oda değişince o testler aynı PR'da güncellenir.
