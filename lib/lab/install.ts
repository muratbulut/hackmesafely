// Kurulum görevinin kuralları (Şehir Kapısı "Bu uygulama nereden geliyor?"): mesajdaki dosya,
// mağazadan kurulum, izin pencereleri ve ödev. Öğrencide sunucu eylemleri (lib/lab/actions.ts),
// yönetimdeki önizlemede tarayıcıdaki sürücü (components/lab/preview/local-driver.ts) aynı
// fonksiyonlarla karar verir. Veritabanına ve oturuma dokunmaz.

import type { Item, ScenarioContent, StoreApp } from "./content";
import { permissionKey, type SceneState } from "./events";
import { copyAlmostStory, fileAlmostStory, installAfter, installPrompts, type AlmostStory, type InstallAfter, type InstallPrompt } from "./story";

const appOf = (content: ScenarioContent, appId: string) => content.mission?.install?.apps.find((a) => a.id === appId) ?? null;

/** Bu öğenin eki kurulum görevindeki dosya mı (eki olan her mesaj; indirmek telefonun uyarısıyla başlar). */
export function opensFile(content: Pick<ScenarioContent, "mission">, item: Pick<Item, "attachment">) {
  return !!content.mission?.install && !!item.attachment;
}

/** Dosyayı kurmak: önce indirilmiş olmalı; kurmak "bilgi girildi" sayılır ve "Az kalsın" getirir. */
export function canInstallFile(content: ScenarioContent, state: SceneState, item: Item) {
  return opensFile(content, item) && (state.filesOpened ?? []).includes(item.id) && !state.infoEntered.includes(item.id);
}

export function fileAlmost(content: ScenarioContent): AlmostStory {
  return fileAlmostStory(content);
}

/** Mağazadan kurulum: her uygulama bir kez kurulur; izin pencereleri kurulunca söylenir. */
export function installApp(content: ScenarioContent, state: SceneState, appId: string): InstallPrompt[] | null {
  const app = appOf(content, appId);
  if (!app || (state.installed ?? []).includes(app.id)) return null;
  return installPrompts(app);
}

/** Sıradaki cevaplanmamış iznin sırası; hepsi cevaplandıysa izin sayısı. */
function nextPermission(app: StoreApp, state: SceneState) {
  const answered = state.permissions ?? {};
  const index = app.permissions.findIndex((_, i) => !(permissionKey(app.id, i) in answered));
  return index < 0 ? app.permissions.length : index;
}

/**
 * İzin penceresinde seçim: kurulu uygulamanın sıradaki izni ve geçerli bir seçenek olmalı.
 * Kopyada "Az kalsın" getiren seçenekte o ekranın metinleri döner; son izinden sonra ne açılacağı.
 */
export function permissionStep(
  content: ScenarioContent,
  state: SceneState,
  appId: string,
  index: number,
  choice: number,
): { almost: AlmostStory | null; after: InstallAfter | null } | null {
  const app = appOf(content, appId);
  if (!app || !(state.installed ?? []).includes(app.id)) return null;
  if (!Number.isInteger(index) || index !== nextPermission(app, state)) return null;
  const permission = app.permissions[index];
  if (!permission || !Number.isInteger(choice) || choice < 0 || choice >= permission.choices.length) return null;
  const almost = app.copy && permission.almost === choice ? copyAlmostStory(app) : null;
  return { almost, after: index === app.permissions.length - 1 ? installAfter(app) : null };
}

/** Hiç izni olmayan uygulama kurulunca hemen açılabilir. */
export function afterInstall(content: ScenarioContent, appId: string): InstallAfter | null {
  const app = appOf(content, appId);
  return app && app.permissions.length === 0 ? installAfter(app) : null;
}

/** Ödevi açmak: gerçek oyun kurulmuş ve bütün izinleri cevaplanmış olmalı. Ödevin "açıldı" cümlesi döner. */
export function openHomework(content: ScenarioContent, state: SceneState, appId: string): string | null {
  const app = appOf(content, appId);
  const game = content.mission?.install?.game;
  if (!app || !game || app.copy || !(state.installed ?? []).includes(app.id)) return null;
  if (nextPermission(app, state) < app.permissions.length) return null;
  return game.done;
}
