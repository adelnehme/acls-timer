import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useResuscitationStore } from '../../stores/resuscitationStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { formatMsLong, formatTimestamp, formatDate } from '../../utils/formatTime';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { generatePdf } from '../../utils/pdfGenerator';

export function SummaryScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { session, handleReArrest, startSession } = useResuscitationStore();
  const lang = useSettingsStore((s) => s.language);

  if (!session) {
    return (
      <div className="min-h-dvh bg-slate-900 flex items-center justify-center">
        <Button variant="primary" size="lg" onClick={() => navigate('/')}>
          {t('common.back')}
        </Button>
      </div>
    );
  }

  const isRosc = session.outcome === 'rosc';
  const duration = (session.endTime ?? Date.now()) - session.startTime;

  const handleExportPdf = () => {
    generatePdf(session, lang);
  };

  const handleReArrestClick = () => {
    handleReArrest();
    navigate('/dashboard');
  };

  const handleNewSession = () => {
    startSession();
    navigate('/');
  };

  return (
    <div className="min-h-dvh bg-slate-900 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <div
            className={`inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-2xl font-bold ${
              isRosc
                ? 'bg-green-900/30 text-green-400 border-2 border-green-700'
                : 'bg-slate-800 text-slate-300 border-2 border-slate-600'
            }`}
          >
            {isRosc ? '✅' : '⬛'}{' '}
            {isRosc ? t('summary.roscAchieved') : t('summary.terminated')}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard label={t('summary.duration')} value={formatMsLong(duration)} />
          <StatCard label={t('summary.totalShocks')} value={String(session.shockCount)} />
          <StatCard label={t('summary.totalCycles')} value={String(session.currentCycle)} />
        </div>

        {/* Patient info */}
        {session.patientId && (
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <span className="text-sm text-slate-400">Patient: </span>
            <span className="text-slate-50 font-medium">{session.patientId}</span>
          </div>
        )}

        {/* Time info */}
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Date</span>
            <span className="text-slate-200">{formatDate(session.startTime)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Start</span>
            <span className="text-slate-200 font-mono">{formatTimestamp(session.startTime)}</span>
          </div>
          {session.endTime && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">End</span>
              <span className="text-slate-200 font-mono">{formatTimestamp(session.endTime)}</span>
            </div>
          )}
        </div>

        {/* Medications */}
        {session.medications.length > 0 && (
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
              {t('summary.medicationsGiven')}
            </h3>
            <div className="space-y-2">
              {session.medications.map((med) => (
                <div key={med.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="purple">{med.customName || med.medication}</Badge>
                    <span className="text-slate-300">{med.dose} {med.route}</span>
                  </div>
                  <span className="text-slate-500 font-mono text-xs">
                    {formatMsLong(med.timestamp - session.startTime)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
            {t('summary.timeline')}
          </h3>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {session.events.map((event) => (
              <div key={event.id} className="flex items-start gap-2 text-xs">
                <span className="text-slate-500 font-mono tabular-nums min-w-[52px]">
                  {formatMsLong(event.elapsed)}
                </span>
                <span className="text-slate-300">{event.description}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Post-ROSC care checklist */}
        {isRosc && <PostRoscChecklist />}

        {/* Actions */}
        <div className="flex flex-col gap-3 pb-8">
          <div className="grid grid-cols-2 gap-3">
            <Button variant="primary" size="lg" fullWidth onClick={handleExportPdf}>
              {t('summary.exportPdf')}
            </Button>
            <Button variant="ghost" size="lg" fullWidth onClick={() => window.print()}>
              {t('summary.print')}
            </Button>
          </div>

          {isRosc && (
            <Button variant="danger" size="lg" fullWidth onClick={handleReArrestClick}>
              {t('summary.reArrest')}
            </Button>
          )}

          <Button variant="ghost" size="lg" fullWidth onClick={handleNewSession}>
            {t('summary.newSession')}
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 text-center">
      <div className="text-2xl font-mono font-bold text-slate-50 tabular-nums">{value}</div>
      <div className="text-xs text-slate-400 mt-1">{label}</div>
    </div>
  );
}

function PostRoscChecklist() {
  const { t } = useTranslation();
  const items = [
    'ecg12lead',
    'targetTemperature',
    'hemodynamics',
    'labs',
    'imaging',
    'transport',
  ] as const;

  return (
    <div className="bg-green-900/20 rounded-xl p-4 border border-green-700">
      <h3 className="text-sm font-semibold text-green-400 uppercase tracking-wider mb-3">
        {t('postRosc.title')}
      </h3>
      <div className="space-y-2">
        {items.map((item) => (
          <label key={item} className="flex items-center gap-3 text-sm text-slate-300 cursor-pointer touch-manipulation">
            <input
              type="checkbox"
              className="w-5 h-5 rounded border-2 border-green-700 bg-transparent text-green-500 focus:ring-green-600"
            />
            {t(`postRosc.${item}`)}
          </label>
        ))}
      </div>
    </div>
  );
}
