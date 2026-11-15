-- Profil çerçeveleri (16 Kasım, hoca öncesi kontrol 29): kart arka planı ve seviye atlama kutlaması.
-- levelSeen önce varsayılansız eklenir: var olan hesaplar boş kalır, ilk bakışta o anki seviyeleri
-- sessizce yazılır (eski seviyeler için kutlama çıkmaz). Yeni hesaplar 1. seviyeden başlar.
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "cardBackground" TEXT,
ADD COLUMN     "levelSeen" SMALLINT;
ALTER TABLE "User" ALTER COLUMN "levelSeen" SET DEFAULT 1;
