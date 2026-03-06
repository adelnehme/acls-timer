import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useResuscitationStore } from '../../stores/resuscitationStore';
import { useSettingsStore } from '../../stores/settingsStore';
import type { ReversibleCause } from '../../engine/types';

interface ReversibleCausesProps {
  causes: ReversibleCause[];
}

export function ReversibleCauses({ causes }: ReversibleCausesProps) {
  const { t } = useTranslation();
  const { toggleCause } = useResuscitationStore();
  const lang = useSettingsStore((s) => s.language);
  const [expanded, setExpanded] = useState(false);

  const hs = causes.filter((c) => c.category === 'h');
  const ts = causes.filter((c) => c.category === 't');

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2 touch-manipulation"
      >
        <span>{t('reversibleCauses.title')}</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {expanded && (
        <div className="space-y-3">
          {/* 5 Hs */}
          <div>
            <div className="text-xs font-semibold text-red-400 mb-1">{t('reversibleCauses.hs')}</div>
            <div className="space-y-1">
              {hs.map((cause) => (
                <CauseRow key={cause.id} cause={cause} lang={lang} onToggle={toggleCause} />
              ))}
            </div>
          </div>

          {/* 5 Ts */}
          <div>
            <div className="text-xs font-semibold text-blue-400 mb-1">{t('reversibleCauses.ts')}</div>
            <div className="space-y-1">
              {ts.map((cause) => (
                <CauseRow key={cause.id} cause={cause} lang={lang} onToggle={toggleCause} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CauseRow({
  cause,
  lang,
  onToggle,
}: {
  cause: ReversibleCause;
  lang: string;
  onToggle: (id: string, action: 'check' | 'rule_out') => void;
}) {
  const nameKey = lang === 'de' ? 'de' : 'en';
  return (
    <div className="flex items-center gap-2 text-xs p-1.5 rounded-lg hover:bg-slate-800/50">
      <button
        onClick={() => onToggle(cause.id, 'check')}
        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 touch-manipulation ${
          cause.checked
            ? 'bg-amber-600 border-amber-600 text-white'
            : 'border-slate-500 text-transparent'
        }`}
      >
        {cause.checked && '✓'}
      </button>
      <span
        className={`flex-1 ${
          cause.ruled_out ? 'line-through text-slate-600' : cause.checked ? 'text-amber-300' : 'text-slate-300'
        }`}
      >
        {cause.name[nameKey]}
      </span>
      <button
        onClick={() => onToggle(cause.id, 'rule_out')}
        className={`text-[10px] px-1.5 py-0.5 rounded border touch-manipulation ${
          cause.ruled_out
            ? 'bg-green-900/50 border-green-700 text-green-400'
            : 'border-slate-600 text-slate-500 hover:border-slate-500'
        }`}
      >
        {cause.ruled_out ? '✗' : 'R/O'}
      </button>
    </div>
  );
}
