"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Mascot } from "@/components/mascot/Mascot";
import { format, getMessages } from "@/lib/i18n";
import { paths } from "@/lib/navigation";
import { acknowledgeLevelUp } from "@/lib/progress/level-up-actions";
import type { LevelUp } from "@/lib/progress/level-up";
import { levelUpUnlocks } from "@/lib/progress/frames";
import { AvatarFrame } from "./AvatarFrame";

type Vars = CSSProperties & Record<`--${string}`, string>;

// Konfeti: 30 parça, çevreye eşit dağılır (açı, uzaklık px, boyut px, renk). Sabit sayılar: sunucu
// ve tarayıcı aynı çizer.
const confettiColors = ["var(--accent)", "var(--frame-gold)", "var(--purple)", "var(--pink)", "var(--success)"];
const confetti = Array.from({ length: 30 }, (_, i) => {
  const angle = (i / 30) * Math.PI * 2;
  const distance = 125 + ((i * 37) % 80);
  return {
    x: `${Math.round(Math.cos(angle) * distance)}px`,
    y: `${Math.round(Math.sin(angle) * distance)}px`,
    s: `${[6, 8, 10, 12][i % 4]}px`,
    c: confettiColors[i % confettiColors.length],
  };
});
// Yıldız parıltıları: sahnede konum (%) ve gecikme (sn).
const twinkles = [
  [6, 10, 1.5],
  [82, 18, 1.65],
  [12, 74, 1.8],
  [86, 70, 1.95],
  [47, -4, 1.7],
  [48, 96, 2.05],
] as const;

/**
 * Seviye atlama kutlaması (29, 16 Kasım; tuval "29+ Avatar çerçeveleri", Profil kartı panosu).
 * Tam ekran pencere: maskot zıplar, SEVİYE N gelir, eski çerçeve kırılıp yenisi konfetiyle gelir,
 * açılan çerçeve ve kart arka planı yazılır. Açılınca sunucuya "görüldü" der (önizlemede demez).
 * "Hareketi azalt" açıksa hareket yok: yeni çerçeve ve yazılar doğrudan görünür (frame.css).
 */
export function LevelUpCelebration({
  levelUp,
  emoji,
  preview = false,
  onClose,
}: {
  levelUp: LevelUp;
  emoji: string;
  /** /onizleme: kayıt yok. */
  preview?: boolean;
  onClose?: () => void;
}) {
  const t = getMessages().progress;
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(true);
  const { frame, backgrounds } = levelUpUnlocks(levelUp.from, levelUp.to);
  const title = t.levels[levelUp.to - 1] ?? "";

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    if (!preview) acknowledgeLevelUp().catch(() => {});
  }, [preview]);

  function close() {
    ref.current?.close();
    setOpen(false);
    onClose?.();
  }

  if (!open) return null;

  const frameLine = frame
    ? format(frame.kind === "new" ? t.levelUp.frameNew : t.levelUp.frameStronger, { name: t.frames[frame.tier] })
    : format(t.levelUp.newTitle, { title });
  const names = backgrounds.map((code) => t.cardBackgrounds[code]);
  const backgroundLine =
    names.length === 0 ? null : names.length === 1 ? format(t.levelUp.background, { name: names[0] }) : format(t.levelUp.backgrounds, { names: names.join(", ") });

  return (
    <dialog
      ref={ref}
      aria-label={t.levelUp.label}
      data-testid="level-up"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      className="m-0 h-dvh max-h-none w-screen max-w-none overflow-y-auto bg-transparent p-0 text-fg backdrop:bg-transparent"
    >
      <div className="af-lu keep-dark flex min-h-full flex-col items-center justify-center gap-3 px-4 py-8 text-center sm:gap-4">
        <span className="af-lu-mascot">
          <Mascot mood="happy" className="h-auto w-[84px] sm:w-[104px]" />
        </span>
        <h2 className="af-lu-title m-0 font-heading text-[40px] leading-none font-bold tracking-[0.02em] sm:text-[54px]">{format(t.levelUp.title, { n: levelUp.to })}</h2>
        <p className="af-lu-fade m-0 text-base font-bold text-accent-fg sm:text-[17px]">{title}</p>
        <div className="af-lu-stage size-[220px] sm:size-[260px]">
          <span className="af-lu-rays" />
          <svg className="af-lu-charge" viewBox="0 0 260 260" aria-hidden="true" focusable="false">
            <circle cx="130" cy="130" r="88" />
          </svg>
          <span className="af-lu-flash" />
          <span className="af-lu-shock" />
          <span className="af-lu-shock af-gold" style={{ "--delay": "1.52s" } as Vars} />
          <span className="af-lu-old">
            <AvatarFrame level={levelUp.from} emoji={emoji} className="size-[128px] text-[70px] sm:size-[150px] sm:text-[82px]" />
          </span>
          <span className="af-lu-new">
            <AvatarFrame level={levelUp.to} emoji={emoji} className="size-[128px] text-[70px] sm:size-[150px] sm:text-[82px]" />
          </span>
          <span className="af-lu-burst">
            {confetti.map((p, i) => (
              <i key={i} style={{ "--x": p.x, "--y": p.y, "--s": p.s, "--c": p.c } as Vars} />
            ))}
          </span>
          {twinkles.map(([left, top, delay], i) => (
            <svg key={i} className="af-lu-twinkle" viewBox="-10 -10 20 20" style={{ left: `${left}%`, top: `${top}%`, "--delay": `${delay}s` } as Vars} aria-hidden="true" focusable="false">
              <path d="M0,-10 L2.4,-2.4 L10,0 L2.4,2.4 L0,10 L-2.4,2.4 L-10,0 L-2.4,-2.4 Z" />
            </svg>
          ))}
        </div>
        <p className="af-lu-fade m-0 text-lg font-bold text-fg sm:text-[19px]" style={{ "--delay": "2s" } as Vars}>
          {frameLine}
        </p>
        {backgroundLine ? (
          <p className="af-lu-fade m-0 text-sm text-fg-3 sm:text-[15px]" style={{ "--delay": "2.15s" } as Vars}>
            {backgroundLine}
          </p>
        ) : null}
        <div className="af-lu-fade mt-2 flex flex-wrap justify-center gap-2.5" style={{ "--delay": "2.35s" } as Vars}>
          <button
            type="button"
            autoFocus
            onClick={close}
            className="inline-flex h-11 cursor-pointer items-center rounded-xl bg-warning px-6 text-base font-bold text-on-warning transition-[filter] hover:brightness-110"
          >
            {t.levelUp.ok}
          </button>
          <Link
            href={paths.profileSection("avatar")}
            onClick={close}
            className="inline-flex h-11 items-center rounded-xl border border-line bg-surface px-5 text-base font-bold text-fg no-underline hover:border-line-strong"
          >
            {t.levelUp.profile}
          </Link>
        </div>
      </div>
    </dialog>
  );
}
