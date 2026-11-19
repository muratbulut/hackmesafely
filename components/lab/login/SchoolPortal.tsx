"use client";

import { ArrowLeft, Check, ChevronDown, FileText, ImageIcon, KeyRound, Lock, LogOut, Megaphone, MessageSquare, User, X } from "lucide-react";
import type { ClientMission } from "@/lib/lab/client";
import { format, getMessages, rich } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { LoginAppIcon } from "./LoginDesktop";

export type PortalPage = "login" | "code" | "home" | "homework" | "bye";

/** Adres çubuğunda sayfanın yolu (kurgusal portal; gerçek site açılmaz). */
const paths: Record<PortalPage, string> = {
  login: "/giris",
  code: "/giris/dogrulama",
  home: "/",
  homework: "/odevler",
  bye: "/giris",
};

export type PortalView = {
  login: NonNullable<ClientMission["login"]>;
  page: PortalPage;
  /** Giriş: şifre kutusu dolu mu, kaç nokta yazıldı (yazılıyorsa), "gerçek şifreni yazma" kutusu. */
  pw: boolean;
  pwTyping: number;
  pwAsk: boolean;
  remember: boolean;
  /** Tarayıcı şifreyi kaydetti mi (çıkış sayfasında şifre dolu gelir). */
  saved: boolean;
  /** Kod: kaç hanesi yazıldı; kutuların altındaki yönlendirme. */
  codeTyped: number;
  codeHint: "phone" | "talk" | "fill" | null;
  speaker: string;
  /** Ana sayfa ve ödev. */
  uploaded: boolean;
  /** Az kalsın'dan sonra geri dönünce: sayfa öğrenci kalktıktan sonra da açıktı. */
  stillOpen: boolean;
  menu: boolean;
  file: boolean;
  picker: boolean;
  uploading: boolean;
  /** Tarayıcının "Şifreyi kaydedeyim mi?" sorusu. */
  savePrompt: boolean;
  on: {
    pw: () => void;
    pwType: () => void;
    remember: () => void;
    login: () => void;
    code: () => void;
    menu: () => void;
    logout: () => void;
    homework: () => void;
    home: () => void;
    picker: (open: boolean) => void;
    pick: () => void;
    upload: () => void;
    save: (saved: boolean) => void;
    closeTab: () => void;
  };
};

const dots = (n: number) => "•".repeat(n);
const field = "flex min-h-11 w-full items-center rounded-[9px] border border-scene-line-strong bg-scene-white px-3 text-left text-[15px] text-scene-ink";
const greenButton =
  "mt-3.5 inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-scene-school font-bold text-scene-white disabled:cursor-default disabled:opacity-50";
const card = "rounded-[14px] border border-scene-line bg-scene-white p-5 shadow-[0_2px_8px_var(--scene-shadow)]";

/**
 * Tarayıcıda okulun kurgusal portalı: giriş, "Giren sen misin?" kodu, ana sayfa, ödev ve çıkış.
 * Şifre hiç yazılmaz: kutuya dokununca "gerçek şifreni yazma" uyarısıyla noktalar kendiliğinden
 * dolar. Kod telefona gelir, kutulara dokununca yazılır. Hiçbir ağ isteği yapılmaz; her karar
 * oynatıcıdan sunucuya olay olarak gider.
 */
