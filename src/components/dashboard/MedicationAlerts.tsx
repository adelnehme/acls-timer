import { useTranslation } from 'react-i18next';
import { useResuscitationStore } from '../../stores/resuscitationStore';

export function MedicationAlerts() {
  const { t } = useTranslation();
  const {
    epiAlertVisible,
    amioAlertVisible,
    amioAlertDose,
    abgReminderDue,
    reversibleCausesReminderVisible,
    setEpiAlertVisible,
    setAmioAlertVisible,
    setAbgReminderDue,
    setReversibleCausesReminderVisible,
    setShowAbgPanel,
    quickGiveEpi,
    quickGiveAmio,
  } = useResuscitationStore();

  return (
    <div className="fixed top-14 left-0 right-0 z-50 flex flex-col items-center gap-2 px-4 pointer-events-none">
      {/* Epinephrine alert — URGENT red */}
      {epiAlertVisible && (
        <div className="w-full max-w-xl pointer-events-auto animate-bounce-in">
          <div className="bg-red-700 border-2 border-red-400 rounded-xl p-3 shadow-2xl shadow-red-900/50 flex items-center gap-3">
            <div className="flex-shrink-0 text-3xl">💉</div>
            <div className="flex-1 min-w-0">
              <div className="text-white font-bold text-lg">EPINEPHRINE DUE</div>
              <div className="text-red-200 text-sm">1 mg IV/IO — Give now</div>
            </div>
            <button
              onClick={quickGiveEpi}
              className="flex-shrink-0 px-5 py-2.5 bg-white text-red-700 font-bold rounded-lg text-lg touch-manipulation active:scale-95 transition-transform"
            >
              GIVEN
            </button>
            <button
              onClick={() => setEpiAlertVisible(false)}
              className="flex-shrink-0 p-1.5 text-red-300 hover:text-white touch-manipulation"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Amiodarone alert — amber, less urgent */}
      {amioAlertVisible && (
        <div className="w-full max-w-xl pointer-events-auto animate-bounce-in">
          <div className="bg-amber-700 border-2 border-amber-400 rounded-xl p-3 shadow-2xl shadow-amber-900/50 flex items-center gap-3">
            <div className="flex-shrink-0 text-3xl">💊</div>
            <div className="flex-1 min-w-0">
              <div className="text-white font-bold text-lg">AMIODARONE</div>
              <div className="text-amber-200 text-sm">{amioAlertDose} IV/IO — Refractory VF/pVT</div>
            </div>
            <button
              onClick={quickGiveAmio}
              className="flex-shrink-0 px-5 py-2.5 bg-white text-amber-700 font-bold rounded-lg text-lg touch-manipulation active:scale-95 transition-transform"
            >
              GIVEN
            </button>
            <button
              onClick={() => setAmioAlertVisible(false)}
              className="flex-shrink-0 p-1.5 text-amber-300 hover:text-white touch-manipulation"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ABG reminder — blue/purple */}
      {abgReminderDue && (
        <div className="w-full max-w-xl pointer-events-auto animate-bounce-in">
          <div className="bg-purple-800 border-2 border-purple-400 rounded-xl p-3 shadow-2xl flex items-center gap-3">
            <div className="flex-shrink-0 text-2xl">🩸</div>
            <div className="flex-1 min-w-0">
              <div className="text-white font-bold">ABG REMINDER</div>
              <div className="text-purple-200 text-sm">Last blood gas &gt;10 min ago — consider repeat ABG</div>
            </div>
            <button
              onClick={() => { setShowAbgPanel(true); setAbgReminderDue(false); }}
              className="flex-shrink-0 px-4 py-2 bg-purple-500 text-white font-bold rounded-lg text-sm touch-manipulation active:scale-95 transition-transform"
            >
              OPEN ABG
            </button>
            <button
              onClick={() => setAbgReminderDue(false)}
              className="flex-shrink-0 p-1.5 text-purple-300 hover:text-white touch-manipulation"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Reversible causes reminder — slate */}
      {reversibleCausesReminderVisible && (
        <div className="w-full max-w-xl pointer-events-auto animate-bounce-in">
          <div className="bg-slate-700 border-2 border-slate-400 rounded-xl p-3 shadow-2xl flex items-center gap-3">
            <div className="flex-shrink-0 text-2xl">📋</div>
            <div className="flex-1 min-w-0">
              <div className="text-white font-bold">REVERSIBLE CAUSES</div>
              <div className="text-slate-300 text-sm">Have you checked Hs &amp; Ts?</div>
            </div>
            <button
              onClick={() => setReversibleCausesReminderVisible(false)}
              className="flex-shrink-0 px-4 py-2 bg-slate-500 text-white font-bold rounded-lg text-sm touch-manipulation active:scale-95 transition-transform"
            >
              DISMISS
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
