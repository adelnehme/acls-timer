import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useResuscitationStore } from '../../stores/resuscitationStore';
import { evaluateABGAlerts, getBasicInterpretation, needsGeminiInterpretation, getValueColor, getAlertColor } from '../../engine/abgRules';
import { extractABGFromImage, getABGInterpretation, isGeminiConfigured } from '../../services/geminiService';
import { formatMsLong } from '../../utils/formatTime';
import { Button } from '../ui/Button';
import type { ABGValues, ABGResult, ABGInterpretation } from '../../engine/types';

const EMPTY_ABG: ABGValues = {
  pH: null, pCO2: null, pO2: null, HCO3: null, BE: null, lactate: null,
  potassium: null, sodium: null, hemoglobin: null, glucose: null, calcium: null, chloride: null,
};

const ABG_FIELDS: { key: keyof ABGValues; label: string; unit: string; step: string }[] = [
  { key: 'pH', label: 'pH', unit: '', step: '0.01' },
  { key: 'pCO2', label: 'pCO2', unit: 'mmHg', step: '1' },
  { key: 'pO2', label: 'pO2', unit: 'mmHg', step: '1' },
  { key: 'HCO3', label: 'HCO3', unit: 'mEq/L', step: '0.1' },
  { key: 'BE', label: 'BE', unit: 'mEq/L', step: '0.1' },
  { key: 'lactate', label: 'Lactate', unit: 'mmol/L', step: '0.1' },
  { key: 'potassium', label: 'K+', unit: 'mmol/L', step: '0.1' },
  { key: 'sodium', label: 'Na+', unit: 'mmol/L', step: '1' },
  { key: 'hemoglobin', label: 'Hb', unit: 'g/dL', step: '0.1' },
  { key: 'glucose', label: 'Glucose', unit: 'mg/dL', step: '1' },
  { key: 'calcium', label: 'Ca2+', unit: 'mg/dL', step: '0.1' },
  { key: 'chloride', label: 'Cl-', unit: 'mmol/L', step: '1' },
];

