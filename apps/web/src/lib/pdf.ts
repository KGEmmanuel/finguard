import type jsPDF from "jspdf";

/**
 * Small helpers for building multi-section evidence PDFs consistently.
 * All helpers assume `pt` units and letter format (612 × 792).
 */

const MARGIN = 40;
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const NAVY: [number, number, number] = [15, 23, 42];
const MUTED: [number, number, number] = [100, 116, 139];
const ACCENT: [number, number, number] = [56, 189, 248];
const AMBER: [number, number, number] = [217, 119, 6];

export interface Cursor {
  y: number;
  page: number;
}

export function newCursor(): Cursor {
  return { y: 130, page: 1 };
}

export function ensureSpace(pdf: jsPDF, c: Cursor, need: number) {
  if (c.y + need > PAGE_HEIGHT - 60) {
    footer(pdf, c);
    pdf.addPage();
    c.page += 1;
    c.y = 60;
  }
}

export function sectionHeader(pdf: jsPDF, c: Cursor, eyebrow: string, title: string) {
  ensureSpace(pdf, c, 60);
  pdf.setTextColor(...MUTED);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.text(eyebrow.toUpperCase(), MARGIN, c.y);
  c.y += 12;
  pdf.setTextColor(...NAVY);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text(title, MARGIN, c.y);
  c.y += 6;
  pdf.setDrawColor(...ACCENT);
  pdf.setLineWidth(1.2);
  pdf.line(MARGIN, c.y, MARGIN + 42, c.y);
  c.y += 18;
  pdf.setDrawColor(0);
}

export function h2(pdf: jsPDF, c: Cursor, text: string) {
  ensureSpace(pdf, c, 24);
  pdf.setTextColor(...NAVY);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text(text, MARGIN, c.y);
  c.y += 14;
}

export function paragraph(pdf: jsPDF, c: Cursor, text: string, opts?: { color?: [number, number, number]; size?: number }) {
  const size = opts?.size ?? 9.5;
  pdf.setTextColor(...(opts?.color ?? NAVY));
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(size);
  const lines = pdf.splitTextToSize(text, CONTENT_WIDTH) as string[];
  for (const l of lines) {
    ensureSpace(pdf, c, size + 3);
    pdf.text(l, MARGIN, c.y);
    c.y += size + 3;
  }
}

export function kv(pdf: jsPDF, c: Cursor, rows: Array<[string, string]>) {
  const labelW = 160;
  pdf.setFontSize(9);
  for (const [k, v] of rows) {
    ensureSpace(pdf, c, 14);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...MUTED);
    pdf.text(k, MARGIN, c.y);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(...NAVY);
    const wrapped = pdf.splitTextToSize(v, CONTENT_WIDTH - labelW) as string[];
    wrapped.forEach((line, i) => {
      pdf.text(line, MARGIN + labelW, c.y + i * 12);
    });
    c.y += Math.max(14, wrapped.length * 12 + 2);
  }
}

export function bar(pdf: jsPDF, c: Cursor, value: number, label: string, note: string) {
  ensureSpace(pdf, c, 32);
  const color: [number, number, number] =
    value >= 90 ? [22, 163, 74] : value >= 75 ? [217, 119, 6] : [220, 38, 38];
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9.5);
  pdf.setTextColor(...NAVY);
  pdf.text(label, MARGIN, c.y);
  pdf.setTextColor(...color);
  pdf.text(String(value), PAGE_WIDTH - MARGIN, c.y, { align: "right" });
  c.y += 6;
  pdf.setFillColor(226, 232, 240);
  pdf.rect(MARGIN, c.y, CONTENT_WIDTH, 4, "F");
  pdf.setFillColor(...color);
  pdf.rect(MARGIN, c.y, (CONTENT_WIDTH * Math.min(100, value)) / 100, 4, "F");
  c.y += 10;
  pdf.setTextColor(...MUTED);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.text(note, MARGIN, c.y);
  c.y += 14;
}

export function table(
  pdf: jsPDF,
  c: Cursor,
  headers: string[],
  rows: string[][],
  colWidths: number[],
) {
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(...MUTED);
  ensureSpace(pdf, c, 18);
  let x = MARGIN;
  headers.forEach((h, i) => {
    pdf.text(h.toUpperCase(), x, c.y);
    x += colWidths[i];
  });
  c.y += 4;
  pdf.setDrawColor(203, 213, 225);
  pdf.line(MARGIN, c.y, MARGIN + CONTENT_WIDTH, c.y);
  c.y += 10;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.setTextColor(...NAVY);
  for (const row of rows) {
    // Compute max wrapped lines for this row
    const wrapped = row.map((cell, i) =>
      pdf.splitTextToSize(cell, colWidths[i] - 6) as string[],
    );
    const rowH = Math.max(...wrapped.map((w) => w.length)) * 10 + 4;
    ensureSpace(pdf, c, rowH);
    x = MARGIN;
    wrapped.forEach((lines, i) => {
      lines.forEach((line, li) => {
        pdf.text(line, x, c.y + li * 10);
      });
      x += colWidths[i];
    });
    c.y += rowH;
  }
  c.y += 4;
}

export function footer(pdf: jsPDF, c: Cursor) {
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(...MUTED);
  pdf.text(
    "Cognita FinGuard v2.0 · tamper-evident evidence pack",
    MARGIN,
    PAGE_HEIGHT - 30,
  );
  pdf.text(String(c.page), PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 30, { align: "right" });
}

export const PDF = {
  MARGIN,
  PAGE_WIDTH,
  PAGE_HEIGHT,
  CONTENT_WIDTH,
  NAVY,
  MUTED,
  ACCENT,
  AMBER,
};
