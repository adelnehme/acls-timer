import { useEffect, useRef, useCallback } from 'react';
import { useResuscitationStore } from '../stores/resuscitationStore';
import { useAudio } from './useAudio';
import { useWakeLock } from './useWakeLock';
import { getCycleDurationMs, getEpiIntervalMs, isAmiodaroneSuggested, isEpinephrineDue } from '../engine/acls';
import { saveSession } from '../db/database';

const TICK_INTERVAL = 100; // 100ms
const COUNTDOWN_WARN_SEC = 10;
const ABG_REMINDER_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const REVERSIBLE_CAUSES_REMINDER_MS = 5 * 60 * 1000; // 5 minutes

export function useResuscitation() {
  const store = useResuscitationStore();
  const { play } = useAudio();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastCountdownSecRef = useRef<number | null>(null);
  const cycleExpiredRef = useRef(false);
  const lastSaveRef = useRef(0);
  const epiAlertFiredRef = useRef(false);
  const epiPopupShownRef = useRef(false);
  const lastAmioAlertRef = useRef(0);
  const amioPopupShownForDoseRef = useRef(0); // track which dose count we showed popup for
  const lastAbgReminderRef = useRef(0);
  const lastReversibleCausesReminderRef = useRef(0);

  // Keep screen awake during active resuscitation
  useWakeLock(store.isActive);

  const tick = useCallback(() => {
    const state = useResuscitationStore.getState();
    const { session, isActive } = state;
    if (!session || !isActive) return;

    const now = Date.now();
    const masterElapsed = now - session.startTime;
    const epiInterval = getEpiIntervalMs();

    // Calculate cycle remaining
    const currentCycle = session.cycles[session.cycles.length - 1];
    const cycleElapsed = currentCycle ? now - currentCycle.startTime : 0;
    const cycleDuration = getCycleDurationMs();
    const cycleRemaining = Math.max(0, cycleDuration - cycleElapsed);

    // Calculate epi countdown
    let epiCountdown: number | null = null;
    if (session.lastEpinephrineTime) {
      const epiElapsed = now - session.lastEpinephrineTime;
      epiCountdown = Math.max(0, epiInterval - epiElapsed);
    }

    // Update timer display values
    useResuscitationStore.getState().updateTimerValues({
      masterElapsed,
      cycleRemaining,
      epiCountdown,
    });

    // Audio: 10-second countdown ticks
    const cycleRemainingSeconds = Math.floor(cycleRemaining / 1000);
    if (
      cycleRemainingSeconds <= COUNTDOWN_WARN_SEC &&
      cycleRemainingSeconds > 0 &&
      cycleRemainingSeconds !== lastCountdownSecRef.current
    ) {
      lastCountdownSecRef.current = cycleRemainingSeconds;
      play('countdownTick');
    }

    // Audio: Cycle complete
    if (cycleRemaining <= 0 && !cycleExpiredRef.current) {
      cycleExpiredRef.current = true;
      lastCountdownSecRef.current = null;
      play('cycleComplete');

      // Auto-show rhythm check modal
      useResuscitationStore.getState().setShowRhythmCheckModal(true);
    }

    // === EPINEPHRINE ALERTS ===
    const epiDue = isEpinephrineDue(session);
    if (epiDue) {
      // Show popup when epi becomes due
      if (!epiPopupShownRef.current) {
        epiPopupShownRef.current = true;
        useResuscitationStore.getState().setEpiAlertVisible(true);
      }
      // Audio alarm
      if (epiCountdown !== null && epiCountdown <= 0) {
        if (!epiAlertFiredRef.current) {
          epiAlertFiredRef.current = true;
          play('epiDue');
        } else {
          const epiOverdue = session.lastEpinephrineTime
            ? now - session.lastEpinephrineTime - epiInterval
            : 0;
          if (epiOverdue > 0 && Math.floor(epiOverdue / 30000) !== Math.floor((epiOverdue - TICK_INTERVAL) / 30000)) {
            play('epiDue');
          }
        }
      } else if (epiCountdown === null && session.epinephrineCount === 0) {
        // First epi never given, play alarm every 30s
        const timeSinceStart = now - session.startTime;
        if (timeSinceStart > 5000 && Math.floor(timeSinceStart / 30000) !== Math.floor((timeSinceStart - TICK_INTERVAL) / 30000)) {
          play('epiDue');
        }
      }
    } else {
      epiAlertFiredRef.current = false;
      epiPopupShownRef.current = false;
    }

    // === AMIODARONE ALERTS ===
    const amioStatus = isAmiodaroneSuggested(session);
    if (amioStatus.suggested) {
      // Show popup when amio becomes suggested (once per dose level)
      if (amioPopupShownForDoseRef.current !== session.amiodaroneDosesGiven) {
        amioPopupShownForDoseRef.current = session.amiodaroneDosesGiven;
        useResuscitationStore.getState().setAmioAlertVisible(true, amioStatus.dose);
      }
      // Audio (less urgent, every 30s)
      if (now - lastAmioAlertRef.current >= 30000) {
        lastAmioAlertRef.current = now;
        play('amioDue');
      }
    }

    // === ABG REMINDER ===
    const lastAbgTime = session.lastAbgTime ?? session.startTime;
    const timeSinceAbg = now - lastAbgTime;
    if (timeSinceAbg >= ABG_REMINDER_INTERVAL_MS) {
      if (now - lastAbgReminderRef.current >= 30000) {
        lastAbgReminderRef.current = now;
        play('alert');
        useResuscitationStore.getState().setAbgReminderDue(true);
      }
    }

    // === REVERSIBLE CAUSES REMINDER ===
    if (now - lastReversibleCausesReminderRef.current >= REVERSIBLE_CAUSES_REMINDER_MS) {
      // Only remind if resuscitation has been going for at least 2 min and some causes not checked
      const uncheckedCauses = session.reversibleCauses.filter(c => !c.checked && !c.ruled_out);
      if (masterElapsed > 2 * 60 * 1000 && uncheckedCauses.length > 0) {
        lastReversibleCausesReminderRef.current = now;
        useResuscitationStore.getState().setReversibleCausesReminderVisible(true);
      }
    }

    // Auto-save to IndexedDB every 5 seconds
    if (now - lastSaveRef.current >= 5000) {
      lastSaveRef.current = now;
      saveSession(session).catch(() => {});
    }
  }, [play]);

  // Start/stop timer loop
  useEffect(() => {
    if (store.isActive && !store.isPaused) {
      cycleExpiredRef.current = false;
      lastCountdownSecRef.current = null;
      intervalRef.current = setInterval(tick, TICK_INTERVAL);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [store.isActive, store.isPaused, tick]);

  // Reset cycle expired flag when new cycle starts
  useEffect(() => {
    cycleExpiredRef.current = false;
    lastCountdownSecRef.current = null;
  }, [store.session?.currentCycle]);

  // Reset epi alert when new epi is given
  useEffect(() => {
    epiAlertFiredRef.current = false;
    epiPopupShownRef.current = false;
  }, [store.session?.lastEpinephrineTime]);

  // Reset amio popup tracker when dose is given
  useEffect(() => {
    amioPopupShownForDoseRef.current = store.session?.amiodaroneDosesGiven ?? 0;
  }, [store.session?.amiodaroneDosesGiven]);

  // Save session on every meaningful state change
  useEffect(() => {
    if (store.session) {
      saveSession(store.session).catch(() => {});
    }
  }, [store.session?.events.length, store.session?.phase]);

  return store;
}
