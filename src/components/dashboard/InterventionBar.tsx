import { useTranslation } from 'react-i18next';
import { useResuscitationStore } from '../../stores/resuscitationStore';
import { formatMsLong } from '../../utils/formatTime';
import type { Intervention, InterventionType } from '../../engine/types';

interface InterventionBarProps {
  interventions: Intervention[];
}

const INTERVENTION_ITEMS: { type: InterventionType; icon: string }[] = [
  { type: 'iv', icon: '💉' },
  { type: 'io', icon: '🦴' },
  { type: 'ett', icon: '🫁' },
  { type: 'supraglottic', icon: '😮' },
  { type: 'etco2', icon: '📈' },
];

export function InterventionBar({ interventions }: InterventionBarProps) {
  const { t } = useTranslation();
  const { addIntervention, session } = useResuscitationStore();

  const isEstablished = (type: InterventionType) =>
    interventions.some((i) => i.type === type);

  const getTime = (type: InterventionType) => {
    const intervention = interventions.find((i) => i.type === type);
    if (!intervention || !session) return null;
    return formatMsLong(intervention.timestamp - session.startTime);
  };

  return (
    <div className="bg-slate-800 border-t border-slate-700 px-3 py-2">
      <div className="flex items-center gap-3 overflow-x-auto">
        {INTERVENTION_ITEMS.map(({ type, icon }) => {
          const established = isEstablished(type);
          const time = getTime(type);
          return (
            <button
              key={type}
              onClick={() => {
                if (!established) addIntervention(type);
              }}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                whitespace-nowrap touch-manipulation transition-colors
                ${
                  established
                    ? 'bg-green-900/30 border border-green-700 text-green-400'
                    : 'bg-slate-700 border border-slate-600 text-slate-400 hover:bg-slate-600'
                }
              `}
            >
              <span>{icon}</span>
              <span>{t(`interventions.${type}`)}</span>
              {established && time && (
                <span className="text-green-600 font-mono tabular-nums">{time}</span>
              )}
              {established && <span className="text-green-400">✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