export function SchoolPortal(view: PortalView) {
  const t = getMessages().lab.login;
  const { login, page, on } = view;
  const inside = page === "home" || page === "homework";

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-scene-paper text-scene-ink" data-testid="school-portal" data-page={page}>
      <div className="flex h-[42px] flex-none items-end gap-0.5 bg-scene-paper px-2">
        <div className="flex h-[34px] max-w-[300px] min-w-0 items-center gap-2 rounded-t-[9px] bg-scene-white py-0 pr-1.5 pl-3 text-[13px] font-semibold">
          <Lock className="size-3.5 flex-none text-scene-school" strokeWidth={2.4} aria-hidden="true" />
          <span className="truncate">{format(t.tab, { school: login.school, site: login.site })}</span>
          <button
            type="button"
            onClick={on.closeTab}
            aria-label={t.closeTab}
            className="grid size-7 flex-none cursor-pointer place-items-center rounded-md hover:bg-scene-paper"
            data-testid="portal-close-tab"
          >
            <X className="size-3.5" strokeWidth={2.4} />
          </button>
        </div>
      </div>
      <div className="relative flex h-[46px] flex-none items-center gap-2 border-b border-scene-line bg-scene-white px-3">
        <ArrowLeft className="size-4 flex-none text-scene-ink-faint" strokeWidth={2.2} aria-label={t.back} />
        <span className="flex h-[34px] min-w-0 flex-1 items-center gap-2 overflow-hidden rounded-full bg-scene-paper px-3 text-[13px] whitespace-nowrap text-scene-ink-muted">
          <Lock className="size-3.5 flex-none text-scene-school" strokeWidth={2.4} aria-label={t.secure} />
          <span className="truncate">
            {rich(format(t.address, { domain: login.url, path: paths[page] }), {
              b: (chunk) => <b className="font-semibold text-scene-ink">{chunk}</b>,
            })}
          </span>
        </span>
        {view.savePrompt ? (
          <div
            role="dialog"
            aria-label={t.save.dialog}
            className="absolute top-[42px] right-3 z-[7] w-[min(340px,calc(100%-24px))] rounded-xl border border-scene-line-strong bg-scene-white px-4 py-3.5 text-scene-ink shadow-[0_14px_40px_var(--scene-shadow)] [animation:pop_.25s_ease-out_both]"
            data-testid="portal-save"
          >
            <b className="block text-[15px]">{t.save.title}</b>
            <small className="mt-1 mb-3 flex items-center gap-1.5 text-[12.5px] text-scene-ink-muted">
              <KeyRound className="size-3.5 flex-none" strokeWidth={2.2} aria-hidden="true" />
              <span className="truncate">
                {format(t.save.line, {
                  domain: login.url,
                  user: login.user,
                  dots: dots(8),
                })}
              </span>
            </small>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => on.save(false)}
                className="min-h-10 cursor-pointer rounded-[9px] border border-scene-line-strong bg-scene-white px-3.5 font-bold"
                data-testid="portal-save-no"
              >
                {t.save.no}
              </button>
              <button
                type="button"
                onClick={() => on.save(true)}
                className="min-h-10 cursor-pointer rounded-[9px] bg-scene-blue px-4 font-bold text-scene-white"
                data-testid="portal-save-yes"
              >
                {t.save.yes}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="relative min-h-0 flex-1 overflow-y-auto">
        {view.savePrompt ? <div aria-hidden="true" className="absolute inset-0 z-[6] bg-scene-scrim/40" /> : null}
        <header className="flex items-center gap-2.5 bg-scene-school px-[18px] py-2.5 text-scene-white">
          <span aria-hidden="true" className="grid size-[30px] flex-none place-items-center rounded-lg bg-scene-white font-heading font-bold text-scene-school">
            {login.school.slice(0, 1)}
          </span>
          <span className="min-w-0 flex-1">
            <b className="block font-heading text-[15px]">{login.site}</b>
            <small className="block truncate text-[11.5px] opacity-85">{login.school}</small>
          </span>
          {inside ? (
            <span className="relative">
              <button
                type="button"
                onClick={on.menu}
                aria-expanded={view.menu}
                aria-label={t.home.menu}
                className="flex min-h-10 cursor-pointer items-center gap-2 rounded-full bg-scene-white/15 px-3 font-bold"
                data-testid="portal-menu"
              >
                <User className="size-4" strokeWidth={2.4} aria-hidden="true" />
                {login.user}
                <ChevronDown className="size-4" strokeWidth={2.4} aria-hidden="true" />
              </button>
              {view.menu ? (
                <div className="absolute top-11 right-0 z-[5] w-[200px] rounded-xl border border-scene-line bg-scene-white p-1.5 text-scene-ink shadow-[0_12px_30px_var(--scene-shadow)]">
                  <MenuRow icon={User} label={t.home.profile} />
                  <MenuRow icon={MessageSquare} label={t.home.messages} />
                  <button
                    type="button"
                    onClick={on.logout}
                    className="flex min-h-[42px] w-full cursor-pointer items-center gap-2.5 rounded-b-lg border-t border-scene-line px-2.5 text-left text-sm font-bold text-scene-red hover:bg-scene-paper"
                    data-testid="portal-logout"
                  >
                    <LogOut className="size-4" strokeWidth={2.2} aria-hidden="true" />
                    {t.home.logout}
                  </button>
                </div>
              ) : null}
            </span>
          ) : null}
        </header>

        <div className="mx-auto max-w-[520px] px-5 py-7">
          {page === "login" || page === "bye" ? <SignIn view={view} /> : null}
          {page === "code" ? <CodeCheck view={view} /> : null}
          {page === "home" ? <Home view={view} /> : null}
          {page === "homework" ? <Homework view={view} /> : null}
        </div>
        {page === "homework" && view.picker ? <Picker view={view} /> : null}
      </div>
    </div>
  );
}

