"use client";

import { Check, Moon, Sun, Waves } from "lucide-react";
import { useId } from "react";
import { saveReduceMotion, useSiteReduceMotion } from "@/components/theme/motion-client";
import { saveTheme, useTheme } from "@/components/theme/theme-client";
import { useReducedMotion } from "@/components/teachers/useReducedMotion";
import { getMessages } from "@/lib/i18n";
import type { Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { SectionCard } from "./SectionCard";

/**
 * Tema seçimi (koyu / gri) ve "Hareketi azalt" anahtarı. Önizlemeler kendi temalarıyla çizilir:
 * data-theme verilen kutuda renk değişkenleri o temanınkine döner.
 */
export function AppearanceSection({ onDone }: { onDone: (message: string) => void }) {
  const t = getMessages().profile.appearance;
  const theme = useTheme();
  const siteReduce = useSiteReduceMotion();
  const motionLabel = useId();
  // Cihazın ayarı açıksa anahtar kapalı olsa da hareket durur; bunu söyleriz.
  const deviceReduce = useReducedMotion() && !siteReduce;
  const options: { value: Theme; label: string; hint: string; Icon: typeof Moon }[] = [
    { value: "dark", label: t.dark, hint: t.darkHint, Icon: Moon },
    { value: "gray", label: t.gray, hint: t.grayHint, Icon: Sun },
  ];

  return (
    <SectionCard Icon={Moon} tone="violet" title={t.title} lead={t.lead}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {options.map(({ value, label, hint, Icon }) => {
          const on = theme === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={on}
              onClick={() => {
                if (on) return;
                saveTheme(value);
                onDone(t.changed);
              }}
              className={cn(
                "flex cursor-pointer flex-col gap-2.5 rounded-2xl border-2 p-3 text-left transition-colors",
                on ? "border-accent" : "border-line hover:border-line-strong",
              )}
            >
              <span data-theme={value} aria-hidden="true" className="flex h-20 gap-2.5 rounded-xl bg-canvas p-2.5">
                <span className="w-[30%] rounded-lg bg-card" />
                <span className="flex flex-1 flex-col gap-2 pt-1">
                  <span className="h-1.5 w-[70%] rounded-full bg-line" />
                  <span className="h-2 w-[45%] rounded-full bg-accent" />
                </span>
              </span>
              <span className="flex items-center gap-2 px-1">
                <Icon className="size-4 text-fg-2" strokeWidth={2} aria-hidden="true" />
                <b className="flex-1 text-[15px]">{label}</b>
                {on ? <Check className="size-4 text-accent-fg" strokeWidth={2.6} aria-hidden="true" /> : null}
              </span>
              <span className="px-1 text-[13px] text-fg-3">{hint}</span>
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-3 rounded-2xl border border-line px-4 py-3.5">
        <Waves className="size-5 flex-none text-fg-2" strokeWidth={2} aria-hidden="true" />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <b id={motionLabel} className="text-[15px]">
            {t.motion}
          </b>
          <span className="text-[13px] leading-normal text-fg-3">{deviceReduce ? t.motionDevice : t.motionHint}</span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={siteReduce}
          aria-labelledby={motionLabel}
          data-testid="motion-switch"
          onClick={() => {
            saveReduceMotion(!siteReduce);
            onDone(siteReduce ? t.motionOff : t.motionOn);
          }}
          className={cn(
            "relative h-10 w-[60px] flex-none cursor-pointer rounded-full border-2 transition-colors",
            siteReduce ? "border-accent bg-accent" : "border-line bg-surface-raised",
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              "absolute top-1/2 left-1 size-7 -translate-y-1/2 rounded-full shadow-card transition-transform",
              siteReduce ? "translate-x-5 bg-on-accent" : "bg-fg-3",
            )}
          />
        </button>
      </div>
    </SectionCard>
  );
}
