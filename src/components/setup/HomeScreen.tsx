import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useSettingsStore } from '../../stores/settingsStore';
import { Button } from '../ui/Button';

export function HomeScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { language, setLanguage, audioEnabled, toggleAudio } = useSettingsStore();

  return (
    <div className="min-h-dvh bg-slate-900 flex flex-col items-center justify-center p-6 relative">
      {/* Top bar */}
      <div className="absolute top-4 right-4 flex items-center gap-3">
        {/* Language toggle */}
        <button
          onClick={() => setLanguage(language === 'en' ? 'de' : 'en')}
          className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-300 text-sm font-medium hover:bg-slate-700 touch-manipulation"
        >
          {language === 'en' ? 'DE' : 'EN'}
        </button>
        {/* Audio toggle */}
        <button
          onClick={toggleAudio}
          className="p-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-300 hover:bg-slate-700 touch-manipulation"
        >
          {audioEnabled ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          )}
        </button>
      </div>

      {/* UKB Logo + Title */}
      <div className="text-center mb-12">
        {/* UKB Logo */}
        <div className="w-24 h-24 mx-auto mb-4 rounded-2xl bg-white/10 border-2 border-white/20 flex items-center justify-center p-2">
          <svg width="56" height="56" viewBox="0 0 100 100" fill="none">
            {/* Cross symbol */}
            <rect x="38" y="12" width="24" height="76" rx="4" fill="#2563EB" />
            <rect x="12" y="38" width="76" height="24" rx="4" fill="#2563EB" />
            {/* Inner cross highlight */}
            <rect x="42" y="16" width="16" height="68" rx="2" fill="#3B82F6" />
            <rect x="16" y="42" width="68" height="16" rx="2" fill="#3B82F6" />
          </svg>
        </div>
        <div className="text-sm font-semibold text-blue-400 tracking-widest uppercase mb-1">
          UKB
        </div>
        <div className="text-xs text-slate-500 mb-6">
          Universitätsklinikum Bonn
        </div>
        <h1 className="text-3xl font-bold text-slate-50 mb-2">{t('app.title')}</h1>
        <p className="text-slate-400 text-lg">{t('app.subtitle')}</p>
      </div>

      {/* Start Button */}
      <Button
        variant="danger"
        size="xl"
        fullWidth
        className="max-w-md text-2xl py-8 mb-8"
        onClick={() => navigate('/setup')}
      >
        {t('home.start')}
      </Button>

      {/* History link */}
      <button
        onClick={() => navigate('/history')}
        className="text-slate-400 hover:text-slate-200 text-base underline underline-offset-4 touch-manipulation"
      >
        {t('home.history')}
      </button>

      {/* Credits */}
      <div className="absolute bottom-6 text-center">
        <p className="text-xs text-slate-600">Created by Karaki</p>
      </div>
    </div>
  );
}
