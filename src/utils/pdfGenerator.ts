import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ResuscitationSession } from '../engine/types';
import { formatMsLong, formatTimestamp, formatDate } from './formatTime';

export function generatePdf(session: ResuscitationSession, lang: string): void {
  const doc = new jsPDF();
  const isRosc = session.outcome === 'rosc';
  let yPos = 20;

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Resuscitation Report', 105, yPos, { align: 'center' });
  yPos += 12;

  // Outcome
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  const outcome = isRosc
    ? (lang === 'de' ? 'ROSC erreicht' : 'ROSC Achieved')
    : (lang === 'de' ? 'Reanimation beendet' : 'Resuscitation Terminated');
  doc.text(outcome, 105, yPos, { align: 'center' });
  yPos += 15;

  // Summary table
  const duration = (session.endTime ?? Date.now()) - session.startTime;
  const summaryData = [
    [lang === 'de' ? 'Patient' : 'Patient', session.patientId || '—'],
    [lang === 'de' ? 'Datum' : 'Date', formatDate(session.startTime)],
    [lang === 'de' ? 'Startzeit' : 'Start Time', formatTimestamp(session.startTime)],
    [lang === 'de' ? 'Endzeit' : 'End Time', session.endTime ? formatTimestamp(session.endTime) : '—'],
    [lang === 'de' ? 'Dauer' : 'Duration', formatMsLong(duration)],
    [lang === 'de' ? 'Zyklen' : 'Cycles', String(session.currentCycle)],
    [lang === 'de' ? 'Schocks' : 'Shocks', String(session.shockCount)],
    [lang === 'de' ? 'Ergebnis' : 'Outcome', outcome],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: summaryData,
    theme: 'grid',
    styles: { fontSize: 10 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 40 },
    },
  });

  yPos = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  // Medications
  if (session.medications.length > 0) {
    if (yPos > 230) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(lang === 'de' ? 'Medikamente' : 'Medications', 14, yPos);
    yPos += 5;

    const medData = session.medications.map((m) => [
      formatMsLong(m.timestamp - session.startTime),
      m.customName || m.medication,
      m.dose,
      m.route,
      `Cycle ${m.cycle}`,
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Time', lang === 'de' ? 'Medikament' : 'Medication', lang === 'de' ? 'Dosis' : 'Dose', 'Route', 'Cycle']],
      body: medData,
      theme: 'striped',
      styles: { fontSize: 9 },
    });

    yPos = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }

  // ABG Results
  if (session.abgResults.length > 0) {
    if (yPos > 230) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(lang === 'de' ? 'Blutgasanalysen' : 'ABG Results', 14, yPos);
    yPos += 5;

    const abgData = session.abgResults.map((abg) => [
      formatMsLong(abg.elapsed),
      abg.values.pH != null ? String(abg.values.pH) : '—',
      abg.values.pCO2 != null ? String(abg.values.pCO2) : '—',
      abg.values.pO2 != null ? String(abg.values.pO2) : '—',
      abg.values.HCO3 != null ? String(abg.values.HCO3) : '—',
      abg.values.lactate != null ? String(abg.values.lactate) : '—',
      abg.values.potassium != null ? String(abg.values.potassium) : '—',
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Time', 'pH', 'pCO2', 'pO2', 'HCO3', 'Lac', 'K+']],
      body: abgData,
      theme: 'striped',
      styles: { fontSize: 8 },
    });

    yPos = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }

  // Hemodynamics
  if (session.hemodynamicsHistory.length > 0) {
    if (yPos > 230) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(lang === 'de' ? 'Hamodynamik' : 'Hemodynamics', 14, yPos);
    yPos += 5;

    const hemoData = session.hemodynamicsHistory.map((h) => [
      formatMsLong(h.elapsed),
      h.vitals.hr != null ? String(h.vitals.hr) : '—',
      h.vitals.systolic != null && h.vitals.diastolic != null ? `${h.vitals.systolic}/${h.vitals.diastolic}` : '—',
      h.vitals.map != null ? String(h.vitals.map) : '—',
      h.vitals.spo2 != null ? `${h.vitals.spo2}%` : '—',
      h.vasopressors.map(v => `${v.drug} ${v.dose}${v.unit}`).join(', ') || '—',
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Time', 'HR', 'BP', 'MAP', 'SpO2', lang === 'de' ? 'Vasopressoren' : 'Vasopressors']],
      body: hemoData,
      theme: 'striped',
      styles: { fontSize: 8 },
    });

    yPos = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }

  // Ventilation
  if (session.ventilationHistory.length > 0) {
    if (yPos > 230) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(lang === 'de' ? 'Beatmung' : 'Ventilation', 14, yPos);
    yPos += 5;

    const ventData = session.ventilationHistory.map((v) => [
      formatMsLong(v.elapsed),
      v.settings.mode,
      v.settings.fio2 != null ? `${v.settings.fio2}%` : '—',
      v.settings.peep != null ? String(v.settings.peep) : '—',
      v.settings.tidalVolume != null ? String(v.settings.tidalVolume) : '—',
      v.settings.respiratoryRate != null ? String(v.settings.respiratoryRate) : '—',
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Time', 'Mode', 'FiO2', 'PEEP', 'TV', 'RR']],
      body: ventData,
      theme: 'striped',
      styles: { fontSize: 8 },
    });

    yPos = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }

  // Event Timeline
  if (yPos > 230) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(lang === 'de' ? 'Zeitachse' : 'Timeline', 14, yPos);
  yPos += 5;

  const eventData = session.events.map((e) => [
    formatMsLong(e.elapsed),
    e.type.replace(/_/g, ' '),
    e.description,
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Time', 'Type', 'Description']],
    body: eventData,
    theme: 'striped',
    styles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 35 },
    },
  });

  // Save
  const filename = `resuscitation-${formatDate(session.startTime).replace(/\//g, '-')}-${formatTimestamp(session.startTime).replace(/:/g, '')}.pdf`;
  doc.save(filename);
}
