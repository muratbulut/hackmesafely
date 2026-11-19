import { FileText, Film, Headphones, Image, Paperclip, Settings, Smartphone, type LucideIcon } from "lucide-react";
import { format, getMessages } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type File = { from: string; text: string; name: string; size: string };

/** Dosya adını adı ve soyadına (son noktadan sonrası) ayırır: "odev.pdf.exe" -> ["odev.pdf", "exe"]. */
export function splitFileName(name: string): [string, string] {
  const dot = name.lastIndexOf(".");
  return dot > 0 && dot < name.length - 1 ? [name.slice(0, dot), name.slice(dot + 1)] : [name, ""];
}

const extIcons: Record<string, LucideIcon> = { jpg: Image, jpeg: Image, png: Image, mp3: Headphones, mp4: Film, exe: Settings, apk: Smartphone };

/**
 * Mini testin üstündeki mesaj eki (Şehir Kapısı, Dosya ve uygulama): soru grupta gelen bir dosyayı
 * anlatıyorsa öğrenci onu bir sohbet balonunda görür. Cevaptan sonra (`revealed`) adın son noktadan
 * sonrası sarıyla ayrılır ve altında "soyadı" yazar; böylece öğrenci kuralı kendi gözüyle görür.
 * Simge de kandırır: cevaptan önce adın göründüğü türün simgesi (odev.pdf.exe'de belge), sonra
 * gerçek soyadının simgesi (program) çıkar.
 * Yalnızca gösterilir: ek basılmaz, hiçbir şey indirilmez.
 */
export function FilePeek({ file, revealed }: { file: File; revealed: boolean }) {
  const m = getMessages().lab.training.quiz.file;
  const [base, ext] = splitFileName(file.name);
  const dotExt = ext ? "." + ext : "";
  const Icon = extIcons[(revealed ? ext : splitFileName(base)[1] || ext).toLocaleLowerCase("en")] ?? FileText;
  return (
    <div
      data-testid="file-peek"
      className="overflow-hidden rounded-[20px] border border-card bg-[radial-gradient(60%_90%_at_0%_0%,color-mix(in_srgb,var(--accent)_12%,transparent),transparent_70%),var(--surface-deep)] px-4 py-4"
    >
      <div className="max-w-[400px] motion-safe:[animation:rise_.45s_.2s_ease-out_both]">
        <div className="flex flex-col gap-2 rounded-2xl rounded-tl-md border border-scene-line-strong bg-scene-white px-3.5 py-3 font-sans text-scene-ink shadow-floating">
          <span className="flex items-baseline justify-between gap-2 text-xs">
            <b className="text-[13px] text-scene-blue">{file.from}</b>
            <span className="text-scene-ink-muted">{m.now}</span>
          </span>
          {file.text ? <span className="text-[15px] leading-snug text-scene-ink-2">{file.text}</span> : null}
          <span className="flex items-center gap-3 rounded-xl border border-scene-line bg-scene-paper px-3 py-2.5" aria-label={format(m.attachment, { name: file.name })}>
            <span className="flex size-10 flex-none items-center justify-center rounded-lg bg-scene-red-soft text-scene-red">
              <Icon className="size-5" strokeWidth={2.1} aria-hidden="true" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span aria-hidden="true" className="flex flex-wrap items-start text-[15px] font-bold break-all">
                <span>{base}</span>
                {ext ? (
                  <span className="inline-flex flex-col items-center">
                    <span className={cn("rounded-md transition-colors duration-500", revealed && "-mx-0.5 bg-scene-yellow px-0.5 text-scene-ink")}>{dotExt}</span>
                    {revealed ? (
                      <span className="text-[11px] font-bold tracking-[0.6px] text-scene-amber-ink motion-safe:[animation:rise_.35s_ease-out_both]">{m.surname}</span>
                    ) : null}
                  </span>
                ) : null}
              </span>
              {file.size ? (
                <span className="flex items-center gap-1 text-xs text-scene-ink-muted">
                  <Paperclip className="size-3" strokeWidth={2.2} aria-hidden="true" />
                  {file.size}
                </span>
              ) : null}
            </span>
          </span>
        </div>
      </div>
      {revealed && ext ? (
        <p role="status" className="sr-only">
          {format(m.revealed, { ext: dotExt })}
        </p>
      ) : null}
    </div>
  );
}
