"use client";

import Form from "next/form";
import Link from "next/link";
import { Download, Search, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useRevealSelected } from "@/components/common/ScrollStrip";
import type { AuditPerson } from "@/lib/admin/audit-log";
import { auditExportHref, auditHref, auditKindList, hasFilters, maxQueryLength, kindParams, type AuditFilters } from "@/lib/admin/audit-url";
import { format, getMessages } from "@/lib/i18n";
import { paths } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { kindTones } from "./kinds";

/**
 * Kayıt defterinin süzgeçleri (Kayit-Defteri): arama, kişi, tarih aralığı ve tür. Hepsi adreste
 * durur (?ara=&kisi=&bas=&bit=&tur=). Arama yazarken kısa bir beklemeden sonra liste kendiliğinden
 * süzülür; JavaScript yoksa form normal gönderilir. "CSV indir" süzülen kayıtların hepsini indirir.
 */
export function AuditFilterBar({ filters, people, exportLimit }: { filters: AuditFilters; people: AuditPerson[]; exportLimit: number }) {
  const t = getMessages().adminAudit;
  const form = useRef<HTMLFormElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const chipStrip = useRevealSelected<HTMLElement>(filters.kind);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  // Alanlar kontrolsüz (defaultValue): adres başka yoldan değişince (kişinin adına basmak, "Süzgeçleri
  // temizle", tür düğmeleri) sayfa yeniden kurulmaz, alanlar adrese burada eşitlenir. Arama yazılırken
  // boşluklar kırpılmasın diye karşılaştırma kırpılmış metinle yapılır. İlk açılışta eşitlenmez: sayfa
  // yüklenirken (hidrasyondan önce) seçilen değer silinmesin.
  const wanted = { ara: filters.query, kisi: filters.person ?? "", bas: filters.from ?? "", bit: filters.to ?? "" };
  const wantedKey = Object.values(wanted).join("\n");
  const synced = useRef(wantedKey);
  useEffect(() => {
    const fields = form.current?.elements;
    if (!fields || synced.current === wantedKey) return;
    synced.current = wantedKey;
    for (const [name, value] of Object.entries(wanted)) {
      const field = fields.namedItem(name);
      if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement)) continue;
      const current = name === "ara" ? field.value.replace(/\s+/g, " ").trim() : field.value;
      if (current !== value) field.value = value;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- wanted, wantedKey'ten türer
  }, [wantedKey]);

  const submitSoon = (delay: number) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => form.current?.requestSubmit(), delay);
  };

  const exportHint = format(t.export.hint, { max: exportLimit.toLocaleString("tr-TR") });
  const dateInput = "h-[42px] w-full min-w-0 rounded-xl border border-line bg-surface px-2.5 text-sm font-bold text-fg focus:border-accent focus:outline-none lg:w-[150px]";

  const chips: { key: string; label: string; href: string; on: boolean; tone: string }[] = [
    { key: "all", label: t.all, href: auditHref({ ...filters, kind: null, cursor: null }), on: !filters.kind, tone: "border-accent" },
    ...auditKindList.map((kind) => ({
      key: kindParams[kind],
      label: t.kinds[kind],
      href: auditHref({ ...filters, kind, cursor: null }),
      on: filters.kind === kind,
      tone: kindTones[kind].border,
    })),
  ];

  return (
    <div className="flex flex-col gap-2.5">
      <Form ref={form} action={paths.adminAudit} replace role="search" className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
        {filters.kind ? <input type="hidden" name="tur" value={kindParams[filters.kind]} /> : null}
        <label className="relative block min-w-0 flex-1">
          <span className="sr-only">{t.search.label}</span>
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-fg-4" strokeWidth={2} aria-hidden="true" />
          <input
            type="search"
            name="ara"
            defaultValue={filters.query}
            maxLength={maxQueryLength}
            placeholder={t.search.placeholder}
            onChange={() => submitSoon(400)}
            className="h-[50px] w-full rounded-xl border border-line bg-canvas pr-3.5 pl-11 text-base text-fg placeholder:text-fg-4 focus:border-accent focus:outline-none lg:text-[15px]"
          />
        </label>
        <label className="flex items-center gap-2 text-[13px] font-bold text-fg-3">
          <span className="flex-none">{t.personLabel}</span>
          <select
            name="kisi"
            defaultValue={filters.person ?? ""}
            onChange={() => submitSoon(0)}
            className="h-[42px] min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 text-sm font-bold text-fg focus:border-accent focus:outline-none lg:w-[220px] lg:flex-none"
          >
            <option value="">{t.everyone}</option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
        </label>
        <div role="group" aria-labelledby="audit-range" className="flex min-w-0 items-center gap-2 text-[13px] font-bold text-fg-3">
          <span id="audit-range" className="flex-none">
            {t.range.label}
          </span>
          <label className="relative min-w-0 flex-1 lg:flex-none">
            <span className="sr-only">{t.range.from}</span>
            <input type="date" name="bas" defaultValue={filters.from ?? ""} max={filters.to ?? undefined} onChange={() => submitSoon(500)} className={dateInput} />
          </label>
          <span aria-hidden="true">{t.range.separator}</span>
          <label className="relative min-w-0 flex-1 lg:flex-none">
            <span className="sr-only">{t.range.to}</span>
            <input type="date" name="bit" defaultValue={filters.to ?? ""} min={filters.from ?? undefined} onChange={() => submitSoon(500)} className={dateInput} />
          </label>
        </div>
        <button type="submit" className="sr-only">
          {t.search.submit}
        </button>
      </Form>
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
        <nav ref={chipStrip} aria-label={t.kindLabel} className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
          <ul className="m-0 flex list-none gap-2 p-0 lg:flex-wrap">
            {chips.map((chip) => (
              <li key={chip.key} className="flex-none">
                <Link
                  href={chip.href}
                  aria-current={chip.on ? "true" : undefined}
                  className={cn(
                    "inline-flex h-[34px] items-center rounded-full border px-3 text-[13px] font-bold whitespace-nowrap no-underline max-lg:h-10",
                    chip.on ? cn("bg-card text-fg", chip.tone) : "border-line bg-transparent text-fg-3 hover:text-fg",
                  )}
                >
                  {chip.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex flex-none items-center justify-end gap-2">
          {hasFilters(filters) ? (
            <Link
              href={auditHref({})}
              className="relative inline-flex h-[38px] items-center gap-1 rounded-xl px-2.5 text-[13px] font-bold text-fg-3 no-underline hover:text-fg max-lg:h-10"
              data-testid="audit-clear"
            >
              <X className="size-3.5" strokeWidth={2} aria-hidden="true" />
              {t.range.clear}
            </Link>
          ) : null}
          {/* Dosya bir yol işleyicisinden gelir: istemci yönlendirmesi değil, düz bağlantı. */}
          <a
            href={auditExportHref(filters)}
            download
            title={exportHint}
            aria-label={format(t.export.label, { button: t.export.button, hint: exportHint })}
            className="relative inline-flex h-[38px] items-center gap-1.5 rounded-xl border border-line bg-card px-3 text-[13px] font-bold text-fg no-underline hover:border-line-strong max-lg:h-10"
            data-testid="audit-export"
          >
            <Download className="size-4" strokeWidth={2} aria-hidden="true" />
            {t.export.button}
          </a>
        </div>
      </div>
    </div>
  );
}
