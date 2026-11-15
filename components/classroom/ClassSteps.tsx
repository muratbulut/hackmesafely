import { getMessages } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Sınıfı olmayan öğretmene üç kısa adım: sınıf oluştur, kodu paylaş, ödev ver (hoca öncesi
 * kontrol 32). Sınıflarım'ın boş hâlinde ve ana sayfadaki "Sınıfların" kutusunda.
 * `stacked`: dar kutuda adımlar hep alt alta.
 */
export function ClassSteps({ stacked = false, className }: { stacked?: boolean; className?: string }) {
  const s = getMessages().classroom.steps;
  return (
    <ol aria-label={s.label} className={cn("m-0 grid list-none gap-2 p-0", !stacked && "sm:grid-cols-3", className)}>
      {[s.create, s.share, s.homework].map((text, index) => (
        <li key={text} className="flex items-start gap-2.5 rounded-xl border border-line bg-surface-deep px-3 py-2.5 text-left">
          <span className="flex size-6 flex-none items-center justify-center rounded-full bg-accent/14 text-xs font-bold text-accent-fg">{index + 1}</span>
          <span className="pt-0.5 text-[13px] leading-[1.45] text-fg-2">{text}</span>
        </li>
      ))}
    </ol>
  );
}
