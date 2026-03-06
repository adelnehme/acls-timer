import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useResuscitationStore } from '../../stores/resuscitationStore';
import { formatMsLong } from '../../utils/formatTime';
import { Button } from '../ui/Button';
import type { VitalSigns, VasopressorEntry, VasopressorName, HemodynamicsEntry } from '../../engine/types';

const VASOPRESSOR_OPTIONS: { name: VasopressorName; label: string; unit: string }[] = [
  { name: 'norepinephrine', label: 'Norepinephrine', unit: 'mcg/kg/min' },
  { name: 'epinephrine_infusion', label: 'Epinephrine infusion', unit: 'mcg/kg/min' },
  { name: 'vasopressin', label: 'Vasopressin', unit: 'units/min' },
  { name: 'dobutamine', label: 'Dobutamine', unit: 'mcg/kg/min' },
];

const EMPTY_VITALS: VitalSigns = {
  hr: null, systolic: null, diastolic: null, map: null, spo2: null, cvp: null,
};

export function HemodynamicsPanel() {
  const { t } = useTranslation();
  const { session, addHemodynamicsEntry } = useResuscitationStore();
  const [vitals, setVitals] = useState<VitalSigns>({ ...EMPTY_VITALS });
  const [vasopressors, setVasopressors] = useState<VasopressorEntry[]>([]);
  const [notes, setNotes] = useState('');

  if (!session) return null;

  const updateVital = (key: keyof VitalSigns, val: string) => {
    const newVitals = { ...vitals, [key]: val === '' ? null : Number(val) };
    // Auto-calc MAP
    if ((key === 'systolic' || key === 'diastolic') && newVitals.systolic != null && newVitals.diastolic != null) {
      newVitals.map = Math.round((newVitals.systolic + 2 * newVitals.diastolic) / 3);
    }
    setVitals(newVitals);
  };

  const addVasopressor = (name: VasopressorName) => {
    if (vasopressors.some(v => v.drug === name)) return;
    const opt = VASOPRESSOR_OPTIONS.find(o => o.name === name);
    setVasopressors([...vasopressors, { drug: name, dose: 0, unit: opt?.unit || '' }]);
  };

  const updateVasopressorDose = (drug: VasopressorName, dose: number) => {
    setVasopressors(vasopressors.map(v => v.drug === drug ? { ...v, dose } : v));
  };

  const removeVasopressor = (drug: VasopressorName) => {
    setVasopressors(vasopressors.filter(v => v.drug !== drug));
  };

  const hasData = Object.values(vitals).some(v => v != null) || vasopressors.length > 0;

  const handleRecord = () => {
    const now = Date.now();
    const entry: HemodynamicsEntry = {
      id: `hemo-${now}`,
      timestamp: now,
      elapsed: now - session.startTime,
      cycle: session.currentCycle,
      vitals,
      vasopressors,
      notes: notes || undefined,
    };
    addHemodynamicsEntry(entry);
    setVitals({ ...EMPTY_VITALS });
    setVasopressors([]);
    setNotes('');
  };

  return (
    <div className="space-y-4">
      {/* Vitals */}
      <div>
        <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">{t('hemo.vitals')}</h4>
        <div className="grid grid-cols-2 gap-2">
          {[
            { key: 'hr' as const, label: 'HR', unit: 'bpm' },
            { key: 'systolic' as const, label: 'Systolic', unit: 'mmHg' },
            { key: 'diastolic' as const, label: 'Diastolic', unit: 'mmHg' },
            { key: 'map' as const, label: 'MAP', unit: 'mmHg' },
            { key: 'spo2' as const, label: 'SpO2', unit: '%' },
            { key: 'cvp' as const, label: 'CVP', unit: 'mmHg' },
          ].map(({ key, label, unit }) => (
            <div key={key} className="flex flex-col">
              <label className="text-xs text-slate-400 mb-1">
                {label} <span className="text-slate-600">({unit})</span>
              </label>
              <input
                type="number"
                value={vitals[key] ?? ''}
                onChange={(e) => updateVital(key, e.target.value)}
                className="px-2 py-1.5 bg-slate-800 border border-slate-600 rounded text-sm text-slate-200 focus:outline-none focus:border-slate-400"
                placeholder="—"
                readOnly={key === 'map'}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Vasopressors */}
      <div>
        <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">{t('hemo.vasopressors')}</h4>

        {/* Active vasopressors */}
        {vasopressors.map(({ drug, dose, unit }) => {
          const opt = VASOPRESSOR_OPTIONS.find(o => o.name === drug);
          return (
            <div key={drug} className="flex items-center gap-2 mb-2">
              <span className="text-xs text-slate-300 min-w-[100px]">{opt?.label}</span>
              <input
                type="number"
                step="0.01"
                value={dose || ''}
                onChange={(e) => updateVasopressorDose(drug, Number(e.target.value))}
                className="flex-1 px-2 py-1.5 bg-slate-800 border border-slate-600 rounded text-sm text-slate-200 focus:outline-none focus:border-slate-400"
                placeholder="0"
              />
              <span className="text-[10px] text-slate-500 min-w-[60px]">{unit}</span>
              <button
                onClick={() => removeVasopressor(drug)}
                className="text-red-400 hover:text-red-300 p-1 touch-manipulation"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          );
        })}

        {/* Add vasopressor buttons */}
        <div className="flex flex-wrap gap-1">
          {VASOPRESSOR_OPTIONS.filter(o => !vasopressors.some(v => v.drug === o.name)).map(opt => (
            <button
              key={opt.name}
              onClick={() => addVasopressor(opt.name)}
              className="text-xs px-2 py-1 bg-slate-800 border border-slate-600 rounded text-slate-400 hover:text-slate-200 hover:border-slate-500 touch-manipulation"
            >
              + {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="text-xs text-slate-400 mb-1 block">{t('hemo.notes')}</label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t('hemo.notesPlaceholder')}
          className="w-full px-2 py-1.5 bg-slate-800 border border-slate-600 rounded text-sm text-slate-200 focus:outline-none focus:border-slate-400"
        />
      </div>

      {/* Record button */}
      <Button variant="primary" size="lg" fullWidth onClick={handleRecord} disabled={!hasData}>
        {t('hemo.record')}
      </Button>

      {/* History */}
      {session.hemodynamicsHistory.length > 0 && (
        <div className="space-y-2 mt-4">
          <h4 className="text-xs font-semibold text-slate-400 uppercase">{t('hemo.history')}</h4>
          {session.hemodynamicsHistory.map((entry) => (
            <div key={entry.id} className="bg-slate-800 rounded-lg p-2 border border-slate-700 text-xs">
              <div className="flex justify-between text-slate-400 mb-1">
                <span>{formatMsLong(entry.elapsed)}</span>
                <span>Cycle {entry.cycle}</span>
              </div>
              <div className="grid grid-cols-3 gap-1 text-slate-300">
                {entry.vitals.hr != null && <span>HR {entry.vitals.hr}</span>}
                {entry.vitals.systolic != null && entry.vitals.diastolic != null && (
                  <span>BP {entry.vitals.systolic}/{entry.vitals.diastolic}</span>
                )}
                {entry.vitals.map != null && <span>MAP {entry.vitals.map}</span>}
                {entry.vitals.spo2 != null && <span>SpO2 {entry.vitals.spo2}%</span>}
              </div>
              {entry.vasopressors.length > 0 && (
                <div className="text-purple-400 mt-1">
                  {entry.vasopressors.map(v => `${v.drug}: ${v.dose} ${v.unit}`).join(', ')}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
