import { Mascot } from "@/components/mascot/Mascot";
import { cn } from "@/lib/utils";

/**
 * Bekleme işareti: gözlü a'nın göz bebeği iç boşlukta döner (yazısız; yanındaki metin ya da düğmenin
 * aria-busy'si ne beklendiğini söyler). Ana renk ya da tehlike düğmesinin içinde gövde düğmenin
 * yazı rengini alır, göz beyazı çıkar ki zeminle karışmasın.
 */
export function Spinner({ className, tone = "plain" }: { className?: string; tone?: "plain" | "onAccent" | "onDanger" }) {
  return (
    <Mascot
      mood="loading"
      onAccent={tone !== "plain"}
      className={cn("inline-block size-[18px] flex-none", tone === "onDanger" && "mc-on-danger", className)}
    />
  );
}
