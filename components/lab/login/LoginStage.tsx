"use client";

import { Computer } from "@/components/device/Computer";
import { BellRing, Smartphone } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ClientMission, ClientStage } from "@/lib/lab/client";
import type { SceneState } from "@/lib/lab/events";
import { format, getMessages, rich } from "@/lib/i18n";
import { prefersReducedMotion } from "@/lib/motion";
import { bellTone, smsTone } from "../mission/tones";
import { RichLine } from "../scene/parts";
import { readMuted } from "../sound";
import { DeskPhone, type PhoneNotice } from "../stage/DeskPhone";
import { useClock, useOwner } from "../stage/common";
import { LoginDesktop, type LoginWin, type LoginWinId } from "./LoginDesktop";
import { SchoolPortal, type PortalPage, type PortalView } from "./SchoolPortal";
import "../stage/stage.css";

/** Giriş yapınca kodun telefona gelmesi, zilin çalması ve noktaların yazılması için beklemeler (ms). */
const SMS_MS = 1300;
const BELL_MS = 2600;
const UPLOAD_MS = 1100;
const TALK_MS = 700;
const PW_STEP_MS = 110;
const CODE_STEP_MS = 160;

type Wins = Record<LoginWinId, { open: boolean; min: boolean }>;
type LeaveResult = "left" | "almost" | null;

export type LoginStageProps = {
  stage: ClientStage;
  mission: ClientMission;
  login: NonNullable<ClientMission["login"]>;
  /** Öğrencinin profildeki avatarı (emoji): kilit ekranında. */
  avatar: string;
  state: SceneState;
  /** Yarım kalan denemeye dönülünce bilgisayar açık, not okunmuş başlar. */
  resumed: boolean;
  /** Kodu isteyen arkadaşın adı ve sorusu cevaplandı mı (cevaplanmadan kod yazılmaz). */
  speaker: string;
  talkAnswered: boolean;
  onNoteOk: () => void;
  onLogin: (remember: boolean) => void;
  onVerified: () => void;
  onSave: (saved: boolean) => void;
  onUploaded: () => void;
  onLogout: () => void;
  /** Kod geldi, telefon masaya bırakıldı (ya da kod kutusuna dokunuldu): arkadaş konuşur. */
  onTalk: () => void;
  /** Zil çaldı, kalktı; closed: tarayıcıyı kapatmıştı. */
  onLeave: (closed: boolean) => Promise<LeaveResult>;
  /** Telefon genişliğinde "Bırak" düğmesinin yeri (oynatıcının şeridi). */
  barSlot?: HTMLElement | null;
};

/**
 * Giriş görevli odanın sahnesi (Şehir Kapısı "Okul bilgisayarında giriş yap ve çık"; T2: bilgisayar
 * ve masadaki telefon). Sınıfın ortak bilgisayarı kilitli açılır; oturum açınca öğretmenin notu,
 * sonra tarayıcıda okulun portalı gelir. Giriş kodu telefona düşer; kodu yazmadan önce yandaki
 * arkadaş kodu ister (T3 konuşma, oynatıcı açar). Ödev yüklenince zil çalar, öğrenci kalkar.
 * Burada doğru ya da yanlış bilinmez: her karar oynatıcıdan sunucuya gider; çıkış yapmadan
 * kalkınca "Az kalsın"ı sunucu söyler.
 */
