import { create } from 'zustand';
import type {
  ResuscitationSession,
  RhythmType,
  MedicationName,
  MedicationDose,
  InterventionType,
  Intervention,
  EventLogEntry,
  SpecialSituation,
  ABGResult,
  HemodynamicsEntry,
  VentilationEntry,
} from '../engine/types';
import {
  createNewSession,
  performRhythmCheck,
  deliverShock,
  startNextCycle,
  achieveRosc,
  reArrest,
  terminateResuscitation,
  toggleReversibleCause,
} from '../engine/acls';
import { recordMedication } from '../engine/medications';

interface TimerValues {
  masterElapsed: number;
  cycleRemaining: number;
  epiCountdown: number | null;
}

interface ResuscitationStore {
  // Session
  session: ResuscitationSession | null;
  isActive: boolean;
  isPaused: boolean;

  // Timer display values (updated frequently by timer hook)
  timerValues: TimerValues;

  // UI state
  showRhythmCheckModal: boolean;
  showMedicationModal: boolean;
  showEndConfirmation: boolean;
  showRoscConfirmation: boolean;
  showAbgPanel: boolean;
  showHemodynamicsPanel: boolean;
  showVentilationPanel: boolean;
  abgReminderDue: boolean;
  epiAlertVisible: boolean;
  amioAlertVisible: boolean;
  amioAlertDose: '300mg' | '150mg' | null;
  reversibleCausesReminderVisible: boolean;

  // Actions
  startSession: (patientId?: string) => void;
  endSession: () => void;

  // Timer value updates
  updateTimerValues: (values: TimerValues) => void;

  // Algorithm actions
  checkRhythm: (rhythm: RhythmType) => {
    suggestEpinephrine: boolean;
    suggestAmiodarone: boolean;
    amiodaroneDose: '300mg' | '150mg' | null;
    suggestShock: boolean;
  };
  shock: (energy?: number) => void;
  nextCycle: () => void;
  rosc: () => void;
  handleReArrest: () => void;
  terminate: () => void;

  // Medication
  giveMedication: (
    medication: MedicationName,
    dose: string,
    route: MedicationDose['route'],
    customName?: string,
    administeredBy?: string
  ) => void;

  // Interventions
  addIntervention: (type: InterventionType, details?: string) => void;

  // Reversible causes
  toggleCause: (causeId: string, action: 'check' | 'rule_out') => void;

  // Special situations
  addSpecialSituation: (situation: SpecialSituation) => void;
  removeSpecialSituation: (situation: SpecialSituation) => void;

  // Notes
  addNote: (text: string) => void;

  // ABG
  addAbgResult: (result: ABGResult) => void;
  setAbgReminderDue: (due: boolean) => void;

  // Alert popups
  setEpiAlertVisible: (visible: boolean) => void;
  setAmioAlertVisible: (visible: boolean, dose?: '300mg' | '150mg' | null) => void;
  setReversibleCausesReminderVisible: (visible: boolean) => void;
  quickGiveEpi: () => void;
  quickGiveAmio: () => void;

  // Hemodynamics
  addHemodynamicsEntry: (entry: HemodynamicsEntry) => void;

  // Ventilation
  addVentilationEntry: (entry: VentilationEntry) => void;

  // Timer adjustment
  adjustStartTime: (elapsedMs: number) => void;

  // UI toggles
  setShowRhythmCheckModal: (show: boolean) => void;
  setShowMedicationModal: (show: boolean) => void;
  setShowEndConfirmation: (show: boolean) => void;
  setShowRoscConfirmation: (show: boolean) => void;
  setShowAbgPanel: (show: boolean) => void;
  setShowHemodynamicsPanel: (show: boolean) => void;
  setShowVentilationPanel: (show: boolean) => void;
}

