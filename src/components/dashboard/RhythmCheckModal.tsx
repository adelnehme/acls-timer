import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useResuscitationStore } from '../../stores/resuscitationStore';
import { useAudio } from '../../hooks/useAudio';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

export function RhythmCheckModal() {
  const { t } = useTranslation();
  const store = useResuscitationStore();
  const { play } = useAudio();
  const [showPulseCheck, setShowPulseCheck] = useState(false);

  const handleRhythm = (rhythm: 'vf_pvt' | 'asystole_pea') => {
    const result = store.checkRhythm(rhythm);

    if (result.suggestAmiodarone) {
      play('amioDue');
    }
    if (result.suggestEpinephrine) {
      play('epiDue');
    }

    // If shockable, user should shock. If non-shockable, start next cycle.
    if (rhythm === 'asystole_pea') {
      store.nextCycle();
    }
    // For VF/pVT, user will shock manually which triggers next cycle
  };

  const handleOrganized = () => {
    setShowPulseCheck(true);
  };

  const handlePulseResult = (hasPulse: boolean) => {
    setShowPulseCheck(false);
    if (hasPulse) {
      store.setShowRhythmCheckModal(false);
      store.setShowRoscConfirmation(true);
    } else {
      store.checkRhythm('asystole_pea');
      store.nextCycle();
    }
  };

  return (
    <Modal
      open={store.showRhythmCheckModal}
      closable={false}
      className="max-w-md"
    >
      {!showPulseCheck ? (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-center text-amber-400">
            {t('rhythm.title')}
          </h2>

          <div className="grid grid-cols-2 gap-3">
            {/* Shockable */}
            <Button
              variant="shockable"
              size="xl"
              fullWidth
              onClick={() => handleRhythm('vf_pvt')}
              className="flex-col py-6"
            >
              <span className="text-lg font-bold">{t('rhythm.vf_pvt')}</span>
              <span className="text-sm opacity-75">{t('rhythm.shockable')}</span>
            </Button>

            {/* Non-shockable */}
            <Button
              variant="nonshockable"
              size="xl"
              fullWidth
              onClick={() => handleRhythm('asystole_pea')}
              className="flex-col py-6"
            >
              <span className="text-lg font-bold">{t('rhythm.asystole_pea')}</span>
              <span className="text-sm opacity-75">{t('rhythm.nonShockable')}</span>
            </Button>
          </div>

          {/* Organized rhythm */}
          <Button
            variant="success"
            size="lg"
            fullWidth
            onClick={handleOrganized}
          >
            <span className="font-bold">{t('rhythm.organized')}</span>
            <span className="text-sm opacity-75 ml-2">{t('rhythm.checkPulse')}</span>
          </Button>

          <p className="text-xs text-center text-slate-500">
            {t('rhythm.considerHsTs')}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-center text-slate-50">
            {t('rhythm.organized')}
          </h2>

          <div className="grid grid-cols-1 gap-3">
            <Button
              variant="success"
              size="xl"
              fullWidth
              onClick={() => handlePulseResult(true)}
              className="py-6"
            >
              <span className="text-lg font-bold">{t('rhythm.pulsePresent')}</span>
            </Button>

            <Button
              variant="nonshockable"
              size="xl"
              fullWidth
              onClick={() => handlePulseResult(false)}
              className="py-6"
            >
              <span className="text-lg font-bold">{t('rhythm.noPulse')}</span>
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
