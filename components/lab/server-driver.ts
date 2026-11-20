import {
  answerCode,
  answerTalk,
  answerPermission,
  checkTrainingAnswer,
  checkTrainingPlacement,
  checkTrainingSpot,
  closeAd,
  connectWifi,
  finishSetup,
  installUpdate,
  getTrainingHint,
  finishAttempt,
  leaveDesk,
  installApp,
  installFile,
  openFile,
  openHomework,
  openLink,
  payShop,
  restartAttempt,
  restartTraining,
  saveTrainingProgress,
  sendEvents,
  sendForm,
  sendReply,
  shipOrder,
  startAttempt,
  submitTrap,
} from "@/lib/lab/actions";
import type { LabDriver, TrainingDriver } from "./driver";

/** Öğrencinin sürücüsü: her şey sunucu eylemleriyle (puan ve rapor sunucuda hesaplanır). */
export function serverDriver(slug: string): LabDriver {
  return {
    start: () => startAttempt(slug),
    restart: () => restartAttempt(slug),
    send: (attemptId, batch) => sendEvents(attemptId, batch),
    openLink,
    submitTrap,
    sendReply,
    payShop,
    answerCode,
    shipOrder,
    sendForm,
    answerTalk,
    leaveDesk,
    openFile,
    installFile,
    installApp,
    answerPermission,
    openHomework,
    connectWifi,
    installUpdate,
    closeAd,
    finishSetup,
    finish: finishAttempt,
  };
}

/** Öğrencinin eğitim sürücüsü: doğru cevaplar sunucuda kalır. */
export function serverTrainingDriver(slug: string): TrainingDriver {
  return {
    spot: (cardId, part) => checkTrainingSpot(slug, cardId, part),
    hint: (cardId, found, n) => getTrainingHint(slug, cardId, found, n),
    answer: (cardId, option) => checkTrainingAnswer(slug, cardId, option),
    place: (cardId, picks) => checkTrainingPlacement(slug, cardId, picks),
    save: (cardIndex) => saveTrainingProgress(slug, cardIndex),
    restart: () => restartTraining(slug),
  };
}
