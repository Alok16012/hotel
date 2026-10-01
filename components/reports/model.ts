import type { RenderedReport, ReportSection } from "@/lib/reports";
import type { ReportCadence, ReportDeliveryChannel } from "@/types";

/**
 * Client-side seam for /reports.
 *
 * `lib/reports.ts` reaches into `data/` and cannot be imported by a client
 * component, so the labels and the export live here and take the finished
 * shape as an argument.
 */

export const CADENCE_LABEL: Record<ReportCadence, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

export const CADENCE_ORDER: ReportCadence[] = ["daily", "weekly", "monthly"];

export const DELIVERY_LABEL: Record<ReportDeliveryChannel, string> = {
  email: "Email",
  whatsapp: "WhatsApp",
};

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

function escapeCell(value: string): string {
  // Quote anything that could be read as a delimiter, a newline or a leading
  // formula. The last of those matters: a cell opening with `=` or `+` is
  // executed by Excel on open, and these sheets carry guest references.
  const needsQuotes = /[",\n\r]/.test(value) || /^[=+\-@]/.test(value);
  return needsQuotes ? `"${value.replace(/"/g, '""')}"` : value;
}

function sectionRows(section: ReportSection): string[][] {
  const rows: string[][] = [[section.title]];

  if (section.note) rows.push([section.note]);

  if (section.lines) {
    for (const line of section.lines) {
      rows.push([line.label, line.value, line.hint ?? ""]);
    }
  }

  if (section.table) {
    rows.push(section.table.columns);
    rows.push(...section.table.rows);
    if (section.table.total) rows.push(section.table.total);
  }

  if (section.empty) rows.push([section.empty]);

  rows.push([]);
  return rows;
}

/**
 * The sheet, flattened.
 *
 * Deliberately the same shape the screen renders rather than a tidier
 * normalised export. Somebody who checks a figure in Excel against the figure
 * they were shown should find them in the same order, under the same heading.
 */
export function toCsv(report: RenderedReport): string {
  const head: string[][] = [
    [report.definition.name],
    [report.period.rangeLabel],
    [report.coverage],
    [],
  ];

  const body = report.sections.flatMap(sectionRows);

  return [...head, ...body].map((row) => row.map(escapeCell).join(",")).join("\r\n");
}

export function csvFilename(report: RenderedReport): string {
  const slug = report.definition.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `${slug}-${report.period.from}.csv`;
}

/**
 * Hand the CSV to the browser.
 *
 * This is the one thing on the screen that genuinely completes: the file is
 * built in the tab from figures already on screen, so it needs no server and
 * makes no claim to have one. The PDF button beside it is disabled for the
 * opposite reason.
 */
export function downloadCsv(report: RenderedReport): void {
  const blob = new Blob([`﻿${toCsv(report)}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = csvFilename(report);
  link.click();
  URL.revokeObjectURL(url);
}
