import type { ABGValues, ABGInterpretation, VentilationRecommendation, VentilationSettings, VitalSigns } from '../engine/types';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
const TIMEOUT_MS = 15000;

function getApiKey(): string {
  return import.meta.env.VITE_GEMINI_API_KEY || '';
}

async function callGeminiAPI(prompt: string, image?: { base64: string; mimeType: string }): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('Gemini API key not configured');

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

  if (image) {
    parts.push({ inlineData: { mimeType: image.mimeType, data: image.base64 } });
  }
  parts.push({ text: prompt });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Gemini API error: ${response.status} — ${err}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Gemini API timeout — continuing without AI analysis');
    }
    throw error;
  }
}

export async function extractABGFromImage(base64: string, mimeType: string): Promise<Partial<ABGValues>> {
  const prompt = `You are analyzing a blood gas analysis (ABG) printout image. Extract the following values if visible. Return ONLY a JSON object with these exact keys. Use null for values you cannot read or find.

{
  "pH": number or null,
  "pCO2": number or null (mmHg),
  "pO2": number or null (mmHg),
  "HCO3": number or null (mEq/L),
  "BE": number or null (mEq/L, base excess),
  "lactate": number or null (mmol/L),
  "potassium": number or null (mmol/L, may be labeled K+),
  "sodium": number or null (mmol/L, may be labeled Na+),
  "hemoglobin": number or null (g/dL, may be labeled Hb),
  "glucose": number or null (mg/dL, may be labeled Glu),
  "calcium": number or null (mg/dL or mmol/L, may be labeled Ca2+ or iCa),
  "chloride": number or null (mmol/L, may be labeled Cl-)
}

IMPORTANT: Return ONLY the JSON object, no explanation or markdown.`;

  const text = await callGeminiAPI(prompt, { base64, mimeType });

  try {
    // Extract JSON from response (handle potential markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    return JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error('Failed to parse ABG values from image');
  }
}

export async function getABGInterpretation(
  current: ABGValues,
  previousResults: ABGValues[],
  context: { rhythm: string; shockCount: number; medications: string[] }
): Promise<ABGInterpretation> {
  const prompt = `You are an expert critical care physician interpreting ABG results during cardiac arrest resuscitation.

CURRENT ABG:
${JSON.stringify(current, null, 2)}

${previousResults.length > 0 ? `PREVIOUS ABGs (oldest to newest):\n${previousResults.map((p, i) => `ABG #${i + 1}: ${JSON.stringify(p)}`).join('\n')}` : 'No previous ABGs.'}

CLINICAL CONTEXT:
- Cardiac rhythm: ${context.rhythm}
- Shocks delivered: ${context.shockCount}
- Medications given: ${context.medications.join(', ') || 'none'}

Provide a comprehensive interpretation. Return ONLY a JSON object:
{
  "primaryDisorder": "string — e.g., 'Mixed metabolic acidosis with respiratory acidosis'",
  "compensation": "string — compensation status",
  "anionGap": number or null,
  "summary": "string — 2-3 sentence clinical summary including trend analysis if previous ABGs available",
  "recommendations": ["array of specific actionable recommendations for the resuscitation team"]
}

Return ONLY the JSON, no explanation.`;

  const text = await callGeminiAPI(prompt);

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    const parsed = JSON.parse(jsonMatch[0]);
    return { ...parsed, generatedBy: 'gemini' };
  } catch {
    throw new Error('Failed to parse Gemini ABG interpretation');
  }
}

export async function getVentilationRecommendations(
  settings: VentilationSettings,
  abg?: ABGValues | null,
  vitals?: VitalSigns | null
): Promise<VentilationRecommendation[]> {
  const prompt = `You are an expert critical care physician optimizing mechanical ventilation during/after cardiac arrest.

CURRENT VENTILATION SETTINGS:
${JSON.stringify(settings, null, 2)}

${abg ? `LATEST ABG:\n${JSON.stringify(abg, null, 2)}` : 'No ABG available.'}

${vitals ? `CURRENT VITALS:\n${JSON.stringify(vitals, null, 2)}` : 'No vitals available.'}

Provide specific ventilation optimization recommendations. Return ONLY a JSON array:
[
  {
    "parameter": "string — which parameter to adjust",
    "currentValue": "string — current value",
    "suggestion": "string — specific suggested change",
    "rationale": "string — brief evidence-based rationale",
    "severity": "info" | "warning" | "critical"
  }
]

Focus on: lung-protective ventilation, oxygenation, CO2 management, hemodynamic effects.
Return ONLY the JSON array, no explanation.`;

  const text = await callGeminiAPI(prompt);

  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No JSON array in response');
    const parsed = JSON.parse(jsonMatch[0]);
    return parsed.map((r: VentilationRecommendation) => ({ ...r, generatedBy: 'gemini' as const }));
  } catch {
    throw new Error('Failed to parse Gemini ventilation recommendations');
  }
}

export function isGeminiConfigured(): boolean {
  return !!getApiKey();
}
