import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { FinanceTx } from '@/lib/financeTypes';
import { labelForPaymentType } from '@/lib/payments';
import {
  brandingContactLine,
  brandingSpreadsheetRows,
  loadLogoForPdf,
  type ReportBranding,
} from '@/lib/reportBranding';

function safeFileFragment(s: string): string {
  return String(s)
    .replace(/[<>:"/\\|?*]+/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 48) || 'report';
}

function formatNum(n: number): string {
  if (!Number.isFinite(n)) return '—';
  const rounded = Math.round((n + Number.EPSILON) * 100) / 100;
  if (Math.abs(rounded - Math.round(rounded)) < 1e-9) return String(Math.round(rounded));
  return rounded.toFixed(2);
}

export type FinanceReportExportInput = {
  variant: 'admin' | 'superadmin';
  scopeLabel: string;
  periodText: string;
  displayCurrency: string;
  showChurchCol: boolean;
  branding: ReportBranding;
  paymentOptions: readonly string[];
  paymentOptionLabels?: Record<string, string>;
  incomeIncluded: boolean;
  incomeMatrix: {
    rows: Array<{
      party: string;
      churchName: string | null;
      totals: Record<string, number>;
      rowTotal: number;
    }>;
    columnTotals: Record<string, number>;
    grandTotal: number;
  };
  expenseIncluded: boolean;
  expenditureByCategory: {
    rows: Array<{ category: string; amount: number }>;
    totalUsd: number;
  };
  summaryForDisplay: Record<string, { incomeTotal: number; expenses: number; net: number }>;
  transactionRows: FinanceTx[];
  getAmountDisplay: (r: FinanceTx) => number;
};

function baseFilename(input: FinanceReportExportInput): string {
  const d = new Date();
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return `finance-report-${safeFileFragment(input.scopeLabel)}-${stamp}`;
}

async function drawBrandingHeader(doc: jsPDF, branding: ReportBranding, margin: number): Promise<number> {
  let y = 36;
  const pageW = doc.internal.pageSize.getWidth();
  let textX = margin;
  let textStartY = y + 4;

  const logo = await loadLogoForPdf(branding.logoUrl);
  const logoBox = 52;
  if (logo && logo.width > 0 && logo.height > 0) {
    const scale = Math.min(logoBox / logo.width, logoBox / logo.height, 1);
    const w = logo.width * scale;
    const h = logo.height * scale;
    const format = logo.format === 'WEBP' ? 'PNG' : logo.format;
    try {
      doc.addImage(logo.dataUrl, format, margin, y, w, h);
      textX = margin + w + 14;
    } catch {
      // Skip logo if jsPDF cannot decode format.
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(20, 20, 20);
  doc.text(branding.name, textX, textStartY);
  textStartY += 16;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  for (const line of branding.addressLines) {
    doc.text(line, textX, textStartY);
    textStartY += 12;
  }
  const contact = brandingContactLine(branding);
  if (contact) {
    const wrapped = doc.splitTextToSize(contact, pageW - textX - margin);
    doc.text(wrapped, textX, textStartY);
    textStartY += 12 * wrapped.length;
  }

  y = Math.max(y + logoBox, textStartY) + 10;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageW - margin, y);
  y += 16;
  return y;
}

export async function downloadFinanceReportPdf(input: FinanceReportExportInput): Promise<void> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const margin = 36;
  let y = await drawBrandingHeader(doc, input.branding, margin);

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 20);
  doc.text('Finance report', margin, y);
  y += 22;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Scope: ${input.scopeLabel}`, margin, y);
  y += 14;
  doc.text(`Period: ${input.periodText}`, margin, y);
  y += 22;

  const opts = input.paymentOptions;
  const optLabel = (code: string) =>
    labelForPaymentType(code, input.paymentOptionLabels || {});

  if (input.incomeIncluded && input.incomeMatrix.rows.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Income by payer (USD)', margin, y);
    y += 14;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    const head: string[][] = [
      [
        'Payer / member',
        ...(input.showChurchCol ? ['Church'] : []),
        ...opts.map(optLabel),
        'Total USD',
      ],
    ];
    const bodyData = input.incomeMatrix.rows.map((row) => [
      row.party,
      ...(input.showChurchCol ? [row.churchName || '—'] : []),
      ...opts.map((opt) => formatNum(row.totals[opt])),
      formatNum(row.rowTotal),
    ]);
    const footerRow = [
      'Total income USD',
      ...(input.showChurchCol ? [''] : []),
      ...opts.map((opt) => formatNum(input.incomeMatrix.columnTotals[opt])),
      formatNum(input.incomeMatrix.grandTotal),
    ];
    const incomeRowCount = bodyData.length;

    autoTable(doc, {
      startY: y,
      head,
      body: [...bodyData, footerRow],
      theme: 'striped',
      styles: { fontSize: 7, cellPadding: 3 },
      headStyles: { fillColor: [55, 65, 81], textColor: 255 },
      margin: { left: margin, right: margin },
      didParseCell(data) {
        if (data.section === 'body' && data.row.index === incomeRowCount) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [229, 231, 235];
        }
      },
    });
    y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 40;
    y += 20;
  }

  if (input.expenseIncluded && input.expenditureByCategory.rows.length > 0) {
    if (y > 450) {
      doc.addPage();
      y = 40;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Expenditure by category (USD)', margin, y);
    y += 14;
    doc.setFont('helvetica', 'normal');
    autoTable(doc, {
      startY: y,
      head: [['Category', 'USD']],
      body: input.expenditureByCategory.rows.map((r) => [r.category, formatNum(r.amount)]),
      foot: [['Total expenditure USD', formatNum(input.expenditureByCategory.totalUsd)]],
      theme: 'striped',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [55, 65, 81], textColor: 255 },
      footStyles: { fillColor: [240, 240, 240] },
      margin: { left: margin, right: margin },
    });
    y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 80;
    y += 24;
  }

  const totalsEntries = Object.entries(input.summaryForDisplay);
  if (totalsEntries.length > 0) {
    if (y > 420) {
      doc.addPage();
      y = 40;
    }
    doc.setFont('helvetica', 'bold');
    doc.text('Totals summary', margin, y);
    y += 14;
    doc.setFont('helvetica', 'normal');
    autoTable(doc, {
      startY: y,
      head: [['Currency', 'Payments (income)', 'Expenses', 'Net']],
      body: totalsEntries.map(([cur, v]) => [
        cur,
        formatNum(v.incomeTotal),
        formatNum(v.expenses),
        formatNum(v.net),
      ]),
      theme: 'grid',
      styles: { fontSize: 9 },
      margin: { left: margin, right: margin },
    });
    y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 60;
    y += 28;
  }

  if (input.transactionRows.length > 0) {
    doc.addPage();
    y = 40;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Payment & expense lines (${input.transactionRows.length} rows)`, margin, y);
    y += 16;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    const thead = [
      'Date',
      ...(input.showChurchCol ? ['Church'] : []),
      'Kind',
      'Payment type',
      'Way / channel',
      'Party',
      'Description',
      'Status',
      `Amount (${input.displayCurrency})`,
      'Ref',
    ];

    const body = input.transactionRows.map((r) => [
      r.date ? new Date(r.date).toLocaleString() : '—',
      ...(input.showChurchCol ? [r.churchName || '—'] : []),
      r.kind,
      r.paymentType,
      r.paymentWay.slice(0, 80),
      r.party.slice(0, 60),
      r.description.slice(0, 120),
      r.status,
      formatNum(input.getAmountDisplay(r)),
      r.reference.slice(0, 24),
    ]);

    autoTable(doc, {
      startY: y,
      head: [thead],
      body,
      styles: { fontSize: 6, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [55, 65, 81], textColor: 255, fontSize: 7 },
      margin: { left: margin, right: margin },
    });
  }

  const totalPages = doc.getNumberOfPages();
  const footerText = `Generated — ${variantLabel(input.variant)} — ${new Date().toLocaleString()}`;
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(footerText, margin, doc.internal.pageSize.getHeight() - 24);
  }

  doc.save(`${baseFilename(input)}.pdf`);
}

