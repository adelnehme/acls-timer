import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useResuscitationStore } from '../../stores/resuscitationStore';
import { Button } from '../ui/Button';
import type { MedicationName, MedicationDose } from '../../engine/types';
import { MEDICATION_PROTOCOLS, getProtocol } from '../../engine/medications';

export function ActionPanel() {
  const { t } = useTranslation();
  const store = useResuscitationStore();
  const session = store.session;
  const [showMedPicker, setShowMedPicker] = useState(false);
  const [selectedMed, setSelectedMed] = useState<MedicationName | null>(null);
  const [customName, setCustomName] = useState('');
  const [customDose, setCustomDose] = useState('');
  const [noteText, setNoteText] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);

  if (!session) return null;

  const isShockable = session.currentRhythm === 'vf_pvt';

  const handleShock = () => {
    store.shock(200); // Default biphasic 200J
    store.nextCycle();
  };

  const handleGiveMed = (medication: MedicationName, dose: string, route: MedicationDose['route'], name?: string) => {
    store.giveMedication(medication, dose, route, name);
    setShowMedPicker(false);
    setSelectedMed(null);
    setCustomName('');
    setCustomDose('');
  };

  return (
    <div className="w-full max-w-md space-y-3">
      {/* Primary action buttons */}
      <div className="grid grid-cols-2 gap-3">
        {/* Shock button - only when shockable */}
        <Button
          variant="shockable"
          size="xl"
          fullWidth
          disabled={!isShockable}
          onClick={handleShock}
          className={!isShockable ? 'opacity-30' : ''}
        >
          <span className="text-2xl">⚡</span>
          {t('dashboard.shockDelivered')}
        </Button>

        {/* Rhythm check */}
        <Button
          variant="warning"
          size="xl"
          fullWidth
          onClick={() => store.setShowRhythmCheckModal(true)}
        >
          <span className="text-2xl">🔍</span>
          {t('dashboard.checkRhythm')}
        </Button>
      </div>

      {/* Secondary actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="success"
          size="lg"
          fullWidth
          onClick={() => store.setShowRoscConfirmation(true)}
        >
          {t('dashboard.rosc')}
        </Button>
        <Button
          variant="ghost"
          size="lg"
          fullWidth
          onClick={() => store.setShowEndConfirmation(true)}
        >
          {t('dashboard.endResuscitation')}
        </Button>
      </div>

      {/* Medication + Note */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="primary"
          size="md"
          fullWidth
          onClick={() => setShowMedPicker(!showMedPicker)}
        >
          {t('dashboard.addMedication')}
        </Button>
        <Button
          variant="primary"
          size="md"
          fullWidth
          onClick={() => setShowNoteInput(!showNoteInput)}
        >
          {t('dashboard.addNote')}
        </Button>
      </div>

      {/* Note input */}
      {showNoteInput && (
        <div className="flex gap-2">
          <input
            type="text"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && noteText.trim()) {
                store.addNote(noteText.trim());
                setNoteText('');
                setShowNoteInput(false);
              }
            }}
            placeholder="Type note..."
            className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-50 text-sm focus:outline-none focus:border-slate-400"
            autoFocus
          />
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              if (noteText.trim()) {
                store.addNote(noteText.trim());
                setNoteText('');
                setShowNoteInput(false);
              }
            }}
          >
            Add
          </Button>
        </div>
      )}

      {/* Medication picker */}
      {showMedPicker && (
        <div className="bg-slate-800 border border-slate-600 rounded-xl p-3 space-y-2">
          {!selectedMed ? (
            <div className="grid grid-cols-2 gap-2">
              {MEDICATION_PROTOCOLS.map((med) => (
                <button
                  key={med.name}
                  onClick={() => setSelectedMed(med.name)}
                  className="p-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-left text-sm text-slate-200 touch-manipulation transition-colors"
                >
                  {med.displayName.en}
                </button>
              ))}
              <button
                onClick={() => setSelectedMed('custom')}
                className="p-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-left text-sm text-slate-200 touch-manipulation transition-colors"
              >
                {t('medications.custom')}
              </button>
            </div>
          ) : selectedMed === 'custom' ? (
            <div className="space-y-2">
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Medication name"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-50 text-sm focus:outline-none"
                autoFocus
              />
              <input
                type="text"
                value={customDose}
                onChange={(e) => setCustomDose(e.target.value)}
                placeholder="Dose (e.g., 500mg)"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-50 text-sm focus:outline-none"
              />
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setSelectedMed(null); setCustomName(''); setCustomDose(''); }}>
                  {t('common.back')}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  fullWidth
                  disabled={!customName.trim() || !customDose.trim()}
                  onClick={() => handleGiveMed('custom', customDose, 'IV', customName)}
                >
                  {t('medications.give')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-sm font-semibold text-slate-300 mb-2">
                {getProtocol(selectedMed)?.displayName.en}
              </div>
              {getProtocol(selectedMed)?.doses.map((dose, i) => (
                <button
                  key={i}
                  onClick={() => handleGiveMed(selectedMed, dose.amount, dose.route.includes('IV') ? 'IV' : 'IO')}
                  className="w-full p-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-left text-sm text-slate-200 touch-manipulation transition-colors"
                >
                  <span className="font-medium">{dose.amount}</span>
                  <span className="text-slate-400 ml-2">{dose.route}</span>
                  {dose.label !== 'Standard' && (
                    <span className="text-slate-500 ml-2">({dose.label})</span>
                  )}
                </button>
              ))}
              <Button variant="ghost" size="sm" onClick={() => setSelectedMed(null)}>
                {t('common.back')}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
