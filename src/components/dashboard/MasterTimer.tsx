import { formatMsLong } from '../../utils/formatTime';

interface MasterTimerProps {
  elapsed: number;
}

export function MasterTimer({ elapsed }: MasterTimerProps) {
  return (
    <div className="flex items-center gap-2">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" className="flex-shrink-0">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      <span className="text-xl md:text-2xl font-mono font-bold text-slate-50 tabular-nums">
        {formatMsLong(elapsed)}
      </span>
    </div>
  );
}
