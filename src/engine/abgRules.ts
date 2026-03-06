import type { ABGValues, ABGAlert, ABGAlertSeverity, ABGInterpretation } from './types';

interface NormalRange {
  min: number;
  max: number;
  warningLow?: number;
  warningHigh?: number;
  criticalLow?: number;
  criticalHigh?: number;
  unit: string;
  label: string;
}

const NORMAL_RANGES: Partial<Record<keyof ABGValues, NormalRange>> = {
  pH: { min: 7.35, max: 7.45, warningLow: 7.35, warningHigh: 7.45, criticalLow: 7.2, criticalHigh: 7.55, unit: '', label: 'pH' },
  pCO2: { min: 35, max: 45, warningLow: 35, warningHigh: 45, criticalLow: 25, criticalHigh: 60, unit: 'mmHg', label: 'pCO2' },
  pO2: { min: 80, max: 100, warningLow: 80, criticalLow: 60, unit: 'mmHg', label: 'pO2' },
  HCO3: { min: 22, max: 26, warningLow: 22, warningHigh: 26, criticalLow: 15, criticalHigh: 35, unit: 'mEq/L', label: 'HCO3' },
  BE: { min: -2, max: 2, warningLow: -2, warningHigh: 2, criticalLow: -10, criticalHigh: 10, unit: 'mEq/L', label: 'Base Excess' },
  lactate: { min: 0, max: 2, warningHigh: 2, criticalHigh: 4, unit: 'mmol/L', label: 'Lactate' },
  potassium: { min: 3.5, max: 5.0, warningLow: 3.5, warningHigh: 5.5, criticalLow: 3.0, criticalHigh: 6.5, unit: 'mmol/L', label: 'K+' },
  sodium: { min: 135, max: 145, warningLow: 130, warningHigh: 150, criticalLow: 120, criticalHigh: 160, unit: 'mmol/L', label: 'Na+' },
  hemoglobin: { min: 12, max: 17, warningLow: 10, criticalLow: 7, unit: 'g/dL', label: 'Hemoglobin' },
  glucose: { min: 70, max: 180, warningHigh: 250, criticalLow: 70, criticalHigh: 400, unit: 'mg/dL', label: 'Glucose' },
  calcium: { min: 8.5, max: 10.5, warningLow: 8.5, warningHigh: 10.5, criticalLow: 7.0, criticalHigh: 12.0, unit: 'mg/dL', label: 'Calcium' },
  chloride: { min: 96, max: 106, warningLow: 96, warningHigh: 106, unit: 'mmol/L', label: 'Chloride' },
};

function getSeverity(value: number, range: NormalRange): ABGAlertSeverity {
  if (range.criticalLow != null && value < range.criticalLow) return 'critical';
  if (range.criticalHigh != null && value > range.criticalHigh) return 'critical';
  if (range.warningLow != null && value < range.warningLow) return 'warning';
  if (range.warningHigh != null && value > range.warningHigh) return 'warning';
  if (value >= range.min && value <= range.max) return 'normal';
  return 'warning';
}

function getMessage(param: string, value: number, severity: ABGAlertSeverity, range: NormalRange): string {
  if (severity === 'normal') return `${range.label} within normal range`;

  const direction = value < range.min ? 'low' : 'high';
  const severityLabel = severity === 'critical' ? 'CRITICAL' : 'Abnormal';

  const messages: Record<string, Record<string, string>> = {
    pH: {
      low: severity === 'critical' ? 'CRITICAL: Severe acidemia — consider NaHCO3, check for cause' : 'Acidemia — evaluate respiratory vs metabolic',
      high: severity === 'critical' ? 'CRITICAL: Severe alkalemia' : 'Alkalemia — evaluate cause',
    },
    potassium: {
      low: severity === 'critical' ? 'CRITICAL: Severe hypokalemia — risk of arrhythmia' : 'Hypokalemia — consider replacement',
      high: severity === 'critical' ? 'CRITICAL: Severe hyperkalemia — calcium, insulin/glucose, NaHCO3' : 'Hyperkalemia — monitor ECG, consider treatment',
    },
    hemoglobin: {
      low: severity === 'critical' ? 'CRITICAL: Hb < 7 — consider transfusion' : 'Anemia — consider transfusion if symptomatic',
      high: `${severityLabel}: ${range.label} ${direction}`,
    },
    lactate: {
      high: severity === 'critical' ? 'CRITICAL: Lactate > 4 — severe tissue hypoperfusion' : 'Elevated lactate — assess perfusion, consider fluid resuscitation',
      low: `${range.label} normal`,
    },
    pO2: {
      low: severity === 'critical' ? 'CRITICAL: Severe hypoxemia — increase FiO2, assess airway' : 'Hypoxemia — consider increasing oxygen delivery',
      high: `${severityLabel}: ${range.label} ${direction}`,
    },
    glucose: {
      low: severity === 'critical' ? 'CRITICAL: Hypoglycemia — give D50W immediately' : 'Low glucose — monitor closely',
      high: severity === 'critical' ? 'CRITICAL: Severe hyperglycemia — consider insulin' : 'Hyperglycemia — consider insulin',
    },
  };

  return messages[param]?.[direction] || `${severityLabel}: ${range.label} ${direction} (${value} ${range.unit})`;
}

export function evaluateABGAlerts(values: ABGValues): ABGAlert[] {
  const alerts: ABGAlert[] = [];

  for (const [param, range] of Object.entries(NORMAL_RANGES)) {
    const value = values[param as keyof ABGValues];
    if (value == null || range == null) continue;

    const severity = getSeverity(value, range);
    if (severity !== 'normal') {
      alerts.push({
        parameter: param as keyof ABGValues,
        severity,
        message: getMessage(param, value, severity, range),
        value,
        normalRange: { min: range.min, max: range.max },
      });
    }
  }

  // Sort: critical first, then warning
  alerts.sort((a, b) => {
    if (a.severity === 'critical' && b.severity !== 'critical') return -1;
    if (b.severity === 'critical' && a.severity !== 'critical') return 1;
    return 0;
  });

  return alerts;
}

