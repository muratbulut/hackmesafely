"use client";

import Link from "next/link";
import { FileText, Filter, LockKeyhole, Mail, TriangleAlert, Users, Wrench } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Mascot, mascotMoods } from "@/components/mascot/Mascot";
import { format, getMessages } from "@/lib/i18n";
import { routes } from "@/lib/navigation";
import { ConnectionAlert } from "./ConnectionBanner";
import { EmptyState } from "./EmptyState";
import { RetryButton } from "./RetryButton";
import { Loading } from "./Loading";
import { StatusCard } from "./StatusCard";
import type { BadgeCode } from "@/lib/progress/badges";
import { BadgeToast } from "./BadgeToast";
import { AvatarFrame } from "@/components/profile/frame/AvatarFrame";
import { CardBackdrop } from "@/components/profile/frame/CardBackdrop";
import { LevelUpCelebration } from "@/components/profile/frame/LevelUpCelebration";
import { cardBackgrounds } from "@/lib/progress/frames";
import { Toast } from "./Toast";

const wait = (ms: number) => new Promise<boolean>((resolve) => setTimeout(() => resolve(true), ms));

function Section({ title, description, children, wide }: { title: string; description: string; children: ReactNode; wide?: boolean }) {
  return (
    <section className={wide ? "flex flex-col gap-3 lg:col-span-2" : "flex flex-col gap-3"}>
      <span className="flex flex-col gap-0.5">
        <h2 className="m-0 text-[15px] font-bold">{title}</h2>
        <span className="text-xs text-fg-4">{description}</span>
      </span>
      {children}
    </section>
  );
}

const smallButton = "inline-flex h-[38px] items-center rounded-[10px] px-3.5 text-[13px] font-bold no-underline";

/**
 * Sayfanın gerçek hata ekranını açar: düğmeye basınca bileşen çizilirken hata fırlatır, kök hata
 * sınırı (app/error.tsx) devreye girer. "Tekrar dene" sınırı sıfırlar; bileşen baştan kurulur ve
 * hata kalkar. Önizleme sayfası yalnızca PREVIEW_PAGE=1 olan sunucuda açılır (proxy.ts).
 */
function ErrorTrigger({ label }: { label: string }) {
  const [broken, setBroken] = useState(false);
  if (broken) throw new Error("StatusPreview error screen check");
  return (
    <button type="button" onClick={() => setBroken(true)} className={`${smallButton} w-fit cursor-pointer border border-line bg-surface text-fg-2`}>
      {label}
    </button>
  );
}

