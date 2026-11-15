"use client";

import { Lock, User } from "lucide-react";
import { useOptimistic, useTransition } from "react";
import { setAvatar, setCardBackground } from "@/lib/account/profile-actions";
import { avatars, type AvatarCode } from "@/lib/avatars";
import { format, getMessages } from "@/lib/i18n";
import { cardBackgrounds, frameTierOf, type CardBackgroundCode } from "@/lib/progress/frames";
import { cn } from "@/lib/utils";
import { AvatarFrame } from "./frame/AvatarFrame";
import "./frame/frame.css";
import { SectionCard } from "./SectionCard";

/**
 * Avatar seçimi: 12 hazır avatar, dokununca hemen kaydedilir. Çerçeve seviyeden gelir (seçilmez);
 * altında profil kartının arka planı: seviyeyle açılır, açılanlardan biri takılır (29, 16 Kasım).
 */
export function AvatarSection({
  current,
  level,
  background,
  onDone,
}: {
  current: AvatarCode;
  level: number;
  background: CardBackgroundCode;
  onDone: (message: string) => void;
}) {
  const t = getMessages().profile.avatar;
  const p = getMessages().progress;
  const [shown, setShown] = useOptimistic(current);
  const [shownBackground, setShownBackground] = useOptimistic(background);
  const [, startTransition] = useTransition();
  const active = avatars.find((a) => a.code === shown) ?? avatars[0];

  function choose(code: AvatarCode) {
    if (code === shown) return;
    startTransition(async () => {
      setShown(code);
      const result = await setAvatar(code);
      if (result.message) onDone(result.message);
    });
  }

  function chooseBackground(code: CardBackgroundCode) {
    if (code === shownBackground) return;
    startTransition(async () => {
      setShownBackground(code);
      const result = await setCardBackground(code);
      if (result.message) onDone(result.message);
    });
  }

  return (
    <SectionCard Icon={User} title={t.title} lead={t.lead}>
      <div className="flex items-center gap-5 pl-2">
        <AvatarFrame key={active.code} level={level} emoji={active.emoji} className="size-16 text-[34px] anim-pop" />
        <div className="flex flex-col gap-0.5">
          <b className="text-base">{format(t.current, { name: t.names[active.code] })}</b>
          <span className="text-[13px] text-fg-3">{t.currentHint}</span>
          <span className="text-[13px] text-fg-3">{format(t.frame, { name: p.frames[frameTierOf(level)] })}</span>
          <span className="text-[13px] text-fg-3">{t.frameHint}</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">
        {avatars.map((avatar) => {
          const on = avatar.code === shown;
          return (
            <button
              key={avatar.code}
              type="button"
              aria-pressed={on}
              onClick={() => choose(avatar.code)}
              className={cn(
                "flex cursor-pointer flex-col items-center gap-1 rounded-[14px] border-2 py-3 transition-[border-color,background-color,transform] duration-200",
                on ? "border-accent bg-accent/14 motion-safe:scale-[1.04]" : "border-line bg-surface-deep hover:border-line-strong",
              )}
            >
              <span aria-hidden="true" className="text-[34px] leading-none">
                {avatar.emoji}
              </span>
              <span className={cn("text-[13px] font-bold", on ? "text-fg" : "text-fg-3")}>{t.names[avatar.code]}</span>
            </button>
          );
        })}
      </div>

      <div role="group" aria-labelledby="card-background-title" className="flex flex-col gap-2.5 border-t border-card pt-4">
        <div className="flex flex-col gap-0.5">
          <b id="card-background-title" className="text-base">
            {t.backgroundTitle}
          </b>
          <span className="text-[13px] text-fg-3">{t.backgroundLead}</span>
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {cardBackgrounds.map((bg) => {
            const open = bg.level <= level;
            const on = bg.code === shownBackground;
            return (
              <button
                key={bg.code}
                type="button"
                aria-pressed={on}
                disabled={!open}
                onClick={() => chooseBackground(bg.code)}
                className={cn(
                  "flex min-h-14 items-center gap-3 rounded-[14px] border-2 p-2 pr-3 text-left transition-[border-color,background-color] duration-200",
                  on ? "border-accent bg-accent/14" : "border-line bg-surface-deep",
                  open ? "cursor-pointer hover:border-line-strong" : "cursor-default opacity-60",
                )}
              >
                <span aria-hidden="true" className={cn("af-swatch h-10 w-16 flex-none rounded-lg border border-line", `af-swatch-${bg.code}`)} />
                <span className="flex min-w-0 flex-col">
                  <b className="text-sm">{p.cardBackgrounds[bg.code]}</b>
                  <span className="inline-flex items-center gap-1 text-xs text-fg-3">
                    {open ? null : <Lock className="size-3" strokeWidth={2.4} aria-hidden="true" />}
                    {on ? t.backgroundOn : open ? t.backgroundOpen : format(t.backgroundLocked, { n: bg.level })}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </SectionCard>
  );
}
