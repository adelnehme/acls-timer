import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useResuscitationStore } from '../../stores/resuscitationStore';
import { evaluateVentilationRules } from '../../engine/ventilationRules';
import { getVentilationRecommendations, isGeminiConfigured } from '../../services/geminiService';
import { formatMsLong } from '../../utils/formatTime';
import { Button } from '../ui/Button';
import type { VentilationSettings, VentilationMode, VentilationRecommendation, VentilationEntry } from '../../engine/types';

const MODES: VentilationMode[] = ['VC', 'PC', 'PRVC', 'SIMV', 'CPAP', 'manual'];

const EMPTY_SETTINGS: VentilationSettings = {
  mode: 'VC',
  peep: null,
  pInsp: null,
  tidalVolume: null,
  fio2: null,
  respiratoryRate: null,
  ieRatio: null,
};

export function VentilationPanel() {
  const { t } = useTranslation();
  const { session, addVentilationEntry } = useResuscitationStore();
  const [settings, setSettings] = useState<VentilationSettings>({ ...EMPTY_SETTINGS });
  const [recommendations, setRecommendations] = useState<VentilationRecommendation[]>([]);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!session) return null;

  const isPressureMode = settings.mode === 'PC' || settings.mode === 'PRVC';

  const updateSetting = (key: keyof VentilationSettings, val: string) => {
    if (key === 'mode' || key === 'ieRatio') {
      setSettings(prev => ({ ...prev, [key]: val }));
    } else {
      setSettings(prev => ({ ...prev, [key]: val === '' ? null : Number(val) }));
    }
  };

  const handleEvaluate = () => {
    const lastAbg = session.abgResults.length > 0 ? session.abgResults[session.abgResults.length - 1].values : null;
    const lastHemo = session.hemodynamicsHistory.length > 0 ? session.hemodynamicsHistory[session.hemodynamicsHistory.length - 1].vitals : null;
    const ruleRecs = evaluateVentilationRules(settings, lastAbg, lastHemo);
    setRecommendations(ruleRecs);
  };

  const handleAIRecommendations = async () => {
    if (!isGeminiConfigured()) return;
    setIsLoading(true);
    try {
      const lastAbg = session.abgResults.length > 0 ? session.abgResults[session.abgResults.length - 1].values : null;
      const lastHemo = session.hemodynamicsHistory.length > 0 ? session.hemodynamicsHistory[session.hemodynamicsHistory.length - 1].vitals : null;
      const aiRecs = await getVentilationRecommendations(settings, lastAbg, lastHemo);
      // Merge: AI recs + rule recs (deduplicated)
      const ruleRecs = evaluateVentilationRules(settings, lastAbg, lastHemo);
      setRecommendations([...aiRecs, ...ruleRecs.filter(r => !aiRecs.some(a => a.parameter === r.parameter))]);
    } catch {
      // Fallback to rules
      handleEvaluate();
    } finally {
      setIsLoading(false);
    }
  };

  const hasData = settings.mode !== 'VC' || Object.entries(settings).some(([k, v]) => k !== 'mode' && v != null);

  const handleRecord = () => {
    const now = Date.now();
    const entry: VentilationEntry = {
      id: `vent-${now}`,
      timestamp: now,
      elapsed: now - session.startTime,
      cycle: session.currentCycle,
      settings,
      recommendations,
      notes: notes || undefined,
    };
    addVentilationEntry(entry);
    setSettings({ ...EMPTY_SETTINGS });
    setRecommendations([]);
    setNotes('');
  };

  const severityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-red-700 bg-red-900/30 text-red-400';
      case 'warning': return 'border-amber-700 bg-amber-900/30 text-amber-400';
      default: return 'border-blue-700 bg-blue-900/30 text-blue-400';
    }
  };

  return (
    <div className="space-y-4">
      {/* Mode selector */}
      <div>
        <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">{t('vent.mode')}</h4>
        <div className="flex flex-wrap gap-1">
          {MODES.map(mode => (
            <button
              key={mode}
              onClick={() => updateSetting('mode', mode)}
              className={`px-3 py-1.5 rounded text-sm font-medium touch-manipulation ${
                settings.mode === mode
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 border border-slate-600 hover:text-slate-200'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Parameters */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col">
          <label className="text-xs text-slate-400 mb-1">PEEP <span className="text-slate-600">(cmH2O)</span></label>
          <input
            type="number"
            value={settings.peep ?? ''}
            onChange={(e) => updateSetting('peep', e.target.value)}
            className="px-2 py-1.5 bg-slate-800 border border-slate-600 rounded text-sm text-slate-200 focus:outline-none focus:border-slate-400"
            placeholder="5"
          />
        </div>

        {isPressureMode ? (
          <div className="flex flex-col">
            <label className="text-xs text-slate-400 mb-1">P-insp <span className="text-slate-600">(cmH2O)</span></label>
            <input
              type="number"
              value={settings.pInsp ?? ''}
              onChange={(e) => updateSetting('pInsp', e.target.value)}
              className="px-2 py-1.5 bg-slate-800 border border-slate-600 rounded text-sm text-slate-200 focus:outline-none focus:border-slate-400"
              placeholder="20"
            />
          </div>
        ) : (
          <div className="flex flex-col">
            <label className="text-xs text-slate-400 mb-1">TV <span className="text-slate-600">(mL)</span></label>
            <input
              type="number"
              value={settings.tidalVolume ?? ''}
              onChange={(e) => updateSetting('tidalVolume', e.target.value)}
              className="px-2 py-1.5 bg-slate-800 border border-slate-600 rounded text-sm text-slate-200 focus:outline-none focus:border-slate-400"
              placeholder="400"
            />
          </div>
        )}

        <div className="flex flex-col">
          <label className="text-xs text-slate-400 mb-1">FiO2 <span className="text-slate-600">(%)</span></label>
          <input
            type="number"
            value={settings.fio2 ?? ''}
            onChange={(e) => updateSetting('fio2', e.target.value)}
            className="px-2 py-1.5 bg-slate-800 border border-slate-600 rounded text-sm text-slate-200 focus:outline-none focus:border-slate-400"
            placeholder="100"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs text-slate-400 mb-1">RR <span className="text-slate-600">(/min)</span></label>
          <input
            type="number"
            value={settings.respiratoryRate ?? ''}
            onChange={(e) => updateSetting('respiratoryRate', e.target.value)}
            className="px-2 py-1.5 bg-slate-800 border border-slate-600 rounded text-sm text-slate-200 focus:outline-none focus:border-slate-400"
            placeholder="12"
          />
        </div>

        <div className="flex flex-col col-span-2">
          <label className="text-xs text-slate-400 mb-1">I:E Ratio</label>
          <input
            type="text"
            value={settings.ieRatio ?? ''}
            onChange={(e) => updateSetting('ieRatio', e.target.value)}
            className="px-2 py-1.5 bg-slate-800 border border-slate-600 rounded text-sm text-slate-200 focus:outline-none focus:border-slate-400"
            placeholder="1:2"
          />
        </div>
      </div>

      {/* Evaluate + AI buttons */}
      <div className="flex gap-2">
        <Button variant="ghost" size="md" fullWidth onClick={handleEvaluate}>
          {t('vent.evaluate')}
        </Button>
        {isGeminiConfigured() && (
          <Button variant="primary" size="md" fullWidth onClick={handleAIRecommendations} disabled={isLoading}>
            {isLoading ? t('vent.loading') : t('vent.aiRecommend')}
          </Button>
        )}
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-slate-400 uppercase">{t('vent.recommendations')}</h4>
          {recommendations.map((rec, i) => (
            <div key={i} className={`p-2 rounded border text-xs ${severityColor(rec.severity)}`}>
              <div className="font-medium">{rec.parameter}: {rec.suggestion}</div>
              <div className="mt-1 opacity-80">{rec.rationale}</div>
              <div className="mt-1 text-[10px] opacity-60">
                {rec.generatedBy === 'gemini' ? 'AI' : 'Rule-based'}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="text-xs text-slate-400 mb-1 block">{t('vent.notes')}</label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full px-2 py-1.5 bg-slate-800 border border-slate-600 rounded text-sm text-slate-200 focus:outline-none focus:border-slate-400"
          placeholder={t('vent.notesPlaceholder')}
        />
      </div>

      {/* Record */}
      <Button variant="primary" size="lg" fullWidth onClick={handleRecord} disabled={!hasData}>
        {t('vent.record')}
      </Button>

      {/* History */}
      {session.ventilationHistory.length > 0 && (
        <div className="space-y-2 mt-4">
          <h4 className="text-xs font-semibold text-slate-400 uppercase">{t('vent.history')}</h4>
          {session.ventilationHistory.map((entry) => (
            <div key={entry.id} className="bg-slate-800 rounded-lg p-2 border border-slate-700 text-xs">
              <div className="flex justify-between text-slate-400 mb-1">
                <span>{formatMsLong(entry.elapsed)}</span>
                <span>{entry.settings.mode}</span>
              </div>
              <div className="grid grid-cols-3 gap-1 text-slate-300">
                {entry.settings.fio2 != null && <span>FiO2 {entry.settings.fio2}%</span>}
                {entry.settings.peep != null && <span>PEEP {entry.settings.peep}</span>}
                {entry.settings.tidalVolume != null && <span>TV {entry.settings.tidalVolume}</span>}
                {entry.settings.respiratoryRate != null && <span>RR {entry.settings.respiratoryRate}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