function MenuRow({ icon: Icon, label }: { icon: typeof User; label: string }) {
  return (
    <span className="flex min-h-[42px] items-center gap-2.5 rounded-lg px-2.5 text-sm text-scene-ink-muted">
      <Icon className="size-4" strokeWidth={2.2} aria-hidden="true" />
      {label}
    </span>
  );
}

function SignIn({ view }: { view: PortalView }) {
  const t = getMessages().lab.login.signIn;
  const { login, page, on } = view;
  const bye = page === "bye";
  // Çıkıştan sonra kullanıcı adı boş gelir; tarayıcı şifreyi kaydettiyse ikisi de dolu.
  const user = bye && !view.saved ? "" : login.user;
  const filled = view.pw || (bye && view.saved);
  return (
    <div className={card}>
      {bye ? (
        <p className="mb-3.5 rounded-[10px] bg-scene-school-soft px-3 py-2.5 text-sm text-scene-school-ink" data-testid="portal-bye">
          {rich(t.bye, { b: (chunk) => <b>{chunk}</b> })}
        </p>
      ) : null}
      {bye && view.saved ? (
        <p
          className="mb-3.5 rounded-[10px] border border-scene-amber-line bg-scene-amber-soft px-3 py-2.5 text-sm text-scene-amber-ink"
          data-testid="portal-bye-saved"
        >
          {t.byeSaved}
        </p>
      ) : null}
      <h3 className="mb-1 font-heading text-xl font-bold">{t.title}</h3>
      <p className="mb-3.5 text-sm text-scene-ink-muted">{t.text}</p>
      <span className="mt-2.5 mb-1.5 block text-[13px] font-bold text-scene-ink-2">{t.user}</span>
      <div className={cn(field, "bg-scene-paper", !user && "text-scene-ink-muted")}>{user || t.userPlaceholder}</div>
      <span className="mt-2.5 mb-1.5 block text-[13px] font-bold text-scene-ink-2">{t.password}</span>
      <button
        type="button"
        onClick={on.pw}
        className={cn(field, "cursor-pointer", filled || view.pwTyping ? "font-mono tracking-[0.2em]" : "text-scene-ink-muted")}
        data-testid="portal-password"
      >
        {filled ? dots(8) : view.pwTyping ? dots(view.pwTyping) : t.passwordPlaceholder}
      </button>
      {view.pwAsk ? (
        <div className="mt-2 rounded-[10px] border border-scene-info-line bg-scene-info-soft px-3 py-2.5 text-[13.5px] text-scene-info-ink [animation:pop_.2s_ease-out_both]">
          <b>{t.askTitle}</b>
          <br />
          {t.askText}
          <br />
          <button
            type="button"
            onClick={on.pwType}
            className="mt-2 min-h-10 cursor-pointer rounded-[9px] bg-scene-blue px-3.5 font-bold text-scene-white"
            data-testid="portal-password-type"
          >
            {t.askButton}
          </button>
        </div>
      ) : null}
      <button
        type="button"
        role="checkbox"
        aria-checked={view.remember}
        onClick={on.remember}
        className="mt-3.5 mb-1 flex min-h-10 cursor-pointer items-center gap-2.5 text-[14.5px] text-scene-ink"
        data-testid="portal-remember"
      >
        <span
          aria-hidden="true"
          className={cn(
            "grid size-[22px] place-items-center rounded-md border-2 text-scene-white",
            view.remember ? "border-scene-school bg-scene-school" : "border-scene-line-strong bg-scene-white",
          )}
        >
          {view.remember ? <Check className="size-3.5" strokeWidth={3} /> : null}
        </span>
        {t.remember}
      </button>
      <button type="button" onClick={on.login} disabled={!view.pw} className={greenButton} data-testid="portal-login">
        {t.button}
      </button>
    </div>
  );
}

