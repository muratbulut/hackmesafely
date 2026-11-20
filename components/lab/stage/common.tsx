"use client";

import { Globe, Mail, MessageCircle, Settings, ShoppingBag, Truck, type LucideIcon } from "lucide-react";
import { createContext, useContext, useEffect, useState } from "react";
import { patterns } from "@/components/background/patterns";
import { defaultLocale, getMessages } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Sahnedeki gerçek saat (görev çubuğu, kilit ekranı, telefon). Sunucuda ve ilk çizimde boştur;
 * tarayıcıda açılınca dolar, dakikada bir yenilenir (sayfa ile tarayıcının saati çakışmasın).
 */
export function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- saat yalnızca tarayıcıda
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 15_000);
    return () => window.clearInterval(timer);
  }, []);
  const locale = defaultLocale;
  return {
    time: now ? now.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }) : "",
    dateLong: now
      ? now.toLocaleDateString(locale, {
          weekday: "long",
          day: "numeric",
          month: "long",
        })
      : "",
    dateShort: now
      ? now.toLocaleDateString(locale, {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : "",
  };
}

/** Kurgusal bilgisayarın duvarı: gri, üstünde sitedeki sarı ağ yarı saydam (%50). Süstür. */
export function StageWall({ pattern = "hero", className }: { pattern?: "hero" | "mobile"; className?: string }) {
  const { width, height, threads } = patterns[pattern];
  return (
    <div aria-hidden="true" className={cn("st-wall pointer-events-none absolute inset-0", className)}>
      <svg className="st-net absolute inset-0 size-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid slice" focusable="false">
        {threads.map((thread, i) => (
          <g key={i}>
            <path className="st-net-halo" d={thread.d} />
            <path d={thread.d} />
            {thread.dots.map((dot) => (
              <circle key={`${dot.x}-${dot.y}`} cx={dot.x} cy={dot.y} r={Math.max(2.5, dot.r * 0.35)} style={{ animationDelay: `${dot.delay}s` }} />
            ))}
          </g>
        ))}
      </svg>
    </div>
  );
}

/** parcel: takip görevindeki kargo firmasının uygulaması (kurgusal "Yolda Kargo"). */
export type StageApp = "postam" | "browser" | "messages" | "store" | "settings" | "parcel";

const appIcons: Record<StageApp, LucideIcon> = {
  postam: Mail,
  browser: Globe,
  messages: MessageCircle,
  store: ShoppingBag,
  settings: Settings,
  parcel: Truck,
};
const appColors: Record<StageApp, string> = {
  postam: "bg-scene-orange",
  browser: "bg-scene-blue",
  messages: "bg-scene-green",
  store: "bg-scene-violet",
  settings: "bg-scene-ink-2",
  parcel: "bg-scene-violet",
};

/** Kurgusal uygulamanın simgesi (gerçek marka yok): Postam turuncu zarf, tarayıcı mavi küre, Mesajlar yeşil balon, Mağaza mor çanta. */
export function AppIcon({ app, className }: { app: StageApp; className?: string }) {
  const Icon = appIcons[app];
  return (
    <span aria-hidden="true" className={cn("flex flex-none items-center justify-center rounded-[22%] text-scene-white", appColors[app], className)}>
      <Icon className="size-[58%]" strokeWidth={2.2} />
    </span>
  );
}

/** Bilgisayarın ya da telefonun sahibi: yazılmazsa "Sen". */
export function useOwner(owner: string) {
  const t = getMessages().lab.stage;
  return owner.trim() || t.you;
}

export function OwnerAvatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex flex-none items-center justify-center rounded-full border-[3px] border-stage-avatar-ring bg-stage-avatar font-heading font-bold text-stage-avatar-ink",
        className,
      )}
    >
      {name.slice(0, 1).toLocaleUpperCase(defaultLocale)}
    </span>
  );
}

/**
 * Sahnedeki telefon (T2): velinin onay SMS'i gibi telefona düşen ekranlar buraya çizilir
 * (components/lab/mission/MissionSms.tsx). Telefon masadadır; ekran gelince titrer, öğrenci alır.
 */
export type StagePhone = {
  /** Telefonun ekranı (portal hedefi); telefon henüz çizilmediyse null. */
  screen: HTMLElement | null;
  /** Yeni bir şey geldi: telefon titrer, ekranında bildirim görünür. */
  notify: (title: string, text: string) => void;
  /** Öğrenci işini bitirdi: telefon masaya döner. */
  putDown: () => void;
  /** Telefon ekranı dolu kalsın ("Yeni bir şey yok" örtüsü çıkmasın): sesli mesajlı görevin konuşması. */
  keep: () => void;
};

export const StagePhoneContext = createContext<StagePhone | null>(null);

export function useStagePhone() {
  return useContext(StagePhoneContext);
}