export function calculateAnionGap(values: ABGValues): number | null {
  if (values.sodium == null || values.chloride == null || values.HCO3 == null) return null;
  return values.sodium - (values.chloride + values.HCO3);
}

export function getBasicInterpretation(values: ABGValues): ABGInterpretation | null {
  if (values.pH == null || values.pCO2 == null || values.HCO3 == null) return null;

  const pH = values.pH;
  const pCO2 = values.pCO2;
  const HCO3 = values.HCO3;

  let primaryDisorder = '';
  let compensation = '';
  const recommendations: string[] = [];

  if (pH < 7.35) {
    // Acidosis
    if (pCO2 > 45 && HCO3 >= 22) {
      primaryDisorder = 'Respiratory Acidosis';
      compensation = HCO3 > 26 ? 'Metabolic compensation present' : 'Uncompensated';
      recommendations.push('Assess ventilation, consider increasing RR or TV');
    } else if (HCO3 < 22 && pCO2 <= 45) {
      primaryDisorder = 'Metabolic Acidosis';
      compensation = pCO2 < 35 ? 'Respiratory compensation present' : 'Uncompensated';
      const ag = calculateAnionGap(values);
      if (ag != null && ag > 12) {
        recommendations.push(`Anion gap elevated (${ag}) — consider MUDPILES causes`);
      } else {
        recommendations.push('Non-anion gap metabolic acidosis — check chloride, consider GI/renal losses');
      }
      if (pH < 7.2) {
        recommendations.push('Consider sodium bicarbonate for severe acidemia');
      }
    } else {
      primaryDisorder = 'Mixed Acidosis';
      compensation = 'Both respiratory and metabolic components';
      recommendations.push('Address both ventilation and metabolic cause');
    }
  } else if (pH > 7.45) {
    // Alkalosis
    if (pCO2 < 35 && HCO3 <= 26) {
      primaryDisorder = 'Respiratory Alkalosis';
      compensation = HCO3 < 22 ? 'Metabolic compensation present' : 'Uncompensated';
      recommendations.push('Reduce respiratory rate if mechanically ventilated');
    } else if (HCO3 > 26 && pCO2 >= 35) {
      primaryDisorder = 'Metabolic Alkalosis';
      compensation = pCO2 > 45 ? 'Respiratory compensation present' : 'Uncompensated';
      recommendations.push('Check volume status, chloride-responsive vs chloride-resistant');
    } else {
      primaryDisorder = 'Mixed Alkalosis';
      compensation = 'Both respiratory and metabolic components';
    }
  } else {
    primaryDisorder = 'Normal acid-base status';
    compensation = 'None needed';
    if (pCO2 < 35 && HCO3 < 22) {
      primaryDisorder = 'Compensated Metabolic Acidosis';
      compensation = 'Fully compensated';
    } else if (pCO2 > 45 && HCO3 > 26) {
      primaryDisorder = 'Compensated Respiratory Acidosis';
      compensation = 'Fully compensated';
    }
  }

  // Additional recommendations from values
  if (values.potassium != null) {
    if (values.potassium > 6.5) recommendations.push('Treat hyperkalemia: calcium, insulin/glucose, NaHCO3');
    else if (values.potassium < 3.0) recommendations.push('Replace potassium urgently');
  }
  if (values.lactate != null && values.lactate > 4) {
    recommendations.push('Assess perfusion — fluid resuscitation, vasopressors if needed');
  }
  if (values.hemoglobin != null && values.hemoglobin < 7) {
    recommendations.push('Transfuse pRBCs');
  }

  const anionGap = calculateAnionGap(values);

  return {
    primaryDisorder,
    compensation,
    anionGap,
    summary: `${primaryDisorder}. ${compensation}.`,
    recommendations,
    generatedBy: 'rules',
  };
}

export function needsGeminiInterpretation(values: ABGValues, alerts: ABGAlert[]): boolean {
  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  if (criticalCount >= 3) return true;

  // Mixed acid-base disorders
  if (values.pH != null && values.pCO2 != null && values.HCO3 != null) {
    const isAcidotic = values.pH < 7.35;
    const isAlkalotic = values.pH > 7.45;
    const respAcid = values.pCO2 > 45;
    const respAlk = values.pCO2 < 35;
    const metAcid = values.HCO3 < 22;
    const metAlk = values.HCO3 > 26;

    // Mixed: both respiratory and metabolic going same direction
    if ((respAcid && metAcid) || (respAlk && metAlk)) return true;
    // pH normal but both components abnormal (triple disorder possibility)
    if (!isAcidotic && !isAlkalotic && (respAcid || respAlk) && (metAcid || metAlk)) return true;
  }

  return false;
}

export function getAlertColor(severity: ABGAlertSeverity): string {
  switch (severity) {
    case 'critical': return 'text-red-400 bg-red-900/30 border-red-700';
    case 'warning': return 'text-amber-400 bg-amber-900/30 border-amber-700';
    default: return 'text-green-400 bg-green-900/30 border-green-700';
  }
}

export function getValueColor(param: keyof ABGValues, value: number | null): string {
  if (value == null) return 'text-slate-500';
  const range = NORMAL_RANGES[param];
  if (!range) return 'text-slate-300';

  const severity = getSeverity(value, range);
  switch (severity) {
    case 'critical': return 'text-red-400';
    case 'warning': return 'text-amber-400';
    default: return 'text-green-400';
  }
}
