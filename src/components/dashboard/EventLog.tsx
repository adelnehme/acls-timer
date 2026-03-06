import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { formatMsLong } from '../../utils/formatTime';
import type { EventLogEntry } from '../../engine/types';

interface EventLogProps {
  events: EventLogEntry[];
  startTime: number;
}

const EVENT_ICONS: Record<string, string> = {
  resuscitation_started: '🚨',
  cpr_started: '🫀',
  rhythm_check: '🔍',
  rhythm_identified: '📊',
  shock_delivered: '⚡',
  medication_given: '💊',
  intervention: '🔧',
  reversible_cause_checked: '📋',
  rosc_achieved: '✅',
  re_arrest: '🔄',
  resuscitation_terminated: '⬛',
  note: '📝',
  cycle_started: '🔄',
  special_situation: '⚠️',
  abg_recorded: '🩸',
  hemodynamics_recorded: '💓',
  ventilation_recorded: '🌬️',
};

export function EventLog({ events, startTime }: EventLogProps) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events.length]);

  if (events.length === 0) {
    return (
      <div className="text-center text-slate-500 py-8">
        {t('eventLog.empty')}
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
        {t('eventLog.title')}
      </h3>
      <div ref={scrollRef} className="space-y-1 max-h-[50vh] overflow-y-auto">
        {events.map((event, index) => (
          <div
            key={event.id}
            className="flex items-start gap-2 text-xs p-2 rounded-lg hover:bg-slate-800/50"
          >
            <span className="text-slate-500 font-mono tabular-nums flex-shrink-0 min-w-[18px] text-right">
              {index + 1}.
            </span>
            <span className="flex-shrink-0 w-5 text-center">
              {EVENT_ICONS[event.type] || '•'}
            </span>
            <span className="text-slate-500 font-mono tabular-nums flex-shrink-0 min-w-[52px]">
              {formatMsLong(event.elapsed)}
            </span>
            <span className="text-slate-300 flex-1">
              {event.description}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
