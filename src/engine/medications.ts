import type { MedicationProtocol, MedicationDose, MedicationName, ResuscitationSession } from './types';

let doseCounter = 0;

function generateDoseId(): string {
  return `dose-${Date.now()}-${++doseCounter}`;
}

export const MEDICATION_PROTOCOLS: MedicationProtocol[] = [
  {
    name: 'epinephrine',
    displayName: { en: 'Epinephrine', de: 'Adrenalin' },
    doses: [{ label: 'Standard', amount: '1 mg', route: 'IV/IO' }],
    intervalMs: 3 * 60 * 1000, // 3 minutes
    condition: 'Every 3-5 minutes. Non-shockable: ASAP. Shockable: after 2nd shock.',
  },
  {
    name: 'amiodarone',
    displayName: { en: 'Amiodarone', de: 'Amiodaron' },
    doses: [
      { label: '1st dose', amount: '300 mg', route: 'IV/IO' },
      { label: '2nd dose', amount: '150 mg', route: 'IV/IO' },
    ],
    maxDoses: 2,
    condition: 'Refractory VF/pVT. 1st dose after 3rd shock, 2nd after 5th shock.',
  },
  {
    name: 'lidocaine',
    displayName: { en: 'Lidocaine', de: 'Lidocain' },
    doses: [
      { label: '1st dose', amount: '1-1.5 mg/kg', route: 'IV/IO' },
      { label: 'Subsequent', amount: '0.5-0.75 mg/kg', route: 'IV/IO' },
    ],
    intervalMs: 5 * 60 * 1000,
    condition: 'Alternative to amiodarone for refractory VF/pVT. Max 3 mg/kg.',
  },
  {
    name: 'sodium_bicarbonate',
    displayName: { en: 'Sodium Bicarbonate', de: 'Natriumbicarbonat' },
    doses: [{ label: 'Standard', amount: '1 mEq/kg', route: 'IV/IO' }],
    condition: 'For hyperkalemia, metabolic acidosis, or tricyclic antidepressant overdose.',
  },
  {
    name: 'calcium_chloride',
    displayName: { en: 'Calcium Chloride', de: 'Calciumchlorid' },
    doses: [{ label: 'Standard', amount: '1-2 g (10% solution)', route: 'IV' }],
    condition: 'For hyperkalemia, hypocalcemia, calcium channel blocker overdose.',
  },
  {
    name: 'calcium_gluconate',
    displayName: { en: 'Calcium Gluconate', de: 'Calciumgluconat' },
    doses: [{ label: 'Standard', amount: '3 g', route: 'IV' }],
    condition: 'Alternative to calcium chloride. For hyperkalemia, hypocalcemia.',
  },
  {
    name: 'magnesium_sulfate',
    displayName: { en: 'Magnesium Sulfate', de: 'Magnesiumsulfat' },
    doses: [{ label: 'Standard', amount: '1-2 g', route: 'IV/IO' }],
    condition: 'For torsades de pointes or suspected hypomagnesemia.',
  },
  {
    name: 'lipid_emulsion',
    displayName: { en: 'Lipid Emulsion 20%', de: 'Lipidemulsion 20%' },
    doses: [
      { label: 'Bolus', amount: '1.5 mL/kg', route: 'IV' },
      { label: 'Infusion', amount: '0.25 mL/kg/min', route: 'IV' },
    ],
    condition: 'For local anesthetic systemic toxicity (LAST).',
  },
  {
    name: 'naloxone',
    displayName: { en: 'Naloxone', de: 'Naloxon' },
    doses: [
      { label: 'Standard', amount: '0.4-2 mg', route: 'IV/IO/IM' },
      { label: 'Intranasal', amount: '4 mg', route: 'other' },
    ],
    condition: 'For known or suspected opioid overdose.',
  },
];

export function getProtocol(name: MedicationName): MedicationProtocol | undefined {
  return MEDICATION_PROTOCOLS.find((p) => p.name === name);
}

export function recordMedication(
  session: ResuscitationSession,
  medication: MedicationName,
  dose: string,
  route: MedicationDose['route'],
  customName?: string,
  administeredBy?: string
): { session: ResuscitationSession; doseRecord: MedicationDose } {
  const record: MedicationDose = {
    id: generateDoseId(),
    medication,
    customName,
    dose,
    route,
    timestamp: Date.now(),
    administeredBy,
    cycle: session.currentCycle,
  };

  session.medications.push(record);

  // Update cycle record
  const currentCycle = session.cycles[session.cycles.length - 1];
  if (currentCycle) {
    currentCycle.medications.push(record);
  }

  // Track epinephrine timing
  if (medication === 'epinephrine') {
    session.lastEpinephrineTime = record.timestamp;
    session.epinephrineCount++;
  }

  // Track amiodarone doses
  if (medication === 'amiodarone') {
    session.amiodaroneDosesGiven++;
  }

  return { session, doseRecord: record };
}

export function getEpinephrineCountdown(session: ResuscitationSession): number | null {
  if (!session.lastEpinephrineTime) return null;
  const elapsed = Date.now() - session.lastEpinephrineTime;
  const remaining = 3 * 60 * 1000 - elapsed; // 3 min target
  return Math.max(0, remaining);
}

export function getMedicationHistory(session: ResuscitationSession, name?: MedicationName): MedicationDose[] {
  if (!name) return session.medications;
  return session.medications.filter((m) => m.medication === name);
}
