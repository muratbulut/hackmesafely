"use client";

import { ChevronLeft, Mic, Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CardIcon, Voicemail } from "@/lib/lab/content";
import { format, getMessages } from "@/lib/i18n";
import { prefersReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { readMuted } from "../sound";
import { useStagePhone } from "../stage/common";
import { MissionPoints } from "./MissionPoints";
import { smsTone } from "./tones";

/** Konuşmadaki bir sesli mesaj: satırları (altyazı), sesleri ve saati. */
export type VoiceNote = { key: string; lines: string[]; voice: (string | null)[]; time: string };

/** Ses dosyası yokken kelime başına süre ve satırlar arası bekleme (altyazıyla okunur). */
const WORD_MS = 260;
const LINE_GAP_MS = 900;
const BARS = 30;

/** Sesli mesajın gösterilen uzunluğu: kelime sayısından (ses yokken de makul bir süre). */
function noteSeconds(lines: string[]) {
  const words = lines.join(" ").split(/\s+/).filter(Boolean).length;
  return Math.max(6, Math.round(words * 0.42));
}

function mmss(total: number) {
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/**
 * Sesli mesajla açılan görev (T2, "Sahte kargo maili", 18 Kasım, Murat): masadaki telefonda
 * Mesajlar'daki konuşma. Önce eski mesajlar, sonra görevi verenin sesli mesajı; oynatınca ses
 * (yoksa altyazı) kelime kelime ilerler, "Yazıya dök" metni açar. İlk mesaj dinlenince görev kartı
 * gelir, kabul edince cevap balonu gider. Bitişler (iyi, kaçırdı, kötü) aynı konuşmaya yeni sesli
 * mesaj olarak düşer; yenisi gelince telefon titrer. Ekran sahnedeki telefona çizilir
 * (StagePhoneContext); telefon masadayken dokunulamaz.
 */
export function VoiceMessage({
  caller,
  owner,
  history,
  notes,
  card,
  accepted,
  reply,
  replyTime,
  onListened,
  action,
}: {
  caller: string;
  owner: string;
  history: Voicemail["history"];
  notes: VoiceNote[];
  /** İlk mesaj dinlenince çıkan görev kartı (kabul edilince null). */
  card: { title: string; points: string[]; pointIcons: (CardIcon | null)[]; accept: string; onAccept: () => void } | null;
  accepted: boolean;
  reply: string;
  replyTime: string;
  onListened: (key: string) => void;
  /** Son mesaj dinlenince altta çıkan düğme ("Raporu gör", "Devam"). */
  action: { label: string; onClick: () => void } | null;
}) {
  const t = getMessages().lab.voicemail;
  const phone = useStagePhone();
  const notify = phone?.notify;
  const keep = phone?.keep;
  const body = useRef<HTMLDivElement>(null);
  const [listened, setListened] = useState<string[]>([]);
  const last = notes[notes.length - 1];

  // Yeni sesli mesaj: telefon titrer, ekranında bildirim; konuşma ekranda kalır.
  useEffect(() => {
    if (!last) return;
    keep?.();
    notify?.(caller, format(t.noteShort, { length: mmss(noteSeconds(last.lines)) }));
    if (!readMuted()) smsTone();
  }, [last, caller, notify, keep, t.noteShort]);

  useEffect(() => {
    const el = body.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [notes.length, listened.length, accepted, card, action]);

  if (!phone?.screen) return null;

  const firstKey = notes[0]?.key;
  const lastListened = !!last && listened.includes(last.key);

  return createPortal(
    <div className="flex min-h-0 flex-1 flex-col bg-scene-paper pt-2 text-scene-ink" data-testid="voicemail">
      <div className="flex flex-none items-center gap-2 border-b border-scene-line px-3 pb-2.5">
        <ChevronLeft aria-hidden="true" className="size-5 text-scene-green" strokeWidth={2.4} />
        <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-full bg-call-avatar-bg text-sm font-bold text-call-ink">
          {caller.slice(0, 1)}
        </span>
        <span className="flex min-w-0 flex-col">
          <b className="truncate text-[15px]">{caller}</b>
          <small className="text-[11px] text-scene-ink-muted">{format(t.seen, { time: notes[0]?.time ?? "" })}</small>
        </span>
      </div>

      <div ref={body} className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 py-3" aria-live="polite">
        {history.map((m, i) =>
          m.from === "day" ? (
            <span key={i} className="self-center rounded-full bg-scene-line-soft px-2.5 py-0.5 text-[11px] font-medium text-scene-ink-muted">
              {m.text}
            </span>
          ) : (
            <Bubble key={i} out={m.from === "out"} time={m.time}>
              {m.text}
            </Bubble>
          ),
        )}
        {notes.map((note) => (
          <div key={note.key} className="contents">
            <VoiceBubble
              note={note}
              onDone={() => {
                setListened((all) => (all.includes(note.key) ? all : [...all, note.key]));
                onListened(note.key);
              }}
            />
            {note.key === firstKey && accepted && reply ? (
              <Bubble out time={replyTime}>
                {reply}
              </Bubble>
            ) : null}
          </div>
        ))}
      </div>

      {card && listened.includes(firstKey ?? "") ? (
        <div className="flex flex-none flex-col gap-2 border-t border-scene-line bg-scene-white px-3 pt-3 pb-4 [animation:fade-up_.35s_ease-out_both]" data-testid="voicemail-card">
          <span className="text-[11px] font-bold tracking-[0.08em] text-scene-orange">{format(t.kicker, { owner }).toLocaleUpperCase("tr")}</span>
          <b className="text-[16px] leading-tight">{card.title}</b>
          <MissionPoints points={card.points} icons={card.pointIcons} tone="sheet" />
          <button type="button" onClick={card.onAccept} className="mt-1 min-h-12 cursor-pointer rounded-2xl bg-scene-green font-bold text-scene-white">
            {card.accept}
          </button>
        </div>
      ) : action && lastListened ? (
        <div className="flex flex-none px-3 pt-2 pb-4">
          <button type="button" onClick={action.onClick} className="min-h-12 flex-1 cursor-pointer rounded-2xl bg-scene-ink font-bold text-scene-white" data-testid="voicemail-action">
            {action.label}
          </button>
        </div>
      ) : null}
    </div>,
    phone.screen,
  );
}

function Bubble({ out, time, children }: { out?: boolean; time: string; children: string }) {
  return (
    <p
      className={cn(
        "flex max-w-[86%] flex-col gap-0.5 px-3 py-2 text-[14px] leading-snug break-words",
        out ? "self-end rounded-[16px_16px_4px_16px] bg-scene-green text-scene-white" : "self-start rounded-[16px_16px_16px_4px] bg-scene-bubble",
      )}
    >
      <span>{children}</span>
      {time ? <small className={cn("self-end text-[10.5px]", out ? "text-scene-white/80" : "text-scene-ink-muted")}>{out ? `${time} ✓✓` : time}</small> : null}
    </p>
  );
}

/**
 * Bir sesli mesaj balonu: oynat düğmesi, dalga, süre, "Yazıya dök". Oynatınca metin açılır ve
 * kelimeler sırayla koyulaşır; ses dosyası varsa (ve ses kapalı değilse) sesle birlikte, yoksa
 * kendi hızında. Bitince bir kez onDone.
 */
function VoiceBubble({ note, onDone }: { note: VoiceNote; onDone: () => void }) {
  const t = getMessages().lab.voicemail;
  const words = note.lines.map((line) => line.split(/\s+/).filter(Boolean));
  const total = words.reduce((n, w) => n + w.length, 0);
  const seconds = noteSeconds(note.lines);
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [said, setSaid] = useState(0);
  const [done, setDone] = useState(false);
  const stop = useRef<(() => void) | null>(null);
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  });

  useEffect(() => () => stop.current?.(), []);

  function finish() {
    setPlaying(false);
    setSaid(total);
    setDone(true);
    stop.current = null;
    doneRef.current();
  }

  function play() {
    if (playing) {
      stop.current?.();
      setPlaying(false);
      return;
    }
    setOpen(true);
    setPlaying(true);
    setSaid(0);
    const timers: number[] = [];
    let audio: HTMLAudioElement | null = null;
    let cancelled = false;
    stop.current = () => {
      cancelled = true;
      timers.forEach((id) => window.clearTimeout(id));
      if (audio) {
        audio.pause();
        audio.removeAttribute("src");
      }
    };
    // "Hareketi azalt" açıksa ve ses yoksa metin hemen açılır.
    const quick = prefersReducedMotion() && note.voice.every((v) => !v);
    if (quick) {
      finish();
      return;
    }
    const muted = readMuted();
    let base = 0;
    const playLine = (li: number) => {
      if (cancelled) return;
      if (li >= words.length) return finish();
      const count = words[li].length;
      const src = muted ? null : note.voice[li];
      const advance = (step: number) => {
        let w = 0;
        const tick = () => {
          if (cancelled) return;
          w += 1;
          setSaid(base + w);
          if (w < count) timers.push(window.setTimeout(tick, step));
        };
        timers.push(window.setTimeout(tick, step));
      };
      const next = () => {
        base += count;
        setSaid(base);
        timers.push(window.setTimeout(() => playLine(li + 1), LINE_GAP_MS));
      };
      if (src) {
        audio = new Audio(src);
        audio.addEventListener("loadedmetadata", () => {
          if (audio && Number.isFinite(audio.duration)) advance(Math.min(400, Math.max(80, (audio.duration * 900) / count)));
        });
        audio.addEventListener("ended", next);
        audio.addEventListener("error", () => {
          advance(WORD_MS);
          timers.push(window.setTimeout(next, count * WORD_MS));
        });
        audio.play().catch(() => {
          advance(WORD_MS);
          timers.push(window.setTimeout(next, count * WORD_MS));
        });
      } else {
        advance(WORD_MS);
        timers.push(window.setTimeout(next, count * WORD_MS + 200));
      }
    };
    playLine(0);
  }

  const lit = Math.round((BARS * said) / Math.max(1, total));
  let index = 0;
  return (
    <div className="flex max-w-[92%] flex-col gap-1.5 self-start rounded-[16px_16px_16px_4px] bg-scene-bubble px-2.5 py-2" data-testid="voice-note" data-note={note.key}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={play}
          aria-label={playing ? t.pause : t.play}
          className="grid size-10 flex-none cursor-pointer place-items-center rounded-full bg-scene-green text-scene-white"
          data-testid="voice-play"
        >
          {playing ? <Pause className="size-4" fill="currentColor" strokeWidth={0} /> : <Play className="ml-0.5 size-4" fill="currentColor" strokeWidth={0} />}
        </button>
        <span aria-hidden="true" className="flex h-7 flex-1 items-center gap-[2px]">
          {Array.from({ length: BARS }, (_, i) => (
            <i
              key={i}
              className={cn("w-[3px] flex-none rounded-full", i < lit || (done && !playing) ? "bg-scene-green" : "bg-scene-ink-faint/60")}
              style={{ height: `${28 + Math.abs(Math.sin(i * 1.7 + note.lines.length)) * 70}%` }}
            />
          ))}
        </span>
        <Mic className="size-4 flex-none text-scene-green" strokeWidth={2.2} aria-hidden="true" />
      </div>
      <div className="flex items-center justify-between gap-2 px-1 text-[11px] text-scene-ink-muted">
        <span>{format(t.note, { length: mmss(seconds) })}</span>
        <span className="flex items-center gap-2">
          <button type="button" onClick={() => setOpen((o) => !o)} className="min-h-8 cursor-pointer font-bold text-scene-green" aria-expanded={open}>
            {open ? t.hide : t.transcript}
          </button>
          <span>{note.time}</span>
        </span>
      </div>
      {open ? (
        <p className="px-1 pb-0.5 text-[13.5px] leading-snug" data-testid="voice-transcript">
          {words.map((line, li) => (
            <span key={li} className="block">
              {line.map((word, wi) => {
                const at = index++;
                return (
                  <span key={wi} className={cn("transition-colors", playing && at >= said ? "text-scene-ink-faint" : "text-scene-ink")}>
                    {word}{" "}
                  </span>
                );
              })}
            </span>
          ))}
        </p>
      ) : null}
    </div>
  );
}
