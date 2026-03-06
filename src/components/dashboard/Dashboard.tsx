import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useResuscitation } from '../../hooks/useResuscitation';
import { useSettingsStore } from '../../stores/settingsStore';
import { MasterTimer } from './MasterTimer';
import { CycleTimer } from './CycleTimer';
import { RhythmPanel } from './RhythmPanel';
import { ActionPanel } from './ActionPanel';
import { MedPanel } from './MedPanel';
import { EventLog } from './EventLog';
import { ReversibleCauses } from './ReversibleCauses';
import { InterventionBar } from './InterventionBar';
import { RhythmCheckModal } from './RhythmCheckModal';
import { ABGPanel } from './ABGPanel';
import { HemodynamicsPanel } from './HemodynamicsPanel';
import { VentilationPanel } from './VentilationPanel';
import { MedicationAlerts } from './MedicationAlerts';
import { SlideInPanel } from '../ui/SlideInPanel';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

export function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const store = useResuscitation();
  const { language, setLanguage, toggleAudio, audioEnabled } = useSettingsStore();

  // Redirect if no active session
  useEffect(() => {
    if (!store.session) {
      navigate('/');
    }
  }, [store.session, navigate]);

  if (!store.session) return null;

  const session = store.session;
  const rhythmColor = session.currentRhythm === 'vf_pvt' ? 'border-red-600' : session.currentRhythm === 'asystole_pea' ? 'border-blue-600' : 'border-slate-600';

  return (
    <div className={`min-h-dvh bg-slate-900 flex flex-col border-t-4 ${rhythmColor}`}>
      {/* Top Bar */}
      <div className="bg-slate-800 border-b border-slate-700 px-3 py-2 flex items-center justify-between gap-2 flex-wrap">
        <MasterTimer elapsed={store.timerValues.masterElapsed} />

        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-400">
            {t('dashboard.cycle')} <span className="text-slate-50 font-bold">{session.currentCycle}</span>
          </span>
          <span className="text-slate-400">
            {t('dashboard.shocks')} <span className="text-slate-50 font-bold">{session.shockCount}</span>
          </span>
          <RhythmPanel rhythm={session.currentRhythm} />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setLanguage(language === 'en' ? 'de' : 'en')}
            className="px-2 py-1 rounded bg-slate-700 text-slate-300 text-xs font-medium hover:bg-slate-600 touch-manipulation"
          >
            {language === 'en' ? 'DE' : 'EN'}
          </button>
          <button
            onClick={toggleAudio}
            className="p-1.5 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 touch-manipulation"
          >
            {audioEnabled ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <path d="M15.54 8.46a5 5 0 010 7.07" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Main content - responsive grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden relative">
        {/* Left: Medications panel */}
        <div className="lg:col-span-3 border-r border-slate-700 overflow-y-auto p-3">
          <MedPanel session={session} />
        </div>

        {/* Center: Timer + Actions */}
        <div className="lg:col-span-5 flex flex-col items-center justify-start p-4 gap-4 overflow-y-auto">
          <CycleTimer remaining={store.timerValues.cycleRemaining} />
          <ActionPanel />
        </div>

        {/* Right: Event log + Reversible causes */}
        <div className="lg:col-span-4 border-l border-slate-700 overflow-y-auto flex flex-col">
          <div className="flex-1 p-3 overflow-y-auto">
            <EventLog events={session.events} startTime={session.startTime} />
          </div>
          <div className="border-t border-slate-700 p-3">
            <ReversibleCauses causes={session.reversibleCauses} />
          </div>
        </div>

        {/* Floating side buttons */}
        <div className="fixed right-0 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-40 pr-1">
          <button
            onClick={() => store.setShowAbgPanel(true)}
            className={`px-2 py-3 rounded-l-lg text-xs font-bold writing-vertical shadow-lg touch-manipulation transition-colors ${
              store.abgReminderDue
                ? 'bg-amber-600 text-white animate-pulse'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
          >
            ABG
          </button>
          <button
            onClick={() => store.setShowHemodynamicsPanel(true)}
            className="px-2 py-3 rounded-l-lg bg-slate-700 text-slate-300 hover:bg-slate-600 text-xs font-bold shadow-lg touch-manipulation"
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
          >
            HEMO
          </button>
          <button
            onClick={() => store.setShowVentilationPanel(true)}
            className="px-2 py-3 rounded-l-lg bg-slate-700 text-slate-300 hover:bg-slate-600 text-xs font-bold shadow-lg touch-manipulation"
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
          >
            VENT
          </button>
        </div>
      </div>

      {/* Bottom: Intervention bar */}
      <InterventionBar interventions={session.interventions} />

      {/* Credits */}
      <div className="fixed bottom-2 right-2 z-30 text-[10px] text-slate-600 pointer-events-none">
        Created by Karaki
      </div>

      {/* Medication Alert Popups */}
      <MedicationAlerts />

      {/* Rhythm Check Modal */}
      <RhythmCheckModal />

      {/* Side Panels */}
      <SlideInPanel
        open={store.showAbgPanel}
        onClose={() => store.setShowAbgPanel(false)}
        title={t('abg.title')}
      >
        <ABGPanel />
      </SlideInPanel>

      <SlideInPanel
        open={store.showHemodynamicsPanel}
        onClose={() => store.setShowHemodynamicsPanel(false)}
        title={t('hemo.title')}
      >
        <HemodynamicsPanel />
      </SlideInPanel>

      <SlideInPanel
        open={store.showVentilationPanel}
        onClose={() => store.setShowVentilationPanel(false)}
        title={t('vent.title')}
      >
        <VentilationPanel />
      </SlideInPanel>

      {/* End Resuscitation Confirmation */}
      <Modal
        open={store.showEndConfirmation}
        onClose={() => store.setShowEndConfirmation(false)}
        title={t('confirm.endTitle')}
      >
        <p className="text-slate-300 mb-6">{t('confirm.endMessage')}</p>
        <div className="flex gap-3">
          <Button
            variant="ghost"
            size="lg"
            fullWidth
            onClick={() => store.setShowEndConfirmation(false)}
          >
            {t('confirm.cancel')}
          </Button>
          <Button
            variant="danger"
            size="lg"
            fullWidth
            onClick={() => {
              store.terminate();
              navigate('/summary');
            }}
          >
            {t('confirm.yes')}
          </Button>
        </div>
      </Modal>

      {/* ROSC Confirmation */}
      <Modal
        open={store.showRoscConfirmation}
        onClose={() => store.setShowRoscConfirmation(false)}
        title={t('confirm.roscTitle')}
      >
        <p className="text-slate-300 mb-6">{t('confirm.roscMessage')}</p>
        <div className="flex gap-3">
          <Button
            variant="ghost"
            size="lg"
            fullWidth
            onClick={() => store.setShowRoscConfirmation(false)}
          >
            {t('confirm.cancel')}
          </Button>
          <Button
            variant="success"
            size="lg"
            fullWidth
            onClick={() => {
              store.rosc();
              navigate('/summary');
            }}
          >
            {t('confirm.yes')}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
