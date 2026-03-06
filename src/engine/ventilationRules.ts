import type { VentilationSettings, VentilationRecommendation, ABGValues, VitalSigns } from './types';

export function evaluateVentilationRules(
  settings: VentilationSettings,
  abg?: ABGValues | null,
  vitals?: VitalSigns | null
): VentilationRecommendation[] {
  const recommendations: VentilationRecommendation[] = [];

  // FiO2 > 0.6 with good SpO2 → suggest weaning
  if (settings.fio2 != null && settings.fio2 > 60) {
    const spo2 = vitals?.spo2;
    if (spo2 != null && spo2 > 95) {
      recommendations.push({
        parameter: 'FiO2',
        currentValue: `${settings.fio2}%`,
        suggestion: 'Consider reducing FiO2 to < 60%',
        rationale: 'SpO2 > 95% with high FiO2 — risk of oxygen toxicity. Target SpO2 92-96%.',
        severity: 'warning',
        generatedBy: 'rules',
      });
    }
  }

  // PEEP > 15 → hemodynamic warning
  if (settings.peep != null && settings.peep > 15) {
    recommendations.push({
      parameter: 'PEEP',
      currentValue: `${settings.peep} cmH2O`,
      suggestion: 'Monitor hemodynamics closely',
      rationale: 'High PEEP (>15) can impair venous return and reduce cardiac output. Watch for hypotension.',
      severity: 'warning',
      generatedBy: 'rules',
    });
  }

  // Tidal volume > 8 mL/kg → lung-protective reminder
  if (settings.tidalVolume != null && settings.tidalVolume > 500) {
    recommendations.push({
      parameter: 'Tidal Volume',
      currentValue: `${settings.tidalVolume} mL`,
      suggestion: 'Consider lung-protective ventilation (6-8 mL/kg IBW)',
      rationale: 'High tidal volumes increase risk of ventilator-induced lung injury (VILI).',
      severity: 'info',
      generatedBy: 'rules',
    });
  }

  // ABG-based recommendations
  if (abg) {
    // pCO2 < 35 with high RR → over-ventilation
    if (abg.pCO2 != null && abg.pCO2 < 35 && settings.respiratoryRate != null && settings.respiratoryRate > 14) {
      recommendations.push({
        parameter: 'Respiratory Rate',
        currentValue: `${settings.respiratoryRate}/min`,
        suggestion: 'Consider reducing RR — patient may be over-ventilated',
        rationale: `pCO2 ${abg.pCO2} mmHg is below normal. Reduce RR to allow pCO2 to normalize (target 35-45 mmHg).`,
        severity: 'warning',
        generatedBy: 'rules',
      });
    }

    // pCO2 > 45 → consider increasing RR or TV
    if (abg.pCO2 != null && abg.pCO2 > 45) {
      recommendations.push({
        parameter: 'Minute Ventilation',
        currentValue: `pCO2 ${abg.pCO2} mmHg`,
        suggestion: 'Increase RR or tidal volume to improve CO2 clearance',
        rationale: `pCO2 ${abg.pCO2} mmHg indicates hypoventilation. Increase RR by 2-4/min or TV by 50-100 mL.`,
        severity: abg.pCO2 > 60 ? 'critical' : 'warning',
        generatedBy: 'rules',
      });
    }

    // pO2 < 60 → critical hypoxemia
    if (abg.pO2 != null && abg.pO2 < 60) {
      recommendations.push({
        parameter: 'Oxygenation',
        currentValue: `pO2 ${abg.pO2} mmHg`,
        suggestion: 'Increase FiO2 and/or PEEP',
        rationale: `pO2 < 60 mmHg is critical. Consider increasing FiO2 to 100% and optimizing PEEP.`,
        severity: 'critical',
        generatedBy: 'rules',
      });
    }

    // pH < 7.2 with respiratory component
    if (abg.pH != null && abg.pH < 7.2 && abg.pCO2 != null && abg.pCO2 > 45) {
      recommendations.push({
        parameter: 'Ventilation',
        currentValue: `pH ${abg.pH}, pCO2 ${abg.pCO2}`,
        suggestion: 'Urgently increase minute ventilation',
        rationale: 'Severe respiratory acidosis contributing to life-threatening acidemia.',
        severity: 'critical',
        generatedBy: 'rules',
      });
    }
  }

  // Sort: critical first
  recommendations.sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 };
    return order[a.severity] - order[b.severity];
  });

  return recommendations;
}
