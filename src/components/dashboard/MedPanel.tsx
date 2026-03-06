import { useTranslation } from 'react-i18next';
import { formatMs } from '../../utils/formatTime';
import { formatTimestamp } from '../../utils/formatTime';
import { isEpinephrineDue, isEpinephrineCritical, isAmiodaroneSuggested } from '../../engine/acls';
import { useResuscitationStore } from '../../stores/resuscitationStore';
import type { ResuscitationSession } from '../../engine/types';

interface MedPanelProps {
  session: ResuscitationSession;
}

export function MedPanel({ session }: MedPanelProps) {
  const { t } = useTranslation();
  const timerValues = useResuscitationStore((s) => s.timerValues);
  const quickGiveEpi = useResuscitationStore((s) => s.quickGiveEpi);
  const quickGiveAmio = useResuscitationStore((s) => s.quickGiveAmio);

  const epiDue = isEpinephrineDue(session);
  const epiCritical = isEpinephrineCritical(session);
  const amioStatus = isAmiodaroneSuggested(session);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
        {t('medications.title')}
      </h3>

      {/* Epinephrine Timer */}
      <div
        className={`p-3 rounded-xl border-2 ${
          epiCritical
            ? 'border-red-500 bg-red-900/20 animate-pulse'
            : epiDue
            ? 'border-amber-500 bg-amber-900/20'
            : 'border-slate-600 bg-slate-800'
        }`}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-semibold text-slate-300">
            {t('medications.epinephrine')}
          </span>
          <span className="text-xs text-slate-400">
            #{session.epinephrineCount}
          </span>
        </div>
        {timerValues.epiCountdown !== null ? (
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">{t('medications.dueIn')}</span>
            <span
              className={`text-lg font-mono font-bold tabular-nums ${
                epiCritical ? 'text-red-400' : epiDue ? 'text-amber-400' : 'text-slate-50'
              }`}
            >
              {timerValues.epiCountdown <= 0
                ? t('medications.overdue')
                : formatMs(timerValues.epiCountdown)}
            </span>
          </div>
        ) : (
          <div className="text-xs text-slate-500">
            {session.epinephrineCount === 0
              ? (session.currentRhythm === 'asystole_pea'
                  ? t('medications.due')
                  : session.shockCount >= 2
                  ? t('medications.due')
                  : `After 2nd shock`)
              : t('medications.given')}
          </div>
        )}
        {/* Quick give button */}
        {epiDue && (
          <button
            onClick={quickGiveEpi}
            className="mt-2 w-full py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-sm touch-manipulation active:scale-95 transition-transform"
          >
            GIVE EPI 1mg IV
          </button>
        )}
      </div>

      {/* Amiodarone */}
      {session.currentRhythm === 'vf_pvt' && (
        <div
          className={`p-3 rounded-xl border-2 ${
            amioStatus.suggested
              ? 'border-amber-500 bg-amber-900/20'
              : 'border-slate-600 bg-slate-800'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-semibold text-slate-300">
              {t('medications.amiodarone')}
            </span>
            <span className="text-xs text-slate-400">
              {session.amiodaroneDosesGiven}/2
            </span>
          </div>
          {amioStatus.suggested ? (
            <div className="text-sm font-medium text-amber-400">
              {t('medications.amioAvailable', { dose: amioStatus.dose })}
            </div>
          ) : (
            <div className="text-xs text-slate-500">
              {session.amiodaroneDosesGiven >= 2
                ? 'Max doses given'
                : session.shockCount < 3
                ? `After 3rd shock`
                : 'Available'}
            </div>
          )}
          {/* Quick give button */}
          {amioStatus.suggested && (
            <button
              onClick={quickGiveAmio}
              className="mt-2 w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-sm touch-manipulation active:scale-95 transition-transform"
            >
              GIVE AMIO {amioStatus.dose} IV
            </button>
          )}
        </div>
      )}

      {/* Medication History */}
      {session.medications.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            {t('medications.given')}
          </h4>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {[...session.medications].reverse().map((med) => (
              <div key={med.id} className="flex items-center justify-between text-xs p-2 bg-slate-800/50 rounded-lg">
                <span className="text-slate-300">
                  {med.customName || med.medication} {med.dose}
                </span>
                <span className="text-slate-500 font-mono tabular-nums">
                  {formatTimestamp(med.timestamp)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
