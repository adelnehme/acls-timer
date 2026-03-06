// === ACLS Resuscitation Engine Types ===

export type RhythmType = 'vf_pvt' | 'asystole_pea' | 'organized' | 'unknown';

export type ResuscitationPhase =
  | 'idle'
  | 'cpr_in_progress'
  | 'rhythm_check'
  | 'pulse_check'
  | 'rosc'
  | 'post_resuscitation'
  | 'terminated';

export type MedicationName =
  | 'epinephrine'
  | 'amiodarone'
  | 'lidocaine'
  | 'sodium_bicarbonate'
  | 'calcium_chloride'
  | 'calcium_gluconate'
  | 'magnesium_sulfate'
  | 'lipid_emulsion'
  | 'naloxone'
  | 'custom';

export interface MedicationDose {
  id: string;
  medication: MedicationName;
  customName?: string;
  dose: string;
  route: 'IV' | 'IO' | 'ET' | 'IM' | 'other';
  timestamp: number;
  administeredBy?: string;
  cycle: number;
}

export interface MedicationProtocol {
  name: MedicationName;
  displayName: { en: string; de: string };
  doses: {
    label: string;
    amount: string;
    route: string;
  }[];
  intervalMs?: number;
  maxDoses?: number;
  condition?: string;
}

export type EventType =
  | 'resuscitation_started'
  | 'cpr_started'
  | 'rhythm_check'
  | 'rhythm_identified'
  | 'shock_delivered'
  | 'medication_given'
  | 'intervention'
  | 'reversible_cause_checked'
  | 'rosc_achieved'
  | 're_arrest'
  | 'resuscitation_terminated'
  | 'note'
  | 'cycle_started'
  | 'special_situation'
  | 'abg_recorded'
  | 'hemodynamics_recorded'
  | 'ventilation_recorded';

export interface EventLogEntry {
  id: string;
  type: EventType;
  timestamp: number;
  elapsed: number;
  cycle: number;
  description: string;
  details?: Record<string, unknown>;
}

export type InterventionType = 'iv' | 'io' | 'ett' | 'supraglottic' | 'etco2';

export interface Intervention {
  type: InterventionType;
  timestamp: number;
  details?: string;
  successful: boolean;
}

export type ReversibleCauseCategory = 'h' | 't';

export interface ReversibleCause {
  id: string;
  category: ReversibleCauseCategory;
  name: { en: string; de: string };
  intervention: { en: string; de: string };
  checked: boolean;
  checkedAt?: number;
  ruled_out: boolean;
  notes?: string;
}

export interface CycleRecord {
  number: number;
  startTime: number;
  endTime?: number;
  rhythm: RhythmType;
  shockDelivered: boolean;
  shockEnergy?: number;
  medications: MedicationDose[];
}

export type SpecialSituation =
  | 'pregnancy'
  | 'hypothermia'
  | 'drowning'
  | 'opioid_overdose'
  | 'hyperkalemia'
  | 'none';

// === ABG Types ===

export interface ABGValues {
  pH: number | null;
  pCO2: number | null;
  pO2: number | null;
  HCO3: number | null;
  BE: number | null;
  lactate: number | null;
  potassium: number | null;
  sodium: number | null;
  hemoglobin: number | null;
  glucose: number | null;
  calcium: number | null;
  chloride: number | null;
}

export type ABGAlertSeverity = 'normal' | 'warning' | 'critical';

export interface ABGAlert {
  parameter: keyof ABGValues;
  severity: ABGAlertSeverity;
  message: string;
  value: number;
  normalRange: { min: number; max: number };
}

export interface ABGInterpretation {
  primaryDisorder: string;
  compensation: string;
  anionGap: number | null;
  summary: string;
  recommendations: string[];
  generatedBy: 'rules' | 'gemini';
}

export interface ABGResult {
  id: string;
  timestamp: number;
  elapsed: number;
  cycle: number;
  values: ABGValues;
  alerts: ABGAlert[];
  interpretation: ABGInterpretation | null;
  source: 'camera' | 'upload' | 'manual';
}

// === Hemodynamics Types ===

export type VasopressorName = 'norepinephrine' | 'epinephrine_infusion' | 'vasopressin' | 'dobutamine';

export interface VasopressorEntry {
  drug: VasopressorName;
  dose: number;
  unit: string;
}

export interface VitalSigns {
  hr: number | null;
  systolic: number | null;
  diastolic: number | null;
  map: number | null;
  spo2: number | null;
  cvp: number | null;
}

export interface HemodynamicsEntry {
  id: string;
  timestamp: number;
  elapsed: number;
  cycle: number;
  vitals: VitalSigns;
  vasopressors: VasopressorEntry[];
  notes?: string;
}

// === Ventilation Types ===

export type VentilationMode = 'VC' | 'PC' | 'PRVC' | 'SIMV' | 'CPAP' | 'manual';

export interface VentilationSettings {
  mode: VentilationMode;
  peep: number | null;
  pInsp: number | null;
  tidalVolume: number | null;
  fio2: number | null;
  respiratoryRate: number | null;
  ieRatio: string | null;
}

export interface VentilationRecommendation {
  parameter: string;
  currentValue: string;
  suggestion: string;
  rationale: string;
  severity: 'info' | 'warning' | 'critical';
  generatedBy: 'rules' | 'gemini';
}

export interface VentilationEntry {
  id: string;
  timestamp: number;
  elapsed: number;
  cycle: number;
  settings: VentilationSettings;
  recommendations: VentilationRecommendation[];
  notes?: string;
}

// === Session ===

export interface ResuscitationSession {
  id: string;
  patientId?: string;
  startTime: number;
  endTime?: number;
  phase: ResuscitationPhase;
  currentRhythm: RhythmType;
  currentCycle: number;
  shockCount: number;
  cycles: CycleRecord[];
  medications: MedicationDose[];
  events: EventLogEntry[];
  interventions: Intervention[];
  reversibleCauses: ReversibleCause[];
  specialSituations: SpecialSituation[];
  amiodaroneDosesGiven: number;
  lastEpinephrineTime: number | null;
  epinephrineCount: number;
  outcome?: 'rosc' | 'terminated';
  roscTime?: number;
  terminationTime?: number;
  notes?: string;
  abgResults: ABGResult[];
  lastAbgTime: number | null;
  hemodynamicsHistory: HemodynamicsEntry[];
  ventilationHistory: VentilationEntry[];
}

export interface TimerState {
  masterElapsed: number;
  cycleRemaining: number;
  cycleElapsed: number;
  epiCountdown: number | null;
  isRunning: boolean;
}