function variantLabel(v: 'admin' | 'superadmin'): string {
  return v === 'admin' ? 'Church dashboard' : 'Superadmin dashboard';
}

function prependBranding(aoa: (string | number)[][], branding: ReportBranding): (string | number)[][] {
  return [...brandingSpreadsheetRows(branding), ...aoa];
}

export function downloadFinanceReportSpreadsheet(input: FinanceReportExportInput): void {
  const wb = XLSX.utils.book_new();
  const { branding } = input;

  const opts = input.paymentOptions;
  const optLabel = (code: string) =>
    labelForPaymentType(code, input.paymentOptionLabels || {});

  if (input.incomeIncluded) {
    const aoa: (string | number)[][] = [
      ['Finance report — income by payer (USD)', '', '', ''],
      ['Scope:', input.scopeLabel, '', ''],
      ['Period:', input.periodText, '', ''],
      [],
      ['Payer / member', ...(input.showChurchCol ? ['Church'] : []), ...opts.map(optLabel), 'Total USD'],
    ];
    for (const row of input.incomeMatrix.rows) {
      aoa.push([
        row.party,
        ...(input.showChurchCol ? [row.churchName || ''] : []),
        ...opts.map((opt) =>
          Number.isFinite(row.totals[opt]) ? Math.round(row.totals[opt] * 100) / 100 : ''
        ),
        Number.isFinite(row.rowTotal) ? Math.round(row.rowTotal * 100) / 100 : '',
      ]);
    }
    if (input.incomeMatrix.rows.length > 0) {
      aoa.push([
        'Total income USD',
        ...(input.showChurchCol ? [''] : []),
        ...opts.map((opt) =>
          Number.isFinite(input.incomeMatrix.columnTotals[opt])
            ? Math.round(input.incomeMatrix.columnTotals[opt] * 100) / 100
            : ''
        ),
        Number.isFinite(input.incomeMatrix.grandTotal)
          ? Math.round(input.incomeMatrix.grandTotal * 100) / 100
          : '',
      ]);
    }
    const ws = XLSX.utils.aoa_to_sheet(prependBranding(aoa, branding));
    XLSX.utils.book_append_sheet(wb, ws, 'Income USD');
  }

  if (input.expenseIncluded) {
    const aoa: (string | number)[][] = [['Category', 'Amount USD']];
    for (const row of input.expenditureByCategory.rows) {
      aoa.push([row.category, Math.round(row.amount * 100) / 100]);
    }
    if (input.expenditureByCategory.rows.length > 0) {
      aoa.push(['Total expenditure USD', Math.round(input.expenditureByCategory.totalUsd * 100) / 100]);
    }
    const ws = XLSX.utils.aoa_to_sheet(prependBranding(aoa, branding));
    XLSX.utils.book_append_sheet(wb, ws, 'Expenditure USD');
  }

  const totalsEntries = Object.entries(input.summaryForDisplay);
  if (totalsEntries.length > 0) {
    const aoa: (string | number)[][] = [['Currency', 'Payments (income)', 'Expenses', 'Net']];
    for (const [cur, v] of totalsEntries) {
      aoa.push([
        cur,
        Math.round(v.incomeTotal * 100) / 100,
        Math.round(v.expenses * 100) / 100,
        Math.round(v.net * 100) / 100,
      ]);
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(prependBranding(aoa, branding)), 'Totals');
  }

  const txHead = [
    'Date',
    ...(input.showChurchCol ? ['Church'] : []),
    'Kind',
    'Payment type',
    'Payment way',
    'Party',
    'Description',
    'Status',
    `Amount (${input.displayCurrency})`,
    'Currency',
    'Reference',
  ];
  const txBody: (string | number)[][] = [txHead];
  for (const r of input.transactionRows) {
    txBody.push([
      r.date ? new Date(r.date).toISOString() : '',
      ...(input.showChurchCol ? [r.churchName || ''] : []),
      r.kind,
      r.paymentType,
      r.paymentWay,
      r.party,
      r.description,
      r.status,
      Math.round(input.getAmountDisplay(r) * 100) / 100,
      input.displayCurrency,
      r.reference,
    ]);
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(prependBranding(txBody, branding)), 'Transactions');

  XLSX.writeFile(wb, `${baseFilename(input)}.xlsx`);
}
