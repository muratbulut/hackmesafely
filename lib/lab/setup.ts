// Telefon kurulumunun kuralları (Şehir Kapısı "Yeni telefonunu kur", kurulum görevinin bir türü):
// Wi‑Fi, sistem güncellemesi, uygulamanın içindeki reklam ve görevi bitiren "Kurdum!". Mağaza ve
// izin pencereleri kurulum göreviyle aynıdır (lib/lab/install.ts). Öğrencide sunucu eylemleri
// (lib/lab/actions.ts), yönetimdeki önizlemede tarayıcıdaki sürücü aynı fonksiyonlarla karar verir.

import { setupOf, type ScenarioContent, type Setup } from "./content";
import { permissionKey, type SceneState } from "./events";

/**
 * Ağa dokununca ne olur: evin ağı bağlanır (joined), açık ağ bağlanır ama not gelir (open; kurulum
 * evin ağına geçmeden sürmez), şifresi bilinmeyen kilitli ağ bağlanmaz (unknown). Kilitli ağda
 * şifre kutusu önce tarayıcıda açılır; `password` kutunun doldurulduğunu söyler (şifre gelmez).
 */
export type WifiResult =
  | { status: "joined" }
  | { status: "open"; note: Setup["wifi"]["openNote"] }
  | { status: "unknown"; text: string };

/** Evin ağına bağlı mı? */
export function homeConnected(content: Pick<ScenarioContent, "mission">, state: Pick<SceneState, "wifi">) {
  const setup = setupOf(content);
  if (!setup) return false;
  return (state.wifi ?? []).some((i) => setup.wifi.networks[i]?.home);
}

/** Açık (şifresiz) bir ağa bağlandı mı? */
export function openConnected(content: Pick<ScenarioContent, "mission">, state: Pick<SceneState, "wifi">) {
  const setup = setupOf(content);
  if (!setup) return false;
  return (state.wifi ?? []).some((i) => {
    const net = setup.wifi.networks[i];
    return !!net && !net.locked && !net.home;
  });
}

/** Ağa bağlanmak: geçersizse null; olay yazılacaksa `record` doğrudur. */
export function connectWifi(
  content: ScenarioContent,
  state: SceneState,
  index: number,
  password: boolean,
): { result: WifiResult; record: boolean } | null {
  const setup = setupOf(content);
  if (!setup || !Number.isInteger(index) || homeConnected(content, state)) return null;
  const net = setup.wifi.networks[index];
  if (!net) return null;
  if (net.locked && !password) return null;
  if (net.home) return { result: { status: "joined" }, record: true };
  if (net.locked) return { result: { status: "unknown", text: setup.wifi.unknown }, record: false };
  return { result: { status: "open", note: setup.wifi.openNote }, record: true };
}

/** Güncellemeyi yüklemek: evin ağına bağlı ve henüz yüklenmemiş olmalı; "yüklendi" cümlesi döner. */
export function installUpdate(content: ScenarioContent, state: SceneState): string | null {
  const setup = setupOf(content);
  if (!setup || state.updated || !homeConnected(content, state)) return null;
  return setup.update.done;
}

/** Reklamı × ile kapatmak: reklamın uygulaması kurulu ve temizleyici kurulmamış olmalı. */
export function canCloseAd(content: ScenarioContent, state: SceneState, itemId: string) {
  const setup = setupOf(content);
  if (!setup || setup.ad.item !== itemId) return false;
  return (state.installed ?? []).includes(setup.ad.app) && !state.infoEntered.includes(itemId);
}

/**
 * Kurulum bitti mi ("Kurdum!" denebilir mi): evin ağı, güncelleme, gerçek uygulamaların hepsi
 * kurulu ve izinleri cevaplanmış. Bildirim tarayıcıda da bu kuralla görünür (doğru seçenek değil,
 * yalnızca yapılıp yapılmadığı).
 */
export function setupReady(content: Pick<ScenarioContent, "mission">, state: SceneState) {
  const setup = setupOf(content);
  const apps = content.mission?.install?.apps ?? [];
  if (!setup || !homeConnected(content, state) || !state.updated) return false;
  const permissions = state.permissions ?? {};
  return apps
    .filter((a) => !a.copy)
    .every((a) => (state.installed ?? []).includes(a.id) && a.permissions.every((_, i) => permissionKey(a.id, i) in permissions));
}

export function canFinishSetup(content: ScenarioContent, state: SceneState) {
  return setupReady(content, state) && !state.setupFinished;
}
