"use client";

import { AlertTriangle, Check, ChevronRight, Clock, ExternalLink, FileText, GraduationCap, Mail, MessageSquareText, UserCheck, type LucideIcon } from "lucide-react";
import { useTransition, type ReactNode } from "react";
import { format, getMessages } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { SchoolSheet, SheetTop } from "./SchoolSheet";
import type { HandledRequest, SchoolRequest } from "./types";

const handledDot = { approved: "bg-success", endorsed: "bg-accent", notRecognized: "bg-warning" } as const;

/**
 * "Okulundan gelen talepler": bu okulu seçen ve sorumlunun kararını bekleyen talepler. Satıra
 * dokununca "Talebi incele" penceresi açılır; karar orada verilir. Altta son kararlar.
 */
export function RequestsCard({ requests, handled, onOpen }: { requests: SchoolRequest[]; handled: HandledRequest[]; onOpen: (id: string) => void }) {
  const t = getMessages().school.requests;
  if (requests.length === 0 && handled.length === 0) return null;
  return (
    <section
      aria-labelledby="school-requests"
      className="flex flex-col gap-3 rounded-[20px] border border-purple/35 bg-[radial-gradient(90%_120%_at_0%_0%,color-mix(in_srgb,var(--purple)_10%,transparent),transparent_60%)] bg-surface p-4 lg:p-5 print:hidden"
    >
      <span className="flex items-center gap-2.5">
        <span aria-hidden="true" className="flex size-9 flex-none items-center justify-center rounded-xl bg-purple/14 text-purple-fg">
          <UserCheck className="size-[18px]" strokeWidth={2} />
        </span>
        <h2 id="school-requests" className="m-0 text-[15px] font-bold lg:text-base">
          {requests.length > 0 ? format(t.waitingTitle, { n: requests.length }) : t.title}
        </h2>
      </span>
      {requests.length > 0 ? (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {requests.map((request) => (
            <li key={request.id} aria-label={request.name}>
              <button
                type="button"
                onClick={() => onOpen(request.id)}
                aria-haspopup="dialog"
                aria-label={format(t.inspectOf, { name: request.name })}
                className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-line bg-surface-raised p-3 text-left font-[inherit] text-fg transition-colors hover:border-purple lg:p-3.5"
              >
                <span aria-hidden="true" className="flex size-10 flex-none items-center justify-center rounded-full border border-line bg-card text-xl">
                  {request.avatar}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <b className="truncate text-[15px]">{request.name}</b>
                  <span className="truncate text-xs text-fg-3">{format(t.meta, { subject: request.subject, when: request.when })}</span>
                </span>
                <span aria-hidden="true" className="inline-flex h-10 flex-none items-center gap-1 rounded-xl bg-purple px-3 text-sm font-bold text-on-accent">
                  {t.inspect}
                  <ChevronRight className="size-4" strokeWidth={2.4} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {handled.length > 0 ? (
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
          {handled.map((item) => (
            <li key={item.id} className="flex items-center gap-2 text-[13px] text-fg-2">
              <span aria-hidden="true" className={cn("size-2 flex-none rounded-full", handledDot[item.kind])} />
              <span>
                <b>{item.name}</b> · {t.handled[item.kind]}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <span className="text-xs text-fg-4">{t.footnote}</span>
    </section>
  );
}

function Row({ Icon, label, children }: { Icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3 border-b border-card py-3 last:border-0">
      <Icon className="mt-0.5 size-[18px] flex-none text-fg-3" strokeWidth={2} aria-hidden="true" />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-xs text-fg-3">{label}</span>
        <span className="text-[15px] break-words text-fg">{children}</span>
      </span>
    </li>
  );
}

/**
 * "Talebi incele" penceresi: başvuranın verdiği bilgiler (branş, kurumsal e-posta, belge, not, hesap)
 * ve karar. Belge kendi adresinde, yeni sekmede açılır; her açılış kayıt defterine yazılır.
 */
export function RequestSheet({
  request,
  coordinatorApproves,
  onClose,
  onEndorse,
  onNotRecognize,
  children,
}: {
  request: SchoolRequest | null;
  coordinatorApproves: boolean;
  onClose: () => void;
  onEndorse: (request: SchoolRequest) => Promise<void>;
  onNotRecognize: (request: SchoolRequest) => Promise<void>;
  /** Bildirim kutusu (pencere açıkken içinde). */
  children?: ReactNode;
}) {
  const t = getMessages().school.requests;
  const s = t.sheet;
  const [pending, startTransition] = useTransition();
  return (
    <SchoolSheet open={request !== null} label={request ? request.name : s.eyebrow} onClose={onClose} extra={children}>
      {(close) =>
        request ? (
          <>
            <SheetTop eyebrow={s.eyebrow} onClose={close}>
              <span className="flex items-center gap-3">
                <span aria-hidden="true" className="flex size-12 flex-none items-center justify-center rounded-full border border-line bg-card text-2xl">
                  {request.avatar}
                </span>
                <span className="flex min-w-0 flex-col">
                  <b className="font-heading text-[22px] leading-tight">{request.name}</b>
                  <span className="text-sm text-fg-3">{format(s.applied, { subject: request.subject, when: request.when })}</span>
                </span>
              </span>
            </SheetTop>
            <ul className="m-0 flex list-none flex-col rounded-2xl border border-line bg-surface px-4 py-1">
              <Row Icon={GraduationCap} label={s.subject}>
                {request.subject}
              </Row>
              <Row Icon={Mail} label={s.email}>
                {request.institutionalEmail ?? <span className="text-fg-3">{s.noEmail}</span>}
              </Row>
              <Row Icon={FileText} label={s.document}>
                {request.document ? (
                  <span className="flex flex-col items-start gap-2">
                    <span className="break-all">{format(s.documentMeta, { name: request.document.name, size: request.document.size })}</span>
                    <a
                      href={request.document.href}
                      target="_blank"
                      rel="noopener"
                      className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-line px-3 text-sm font-bold text-fg no-underline transition-colors hover:border-accent"
                    >
                      <ExternalLink className="size-4" strokeWidth={2} aria-hidden="true" />
                      {s.openDocument}
                    </a>
                  </span>
                ) : (
                  <span className="text-fg-3">{s.noDocument}</span>
                )}
              </Row>
              <Row Icon={MessageSquareText} label={s.note}>
                {request.note ? <span className="whitespace-pre-line text-fg-2">{request.note}</span> : <span className="text-fg-3">{s.noNote}</span>}
              </Row>
              <Row Icon={Clock} label={s.account}>
                {format(s.accountSince, { when: request.accountSince })}
              </Row>
            </ul>
            {request.minor ? (
              <p className="m-0 flex items-start gap-2 rounded-2xl border border-warning/30 bg-warning/8 px-4 py-3 text-sm leading-normal text-fg-2">
                <AlertTriangle className="mt-0.5 size-4 flex-none text-warning-fg" strokeWidth={2.4} aria-hidden="true" />
                {t.minor}
              </p>
            ) : null}
            <section aria-labelledby="request-decision" className={cn("flex flex-col gap-2.5 rounded-2xl border border-success/30 bg-success/6 p-4", pending && "opacity-60")}>
              <h3 id="request-decision" className="m-0 text-base font-bold">
                {s.question}
              </h3>
              <span className="text-sm leading-relaxed text-fg-2">
                {coordinatorApproves ? format(s.approveHint, { name: request.name }) : s.opinionHint}
              </span>
              {/* Yan yana sığmazsa düğmeler alt alta geçer; yazı kırılmaz. */}
              <div className="mt-1 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => startTransition(() => onNotRecognize(request))}
                  className="h-12 flex-[1_0_auto] cursor-pointer rounded-xl border border-line bg-surface px-4 font-[inherit] text-sm font-bold whitespace-nowrap text-fg-2 transition-colors hover:border-line-strong disabled:cursor-default"
                >
                  {t.notRecognized}
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => startTransition(() => onEndorse(request))}
                  className="inline-flex h-12 flex-[2_0_auto] cursor-pointer items-center justify-center gap-2 rounded-xl border-0 bg-success px-4 font-[inherit] text-sm font-bold whitespace-nowrap text-on-accent transition-[filter] hover:brightness-110 disabled:cursor-default"
                >
                  <Check className="size-4" strokeWidth={2.6} aria-hidden="true" />
                  {t.endorse}
                </button>
              </div>
            </section>
            <span className="text-xs text-fg-4">{s.footnote}</span>
          </>
        ) : null
      }
    </SchoolSheet>
  );
}