export const useResuscitationStore = create<ResuscitationStore>((set, get) => ({
  session: null,
  isActive: false,
  isPaused: false,
  timerValues: { masterElapsed: 0, cycleRemaining: 120000, epiCountdown: null },
  showRhythmCheckModal: false,
  showMedicationModal: false,
  showEndConfirmation: false,
  showRoscConfirmation: false,
  showAbgPanel: false,
  showHemodynamicsPanel: false,
  showVentilationPanel: false,
  abgReminderDue: false,
  epiAlertVisible: false,
  amioAlertVisible: false,
  amioAlertDose: null,
  reversibleCausesReminderVisible: false,

  startSession: (patientId?: string) => {
    const session = createNewSession(patientId);
    set({ session, isActive: true, isPaused: false, abgReminderDue: false });
  },

  endSession: () => {
    set({ isActive: false, isPaused: false });
  },

  updateTimerValues: (values: TimerValues) => {
    set({ timerValues: values });
  },

  checkRhythm: (rhythm: RhythmType) => {
    const { session } = get();
    if (!session) return { suggestEpinephrine: false, suggestAmiodarone: false, amiodaroneDose: null, suggestShock: false };

    const result = performRhythmCheck(session, rhythm);
    set({ session: { ...result.session }, showRhythmCheckModal: false });

    return {
      suggestEpinephrine: result.suggestEpinephrine,
      suggestAmiodarone: result.suggestAmiodarone,
      amiodaroneDose: result.amiodaroneDose,
      suggestShock: result.suggestShock,
    };
  },

  shock: (energy?: number) => {
    const { session } = get();
    if (!session) return;
    const updated = deliverShock(session, energy);
    set({ session: { ...updated } });
  },

  nextCycle: () => {
    const { session } = get();
    if (!session) return;
    const updated = startNextCycle(session);
    set({ session: { ...updated } });
  },

  rosc: () => {
    const { session } = get();
    if (!session) return;
    const updated = achieveRosc(session);
    set({ session: { ...updated }, isActive: false, showRoscConfirmation: false });
  },

  handleReArrest: () => {
    const { session } = get();
    if (!session) return;
    const updated = reArrest(session);
    set({ session: { ...updated }, isActive: true });
  },

  terminate: () => {
    const { session } = get();
    if (!session) return;
    const updated = terminateResuscitation(session);
    set({ session: { ...updated }, isActive: false, showEndConfirmation: false });
  },

  giveMedication: (medication, dose, route, customName, administeredBy) => {
    const { session } = get();
    if (!session) return;

    const { session: updated, doseRecord } = recordMedication(
      session, medication, dose, route, customName, administeredBy
    );

    const protocol = medication === 'custom' ? customName : medication;
    const event: EventLogEntry = {
      id: `evt-${Date.now()}`,
      type: 'medication_given',
      timestamp: Date.now(),
      elapsed: Date.now() - session.startTime,
      cycle: session.currentCycle,
      description: `${protocol}: ${dose} ${route}`,
      details: { doseRecord },
    };
    updated.events.push(event);

    set({ session: { ...updated }, showMedicationModal: false });
  },

  addIntervention: (type: InterventionType, details?: string) => {
    const { session } = get();
    if (!session) return;

    const intervention: Intervention = {
      type,
      timestamp: Date.now(),
      details,
      successful: true,
    };
    session.interventions.push(intervention);

    const typeLabels: Record<InterventionType, string> = {
      iv: 'IV access established',
      io: 'IO access established',
      ett: 'Endotracheal tube placed',
      supraglottic: 'Supraglottic airway placed',
      etco2: 'ETCO2 monitoring started',
    };

    session.events.push({
      id: `evt-${Date.now()}`,
      type: 'intervention',
      timestamp: Date.now(),
      elapsed: Date.now() - session.startTime,
      cycle: session.currentCycle,
      description: typeLabels[type] + (details ? ` - ${details}` : ''),
    });

    set({ session: { ...session } });
  },

  toggleCause: (causeId: string, action: 'check' | 'rule_out') => {
    const { session } = get();
    if (!session) return;
    const updated = toggleReversibleCause(session, causeId, action);
    set({ session: { ...updated } });
  },

  addSpecialSituation: (situation: SpecialSituation) => {
    const { session } = get();
    if (!session) return;
    if (!session.specialSituations.includes(situation)) {
      session.specialSituations.push(situation);
      session.events.push({
        id: `evt-${Date.now()}`,
        type: 'special_situation',
        timestamp: Date.now(),
        elapsed: Date.now() - session.startTime,
        cycle: session.currentCycle,
        description: `Special situation flagged: ${situation}`,
      });
      set({ session: { ...session } });
    }
  },

  removeSpecialSituation: (situation: SpecialSituation) => {
    const { session } = get();
    if (!session) return;
    session.specialSituations = session.specialSituations.filter((s: SpecialSituation) => s !== situation);
    set({ session: { ...session } });
  },

  addNote: (text: string) => {
    const { session } = get();
    if (!session) return;
    session.events.push({
      id: `evt-${Date.now()}`,
      type: 'note',
      timestamp: Date.now(),
      elapsed: Date.now() - session.startTime,
      cycle: session.currentCycle,
      description: text,
    });
    set({ session: { ...session } });
  },

  addAbgResult: (result: ABGResult) => {
    const { session } = get();
    if (!session) return;

    session.abgResults.push(result);
    session.lastAbgTime = result.timestamp;

    session.events.push({
      id: `evt-${Date.now()}`,
      type: 'abg_recorded',
      timestamp: result.timestamp,
      elapsed: result.timestamp - session.startTime,
      cycle: session.currentCycle,
      description: `ABG recorded — pH ${result.values.pH ?? '—'}, K+ ${result.values.potassium ?? '—'}, Lac ${result.values.lactate ?? '—'}`,
      details: { abgId: result.id },
    });

    set({ session: { ...session }, abgReminderDue: false });
  },

  setAbgReminderDue: (due: boolean) => set({ abgReminderDue: due }),

  setEpiAlertVisible: (visible: boolean) => set({ epiAlertVisible: visible }),
  setAmioAlertVisible: (visible: boolean, dose?: '300mg' | '150mg' | null) =>
    set({ amioAlertVisible: visible, amioAlertDose: dose ?? null }),
  setReversibleCausesReminderVisible: (visible: boolean) =>
    set({ reversibleCausesReminderVisible: visible }),

  quickGiveEpi: () => {
    const { session } = get();
    if (!session) return;
    const { session: updated, doseRecord } = recordMedication(session, 'epinephrine', '1 mg', 'IV');
    const event: EventLogEntry = {
      id: `evt-${Date.now()}`,
      type: 'medication_given',
      timestamp: Date.now(),
      elapsed: Date.now() - session.startTime,
      cycle: session.currentCycle,
      description: 'epinephrine: 1 mg IV',
      details: { doseRecord },
    };
    updated.events.push(event);
    set({ session: { ...updated }, epiAlertVisible: false });
  },

  quickGiveAmio: () => {
    const { session, amioAlertDose } = get();
    if (!session) return;
    const dose = amioAlertDose === '150mg' ? '150 mg' : '300 mg';
    const { session: updated, doseRecord } = recordMedication(session, 'amiodarone', dose, 'IV');
    const event: EventLogEntry = {
      id: `evt-${Date.now()}`,
      type: 'medication_given',
      timestamp: Date.now(),
      elapsed: Date.now() - session.startTime,
      cycle: session.currentCycle,
      description: `amiodarone: ${dose} IV`,
      details: { doseRecord },
    };
    updated.events.push(event);
    set({ session: { ...updated }, amioAlertVisible: false });
  },

  addHemodynamicsEntry: (entry: HemodynamicsEntry) => {
    const { session } = get();
    if (!session) return;

    session.hemodynamicsHistory.push(entry);

    const parts: string[] = [];
    if (entry.vitals.hr != null) parts.push(`HR ${entry.vitals.hr}`);
    if (entry.vitals.systolic != null && entry.vitals.diastolic != null) parts.push(`BP ${entry.vitals.systolic}/${entry.vitals.diastolic}`);
    if (entry.vitals.map != null) parts.push(`MAP ${entry.vitals.map}`);
    if (entry.vitals.spo2 != null) parts.push(`SpO2 ${entry.vitals.spo2}%`);

    session.events.push({
      id: `evt-${Date.now()}`,
      type: 'hemodynamics_recorded',
      timestamp: entry.timestamp,
      elapsed: entry.timestamp - session.startTime,
      cycle: session.currentCycle,
      description: `Hemodynamics: ${parts.join(', ') || 'recorded'}`,
      details: { hemoId: entry.id },
    });

    set({ session: { ...session } });
  },

  addVentilationEntry: (entry: VentilationEntry) => {
    const { session } = get();
    if (!session) return;

    session.ventilationHistory.push(entry);

    const parts: string[] = [entry.settings.mode];
    if (entry.settings.fio2 != null) parts.push(`FiO2 ${entry.settings.fio2}%`);
    if (entry.settings.peep != null) parts.push(`PEEP ${entry.settings.peep}`);

    session.events.push({
      id: `evt-${Date.now()}`,
      type: 'ventilation_recorded',
      timestamp: entry.timestamp,
      elapsed: entry.timestamp - session.startTime,
      cycle: session.currentCycle,
      description: `Ventilation: ${parts.join(', ')}`,
      details: { ventId: entry.id },
    });

    set({ session: { ...session } });
  },

  adjustStartTime: (elapsedMs: number) => {
    const { session } = get();
    if (!session) return;
    const now = Date.now();
    const newStartTime = now - elapsedMs;
    session.startTime = newStartTime;
    // Also adjust the first cycle's start time
    if (session.cycles.length > 0) {
      session.cycles[0].startTime = newStartTime;
    }
    // Log the adjustment
    session.events.push({
      id: `evt-${now}`,
      type: 'note',
      timestamp: now,
      elapsed: elapsedMs,
      cycle: session.currentCycle,
      description: `Timer adjusted — elapsed set to ${Math.floor(elapsedMs / 60000)}m ${Math.floor((elapsedMs % 60000) / 1000)}s`,
    });
    set({ session: { ...session } });
  },

  setShowRhythmCheckModal: (show) => set({ showRhythmCheckModal: show }),
  setShowMedicationModal: (show) => set({ showMedicationModal: show }),
  setShowEndConfirmation: (show) => set({ showEndConfirmation: show }),
  setShowRoscConfirmation: (show) => set({ showRoscConfirmation: show }),
  setShowAbgPanel: (show) => set({ showAbgPanel: show }),
  setShowHemodynamicsPanel: (show) => set({ showHemodynamicsPanel: show }),
  setShowVentilationPanel: (show) => set({ showVentilationPanel: show }),
}));
