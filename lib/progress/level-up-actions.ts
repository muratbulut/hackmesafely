"use server";

// Seviye atlama kutlaması görüldü (lib/progress/level-up.ts). Seviye tarayıcıdan alınmaz; sunucuda
// yeniden hesaplanır. Yalnızca yukarı yazılır.

import { getUser } from "@/lib/session";
import { db } from "@/lib/db";
import { getProgressSummary } from "./summary";

export async function acknowledgeLevelUp(): Promise<void> {
  const user = await getUser();
  if (!user) return;
  const { level } = await getProgressSummary(user.id);
  await db.user.updateMany({
    where: { id: user.id, OR: [{ levelSeen: null }, { levelSeen: { lt: level.level } }] },
    data: { levelSeen: level.level },
  });
}
