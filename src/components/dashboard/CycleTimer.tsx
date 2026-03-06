import { ProgressRing } from '../ui/ProgressRing';
import { formatMs } from '../../utils/formatTime';
import { getCycleDurationMs } from '../../engine/acls';
import { useResuscitationStore } from '../../stores/resuscitationStore';

interface CycleTimerProps {
  remaining: number;
}

export function CycleTimer({ remaining }: CycleTimerProps) {
  const duration = getCycleDurationMs();
  const progress = remaining / duration;
  const isExpired = remaining <= 0;
  const isWarning = remaining > 0 && remaining <= 10000;

  const masterElapsed = useResuscitationStore((s) => s.timerValues.masterElapsed);
  const adjustStartTime = useResuscitationStore((s) => s.adjustStartTime);

  let color = '#3B82F6';
  if (isExpired) color = '#EF4444';
  else if (isWarning) color = '#F59E0B';

  return (
    <div className="flex flex-col items-center">
      <ProgressRing
        progress={progress}
        size={220}
        strokeWidth={10}
        color={color}
        className={isExpired ? 'animate-pulse' : ''}
      >
        <div className="text-center">
          <div
            className={`text-5xl md:text-6xl font-mono font-bold tabular-nums ${
              isExpired ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-slate-50'
            }`}
          >
            {isExpired ? '00:00' : formatMs(remaining)}
          </div>
          <div className="text-sm text-slate-400 mt-1">
            CPR
          </div>
        </div>
      </ProgressRing>

      {isExpired && (
        <div className="mt-3 px-4 py-2 bg-red-600/20 border border-red-600 rounded-xl text-red-400 text-sm font-semibold animate-pulse text-center">
          CHECK RHYTHM NOW
        </div>
      )}

      {/* Elapsed time adjust */}
      <div className="flex items-center gap-3 mt-4">
        <button
          onClick={() => adjustStartTime(Math.max(0, masterElapsed - 15000))}
          className="px-3 py-2 rounded-lg bg-slate-700 text-slate-300 text-sm font-bold hover:bg-slate-600 touch-manipulation active:scale-95 transition-transform"
        >
          -15s
        </button>
        <button
          onClick={() => adjustStartTime(masterElapsed + 15000)}
          className="px-3 py-2 rounded-lg bg-slate-700 text-slate-300 text-sm font-bold hover:bg-slate-600 touch-manipulation active:scale-95 transition-transform"
        >
          +15s
        </button>
      </div>
    </div>
  );
}
