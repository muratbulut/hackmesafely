import { MessageCircle } from "lucide-react";
import { Phone, PhoneLock } from "@/components/device/Phone";
import { format, getMessages } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { LabDetailData } from "./types";

/** Kurgusal uygulamanın küçük ikonu: Postam (turuncu zarf) ya da Mesajlar. */
export function AppIcon({ template, className }: { template: LabDetailData["template"]; className?: string }) {
  if (template === "MESSAGING") {
    return (
      <span aria-hidden="true" className={cn("flex size-[18px] flex-none items-center justify-center rounded-[5px] bg-scene-green", className)}>
        <MessageCircle className="size-[70%] text-scene-white" strokeWidth={2.6} />
      </span>
    );
  }
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("size-[18px] flex-none", className)}>
      <rect width="32" height="32" rx="9" className="fill-scene-orange" />
      <rect x="6.5" y="9.5" width="19" height="14" rx="3" fill="none" strokeWidth="2.4" className="stroke-scene-white" />
      <path d="M7.5 11l8.5 6.2 8.5-6.2" fill="none" strokeWidth="2.4" strokeLinejoin="round" className="stroke-scene-white" />
      <circle cx="24.5" cy="9" r="4.2" strokeWidth="1.6" className="fill-scene-yellow stroke-scene-orange" />
    </svg>
  );
}

/** "Postam ile" etiketi. */
export function AppPill({ template, className }: { template: LabDetailData["template"]; className?: string }) {
  const t = getMessages().lab.detail;
  return (
    <span
      className={cn(
        "inline-flex h-[34px] items-center gap-1.5 rounded-full bg-scene-white/95 px-3 text-sm font-bold text-scene-ink shadow-floating",
        className,
      )}
    >
      <AppIcon template={template} className="size-5" />
      {t.phoneWith[template]}
    </span>
  );
}

/**
 * Lab detayının sağındaki telefon (Lab-Detay): kilit ekranı ve labdaki ilk iki bildirim. Yalnızca
 * gönderen ve konu görünür; hangisinin sahte olduğu bilgisi buraya hiç gelmez.
 */
export function PhoneMockup({ data, pill = true, className }: { data: LabDetailData; pill?: boolean; className?: string }) {
  const t = getMessages().lab.detail;
  const [first, second] = data.phone.notifications;
  return (
    <div className={cn("relative", className)}>
      <div role="img" aria-label={format(t.phoneLabel, { app: t.phoneApp[data.template] })} className="-rotate-2 anim-buzz">
        {/* Sitenin tek telefonu (components/device), masadaki telefonun kilit ekranıyla. */}
        <Phone height="430px" status="dark">
          <PhoneLock time={data.phone.time} date={data.phone.date}>
            <div className="relative z-[1] mt-3 flex w-full flex-col gap-2">
              {first ? (
                <div className="flex gap-2 rounded-2xl border border-stage-os-line bg-stage-os-glass p-2.5 anim-notification">
                  <AppIcon template={data.template} className="size-7" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-[11px] text-stage-os-fg-2">
                      <b className="text-stage-os-fg">{t.phoneApp[data.template]}</b>
                      <span className="ml-auto">{t.now}</span>
                    </div>
                    <div className="mt-0.5 truncate text-[12.5px] font-bold">{first.sender}</div>
                    <div className="line-clamp-2 text-[11.5px] leading-[1.35] text-stage-os-fg-2">{first.text}</div>
                  </div>
                </div>
              ) : null}
              {second ? (
                <div className="flex items-center gap-2 rounded-[14px] border border-stage-os-line bg-stage-os-glass/70 px-2.5 py-2 text-[11px] text-stage-os-fg-2">
                  <AppIcon template={data.template} className="size-5" />
                  <span className="min-w-0 flex-1 truncate">{format(t.notificationLine, { sender: second.sender, text: second.text })}</span>
                  {second.time ? <span>{second.time}</span> : null}
                </div>
              ) : null}
            </div>
          </PhoneLock>
        </Phone>
      </div>
      {pill ? <AppPill template={data.template} className="absolute top-[26px] -right-[34px] rotate-3" /> : null}
    </div>
  );
}