export function ABGPanel() {
  const { t } = useTranslation();
  const { session, addAbgResult } = useResuscitationStore();
  const [values, setValues] = useState<ABGValues>({ ...EMPTY_ABG });
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [interpretation, setInterpretation] = useState<ABGInterpretation | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  if (!session) return null;

  const alerts = evaluateABGAlerts(values);
  const hasValues = Object.values(values).some(v => v != null);

  const processBase64Image = async (base64: string, mimeType: string) => {
    setError(null);
    setIsProcessing(true);

    try {
      const extracted = await extractABGFromImage(base64, mimeType);
      const merged: ABGValues = { ...EMPTY_ABG };
      for (const [key, val] of Object.entries(extracted)) {
        if (val != null && key in merged) {
          (merged as Record<string, unknown>)[key] = val;
        }
      }
      setValues(merged);
      setShowManual(true);

      // Auto-interpret
      const basicInterp = getBasicInterpretation(merged);
      if (basicInterp && needsGeminiInterpretation(merged, evaluateABGAlerts(merged)) && isGeminiConfigured()) {
        try {
          const geminiInterp = await getABGInterpretation(
            merged,
            session.abgResults.map(r => r.values),
            { rhythm: session.currentRhythm, shockCount: session.shockCount, medications: session.medications.map(m => m.medication) }
          );
          setInterpretation(geminiInterp);
        } catch {
          setInterpretation(basicInterp);
        }
      } else {
        setInterpretation(basicInterp);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process image');
      setShowManual(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      fileToBase64(file).then(base64 => processBase64Image(base64, file.type));
    }
    e.target.value = '';
  };

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  }, []);

  const startCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      setShowCamera(true);
      // Attach stream to video element after render
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      });
    } catch (err) {
      // Fallback: if getUserMedia fails, try the file input approach
      setError(
        err instanceof Error
          ? `Camera access denied: ${err.message}. Try uploading an image instead.`
          : 'Could not access camera. Try uploading an image instead.'
      );
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    const base64 = dataUrl.split(',')[1];

    stopCamera();
    processBase64Image(base64, 'image/jpeg');
  };

  const handleManualInterpret = async () => {
    const basicInterp = getBasicInterpretation(values);
    setInterpretation(basicInterp);

    if (basicInterp && needsGeminiInterpretation(values, alerts) && isGeminiConfigured()) {
      setIsProcessing(true);
      try {
        const geminiInterp = await getABGInterpretation(
          values,
          session.abgResults.map(r => r.values),
          { rhythm: session.currentRhythm, shockCount: session.shockCount, medications: session.medications.map(m => m.medication) }
        );
        setInterpretation(geminiInterp);
      } catch {
        // Keep basic interpretation
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleSave = () => {
    const now = Date.now();
    const result: ABGResult = {
      id: `abg-${now}`,
      timestamp: now,
      elapsed: now - session.startTime,
      cycle: session.currentCycle,
      values,
      alerts: evaluateABGAlerts(values),
      interpretation,
      source: showManual ? 'manual' : 'camera',
    };
    addAbgResult(result);
    setValues({ ...EMPTY_ABG });
    setInterpretation(null);
    setShowManual(false);
    setError(null);
  };

  const updateValue = (key: keyof ABGValues, val: string) => {
    setValues(prev => ({
      ...prev,
      [key]: val === '' ? null : Number(val),
    }));
  };

  return (
    <div className="space-y-4">
      {/* Camera viewfinder */}
      {showCamera && (
        <CameraViewfinder
          videoRef={videoRef}
          onCapture={capturePhoto}
          onClose={stopCamera}
        />
      )}

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Camera / Upload buttons */}
      <div className="flex gap-2">
        <input ref={uploadRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={startCamera}
          disabled={isProcessing || showCamera}
        >
          {t('abg.takePhoto')}
        </Button>
        <Button
          variant="ghost"
          size="lg"
          fullWidth
          onClick={() => uploadRef.current?.click()}
          disabled={isProcessing}
        >
          {t('abg.upload')}
        </Button>
      </div>

      <button
        onClick={() => setShowManual(!showManual)}
        className="text-sm text-slate-400 hover:text-slate-200 underline"
      >
        {showManual ? t('abg.hideManual') : t('abg.manualEntry')}
      </button>

      {isProcessing && (
        <div className="flex items-center justify-center gap-2 py-4">
          <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-blue-400 text-sm">{t('abg.processing')}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Manual entry form */}
      {showManual && (
        <div className="grid grid-cols-2 gap-2">
          {ABG_FIELDS.map(({ key, label, unit, step }) => (
            <div key={key} className="flex flex-col">
              <label className="text-xs text-slate-400 mb-1">
                {label} {unit && <span className="text-slate-600">({unit})</span>}
              </label>
              <input
                type="number"
                step={step}
                value={values[key] ?? ''}
                onChange={(e) => updateValue(key, e.target.value)}
                className={`px-2 py-1.5 bg-slate-800 border border-slate-600 rounded text-sm ${getValueColor(key, values[key])} focus:outline-none focus:border-slate-400`}
                placeholder="—"
              />
            </div>
          ))}
        </div>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-1">
          <h4 className="text-xs font-semibold text-slate-400 uppercase">{t('abg.alerts')}</h4>
          {alerts.map((alert, i) => (
            <div key={i} className={`p-2 rounded border text-xs ${getAlertColor(alert.severity)}`}>
              {alert.message}
            </div>
          ))}
        </div>
      )}

      {/* Interpretation */}
      {interpretation && (
        <div className="bg-slate-800 rounded-lg p-3 border border-slate-700 space-y-2">
          <h4 className="text-xs font-semibold text-slate-400 uppercase">{t('abg.interpretation')}</h4>
          <div className="text-sm text-slate-200 font-medium">{interpretation.primaryDisorder}</div>
          <div className="text-xs text-slate-400">{interpretation.compensation}</div>
          {interpretation.anionGap != null && (
            <div className="text-xs text-slate-400">Anion Gap: {interpretation.anionGap}</div>
          )}
          <div className="text-xs text-slate-300">{interpretation.summary}</div>
          {interpretation.recommendations.length > 0 && (
            <div className="space-y-1 mt-2">
              {interpretation.recommendations.map((rec, i) => (
                <div key={i} className="text-xs text-amber-400 flex gap-1">
                  <span className="flex-shrink-0">-</span>
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          )}
          <div className="text-[10px] text-slate-600">
            {interpretation.generatedBy === 'gemini' ? 'AI-assisted' : 'Rule-based'}
          </div>
        </div>
      )}

      {/* Interpret / Save buttons */}
      {hasValues && (
        <div className="flex gap-2">
          <Button variant="ghost" size="md" fullWidth onClick={handleManualInterpret} disabled={isProcessing}>
            {t('abg.interpret')}
          </Button>
          <Button variant="primary" size="md" fullWidth onClick={handleSave}>
            {t('abg.save')}
          </Button>
        </div>
      )}

      {/* History */}
      {session.abgResults.length > 0 && (
        <div className="space-y-2 mt-4">
          <h4 className="text-xs font-semibold text-slate-400 uppercase">{t('abg.history')}</h4>
          {session.abgResults.map((result) => (
            <div key={result.id} className="bg-slate-800 rounded-lg p-2 border border-slate-700 text-xs">
              <div className="flex justify-between text-slate-400 mb-1">
                <span>{formatMsLong(result.elapsed)}</span>
                <span>Cycle {result.cycle}</span>
              </div>
              <div className="grid grid-cols-4 gap-1 text-slate-300">
                {result.values.pH != null && <span>pH {result.values.pH}</span>}
                {result.values.pCO2 != null && <span>pCO2 {result.values.pCO2}</span>}
                {result.values.lactate != null && <span>Lac {result.values.lactate}</span>}
                {result.values.potassium != null && <span>K+ {result.values.potassium}</span>}
              </div>
              {result.alerts.filter(a => a.severity === 'critical').length > 0 && (
                <div className="text-red-400 mt-1">
                  {result.alerts.filter(a => a.severity === 'critical').length} critical alert(s)
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Live camera viewfinder component
function CameraViewfinder({
  videoRef,
  onCapture,
  onClose,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onCapture: () => void;
  onClose: () => void;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handleCanPlay = () => setReady(true);
    video.addEventListener('canplay', handleCanPlay);
    return () => video.removeEventListener('canplay', handleCanPlay);
  }, [videoRef]);

  return (
    <div className="relative rounded-xl overflow-hidden border-2 border-blue-500 bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full aspect-[4/3] object-cover"
      />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-4">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-slate-800/80 text-white flex items-center justify-center touch-manipulation"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
        <button
          onClick={onCapture}
          disabled={!ready}
          className="w-16 h-16 rounded-full bg-white border-4 border-blue-500 flex items-center justify-center touch-manipulation active:scale-90 transition-transform disabled:opacity-50"
        >
          <div className="w-12 h-12 rounded-full bg-white border-2 border-slate-300" />
        </button>
        <div className="w-10" /> {/* spacer for centering */}
      </div>
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URI prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
