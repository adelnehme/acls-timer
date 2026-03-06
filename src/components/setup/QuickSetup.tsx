import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useResuscitationStore } from '../../stores/resuscitationStore';
import { Button } from '../ui/Button';

export function QuickSetup() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { startSession } = useResuscitationStore();
  const [patientId, setPatientId] = useState('');

  const handleBegin = () => {
    startSession(patientId || undefined);
    navigate('/dashboard');
  };

  const handleSkip = () => {
    startSession(patientId || undefined);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-dvh bg-slate-900 flex flex-col p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/')}
          className="text-slate-400 hover:text-slate-200 p-2 touch-manipulation"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-slate-50">{t('setup.title')}</h1>
        <div className="w-10" /> {/* Spacer */}
      </div>

      {/* Patient ID */}
      <div className="mb-6">
        <label className="block text-sm text-slate-400 mb-2">{t('setup.patientId')}</label>
        <input
          type="text"
          value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
          placeholder={t('setup.patientIdPlaceholder')}
          className="w-full px-4 py-3 bg-slate-800 border-2 border-slate-600 rounded-xl text-slate-50 text-lg placeholder:text-slate-500 focus:outline-none focus:border-slate-400"
          autoFocus
        />
      </div>

      <div className="flex-1" />

      {/* Action buttons */}
      <div className="flex flex-col gap-3 pb-4">
        <Button variant="danger" size="xl" fullWidth onClick={handleBegin} className="text-xl">
          {t('setup.begin')}
        </Button>
        <Button variant="ghost" size="lg" fullWidth onClick={handleSkip}>
          {t('setup.skipSetup')}
        </Button>
      </div>
    </div>
  );
}
