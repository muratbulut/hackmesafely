"use client";

import { format, getMessages } from "@/lib/i18n";
import type { Signal, SetupStep } from "@/lib/school/bulletin-model";
import { cn } from "@/lib/utils";

/** İşaretin renkleri: İyi gidiyor yeşil, Yolda camgöbeği, Yeni katıldı mor, Takıldı sarı. */
export const signalTone: Record<Signal, { chip: string; fill: string; border: string }> = {
  good: { chip: "bg-success/12 text-success-fg", fill: "bg-success", border: "border-success" },
  onTrack: { chip: "bg-accent/12 text-accent-fg", fill: "bg-accent", border: "border-accent" },
  new: { chip: "bg-purple/12 text-purple-fg", fill: "bg-purple", border: "border-purple" },
  stuck: { chip: "bg-warning/12 text-warning-fg", fill: "bg-warning", border: "border-warning" },
};

export function SignalChip({ signal }: { signal: Signal }) {
  const tone = signalTone[signal];
  return (
    <span className={cn("inline-flex h-6 flex-none items-center gap-1.5 rounded-full px-[9px] text-xs font-bold whitespace-nowrap", tone.chip)}>
      <span aria-hidden="true" className={cn("size-1.5 rounded-full", tone.fill)} />
      {getMessages().school.teachers.signals[signal]}
    </span>
  );
}

/** 5 parçalı kurulum çubuğu. */
export function SetupBar({ step, signal, className }: { step: SetupStep; signal: Signal; className?: string }) {
  const t = getMessages().school.teachers;
  return (
    <span role="img" aria-label={format(t.setupLabel, { step })} className={cn("flex min-w-[60px] flex-1 gap-1", className)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={cn("h-1.5 flex-1 rounded-full", n <= step ? signalTone[signal].fill : "bg-line")} />
      ))}
    </span>
  );
}

export function TeacherAvatar({ emoji, size = "md" }: { emoji: string; size?: "md" | "lg" }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex flex-none items-center justify-center rounded-full border border-line bg-card",
        size === "lg" ? "size-14 text-[28px]" : "size-10 text-xl",
      )}
    >
      {emoji}
    </span>
  );
}