function CodeCheck({ view }: { view: PortalView }) {
  const t = getMessages().lab.login.code;
  const digits = [...view.login.code.replace(/\s/g, "")];
  return (
    <div className={card}>
      <h3 className="mb-1 font-heading text-xl font-bold">{t.title}</h3>
      <p className="mb-3.5 text-sm text-scene-ink-muted">{t.text}</p>
      <div className="mt-1.5 flex gap-2">
        {digits.map((digit, i) => (
          <button
            key={i}
            type="button"
            onClick={view.on.code}
            aria-label={format(t.box, { n: i + 1 })}
            className="h-[52px] min-w-0 flex-1 cursor-pointer rounded-[10px] border border-scene-line-strong bg-scene-white font-mono text-[22px] font-bold text-scene-ink"
            data-testid="portal-code"
          >
            {i < view.codeTyped ? digit : ""}
          </button>
        ))}
      </div>
      {view.codeHint === "fill" ? <span className="mt-1.5 block text-[12.5px] text-scene-ink-muted">{t.fill}</span> : null}
      {view.codeHint === "phone" || view.codeHint === "talk" ? (
        <p
          role="status"
          className="mt-2.5 rounded-[9px] border border-scene-orange-line bg-scene-orange-soft px-2.5 py-2 text-[13px] text-scene-orange-ink"
          data-testid="portal-code-nudge"
        >
          {view.codeHint === "phone" ? t.phone : format(t.talk, { speaker: view.speaker })}
        </p>
      ) : null}
    </div>
  );
}

function Home({ view }: { view: PortalView }) {
  const t = getMessages().lab.login;
  const { login } = view;
  return (
    <div data-testid="portal-home">
      <h3 className="mb-1 font-heading text-[22px] font-bold">{format(t.home.welcome, { user: login.user })}</h3>
      <p className="mb-4 text-sm text-scene-ink-muted">{[login.group, login.school].filter(Boolean).join(" · ")}</p>
      {view.stillOpen ? (
        <p
          className="mb-3.5 rounded-[10px] border border-scene-amber-line bg-scene-amber-soft px-3 py-2.5 text-sm text-scene-amber-ink"
          data-testid="portal-still-open"
        >
          {t.home.stillOpen}
        </p>
      ) : null}
      <div className="flex items-center gap-3 rounded-xl border border-scene-line bg-scene-white px-3.5 py-3">
        <span aria-hidden="true" className="grid size-10 flex-none place-items-center rounded-[10px] bg-scene-violet-soft text-scene-violet">
          <ImageIcon className="size-5" strokeWidth={2} />
        </span>
        <span className="min-w-0 flex-1">
          <b className="block">{login.homework.title}</b>
          <small className="block text-[12.5px] text-scene-ink-muted">{login.homework.meta}</small>
        </span>
        {view.uploaded ? (
          <span className="text-[13px] font-bold text-scene-school">{t.home.delivered}</span>
        ) : (
          <button
            type="button"
            onClick={view.on.homework}
            className="min-h-10 cursor-pointer rounded-[9px] border border-scene-school bg-scene-white px-3.5 font-bold text-scene-school"
            data-testid="portal-homework"
          >
            {t.home.open}
          </button>
        )}
      </div>
      {login.news ? (
        <div className="mt-2.5 flex items-center gap-3 rounded-xl border border-scene-line bg-scene-white px-3.5 py-3">
          <span aria-hidden="true" className="grid size-10 flex-none place-items-center rounded-[10px] bg-scene-info-soft text-scene-blue">
            <Megaphone className="size-5" strokeWidth={2} />
          </span>
          <span className="min-w-0 flex-1">
            <b className="block">{t.home.news}</b>
            <small className="block text-[12.5px] text-scene-ink-muted">{login.news}</small>
          </span>
        </div>
      ) : null}
    </div>
  );
}

