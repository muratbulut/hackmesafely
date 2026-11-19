-- Şehir Kapısı'nın geçici turuncusu Para Çarşısı ile karışıyordu; yön levhası mavisi (19 Kasım, Murat).
-- Başlangıç verisi var olan mahalleye dokunmadığı için yayındaki satırı burada güncelliyoruz.
UPDATE "Neighborhood" SET "color" = 'blue' WHERE "slug" = 'sehir-kapisi' AND "color" = 'orange';