export function LoginStage(props: LoginStageProps) {
  const { stage, mission, login, state, resumed, talkAnswered } = props;
  const t = getMessages().lab.login;
  const clock = useClock();
  const owner = useOwner(stage.owner);
  const code = login.code.replace(/\s/g, "");
  const signedIn = state.remember !== null;
  const open = state.verified && !state.loggedOut;

  const [unlocked, setUnlocked] = useState(resumed && !state.left);
  const [noteOk, setNoteOk] = useState(resumed);
  const [wins, setWins] = useState<Wins>(() => ({
    browser: { open: resumed && !state.left, min: false },
    note: { open: resumed && !state.left, min: true },
    image: { open: false, min: false },
  }));
  const [front, setFront] = useState<{ id: LoginWinId; n: number } | null>(null);
  const [page, setPage] = useState<PortalPage>(() => (state.loggedOut ? "bye" : state.verified ? "home" : signedIn ? "code" : "login"));
  const [pw, setPw] = useState(signedIn && !state.loggedOut);
  const [pwAsk, setPwAsk] = useState(false);
  const [pwTyping, setPwTyping] = useState(0);
  const [remember, setRemember] = useState(state.remember ?? true);
  const [sms, setSms] = useState(signedIn);
  const [smsSeen, setSmsSeen] = useState(signedIn);
  const [inHand, setInHand] = useState(false);
  const [nudge, setNudge] = useState(false);
  const [codeTyped, setCodeTyped] = useState(state.verified ? code.length : 0);
  const [menu, setMenu] = useState(false);
  const [picker, setPicker] = useState(false);
  const [file, setFile] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [bell, setBell] = useState(state.uploaded && !state.left);
  const [leaving, setLeaving] = useState(false);
  const [notice, setNotice] = useState<PhoneNotice | null>(null);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);
  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, prefersReducedMotion() ? Math.min(ms, 100) : ms));
  }, []);

  function show(id: LoginWinId) {
    setWins((all) => ({ ...all, [id]: { open: true, min: false } }));
    setFront((f) => ({ id, n: (f?.n ?? 0) + 1 }));
  }

  /** Tarayıcı yeniden açılınca portal: oturum açıksa içeri alır, çıkış yaptıysa güle güle sayfası. */
  function openBrowser() {
    // Küçültülmüş pencere kaldığı sayfayla geri gelir; kapatılıp açılan tarayıcı portalın girişine gider.
    if (!wins.browser.open) {
      if (open) setPage("home");
      else if (state.loggedOut) setPage("bye");
    }
    show("browser");
  }

  function openWin(id: LoginWinId) {
    if (id === "browser") openBrowser();
    else show(id);
  }

  function closeWin(id: LoginWinId) {
    setWins((all) => ({ ...all, [id]: { open: false, min: false } }));
    if (id === "browser") setMenu(false);
  }

  function minWin(id: LoginWinId) {
    setWins((all) => ({ ...all, [id]: { ...all[id], min: true } }));
  }

  function unlock() {
    setUnlocked(true);
    show("note");
  }

  function acceptNote() {
    setNoteOk(true);
    props.onNoteOk();
    setWins((all) => ({ ...all, note: { open: true, min: true } }));
    openBrowser();
  }

  // Şifre kutusu: gerçek şifre hiç yazılmaz, noktalar kendiliğinden dolar.
  function typePassword() {
    setPwAsk(false);
    let n = 0;
    const step = () => {
      n += 1;
      setPwTyping(n);
      if (n >= 8) {
        setPwTyping(0);
        setPw(true);
      } else later(step, PW_STEP_MS);
    };
    later(step, PW_STEP_MS);
  }

  function submitLogin() {
    if (!pw) return;
    props.onLogin(remember);
    // Bu bilgisayar portalı bir kez tanıdı: çıkıştan sonra yeniden girince kod sorulmaz.
    if (state.verified) {
      props.onVerified();
      setPage("home");
      return;
    }
    setPage("code");
    later(() => {
      setSms(true);
      setNotice({
        app: "messages",
        title: login.site,
        text: format(t.code.notice, { code: login.code }),
        key: Date.now(),
      });
      if (!readMuted()) smsTone();
    }, SMS_MS);
  }

  function pickPhone() {
    setInHand(true);
    if (sms) setSmsSeen(true);
    setNudge(false);
  }

  function dropPhone() {
    setInHand(false);
    if ((sms || smsSeen) && !talkAnswered && page === "code") later(props.onTalk, TALK_MS);
  }

  function tapCode() {
    if (!smsSeen) return setNudge(true);
    if (!talkAnswered) return props.onTalk();
    if (codeTyped > 0) return;
    let n = 0;
    const step = () => {
      n += 1;
      setCodeTyped(n);
      if (n < code.length) return later(step, CODE_STEP_MS);
      later(() => {
        props.onVerified();
        setPage("home");
      }, 450);
    };
    later(step, CODE_STEP_MS);
  }

  function upload() {
    setUploading(true);
    later(() => {
      setUploading(false);
      props.onUploaded();
      later(() => {
        setBell(true);
        if (!readMuted()) bellTone();
      }, BELL_MS);
    }, UPLOAD_MS);
  }

  function logout() {
    setMenu(false);
    setPw(false);
    setPage("bye");
    props.onLogout();
  }

  async function leave() {
    if (leaving) return;
    setLeaving(true);
    // Tarayıcıyı kapatmak ya da küçültmek çıkış değildir; Az kalsın'daki "Sen" kutusu için.
    const closed = !wins.browser.open || wins.browser.min;
    const result = await props.onLeave(closed);
    setLeaving(false);
    if (result === "left") {
      setBell(false);
      setInHand(false);
      setUnlocked(false);
      setWins({
        browser: { open: false, min: false },
        note: { open: false, min: false },
        image: { open: false, min: false },
      });
    } else if (result === "almost") {
      closeWin("browser");
    }
  }

  const codeHint: PortalView["codeHint"] =
    page !== "code" ? null : nudge ? "phone" : smsSeen && !talkAnswered ? "talk" : smsSeen && codeTyped === 0 ? "fill" : null;
  const portal: PortalView = {
    login,
    page,
    pw,
    pwTyping,
    pwAsk,
    remember,
    saved: state.passwordSaved === true,
    codeTyped,
    codeHint,
    speaker: props.speaker,
    uploaded: state.uploaded,
    stillOpen: state.leftOpen > 0 && open,
    menu,
    file,
    picker,
    uploading,
    savePrompt: state.verified && state.passwordSaved === null && (page === "home" || page === "homework"),
    on: {
      pw: () => !pw && !pwTyping && page === "login" && setPwAsk(true),
      pwType: typePassword,
      remember: () => setRemember((r) => !r),
      login: submitLogin,
      code: tapCode,
      menu: () => setMenu((m) => !m),
      logout,
      homework: () => setPage("homework"),
      home: () => setPage("home"),
      picker: setPicker,
      pick: () => {
        setFile(true);
        setPicker(false);
      },
      upload,
      save: props.onSave,
      closeTab: () => closeWin("browser"),
    },
  };
  // Çıkış sayfasından yeniden girilebilir (ödev yüklenmeden çıkan öğrenci takılmasın).
  if (page === "bye") portal.on.pw = () => !pw && !pwTyping && setPwAsk(true);

  const note = (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-scene-note px-5 py-[18px] text-[14.5px] text-scene-note-ink" data-testid="login-note">
      {login.note.heading ? <h4 className="mb-0.5 font-heading text-[17px] font-bold">{login.note.heading}</h4> : null}
      {login.note.from ? <div className="mb-3 text-[12.5px] text-scene-note-muted">{login.note.from}</div> : null}
      <ul className="mb-3.5 grid gap-2">
        {mission.points.map((point, i) => (
          <li key={point} className="flex items-start gap-2.5">
            <span aria-hidden="true" className="grid size-6 flex-none place-items-center rounded-[7px] bg-scene-note-chip font-mono text-xs font-bold">
              {i + 1}
            </span>
            <span>
              <RichLine text={point} />
            </span>
          </li>
        ))}
      </ul>
      {noteOk ? (
        <span className="text-[13px] text-scene-note-muted">{t.noteInPanel}</span>
      ) : (
        <button
          type="button"
          onClick={acceptNote}
          className="min-h-11 cursor-pointer self-start rounded-xl bg-stage-road px-5 font-bold text-stage-road-ink"
          data-testid="login-note-ok"
        >
          {mission.accept}
        </button>
      )}
    </div>
  );

  const image = (
    <div className="flex min-h-0 flex-1 flex-col bg-scene-body">
      <div className="grid min-h-0 flex-1 place-items-center p-3.5">
        {login.homework.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- sitenin kendi resmi, boyutu pencereden gelir
          <img
            src={login.homework.image}
            alt={login.homework.title}
            draggable={false}
            className="max-h-full max-w-full rounded-sm shadow-[0_10px_30px_var(--stage-shadow)]"
          />
        ) : null}
      </div>
      <div className="flex flex-none justify-between gap-2 border-t border-stage-os-line px-3 py-2 text-xs text-stage-os-fg-2">
        <span>{[login.homework.file, login.homework.size].filter(Boolean).join(" · ")}</span>
        <span>{t.yourFile}</span>
      </div>
    </div>
  );

  const desktopWins: Record<LoginWinId, LoginWin> = {
    browser: {
      ...wins.browser,
      title: format(t.tab, { school: login.school, site: login.site }),
      label: getMessages().lab.stage.browser,
      node: <SchoolPortal {...portal} />,
    },
    note: {
      ...wins.note,
      title: login.note.title,
      label: login.note.title,
      node: note,
    },
    image: {
      ...wins.image,
      title: format(t.viewer, { file: login.homework.file }),
      label: login.homework.file,
      node: image,
    },
  };

  const phoneNotice = useMemo(() => (inHand || smsSeen ? null : notice), [inHand, smsSeen, notice]);

  return (
    <div
      className="st-stage st-login st-wood relative flex min-h-0 flex-1 flex-col overflow-hidden"
      data-stage="t2"
      data-hand={inHand ? "true" : "false"}
      data-testid="login-stage"
    >
      <span aria-hidden="true" className="st-lamp" />
      {/* eslint-disable-next-line @next/next/no-img-element -- süs görseli */}
      <img src="/stage/mug.webp" alt={""} aria-hidden="true" draggable={false} className="st-prop st-prop-mug" />
      <Computer className="st-monitor" inert={inHand}>
        <LoginDesktop
          computer={login.computer}
          owner={owner}
          avatar={props.avatar}
          unlocked={unlocked}
          onUnlock={unlock}
          wins={desktopWins}
          front={front}
          onOpen={openWin}
          onClose={closeWin}
          onMin={minWin}
          desktopIcons={[
            { id: "browser", label: getMessages().lab.stage.browser },
            { id: "note", label: login.note.title },
            { id: "image", label: login.homework.file },
          ]}
        />
      </Computer>

      {inHand ? <button type="button" aria-label={t.phone.drop} onClick={dropPhone} className="absolute inset-0 z-[11] cursor-pointer" /> : null}
      <DeskPhone place="t2" inHand={inHand} onPick={pickPhone} onDrop={dropPhone} notice={phoneNotice} barSlot={props.barSlot}>
        <div className="flex min-h-0 flex-1 flex-col bg-scene-white" data-testid="login-phone-screen">
          {sms ? (
            <>
              <h5 className="flex h-14 flex-none items-center gap-2.5 border-b border-scene-line px-4 font-bold text-scene-ink">
                <span aria-hidden="true" className="grid size-8 place-items-center rounded-full bg-scene-school text-xs font-bold text-scene-white">
                  {login.site.slice(0, 1)}
                </span>
                {login.site}
              </h5>
              <div className="flex flex-col gap-2 p-4">
                <small className="text-center text-xs text-scene-ink-muted">{format(t.code.today, { time: clock.time })}</small>
                <p className="max-w-[85%] rounded-2xl rounded-bl-md bg-scene-bubble px-3.5 py-2.5 text-[15px] text-scene-ink" data-testid="login-sms">
                  {rich(format(t.code.sms, { site: login.site, code: login.code }), { b: (chunk) => <b>{chunk}</b> })}
                  <br />
                  <span className="text-[13px] text-scene-ink-muted">{t.code.smsNote}</span>
                </p>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-scene-ink-muted">
              <Smartphone className="size-10" strokeWidth={1.8} aria-hidden="true" />
              <span className="text-sm">{getMessages().lab.stage.phone.noNews}</span>
            </div>
          )}
        </div>
      </DeskPhone>

      {bell ? (
        <div
          role="alert"
          className="absolute top-4 right-3 z-[8] flex w-[172px] flex-col gap-2.5 rounded-2xl border border-stage-road bg-stage-os-glass p-3.5 text-sm text-stage-os-fg shadow-[0_10px_30px_var(--stage-shadow)] [animation:pop_.3s_ease-out_both] max-lg:top-auto max-lg:right-2 max-lg:bottom-2 max-lg:w-[180px] max-lg:gap-1.5 max-lg:p-2.5 max-lg:text-[12.5px]"
          data-testid="login-bell"
        >
          <span className="flex items-start gap-2">
            <BellRing className="size-5 flex-none text-stage-road motion-safe:[animation:bell-ring_.5s_ease-in-out_4]" strokeWidth={2.2} aria-hidden="true" />
            <span>
              <RichLine text={login.bell.text} />
            </span>
          </span>
          <button
            type="button"
            onClick={() => void leave()}
            disabled={leaving}
            className="flex min-h-11 cursor-pointer items-center justify-center rounded-[10px] bg-stage-road px-2.5 text-center leading-tight font-bold text-stage-road-ink disabled:opacity-60 max-lg:min-h-10"
            data-testid="login-leave"
          >
            {login.bell.button}
          </button>
        </div>
      ) : null}
    </div>
  );
}