/** Durum ekranlarının hepsi bir arada (Tur 5, Durumlar-Son). "Tekrar dene" düğmeleri çalışır. */
export function StatusPreview() {
  const t = getMessages();
  const p = t.preview;
  const [cleared, setCleared] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [badges, setBadges] = useState<BadgeCode[]>([]);
  const [celebrate, setCelebrate] = useState(false);
  return (
    <div className="grid items-start gap-x-[22px] gap-y-[26px] lg:grid-cols-2">
      <Section title={p.loading.title} description={p.loading.description}>
        <Loading text={p.loading.text} />
      </Section>
      <Section title={p.mascot.title} description={p.mascot.description}>
        <div className="grid grid-cols-4 gap-4 rounded-[20px] border border-card bg-surface-deep p-5 sm:grid-cols-6">
          {mascotMoods.map((mood) => (
            <Mascot key={mood} mood={mood} className="h-auto w-full" />
          ))}
        </div>
      </Section>
      <Section title={p.offline.title} description={p.offline.description}>
        <div className="rounded-[20px] border border-card bg-surface-deep p-5">
          <ConnectionAlert onRetry={() => wait(1200)} />
        </div>
      </Section>
      <Section wide title={p.empty.title} description={p.empty.description}>
        <div className="flex flex-col gap-3 rounded-[20px] border border-card bg-surface-deep p-5 md:flex-row">
          <EmptyState
            Icon={Filter}
            title={p.empty.filters.title}
            action={
              cleared ? (
                <span role="status" className="text-[13px] font-bold text-success-fg">
                  {p.empty.filters.done}
                </span>
              ) : (
                <button type="button" onClick={() => setCleared(true)} className={`${smallButton} cursor-pointer border border-accent bg-transparent text-accent-fg`}>
                  {p.empty.filters.action}
                </button>
              )
            }
          >
            {p.empty.filters.text}
          </EmptyState>
          <EmptyState
            Icon={Users}
            tone="purple"
            title={p.empty.classes.title}
            action={
              <Link href="#" className={`${smallButton} bg-accent text-on-accent`}>
                {p.empty.classes.action}
              </Link>
            }
          >
            {p.empty.classes.text}
          </EmptyState>
          <EmptyState
            Icon={FileText}
            tone="success"
            title={p.empty.report.title}
            action={
              <Link href="#" className={`${smallButton} bg-accent text-on-accent`}>
                {p.empty.report.action}
              </Link>
            }
          >
            {p.empty.report.text}
          </EmptyState>
        </div>
      </Section>
      <Section title={p.labError.title} description={p.labError.description}>
        <StatusCard
          Icon={Mail}
          tone="purple"
          title={p.labError.cardTitle}
          action={<RetryButton onRetry={() => wait(1200)} label={p.labError.action} />}
        >
          {p.labError.text}
        </StatusCard>
      </Section>
      <Section title={p.serverError.title} description={p.serverError.description}>
        <StatusCard
          Icon={TriangleAlert}
          tone="danger"
          title={t.errors.title}
          action={<RetryButton onRetry={() => wait(1200)} />}
        >
          {t.errors.text}
          <code className="mt-2 block w-fit rounded-md border border-line bg-canvas px-2 py-1 font-mono text-xs text-fg-3">
            {format(t.errors.code, { code: p.serverError.sampleCode })}
          </code>
        </StatusCard>
        <ErrorTrigger label={p.serverError.trigger} />
      </Section>
      <Section title={p.signedOut.title} description={p.signedOut.description}>
        <StatusCard
          Icon={LockKeyhole}
          tone="accent"
          title={p.signedOut.cardTitle}
          action={
            <Link href={routes.signIn} className={`${smallButton} h-10 bg-accent px-4 text-sm text-on-accent`}>
              {p.signedOut.action}
            </Link>
          }
        >
          {p.signedOut.text}
        </StatusCard>
      </Section>
      <Section title={p.maintenance.title} description={p.maintenance.description}>
        <StatusCard Icon={Wrench} tone="warning" title={p.maintenance.cardTitle}>
          {p.maintenance.text}
        </StatusCard>
      </Section>
      <Section title={p.toast.title} description={p.toast.description}>
        <div className="rounded-[20px] border border-card bg-surface-deep p-5">
          <button
            type="button"
            onClick={() => setToast(p.toast.message)}
            className={`${smallButton} cursor-pointer border border-accent bg-transparent text-accent-fg`}
          >
            {p.toast.action}
          </button>
        </div>
        <Toast message={toast} onClose={() => setToast(null)} />
      </Section>
      <Section title={p.badgeToast.title} description={p.badgeToast.description}>
        <div className="rounded-[20px] border border-card bg-surface-deep p-5">
          <button
            type="button"
            onClick={() => setBadges(["kart-kurdu"])}
            className={`${smallButton} cursor-pointer border border-accent bg-transparent text-accent-fg`}
          >
            {p.badgeToast.action}
          </button>
        </div>
        <BadgeToast codes={badges} onClose={() => setBadges([])} />
      </Section>
      <Section title={p.frames.title} description={p.frames.description} wide>
        <div className="flex flex-col gap-4 rounded-[20px] border border-card bg-surface-deep p-5">
          <ul className="m-0 grid list-none grid-cols-2 gap-x-3 gap-y-6 p-0 sm:grid-cols-5">
            {Array.from({ length: 10 }, (_, i) => (
              <li key={i} className="flex flex-col items-center gap-3 pt-4">
                <AvatarFrame level={i + 1} emoji="🦊" className="size-16 text-[34px]" />
                <span className="text-xs font-bold text-fg-3">{format(p.frames.level, { n: i + 1 })}</span>
              </li>
            ))}
          </ul>
          <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-5">
            {cardBackgrounds.map((bg) => (
              <li key={bg.code} className="keep-dark relative h-20 overflow-hidden rounded-xl border border-line bg-surface-raised">
                <CardBackdrop code={bg.code} />
                <span className="absolute bottom-2 left-2.5 text-xs font-bold text-fg">{t.progress.cardBackgrounds[bg.code]}</span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setCelebrate(true)}
            className={`${smallButton} w-fit cursor-pointer border border-accent bg-transparent text-accent-fg`}
          >
            {p.frames.action}
          </button>
        </div>
        {celebrate ? <LevelUpCelebration levelUp={{ from: 3, to: 4 }} emoji="🦊" preview onClose={() => setCelebrate(false)} /> : null}
      </Section>
    </div>
  );
}
