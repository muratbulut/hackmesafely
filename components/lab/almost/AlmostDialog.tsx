"use client";

import { ArrowLeft, Globe, Hand, MousePointerClick, UserRound, UsersRound } from "lucide-react";
import { Fragment, useEffect, useRef, type ReactNode } from "react";
import type { AlmostStory, LeaveStory } from "@/lib/lab/story";
import { domainOf } from "@/lib/lab/content";
import { format, getMessages, rich } from "@/lib/i18n";
import { RichLine } from "../scene/parts";

/**
 * "Az kalsın" ekranı (Şehir Kapısı, 18 Kasım): "Az kalsın" odasında (trap.almost) sahte sayfaya
 * bilgi girince hacklendin alarmı yerine bu pencere açılır. Suçlamaz: ne olabileceğini söyler,
 * düğmede yazanla gerçek adresi yan yana gösterir (sahibi kalın), "Bir dahaki sefere" maddelerini
 * verir. "Gelen kutusuna dön" ile oda sürer. Sarsıntı ve flaş yok; yalnızca yumuşak bir açılış.
 * Masaüstünde ortada, telefonda alttan açılır.
 */
export function AlmostDialog({ story, onBack }: { story: AlmostStory; onBack: () => void }) {
  const t = getMessages().lab.almost;
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => button.current?.focus(), []);
  const domain = domainOf(story.url);
  const at = domain.lastIndexOf(story.owner);
  const lead = at > 0 ? domain.slice(0, at) : "";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-canvas/90 [animation:fade-in_.2s_ease-out_both] lg:items-center lg:p-6" data-testid="almost-dialog">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lab-almost-title"
        className="flex max-h-[92dvh] w-full flex-col gap-4 overflow-y-auto rounded-t-3xl border border-warning/50 bg-surface p-6 pb-[max(24px,env(safe-area-inset-bottom))] shadow-card [animation:slide-up_.3s_cubic-bezier(.2,.8,.2,1)_both] lg:max-w-[540px] lg:rounded-3xl lg:p-8 lg:[animation:pop_.25s_ease-out_both]"
      >
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="relative flex size-11 flex-none items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-warning/25 opacity-0 motion-safe:[animation:almost-ring_1.1s_ease-out_.35s_both]" />
            <span className="relative flex size-11 items-center justify-center rounded-full bg-warning/15 text-warning-fg motion-safe:[animation:pop_.35s_cubic-bezier(.2,.8,.2,1.4)_.1s_both]">
              <Hand className="size-6 origin-[50%_85%] motion-safe:[animation:almost-wave_.9s_ease-in-out_.45s_both]" strokeWidth={2.2} />
            </span>
          </span>
          <span className="text-xs font-bold tracking-[0.8px] text-warning-fg">{t.kicker.toLocaleUpperCase("tr")}</span>
        </div>
        <h2 id="lab-almost-title" className="-mt-2 font-heading text-[28px] leading-tight font-bold lg:text-[32px]">
          {t.title}
        </h2>
        {story.realLife ? <p className="-mt-1 leading-relaxed text-fg-2">{story.realLife}</p> : null}

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-1 rounded-xl border border-line bg-surface-deep px-3.5 py-3">
            <span className="flex items-center gap-1.5 text-[11px] font-bold tracking-[0.6px] text-fg-3">
              <MousePointerClick className="size-3.5" strokeWidth={2.2} aria-hidden="true" />
              {t.shown.toLocaleUpperCase("tr")}
            </span>
            <span className="font-mono text-[13.5px] text-fg [overflow-wrap:anywhere]">
              <Breakable text={story.linkText} />
            </span>
          </div>
          <div className="flex min-w-0 flex-col gap-1 rounded-xl border border-warning/50 bg-warning/10 px-3.5 py-3">
            <span className="flex items-center gap-1.5 text-[11px] font-bold tracking-[0.6px] text-warning-fg">
              <Globe className="size-3.5" strokeWidth={2.2} aria-hidden="true" />
              {t.real.toLocaleUpperCase("tr")}
            </span>
            <span className="font-mono text-[13.5px] text-fg [overflow-wrap:anywhere]" data-testid="almost-url">
              <Breakable text={lead} />
              <b className="rounded-sm bg-gradient-to-r from-warning/30 to-warning/30 bg-no-repeat text-warning-fg [background-size:100%_100%] motion-safe:[animation:almost-mark_.6s_ease-out_.9s_both]">
                <Breakable text={story.owner} />
              </b>
            </span>
            <span className="text-xs text-fg-3">{rich(format(t.owner, { owner: story.owner }), { b: (chunk) => <b className="text-fg">{chunk}</b> })}</span>
          </div>
        </div>

        {story.steps.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            <h3 className="text-xs font-bold tracking-[0.8px] text-fg-3">{t.nextTime.toLocaleUpperCase("tr")}</h3>
            <ol className="flex flex-col gap-2.5">
              {story.steps.map((step, i) => (
                <li
                  key={step}
                  className="flex items-start gap-3 motion-safe:[animation:fade-up_.4s_ease-out_both]"
                  style={{ animationDelay: `${1.1 + i * 0.15}s` }}
                >
                  <span aria-hidden="true" className="flex size-7 flex-none items-center justify-center rounded-full bg-warning/15 text-[13px] font-bold text-warning-fg">
                    {i + 1}
                  </span>
                  <span className="pt-0.5 text-[15px] leading-snug text-fg">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}

        <button
          ref={button}
          type="button"
          onClick={onBack}
          className="mt-1 flex h-[52px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-warning text-[17px] font-bold text-on-warning transition-[filter] hover:brightness-110"
          data-testid="almost-back"
        >
          <ArrowLeft className="size-5" strokeWidth={2.4} aria-hidden="true" />
          {t.back}
        </button>
      </div>
    </div>
  );
}

/**
 * Giriş görevinde "Az kalsın" (Şehir Kapısı, okul bilgisayarı): zil çalınca çıkış yapmadan kalkınca
 * açılır. Aynı yumuşak açılış; düğmedeki adres yerine "Sen" (ne yaptı) ve "Sıradaki" (sıradakinin
 * ne yaptığı) kutuları. "Bilgisayara dön" ile oda sürer: öğrenci dönüp çıkış yapabilir.
 */
export function LeaveAlmostDialog({ story, onBack }: { story: LeaveStory; onBack: () => void }) {
  const leave = getMessages().lab.login.leave;
  return (
    <AlmostShell story={story} back={leave.back} onBack={onBack}>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-1 rounded-xl border border-line bg-surface-deep px-3.5 py-3" data-testid="almost-you">
          <span className="flex items-center gap-1.5 text-[11px] font-bold tracking-[0.6px] text-fg-3">
            <UserRound className="size-3.5" strokeWidth={2.2} aria-hidden="true" />
            {leave.you.toLocaleUpperCase("tr")}
          </span>
          <span className="text-[14.5px] text-fg">{story.closed ? leave.closed : leave.nothing}</span>
        </div>
        <div className="flex min-w-0 flex-col gap-1 rounded-xl border border-warning/50 bg-warning/10 px-3.5 py-3" data-testid="almost-next">
          <span className="flex items-center gap-1.5 text-[11px] font-bold tracking-[0.6px] text-warning-fg">
            <UsersRound className="size-3.5" strokeWidth={2.2} aria-hidden="true" />
            {leave.next.toLocaleUpperCase("tr")}
          </span>
          <span className="text-[14.5px] text-fg [&_b]:text-warning-fg">
            <RichLine text={story.next} />
          </span>
        </div>
      </div>
    </AlmostShell>
  );
}

/** Giriş görevindeki "Az kalsın"ın çerçevesi: başlık, gerçek hayatta ne olurdu, kutular, "Bir dahaki sefere", dönüş düğmesi. */
function AlmostShell({ story, back, onBack, children }: { story: { realLife: string; steps: string[] }; back: string; onBack: () => void; children: ReactNode }) {
  const t = getMessages().lab.almost;
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => button.current?.focus(), []);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-canvas/90 [animation:fade-in_.2s_ease-out_both] lg:items-center lg:p-6" data-testid="almost-dialog">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lab-almost-title"
        className="flex max-h-[92dvh] w-full flex-col gap-4 overflow-y-auto rounded-t-3xl border border-warning/50 bg-surface p-6 pb-[max(24px,env(safe-area-inset-bottom))] shadow-card [animation:slide-up_.3s_cubic-bezier(.2,.8,.2,1)_both] lg:max-w-[540px] lg:rounded-3xl lg:p-8 lg:[animation:pop_.25s_ease-out_both]"
      >
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="relative flex size-11 flex-none items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-warning/25 opacity-0 motion-safe:[animation:almost-ring_1.1s_ease-out_.35s_both]" />
            <span className="relative flex size-11 items-center justify-center rounded-full bg-warning/15 text-warning-fg motion-safe:[animation:pop_.35s_cubic-bezier(.2,.8,.2,1.4)_.1s_both]">
              <Hand className="size-6 origin-[50%_85%] motion-safe:[animation:almost-wave_.9s_ease-in-out_.45s_both]" strokeWidth={2.2} />
            </span>
          </span>
          <span className="text-xs font-bold tracking-[0.8px] text-warning-fg">{t.kicker.toLocaleUpperCase("tr")}</span>
        </div>
        <h2 id="lab-almost-title" className="-mt-2 font-heading text-[28px] leading-tight font-bold lg:text-[32px]">
          {t.title}
        </h2>
        {story.realLife ? (
          <p className="-mt-1 leading-relaxed text-fg-2 [&_b]:text-fg">
            <RichLine text={story.realLife} />
          </p>
        ) : null}
        {children}
        {story.steps.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            <h3 className="text-xs font-bold tracking-[0.8px] text-fg-3">{t.nextTime.toLocaleUpperCase("tr")}</h3>
            <ol className="flex flex-col gap-2.5">
              {story.steps.map((step, i) => (
                <li key={step} className="flex items-start gap-3 motion-safe:[animation:fade-up_.4s_ease-out_both]" style={{ animationDelay: `${1.1 + i * 0.15}s` }}>
                  <span aria-hidden="true" className="flex size-7 flex-none items-center justify-center rounded-full bg-warning/15 text-[13px] font-bold text-warning-fg">
                    {i + 1}
                  </span>
                  <span className="pt-0.5 text-[15px] leading-snug text-fg">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
        <button
          ref={button}
          type="button"
          onClick={onBack}
          className="mt-1 flex h-[52px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-warning text-[17px] font-bold text-on-warning transition-[filter] hover:brightness-110"
          data-testid="almost-back"
        >
          <ArrowLeft className="size-5" strokeWidth={2.4} aria-hidden="true" />
          {back}
        </button>
      </div>
    </div>
  );
}

/** Adres noktalardan ve eğik çizgilerden sonra satır atlayabilsin (kelimenin ortasından bölünmesin). */
function Breakable({ text }: { text: string }) {
  const parts = text.split(/(?<=[./])/);
  return parts.map((part, i) => (
    <Fragment key={i}>
      {part}
      {i < parts.length - 1 ? <wbr /> : null}
    </Fragment>
  ));
}
