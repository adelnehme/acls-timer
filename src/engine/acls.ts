import type {
  ResuscitationSession,
  RhythmType,
  EventLogEntry,
  CycleRecord,
  ReversibleCause,
} from './types';
import { createReversibleCauses } from './reversibleCauses';

const CYCLE_DURATION_MS = 2 * 60 * 1000; // 2 minutes
const EPI_INTERVAL_MS = 3 * 60 * 1000; // 3 minutes
const AMIO_MAX_DOSES = 2;

let eventCounter = 0;

function generateId(): string {
  return `${Date.now()}-${++eventCounter}`;
}

function createEvent(
  type: EventLogEntry['type'],
  session: ResuscitationSession,
  description: string,
  details?: Record<string, unknown>
): EventLogEntry {
  return {
    id: generateId(),
    type,
    timestamp: Date.now(),
    elapsed: Date.now() - session.startTime,
    cycle: session.currentCycle,
    description,
    details,
  };
}

export function createNewSession(patientId?: string): ResuscitationSession {
  const now = Date.now();
  const session: ResuscitationSession = {
    id: generateId(),
    patientId,
    startTime: now,
    phase: 'cpr_in_progress',
    currentRhythm: 'unknown',
    currentCycle: 1,
    shockCount: 0,
    cycles: [
      {
        number: 1,
        startTime: now,
        rhythm: 'unknown',
        shockDelivered: false,
        medications: [],
      },
    ],
    medications: [],
    events: [],
    interventions: [],
    reversibleCauses: createReversibleCauses(),
    specialSituations: [],
    amiodaroneDosesGiven: 0,
    lastEpinephrineTime: null,
    epinephrineCount: 0,
    abgResults: [],
    lastAbgTime: null,
    hemodynamicsHistory: [],
    ventilationHistory: [],
  };

  session.events.push(
    createEvent('resuscitation_started', session, 'Resuscitation started'),
    createEvent('cpr_started', session, 'CPR started - Cycle 1')
  );

  return session;
}

export function getCycleDurationMs(): number {
  return CYCLE_DURATION_MS;
}

export function getEpiIntervalMs(): number {
  return EPI_INTERVAL_MS;
}

export function getAmioMaxDoses(): number {
  return AMIO_MAX_DOSES;
}

export interface RhythmCheckResult {
  session: ResuscitationSession;
  suggestEpinephrine: boolean;
  suggestAmiodarone: boolean;
  amiodaroneDose: '300mg' | '150mg' | null;
  suggestShock: boolean;
}

export function performRhythmCheck(
  session: ResuscitationSession,
  rhythm: RhythmType
): RhythmCheckResult {
  const now = Date.now();
  const previousRhythm = session.currentRhythm;

  // Close current cycle
  const currentCycle = session.cycles[session.cycles.length - 1];
  if (currentCycle) {
    currentCycle.endTime = now;
  }

  // Update session
  session.currentRhythm = rhythm;
  session.phase = 'rhythm_check';

  // Log rhythm check
  session.events.push(
    createEvent('rhythm_check', session, `Rhythm check - Cycle ${session.currentCycle}`)
  );

  session.events.push(
    createEvent('rhythm_identified', session, `Rhythm: ${formatRhythmName(rhythm)}`, {
      rhythm,
      previousRhythm,
      switched: previousRhythm !== rhythm && previousRhythm !== 'unknown',
    })
  );

  const isShockable = rhythm === 'vf_pvt';
  const isNonShockable = rhythm === 'asystole_pea';

  // Determine epinephrine suggestion
  let suggestEpinephrine = false;
  const epiElapsed = session.lastEpinephrineTime
    ? now - session.lastEpinephrineTime
    : Infinity;

  if (isNonShockable) {
    // Non-shockable: give ASAP then every 3-5 min
    if (session.epinephrineCount === 0 || epiElapsed >= 3 * 60 * 1000) {
      suggestEpinephrine = true;
    }
  } else if (isShockable) {
    // Shockable: give after 2nd shock, then every 3-5 min
    if (session.shockCount >= 2 && (session.epinephrineCount === 0 || epiElapsed >= 3 * 60 * 1000)) {
      suggestEpinephrine = true;
    }
  }

  // Determine amiodarone suggestion (only for refractory VF/pVT)
  let suggestAmiodarone = false;
  let amiodaroneDose: '300mg' | '150mg' | null = null;

  if (isShockable && session.amiodaroneDosesGiven < AMIO_MAX_DOSES) {
    if (session.shockCount >= 3 && session.amiodaroneDosesGiven === 0) {
      suggestAmiodarone = true;
      amiodaroneDose = '300mg';
    } else if (session.shockCount >= 5 && session.amiodaroneDosesGiven === 1) {
      suggestAmiodarone = true;
      amiodaroneDose = '150mg';
    }
  }

  return {
    session,
    suggestEpinephrine,
    suggestAmiodarone,
    amiodaroneDose,
    suggestShock: isShockable,
  };
}