function Homework({ view }: { view: PortalView }) {
  const t = getMessages().lab.login.homework;
  const { login, on } = view;
  return (
    <div className={card} data-testid="portal-homework-page">
      <small className="text-[12.5px] text-scene-ink-muted">{format(t.crumb, { title: login.homework.title })}</small>
      <h3 className="mb-1 font-heading text-xl font-bold">{login.homework.title}</h3>
      <p className="mb-3.5 text-sm text-scene-ink-muted">{login.homework.meta}</p>
      {view.uploaded ? (
        <>
          <p className="mb-3.5 rounded-[10px] bg-scene-school-soft px-3 py-2.5 text-sm text-scene-school-ink" data-testid="portal-uploaded">
            {rich(format(t.done, { file: login.homework.file }), {
              b: (chunk) => <b>{chunk}</b>,
            })}
          </p>
          <button
            type="button"
            onClick={on.home}
            className="min-h-10 cursor-pointer rounded-[9px] border border-scene-school bg-scene-white px-3.5 font-bold text-scene-school"
          >
            {t.back}
          </button>
        </>
      ) : (
        <>
          <span className="mt-2.5 mb-1.5 block text-[13px] font-bold text-scene-ink-2">{t.file}</span>
          <button
            type="button"
            onClick={() => on.picker(true)}
            className={cn(field, "cursor-pointer gap-2", !view.file && "text-scene-ink-muted")}
            data-testid="portal-choose"
          >
            {view.file ? <FileText className="size-4 flex-none" strokeWidth={2.2} aria-hidden="true" /> : null}
            {view.file ? login.homework.file : t.choose}
          </button>
          {view.uploading ? (
            <div role="status" aria-label={t.uploading} className="mt-3.5 h-2.5 overflow-hidden rounded-full bg-scene-line">
              <span className="block h-full rounded-full bg-scene-school motion-safe:[animation:upload-bar_1.1s_ease-out_both]" />
            </div>
          ) : (
            <button type="button" onClick={on.upload} disabled={!view.file} className={greenButton} data-testid="portal-upload">
              {t.upload}
            </button>
          )}
        </>
      )}
    </div>
  );
}

function Picker({ view }: { view: PortalView }) {
  const t = getMessages().lab.login.homework;
  const { login, on } = view;
  return (
    <div className="absolute inset-0 z-[6] grid place-items-center bg-scene-scrim p-4" data-testid="portal-picker">
      <div
        role="dialog"
        aria-label={t.picker}
        className="w-[min(380px,100%)] overflow-hidden rounded-[14px] bg-scene-white shadow-[0_20px_50px_var(--scene-shadow)]"
      >
        <header className="flex items-center justify-between border-b border-scene-line py-2.5 pr-3 pl-4 font-bold">
          {t.picker}
          <button
            type="button"
            onClick={() => on.picker(false)}
            aria-label={getMessages().lab.stage.window.close}
            className="grid size-10 cursor-pointer place-items-center rounded-md hover:bg-scene-paper"
          >
            <X className="size-4" strokeWidth={2.2} />
          </button>
        </header>
        <div className="p-2">
          <button
            type="button"
            onClick={on.pick}
            className="flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-[9px] px-2.5 text-left text-sm hover:bg-scene-paper"
            data-testid="portal-pick"
          >
            <LoginAppIcon id="image" className="size-[30px]" />
            {login.homework.file}
            <small className="ml-auto text-xs text-scene-ink-muted">{login.homework.size}</small>
          </button>
          {login.homework.other ? (
            <span className="flex min-h-12 w-full items-center gap-3 rounded-[9px] px-2.5 text-sm opacity-55">
              <LoginAppIcon id="note" className="size-[30px]" />
              {login.homework.other}
              <small className="ml-auto text-xs text-scene-ink-muted">{t.wrongType}</small>
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
