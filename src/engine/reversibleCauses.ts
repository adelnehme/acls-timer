import type { ReversibleCause } from './types';

export function createReversibleCauses(): ReversibleCause[] {
  return [
    // 5 Hs
    {
      id: 'hypovolemia',
      category: 'h',
      name: { en: 'Hypovolemia', de: 'Hypovolämie' },
      intervention: {
        en: 'Volume resuscitation, blood products, stop bleeding',
        de: 'Volumensubstitution, Blutprodukte, Blutungskontrolle',
      },
      checked: false,
      ruled_out: false,
    },
    {
      id: 'hypoxia',
      category: 'h',
      name: { en: 'Hypoxia', de: 'Hypoxie' },
      intervention: {
        en: 'Advanced airway, 100% O\u2082, confirm placement, waveform capnography',
        de: 'Atemwegssicherung, 100% O\u2082, Lagekontrolle, Kapnographie',
      },
      checked: false,
      ruled_out: false,
    },
    {
      id: 'hydrogen_ion',
      category: 'h',
      name: { en: 'Hydrogen ion (Acidosis)', de: 'Azidose' },
      intervention: {
        en: 'Sodium bicarbonate, adequate ventilation',
        de: 'Natriumbicarbonat, adäquate Beatmung',
      },
      checked: false,
      ruled_out: false,
    },
    {
      id: 'hypo_hyperkalemia',
      category: 'h',
      name: { en: 'Hypo/Hyperkalemia', de: 'Hypo-/Hyperkaliämie' },
      intervention: {
        en: 'Calcium, insulin + glucose, bicarbonate, dialysis',
        de: 'Calcium, Insulin + Glukose, Bicarbonat, Dialyse',
      },
      checked: false,
      ruled_out: false,
    },
    {
      id: 'hypothermia',
      category: 'h',
      name: { en: 'Hypothermia', de: 'Hypothermie' },
      intervention: {
        en: 'Active warming, warm IV fluids, warm lavage',
        de: 'Aktive Erwärmung, warme Infusionen, warme Lavage',
      },
      checked: false,
      ruled_out: false,
    },
    // 5 Ts
    {
      id: 'tension_pneumothorax',
      category: 't',
      name: { en: 'Tension Pneumothorax', de: 'Spannungspneumothorax' },
      intervention: {
        en: 'Needle decompression, chest tube',
        de: 'Nadeldekompression, Thoraxdrainage',
      },
      checked: false,
      ruled_out: false,
    },
    {
      id: 'tamponade',
      category: 't',
      name: { en: 'Cardiac Tamponade', de: 'Herzbeuteltamponade' },
      intervention: {
        en: 'Pericardiocentesis, thoracotomy',
        de: 'Perikardpunktion, Thorakotomie',
      },
      checked: false,
      ruled_out: false,
    },
    {
      id: 'toxins',
      category: 't',
      name: { en: 'Toxins', de: 'Toxine / Intoxikation' },
      intervention: {
        en: 'Specific antidotes, lipid emulsion, activated charcoal, dialysis',
        de: 'Spezifische Antidote, Lipidemulsion, Aktivkohle, Dialyse',
      },
      checked: false,
      ruled_out: false,
    },
    {
      id: 'thrombosis_pulmonary',
      category: 't',
      name: { en: 'Thrombosis (Pulmonary)', de: 'Lungenembolie' },
      intervention: {
        en: 'Thrombolytics (tPA), surgical embolectomy, consider ECMO',
        de: 'Thrombolyse (tPA), chirurgische Embolektomie, ECMO erwägen',
      },
      checked: false,
      ruled_out: false,
    },
    {
      id: 'thrombosis_coronary',
      category: 't',
      name: { en: 'Thrombosis (Coronary)', de: 'Myokardinfarkt' },
      intervention: {
        en: 'PCI, thrombolytics, consider cath lab',
        de: 'PCI, Thrombolyse, Herzkatheterlabor erwägen',
      },
      checked: false,
      ruled_out: false,
    },
  ];
}
