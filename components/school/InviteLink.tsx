"use client";

import { Link2 } from "lucide-react";
import { getMessages } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Bağlantıyı panoya kopyalar; tarayıcı izin vermezse false. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Başlıktaki "Öğretmen davet et" düğmesi (telefonda da): okulun davet bağlantısını kopyalar. */
export function InviteButton({ onCopy, className }: { onCopy: () => void; className?: string }) {
  const t = getMessages().school;
  return (
    <button
      type="button"
      onClick={onCopy}
      className={cn(
        "inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border-0 bg-accent px-3 font-[inherit] text-sm font-bold whitespace-nowrap text-on-accent transition-[filter] hover:brightness-110 lg:h-12 lg:px-4 lg:text-[15px]",
        className,
      )}
    >
      <Link2 className="size-[18px]" strokeWidth={2} aria-hidden="true" />
      {t.inviteButton}
    </button>
  );
}
