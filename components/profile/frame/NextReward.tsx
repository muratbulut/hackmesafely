import { format, getMessages } from "@/lib/i18n";
import { nextRewards } from "@/lib/progress/frames";
import { cn } from "@/lib/utils";
import { AvatarFrame } from "./AvatarFrame";

/**
 * Profil kartındaki "Sıradaki ödül" (29, 16 Kasım): bir sonraki çerçeve adımı küçük önizlemesiyle,
 * altında bir sonraki kart arka planı. En üst seviyede çizilmez.
 */
export function NextReward({ level, emoji, className }: { level: number; emoji: string; className?: string }) {
  const t = getMessages().progress;
  const { frame, background } = nextRewards(level);
  if (!frame && !background) return null;
  const frameText = frame
    ? format(frame.kind === "new" ? t.nextReward.frameNew : t.nextReward.frameStronger, { n: frame.level, name: t.frames[frame.tier] })
    : t.nextReward.allFrames;
  return (
    <div
      data-testid="next-reward"
      className={cn("flex items-center gap-3 rounded-2xl border border-line bg-canvas/70 px-3.5 py-2.5 backdrop-blur-[2px] lg:gap-3.5 lg:px-4 lg:py-3", className)}
    >
      <span className="flex size-12 flex-none items-center justify-center lg:size-14">
        {frame ? <AvatarFrame level={frame.level} emoji={emoji} className="size-8 text-[17px] lg:size-9 lg:text-[19px]" /> : null}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="font-heading text-[11px] font-bold tracking-[0.12em] text-warning-fg">{t.nextReward.kicker}</span>
        <span className="text-sm font-bold text-fg lg:text-[15px]">{frameText}</span>
        {background ? (
          <span className="text-xs text-fg-3 lg:text-[13px]">
            {format(t.nextReward.background, { n: background.level, name: t.cardBackgrounds[background.code] })}
          </span>
        ) : null}
      </span>
    </div>
  );
}
