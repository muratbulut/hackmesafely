"use client";

import { MessageCircle } from "lucide-react";
import { Computer } from "@/components/device/Computer";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ClientStage } from "@/lib/lab/client";
import { getMessages } from "@/lib/i18n";
import { StagePhoneContext, type StagePhone } from "./common";
import { DeskPhone, type PhoneNotice } from "./DeskPhone";
import { Desktop, type ExtraApp } from "./Desktop";
import "./stage.css";

export type StageViewProps = {
  stage: ClientStage;
  /** Odanın uygulaması: M1 ve T2'de Postam penceresi, T1'de telefonun ekranı (tarayıcı sayfası içinde). */
  appNode: ReactNode;
  /** M1 ve T2: bağlantıdan açılan sayfa, tarayıcı penceresinde. */
  browserNode: ReactNode | null;
  onCloseBrowser: () => void;
  /** T1: telefon masadayken ekranında görünen ilk bildirim (ilk mesaj). */
  firstNotice: { title: string; text: string } | null;
  /** Yarım kalan denemeye dönülünce bilgisayar açık, telefon elde başlar. */
  resumed: boolean;
  /** Telefon genişliğinde oynatıcının şeridindeki yer: eldeki telefonun "Bırak" düğmesi. */
  barSlot?: HTMLElement | null;
  /** M1 ve T2: masaüstünde odanın ikinci uygulaması (takip görevinde kargo uygulaması). */
  extraApp?: ExtraApp | null;
  /** T2: telefona düşen ekranlar (sesli mesajlı görevin konuşması); telefonun bağlamında çizilir. */
  phoneNode?: ReactNode;
  /** T2: bilgisayara dokunulamaz (hacklendikten sonra görevi verenin mesajı beklenirken). */
  deskLocked?: boolean;
};

/**
 * Odanın sahnesi (oda sahne şablonu, docs/design/room-scene-template.md): M1 kurgusal masaüstü,
 * T1 masadaki telefon, T2 masaüstü ve yanında masadaki telefon. T3 konuşma soru görevinde açılır
 * (TalkScene). Sahne yalnızca görünüştür: her eylem yine oynatıcıdan sürücüye gider.
 */
export function StageView({ stage, appNode, browserNode, onCloseBrowser, firstNotice, resumed, barSlot = null, extraApp = null, phoneNode = null, deskLocked = false }: StageViewProps) {
  if (stage.type === "PHONE")
    return (
      <PhoneDesk firstNotice={firstNotice} resumed={resumed} barSlot={barSlot}>
        {appNode}
      </PhoneDesk>
    );
  const desktop = (
    <Desktop
      owner={stage.owner}
      password={stage.password}
      app="postam"
      appNode={appNode}
      browserNode={browserNode}
      onCloseBrowser={onCloseBrowser}
      startUnlocked={resumed}
      extra={extraApp}
    />
  );
  if (stage.type === "DESKTOP")
    return (
      <div className="st-stage flex min-h-0 flex-1 flex-col" data-stage="m1">
        {desktop}
      </div>
    );
  return (
    <DesktopPhone barSlot={barSlot} phoneNode={phoneNode} deskLocked={deskLocked}>
      {desktop}
    </DesktopPhone>
  );
}

/** Masanın üstündeki eşyalar (3B çizim, gerçek ışık ve gölge): defter sol üst, kupa sağ üst, kalem sol alt, kulaklık sağ alt. */
function DeskProps({ only }: { only?: "mug" }) {
  const items = only ? (["mug"] as const) : (["notebook", "mug", "pencil", "earbuds"] as const);
  return (
    <>
      {items.map((name) => (
        // eslint-disable-next-line @next/next/no-img-element -- süs görseli, boyutu sahneden gelir
        <img key={name} src={`/stage/${name}.webp`} alt={""} aria-hidden="true" draggable={false} className={`st-prop st-prop-${name}`} />
      ))}
    </>
  );
}

