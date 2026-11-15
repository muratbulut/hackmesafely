// Seviye atlama kutlaması (29, 16 Kasım): öğrencinin seviyesi, kutlamayı en son gördüğü seviyeden
// (User.levelSeen) yüksekse kutlama bir kez gösterilir. Kutlama açılınca tarayıcı "görüldü" der
// (lib/progress/level-up-actions.ts); sayfa yenilenince tekrar çıkmaz.

import { db } from "@/lib/db";
import { topLevel } from "./levels";

export type LevelUp = { from: number; to: number };

/**
 * Gösterilecek kutlama ya da null. levelSeen boşsa (alan gelmeden önce açılmış hesap) o anki
 * seviye sessizce yazılır: eski seviyeler için kutlama çıkmaz.
 */
export async function getPendingLevelUp(userId: string, level: number): Promise<LevelUp | null> {
  const row = await db.user.findUnique({ where: { id: userId }, select: { levelSeen: true } });
  if (!row) return null;
  if (row.levelSeen === null) {
    await db.user.updateMany({ where: { id: userId, levelSeen: null }, data: { levelSeen: level } });
    return null;
  }
  const from = Math.max(1, Math.min(topLevel, row.levelSeen));
  return level > from ? { from, to: level } : null;
}
