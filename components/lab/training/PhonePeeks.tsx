import { Lock, LockOpen, TriangleAlert, Wifi } from "lucide-react";
import { getMessages } from "@/lib/i18n";
import type { CardIcon } from "@/lib/lab/content";
import { cardIconMap } from "./card-icons";

type Network = { name: string; locked: boolean };
type Popup = { site: string; title: string; text: string; button: string; icon?: CardIcon };

/**
 * Mini testin üstündeki telefon ekranları (Şehir Kapısı, Telefonun ve internet). İkisi de yalnızca
 * gösterilir: listedeki ağlara bağlanılmaz, penceredeki düğme hiçbir şey yapmaz. Ekranın içi telefonun
 * kendi renkleriyle çizilir.
 */

/** Telefonun "Bir ağ seçin" ekranı: ağ adları, şifreli olanın yanında kilit. */
export function WifiPeek({ networks }: { networks: Network[] }) {
  const m = getMessages().lab.training.quiz.wifi;
  return (
    <div data-testid="wifi-peek" className="overflow-hidden rounded-[20px] border border-card bg-surface-deep px-4 py-5">
      <div className="mx-auto max-w-[360px] rounded-2xl border border-scene-line-strong bg-scene-white font-sans text-scene-ink shadow-floating motion-safe:[animation:sms-drop_.5s_.2s_ease-out_both]">
        <div className="flex items-center justify-between border-b border-scene-line px-4 py-3">
          <b className="text-[17px]">{m.title}</b>
          <span aria-hidden="true" className="flex h-[22px] w-[38px] items-center justify-end rounded-full bg-scene-green p-[3px]">
            <span className="size-4 rounded-full bg-scene-white" />
          </span>
        </div>
        <p className="px-4 pt-2.5 pb-1 text-xs font-bold tracking-[0.4px] text-scene-ink-muted">{m.pick}</p>
        <ul className="flex flex-col pb-1.5">
          {networks.map((network, i) => (
            <li
              key={network.name}
              className="flex items-center gap-3 px-4 py-2.5 motion-safe:[animation:sms-drop_.4s_ease-out_both]"
              style={{ animationDelay: `${0.45 + i * 0.12}s` }}
            >
              <Wifi className="size-5 flex-none text-scene-ink-2" strokeWidth={2.2} aria-hidden="true" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[15px] font-semibold">{network.name}</span>
                <span className="text-xs text-scene-ink-muted">{network.locked ? m.locked : m.open}</span>
              </span>
              {network.locked ? (
                <Lock className="size-4 flex-none text-scene-ink-2" strokeWidth={2.4} aria-hidden="true" />
              ) : (
                <LockOpen className="size-4 flex-none text-scene-ink-faint" strokeWidth={2.4} aria-hidden="true" />
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Bir sitenin içinde açılan korkutucu pencere: adres çubuğu, uyarı, geri sayım ve düğme. */
export function PopupPeek({ popup }: { popup: Popup }) {
  const m = getMessages().lab.training.quiz.popup;
  const Icon = popup.icon ? cardIconMap[popup.icon] : TriangleAlert;
  return (
    <div data-testid="popup-peek" className="overflow-hidden rounded-[20px] border border-card bg-surface-deep px-4 py-5">
      <div className="mx-auto max-w-[360px] overflow-hidden rounded-2xl border border-scene-line-strong bg-scene-paper font-sans text-scene-ink shadow-floating">
        <div className="flex items-center gap-2 border-b border-scene-line bg-scene-white px-3 py-2">
          <Lock className="size-3.5 flex-none text-scene-ink-muted" strokeWidth={2.4} aria-hidden="true" />
          <span className="truncate rounded-full bg-scene-paper px-3 py-1 text-[13px] text-scene-ink-2">{popup.site}</span>
        </div>
        <div className="p-3">
          <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-scene-red bg-scene-red-soft px-4 py-4 text-center motion-safe:[animation:pop_.35s_.3s_ease-out_both,shake_.5s_.9s_ease-in-out]">
            <Icon className="size-8 text-scene-red" strokeWidth={2.2} aria-hidden="true" />
            <b className="text-[16px] leading-snug text-scene-red">{popup.title}</b>
            <span className="text-[14px] leading-snug text-scene-ink-2">{popup.text}</span>
            <span className="text-xs text-scene-ink-muted">
              {m.countdownLabel} <b className="font-mono text-[15px] text-scene-red tabular-nums">{m.countdown}</b>
            </span>
            <span aria-hidden="true" className="mt-1 w-full rounded-lg bg-scene-red px-4 py-2.5 text-[15px] font-bold text-scene-white">
              {popup.button}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