/** T1: üstten görülen ahşap masa, ortada telefon. Öğrenci telefonu alır, Mesajlar telefonda açılır. */
function PhoneDesk({
  children,
  firstNotice,
  resumed,
  barSlot,
}: {
  children: ReactNode;
  firstNotice: StageViewProps["firstNotice"];
  resumed: boolean;
  barSlot: HTMLElement | null;
}) {
  const t = getMessages().lab;
  const [inHand, setInHand] = useState(resumed);
  const notice: PhoneNotice | null = useMemo(
    () =>
      firstNotice
        ? {
            app: "messages",
            title: firstNotice.title || t.messaging.app,
            text: firstNotice.text,
            key: 1,
          }
        : null,
    [firstNotice, t.messaging.app],
  );
  const [seen, setSeen] = useState(resumed);
  return (
    <div className="st-stage st-wood relative flex min-h-0 flex-1 flex-col overflow-hidden" data-stage="t1" data-hand={inHand ? "true" : "false"}>
      <span aria-hidden="true" className="st-lamp" />
      <DeskProps />
      <DeskPhone
        place="t1"
        inHand={inHand}
        onPick={() => {
          setInHand(true);
          setSeen(true);
        }}
        onDrop={() => setInHand(false)}
        notice={seen ? null : notice}
        barSlot={barSlot}
      >
        {children}
      </DeskPhone>
    </div>
  );
}

/**
 * T2: ekranı neredeyse tam boy masaüstü, yanında masada telefon. Telefona bir şey düşünce
 * (velinin onay SMS'i) telefon titrer; öğrenci alır, bakar, bırakır. Ekranın içeriği
 * StagePhoneContext ile gelir (components/lab/mission/MissionSms.tsx).
 */
function DesktopPhone({
  children,
  barSlot,
  phoneNode,
  deskLocked,
}: {
  children: ReactNode;
  barSlot: HTMLElement | null;
  phoneNode: ReactNode;
  deskLocked: boolean;
}) {
  const t = getMessages().lab.stage.phone;
  const [inHand, setInHand] = useState(false);
  const [notice, setNotice] = useState<PhoneNotice | null>(null);
  const [screen, setScreen] = useState<HTMLDivElement | null>(null);
  const [busy, setBusy] = useState(false);
  const keyRef = useRef(0);

  // Telefon eldeyken gelen mesaj ekranda görülür: masaya dönünce "Telefonu al" çıkmaz.
  const handRef = useRef(false);
  useEffect(() => {
    handRef.current = inHand;
  }, [inHand]);
  const notify = useCallback((title: string, text: string) => {
    setBusy(true);
    setNotice(handRef.current ? null : { app: "messages", title, text, key: ++keyRef.current });
  }, []);
  const putDown = useCallback(() => {
    setInHand(false);
    setNotice(null);
    setBusy(false);
  }, []);
  const keep = useCallback(() => setBusy(true), []);
  const phone: StagePhone = useMemo(() => ({ screen, notify, putDown, keep }), [screen, notify, putDown, keep]);

  return (
    <StagePhoneContext.Provider value={phone}>
      <div className="st-stage st-wood relative flex min-h-0 flex-1 flex-col overflow-hidden" data-stage="t2" data-hand={inHand ? "true" : "false"}>
        <span aria-hidden="true" className="st-lamp" />
        <DeskProps only="mug" />
        <Computer className="st-monitor" inert={inHand || deskLocked}>
          {children}
        </Computer>
        {phoneNode}
        <DeskPhone
          place="t2"
          inHand={inHand}
          onPick={() => {
            // Alınan telefonun bildirimi görülmüştür: masaya dönünce "Telefonu al" yeniden çıkmaz.
            setInHand(true);
            setNotice(null);
          }}
          onDrop={() => setInHand(false)}
          notice={inHand ? null : notice}
          barSlot={barSlot}
        >
          <div ref={setScreen} className="flex min-h-0 flex-1 flex-col" />
          {busy ? null : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-scene-paper p-6 text-center text-scene-ink-muted">
              <MessageCircle className="size-10" strokeWidth={1.8} aria-hidden="true" />
              <span className="text-sm">{t.noNews}</span>
            </div>
          )}
        </DeskPhone>
      </div>
    </StagePhoneContext.Provider>
  );
}
