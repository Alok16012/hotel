"use client";

import { cn } from "@/lib/utils";
import type { RenderedReport, ReportSection, ReportTable } from "@/lib/reports";

/**
 * A report, rendered as the sheet it is.
 *
 * Not a dashboard. The figures sit in labelled rows under headings, in the
 * order they were computed, because this is a document somebody reads top to
 * bottom and then forwards. The export writes the same rows in the same
 * order, so a figure checked in Excel lands under the heading it was read
 * beneath.
 *
 * Sections with nothing in them say so in a sentence. A table of zeroes reads
 * as a bad week; "no enquiries arrived on this day" reads as what it is.
 */
export function ReportSheet({ report }: { report: RenderedReport }) {
  return (
    <article className="flex flex-col">
      <header className="border-b border-hairline px-4 py-3">
        <h3 className="text-card font-semibold text-text-primary">{report.definition.name}</h3>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-meta text-text-secondary">
          <span>{report.period.rangeLabel}</span>
          {report.period.running ? (
            <>
              <span aria-hidden="true">·</span>
              {/* A part-finished period compared against a finished one is the
                  most common way a standing report misleads. */}
              <span className="text-caution-700">period still running</span>
            </>
          ) : null}
        </p>
      </header>

      <div className="divide-y divide-hairline">
        {report.sections.map((section) => (
          <Section key={section.id} section={section} />
        ))}
      </div>

      <footer className="border-t border-hairline bg-surface-sunken/60 px-4 py-2.5">
        <p className="text-micro text-text-muted">{report.coverage}</p>
      </footer>
    </article>
  );
}

function Section({ section }: { section: ReportSection }) {
  return (
    <section className="px-4 py-3">
      <h4 className="text-meta font-semibold uppercase tracking-[0.06em] text-text-muted">
        {section.title}
      </h4>
      {section.note ? <p className="mt-0.5 text-micro text-text-muted">{section.note}</p> : null}

      {section.lines?.length ? (
        <dl className="mt-2">
          {section.lines.map((line) => (
            <div
              key={line.label}
              className={cn(
                "flex items-start justify-between gap-4 border-b border-hairline py-1.5 last:border-0",
                line.emphasis && "font-semibold",
              )}
            >
              <dt className="min-w-0 text-body text-text-secondary">{line.label}</dt>
              {/* The hint sits under the value, not beside it. A qualifier
                  printed to the left of a number is read as part of it. */}
              <dd className="shrink-0 text-right">
                <span data-numeric className="block text-body text-text-primary">
                  {line.value}
                </span>
                {line.hint ? (
                  <span className="mt-0.5 block text-micro font-normal text-text-muted">
                    {line.hint}
                  </span>
                ) : null}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {section.table ? <Table table={section.table} /> : null}

      {section.empty ? <p className="mt-2 text-body text-text-muted">{section.empty}</p> : null}
    </section>
  );
}

function Table({ table }: { table: ReportTable }) {
  return (
    <div className="scrollbar-slim mt-2 overflow-x-auto">
      <table className="w-full min-w-[28rem] border-collapse text-body">
        <thead>
          <tr className="border-b border-hairline">
            {table.columns.map((column, i) => (
              <th
                key={column}
                scope="col"
                className={cn(
                  "pb-1.5 text-micro font-medium uppercase tracking-[0.06em] text-text-muted",
                  table.numeric[i] ? "pl-3 text-right" : "pr-3 text-left",
                )}
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => (
            <tr key={row[0]} className="border-b border-hairline last:border-0">
              {row.map((cell, i) => (
                <td
                  key={table.columns[i]}
                  data-numeric={table.numeric[i] ? "" : undefined}
                  className={cn(
                    "py-1.5",
                    table.numeric[i]
                      ? "pl-3 text-right text-text-primary"
                      : "pr-3 text-left text-text-secondary",
                  )}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {table.total ? (
          <tfoot>
            <tr className="border-t border-hairline-strong font-semibold">
              {table.total.map((cell, i) => (
                <td
                  key={table.columns[i]}
                  data-numeric={table.numeric[i] ? "" : undefined}
                  className={cn(
                    "pt-1.5 text-text-primary",
                    table.numeric[i] ? "pl-3 text-right" : "pr-3 text-left",
                  )}
                >
                  {cell}
                </td>
              ))}
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  );
}
