"use client";

import { RotateCcw } from "lucide-react";
import { useState } from "react";
import { restartAttempt } from "@/lib/lab/actions";
import { RestartDialog } from "@/components/lab/frame/RestartDialog";
import { getMessages } from "@/lib/i18n";
import { paths } from "@/lib/navigation";
import { cn } from "@/lib/utils";

/** Yarım denemesi olan senaryonun kapağında "Baştan başla": onay sorar, sonra odayı ilk sahneden açar. */
export function RestartButton({ slug, block }: { slug: string; block?: boolean }) {
  const t = getMessages().lab;
  const r = t.frame.restart;
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    const result = await restartAttempt(slug).catch(() => null);
    // Oturum ya da kilit sorununu oynatıcının sayfası kendisi çözer (girişe ya da kapağa yönlendirir).
    if (result && (result.ok || result.reason === "auth" || result.reason === "unverified" || result.reason === "locked")) {
      window.location.assign(paths.labPlay(slug));
      return;
    }
    setBusy(false);
    setError(t.frame.toasts.error);
  }
  return (
    <>
      <button
        type="button"
        data-testid="restart-room"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex cursor-pointer items-center justify-center gap-2 rounded-[14px] border border-line bg-surface font-bold text-fg-2 transition-colors hover:text-fg",
          block ? "min-h-11 w-full text-[15px]" : "min-h-14 px-6 text-[17px]",
        )}
      >
        <RotateCcw className="size-[17px] flex-none" strokeWidth={2.4} aria-hidden="true" />
        {t.detail.restart}
      </button>
      <RestartDialog
        open={open}
        title={r.title}
        text={r.text}
        cancel={r.cancel}
        confirm={r.confirm}
        busy={busy}
        error={error}
        onCancel={() => {
          setOpen(false);
          setError(null);
        }}
        onConfirm={() => void confirm()}
      />
    </>
  );
}
