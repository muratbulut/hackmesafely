import { MessageSquare } from "lucide-react";
import { getMessages } from "@/lib/i18n";

type Sms = { from: string; text: string };

/**
 * Mini testin üstündeki telefon bildirimi (Şehir Kapısı, Hesap ve giriş): soru bir SMS'i
 * anlatıyorsa öğrenci onu kilit ekranında görür. Bildirim yukarıdan düşer ve bir kez titrer;
 * "Hareketi azalt" açıksa yerinde durur. Yalnızca gösterilir, dokunulacak bir şey yoktur.
 */
export function SmsPeek({ sms }: { sms: Sms }) {
  const m = getMessages().lab.training.quiz.sms;
  return (
    <div
      data-testid="sms-peek"
      className="overflow-hidden rounded-[20px] border border-card bg-[radial-gradient(60%_90%_at_50%_0%,color-mix(in_srgb,var(--accent)_14%,transparent),transparent_70%),var(--surface-deep)] px-4 py-5"
    >
      <p aria-hidden="true" className="text-center font-heading text-[28px] leading-none font-bold text-fg tabular-nums">
        {m.clock}
      </p>
      <div className="mx-auto mt-4 max-w-[360px] motion-safe:[animation:sms-drop_.6s_.4s_ease-out_both,shake_.5s_1.1s_ease-in-out]">
        <div className="flex items-start gap-3 rounded-2xl border border-scene-line-strong bg-scene-white px-3.5 py-3 font-sans text-scene-ink shadow-floating">
          <span className="flex size-9 flex-none items-center justify-center rounded-xl bg-scene-green text-scene-white">
            <MessageSquare className="size-[18px]" strokeWidth={2.2} aria-hidden="true" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="flex items-baseline justify-between gap-2 text-xs text-scene-ink-muted">
              <span className="font-bold tracking-[0.4px]">{m.app}</span>
              <span>{m.now}</span>
            </span>
            <b className="text-[15px]">{sms.from}</b>
            <span className="text-[15px] leading-snug text-scene-ink-2">{sms.text}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
