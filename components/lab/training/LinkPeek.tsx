"use client";

import { Hand, MousePointer2 } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { format, getMessages } from "@/lib/i18n";
import { prefersReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { Phone } from "@/components/device/Phone";
import { PostamLogo } from "../inbox/InboxScene";
import { MailComputer } from "./MailComputer";

type Link = { text: string; url: string };
type Mode = "mouse" | "touch";
/** Gösteri: imleç (ya da parmak) düğmeye gider, adres çıkar, sonra çekilir ve sıra öğrenciye gelir. */
type Phase = "rest" | "move" | "show" | "yours";

const HOLD_MS = 450;
const noSubscribe = () => () => undefined;
const coarsePointer = () => window.matchMedia?.("(pointer: coarse)").matches ?? false;

/**
 * Mini testin üstündeki mail düğmesi (Şehir Kapısı, Mesajı okumak): basmadan önce bağlantının gerçek
 * adresine bakmayı gösterir. Bilgisayarda imleç düğmenin üstüne gelir, adres ekranın alt köşesinde
 * çıkar; telefonda parmak basılı tutar, önizlemede adres yazar. Açılışta bir kez kendisi gösterir,
 * sonra öğrenci dener; öğrenci bir kez gördükten sonra adres açık kalır (soruyu okurken kaybolmasın).
 * Düğme gerçek bağlantı değildir: basınca hiçbir yere gitmez, yalnızca "basmadan bakman yeterli" der.
 * "Hareketi azalt" açıksa gösteri yok, sıra hemen öğrencide.
 */
export function LinkPeek({ link }: { link: Link }) {
  const m = getMessages().lab.training.quiz.link;
  // Dokunmatik ekranda parmakla, diğerlerinde imleçle gösterilir; öğrencinin kullandığı araç ağır basar.
  const coarse = useSyncExternalStore(noSubscribe, coarsePointer, () => false);
  const reduced = useSyncExternalStore(noSubscribe, prefersReducedMotion, () => false);
  const [used, setMode] = useState<Mode | null>(null);
  const mode: Mode = used ?? (coarse ? "touch" : "mouse");
  const [demoPhase, setPhase] = useState<Phase>("rest");
  const phase: Phase = reduced ? "yours" : demoPhase;
  const [seen, setSeen] = useState(false);
  const [pressed, setPressed] = useState(false);
  const hold = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (reduced) return;
    const timers = [
      setTimeout(() => setPhase("move"), 700),
      setTimeout(() => setPhase("show"), 1700),
      setTimeout(() => setPhase("yours"), 4600),
    ];
    return () => timers.forEach(clearTimeout);
  }, [reduced]);

  useEffect(() => () => {
    if (hold.current) clearTimeout(hold.current);
  }, []);

  const reveal = () => {
    setPhase("yours");
    setSeen(true);
  };
  const open = phase === "show" || seen;
  const demo = phase === "move" || phase === "show";

  const screen = (
    <>
      <div className="flex items-center border-b border-scene-line bg-scene-paper px-3 py-1.5">
        <PostamLogo className="text-xs" />
      </div>
      <div aria-hidden="true" className="flex flex-col gap-2 px-4 pt-3">
        <span className="h-2 w-3/4 rounded-full bg-scene-line" />
        <span className="h-2 w-1/2 rounded-full bg-scene-line" />
      </div>
      <div className="relative px-4 py-3.5">
        <button
          type="button"
          aria-describedby="link-peek-url"
          onPointerEnter={(e) => {
            if (e.pointerType === "mouse") {
              setMode("mouse");
              reveal();
            }
          }}
          onPointerDown={(e) => {
            if (e.pointerType === "mouse") return;
            setMode("touch");
            setPressed(true);
            if (hold.current) clearTimeout(hold.current);
            hold.current = setTimeout(reveal, HOLD_MS);
          }}
          onPointerUp={() => {
            setPressed(false);
            if (hold.current) clearTimeout(hold.current);
          }}
          onPointerCancel={() => {
            setPressed(false);
            if (hold.current) clearTimeout(hold.current);
          }}
          onContextMenu={(e) => e.preventDefault()}
          onFocus={reveal}
          onClick={reveal}
          className={cn(
            "inline-flex h-10 max-w-full cursor-pointer touch-none items-center rounded-lg bg-scene-blue px-[18px] text-[15px] font-bold text-scene-white transition-transform duration-150 select-none [-webkit-touch-callout:none]",
            (pressed || (demo && mode === "touch" && phase === "show")) && "scale-[0.97]",
          )}
        >
          <span className="truncate">{link.text}</span>
        </button>

        {/* Telefondaki önizleme: düğmenin üstünde açılır. */}
        {mode === "touch" && open ? (
          <div className="absolute right-3 bottom-[calc(100%-6px)] left-3 rounded-xl border border-scene-line-strong bg-scene-paper px-3 py-2 shadow-floating [animation:pop_.25s_ease-out_both]">
            <span className="block text-[11px] font-bold tracking-[0.6px] text-scene-ink-muted">{m.preview}</span>
            <span className="block text-sm font-bold break-all text-scene-ink">{link.url}</span>
          </div>
        ) : null}

        {/* Gösterideki imleç ya da parmak. */}
        {phase !== "yours" ? (
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute top-1/2 left-[60px] text-fg transition-[translate,opacity] duration-[900ms] ease-out motion-reduce:hidden",
              phase === "rest" ? "translate-x-24 translate-y-16 opacity-0" : "translate-x-0 translate-y-0 opacity-100",
            )}
          >
            {mode === "touch" ? (
              <Hand className="size-8 fill-scene-white text-scene-ink" strokeWidth={1.8} />
            ) : (
              <MousePointer2 className="size-6 fill-scene-white text-scene-ink" strokeWidth={2} />
            )}
          </span>
        ) : null}
      </div>
      {/* Bilgisayardaki durum çubuğu: ekranın sol alt köşesinde, imleç düğmenin üstündeyken. */}
      <div
        id="link-peek-url"
        className={cn(
          "absolute bottom-2.5 left-2.5 max-w-[calc(100%-20px)] rounded-lg border border-scene-line-strong bg-scene-paper px-2.5 py-1.5 text-[13px] font-bold break-all text-scene-ink transition-[opacity,translate] duration-300",
          mode === "mouse" && open ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0",
        )}
      >
        {link.url}
      </div>
    </>
  );

  return (
    <div className="flex flex-col gap-2">
      <div data-testid="link-peek" className="flex justify-center">
        {/* Dokunmatik cihazda sitenin telefonu, diğerlerinde bilgisayarı (19 Kasım, Murat). */}
        {coarse ? (
          <Phone height="min(460px, 118vw)" screenClassName="bg-scene-white font-sans text-scene-ink">
            <div className="relative flex min-h-0 flex-1 flex-col">{screen}</div>
          </Phone>
        ) : (
          <MailComputer>
            <div className="relative flex min-h-[200px] flex-1 flex-col pb-12">{screen}</div>
          </MailComputer>
        )}
      </div>
      <p aria-live="polite" className="text-sm text-fg-3">
        {phase === "yours" && !seen ? (mode === "touch" ? m.tryTouch : m.tryMouse) : seen || phase === "show" ? format(m.shown, { where: mode === "touch" ? m.whereTouch : m.whereMouse }) : m.watch}
      </p>
    </div>
  );
}