export function deliverShock(
  session: ResuscitationSession,
  energy?: number
): ResuscitationSession {
  session.shockCount++;
  const currentCycle = session.cycles[session.cycles.length - 1];
  if (currentCycle) {
    currentCycle.shockDelivered = true;
    currentCycle.shockEnergy = energy;
  }

  session.events.push(
    createEvent('shock_delivered', session, `Shock #${session.shockCount} delivered${energy ? ` (${energy}J)` : ''}`, {
      shockNumber: session.shockCount,
      energy,
    })
  );

  return session;
}

export function startNextCycle(session: ResuscitationSession): ResuscitationSession {
  const now = Date.now();
  session.currentCycle++;
  session.phase = 'cpr_in_progress';

  const newCycle: CycleRecord = {
    number: session.currentCycle,
    startTime: now,
    rhythm: session.currentRhythm,
    shockDelivered: false,
    medications: [],
  };

  session.cycles.push(newCycle);

  session.events.push(
    createEvent('cycle_started', session, `CPR resumed - Cycle ${session.currentCycle}`)
  );

  return session;
}

export function achieveRosc(session: ResuscitationSession): ResuscitationSession {
  const now = Date.now();
  session.phase = 'rosc';
  session.outcome = 'rosc';
  session.roscTime = now;
  session.endTime = now;

  // Close current cycle
  const currentCycle = session.cycles[session.cycles.length - 1];
  if (currentCycle) {
    currentCycle.endTime = now;
  }

  session.events.push(
    createEvent('rosc_achieved', session, 'ROSC achieved', {
      totalDuration: now - session.startTime,
      totalShocks: session.shockCount,
      totalCycles: session.currentCycle,
    })
  );

  return session;
}

export function reArrest(session: ResuscitationSession): ResuscitationSession {
  session.phase = 'cpr_in_progress';
  session.outcome = undefined;
  session.roscTime = undefined;
  session.endTime = undefined;

  session.events.push(
    createEvent('re_arrest', session, 'Re-arrest — CPR resumed')
  );

  // Start new cycle
  return startNextCycle(session);
}

export function terminateResuscitation(session: ResuscitationSession): ResuscitationSession {
  const now = Date.now();
  session.phase = 'terminated';
  session.outcome = 'terminated';
  session.terminationTime = now;
  session.endTime = now;

  // Close current cycle
  const currentCycle = session.cycles[session.cycles.length - 1];
  if (currentCycle) {
    currentCycle.endTime = now;
  }

  session.events.push(
    createEvent('resuscitation_terminated', session, 'Resuscitation terminated', {
      totalDuration: now - session.startTime,
      totalShocks: session.shockCount,
      totalCycles: session.currentCycle,
    })
  );

  return session;
}

export function toggleReversibleCause(
  session: ResuscitationSession,
  causeId: string,
  action: 'check' | 'rule_out'
): ResuscitationSession {
  const cause = session.reversibleCauses.find((c: ReversibleCause) => c.id === causeId);
  if (!cause) return session;

  if (action === 'check') {
    cause.checked = !cause.checked;
    cause.checkedAt = cause.checked ? Date.now() : undefined;
  } else {
    cause.ruled_out = !cause.ruled_out;
  }

  session.events.push(
    createEvent('reversible_cause_checked', session, `Reversible cause: ${cause.name.en} — ${action === 'check' ? (cause.checked ? 'considered' : 'unchecked') : (cause.ruled_out ? 'ruled out' : 'un-ruled out')}`, {
      causeId,
      action,
    })
  );

  return session;
}

export function isEpinephrineDue(session: ResuscitationSession): boolean {
  if (!session.lastEpinephrineTime) {
    // For non-shockable: due immediately
    if (session.currentRhythm === 'asystole_pea') return true;
    // For shockable: due after 2nd shock
    if (session.currentRhythm === 'vf_pvt' && session.shockCount >= 2) return true;
    return false;
  }

  const elapsed = Date.now() - session.lastEpinephrineTime;
  return elapsed >= 3 * 60 * 1000; // Due at 3 min (warning), critical at 5 min
}

export function isEpinephrineCritical(session: ResuscitationSession): boolean {
  if (!session.lastEpinephrineTime) return isEpinephrineDue(session);
  const elapsed = Date.now() - session.lastEpinephrineTime;
  return elapsed >= 5 * 60 * 1000;
}

export function isAmiodaroneSuggested(session: ResuscitationSession): { suggested: boolean; dose: '300mg' | '150mg' | null } {
  if (session.currentRhythm !== 'vf_pvt') return { suggested: false, dose: null };
  if (session.amiodaroneDosesGiven >= AMIO_MAX_DOSES) return { suggested: false, dose: null };

  if (session.shockCount >= 3 && session.amiodaroneDosesGiven === 0) {
    return { suggested: true, dose: '300mg' };
  }
  if (session.shockCount >= 5 && session.amiodaroneDosesGiven === 1) {
    return { suggested: true, dose: '150mg' };
  }

  return { suggested: false, dose: null };
}

function formatRhythmName(rhythm: RhythmType): string {
  switch (rhythm) {
    case 'vf_pvt': return 'VF/pVT (Shockable)';
    case 'asystole_pea': return 'Asystole/PEA (Non-shockable)';
    case 'organized': return 'Organized Rhythm';
    default: return 'Unknown';
  }
}
