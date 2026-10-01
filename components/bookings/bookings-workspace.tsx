"use client";

import * as React from "react";
import { CalendarX2, Info } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { PageBody, PageHeader } from "@/components/common/page-header";
import { SourceBadge } from "@/components/common/source-badge";
import { StatusBadge } from "@/components/common/status-badge";
import { ColumnHead, Panel } from "@/components/common/panel";
import { Button } from "@/components/ui/button";
import {
  buildDayBook,
  cancellationStandingFor,
  summariseLedger,
  type BookingRow,
} from "@/lib/booking-math";
import { DEMO_NOW } from "@/lib/clock";
import { formatDayMonth, formatINR, formatINRCompact, formatStayRange } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CancellationPolicy, ISODate } from "@/types";
import { BookingDrawer } from "./booking-drawer";
import { DayBook } from "./day-book";
import { LedgerToolbar } from "./ledger-toolbar";
import {
  EMPTY_LEDGER_FILTERS,
  filterBookings,
  scopeCounts,
  sortBookings,
  stepDate,
  type LedgerFilterState,
} from "./model";

/**
 * The bookings screen (§18).
 *
 * One client component owns both halves because they share a drawer: a name
 * clicked in the morning's arrival list and the same reservation found by
 * reference in the table below have to open the same panel, showing the same
 * money. Two islands would mean two drawers and, eventually, two answers.
 */
export function BookingsWorkspace({
  rows,
  policy,
  range,
}: {
  rows: BookingRow[];
  policy: CancellationPolicy;
  range: { first: ISODate; last: ISODate; today: ISODate };
}) {
  const [state, setState] = React.useState<LedgerFilterState>(EMPTY_LEDGER_FILTERS);
  const [date, setDate] = React.useState<ISODate>(range.today);
  const [openId, setOpenId] = React.useState<string | null>(null);

  const counts = React.useMemo(() => scopeCounts(rows, range.today), [rows, range.today]);
  const visible = React.useMemo(
    () => sortBookings(filterBookings(rows, state, range.today), state.sort),
    [rows, state, range.today],
  );
  const summary = React.useMemo(() => summariseLedger(visible), [visible]);
  const book = React.useMemo(() => buildDayBook(rows, date), [rows, date]);

  const open = React.useMemo(
    () => rows.find((row) => row.id === openId) ?? null,
    [rows, openId],
  );
  const standing = React.useMemo(
    () => (open ? cancellationStandingFor(open, policy, DEMO_NOW) : null),
    [open, policy],
  );

  function update(next: Partial<LedgerFilterState>) {
    setState((current) => ({ ...current, ...next }));
  }

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Bookings"
        description={`${counts.upcoming} reservations still to arrive, ${counts.in_house} in the building, and ${formatINRCompact(
          rows.filter((r) => r.status !== "cancelled").reduce((n, r) => n + r.balance, 0),
        )} outstanding across the ledger.`}
      >
        <LedgerToolbar
          state={state}
          counts={counts}
          onChange={update}
          shown={visible.length}
          total={rows.length}
        />
      </PageHeader>

      <PageBody className="space-y-4">
        <DayBook
          book={book}
          date={date}
          today={range.today}
          first={range.first}
          last={range.last}
          onStep={(days) => setDate((current) => stepDate(current, days, range.first, range.last))}
          onToday={() => setDate(range.today)}
          onOpen={setOpenId}
        />

        <StatBand summary={summary} />

        <Panel
          title="Ledger"
          description="Every reservation matching the filters above. Open one for the rate breakdown and where it stands against the cancellation policy."
          bodyClassName="overflow-x-auto"
        >
          {visible.length === 0 ? (
            <EmptyState
              icon={CalendarX2}
              title="No bookings match that"
              description="Try a different scope, or clear the status and payment filters to see the whole ledger."
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setState(EMPTY_LEDGER_FILTERS)}
                >
                  Reset filters
                </Button>
              }
            />
          ) : (
            <table className="w-full min-w-[60rem] border-collapse">
              <thead className="border-b border-hairline bg-surface-sunken/50">
                <tr>
                  <ColumnHead>Reference</ColumnHead>
                  <ColumnHead>Guest</ColumnHead>
                  <ColumnHead>Stay</ColumnHead>
                  <ColumnHead>Rooms</ColumnHead>
                  <ColumnHead align="right">Value</ColumnHead>
                  <ColumnHead align="right">Balance</ColumnHead>
                  <ColumnHead>Status</ColumnHead>
                  <ColumnHead>Payment</ColumnHead>
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <LedgerRow
                    key={row.id}
                    row={row}
                    today={range.today}
                    selected={row.id === openId}
                    onOpen={setOpenId}
                  />
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        <p className="flex items-start gap-1.5 pb-2 text-meta text-text-muted">
          <Info className="mt-px size-3.5 shrink-0" aria-hidden="true" />
          Totals follow the filters, so they describe the bookings shown rather than the whole
          ledger. Cancellations and no shows are counted separately and never added to value.
        </p>
      </PageBody>

      <BookingDrawer
        booking={open}
        standing={standing}
        policy={policy}
        onClose={() => setOpenId(null)}
      />
    </>
  );
}

function LedgerRow({
  row,
  today,
  selected,
  onOpen,
}: {
  row: BookingRow;
  today: ISODate;
  selected: boolean;
  onOpen: (id: string) => void;
}) {
  const dead = row.status === "cancelled" || row.status === "no_show";

  return (
    <tr
      onClick={() => onOpen(row.id)}
      className={cn(
        "cursor-pointer border-b border-hairline/70 transition-colors duration-[80ms] last:border-0",
        selected ? "bg-brand-50" : "hover:bg-ink-50/70",
      )}
    >
      <td className="px-4 py-2.5">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpen(row.id);
          }}
          data-numeric
          className="text-body font-medium text-text-primary underline-offset-2 hover:text-brand-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
        >
          {row.reference}
        </button>
        <span className="mt-1 block">
          <SourceBadge source={row.source} />
        </span>
      </td>

      <td className="px-4 py-2.5">
        <p className="truncate text-body text-text-primary">{row.guestName}</p>
        <p className="mt-0.5 truncate text-meta text-text-muted">
          {[row.guestCompany, row.guestCity].filter(Boolean).join(" · ") || "Direct guest"}
        </p>
      </td>

      <td className="px-4 py-2.5">
        <p data-numeric className="whitespace-nowrap text-meta text-text-secondary">
          {formatStayRange(row.checkIn, row.checkOut, row.nights)}
        </p>
        <p className="mt-0.5 text-micro text-text-muted">
          {row.checkIn === today
            ? "Arriving today"
            : row.checkOut === today
              ? "Departing today"
              : row.checkIn > today
                ? `Arrives ${formatDayMonth(row.checkIn)}`
                : `Departed ${formatDayMonth(row.checkOut)}`}
        </p>
      </td>

      <td className="px-4 py-2.5 text-meta text-text-secondary">
        {row.roomTypeName}
        <span data-numeric className="mt-0.5 block text-micro text-text-muted">
          {row.rooms} {row.rooms === 1 ? "room" : "rooms"}
          {row.roomNumbers.length > 0 ? ` · ${row.roomNumbers.join(", ")}` : ""}
        </span>
      </td>

      <td
        data-numeric
        className={cn(
          "px-4 py-2.5 text-right text-body",
          dead ? "text-text-muted line-through" : "font-medium text-text-primary",
        )}
      >
        {formatINR(row.total)}
      </td>

      {/* A cancelled reservation can still show total minus paid as a positive
          number, but nobody is collecting it. Printing the figure here would
          read as money owed by a guest who is not coming. */}
      <td data-numeric className="px-4 py-2.5 text-right text-body">
        {row.status === "cancelled" ? (
          <span className="text-text-muted">No longer due</span>
        ) : row.balance > 0 ? (
          <span className={dead ? "text-text-muted" : "font-medium text-caution-700"}>
            {formatINR(row.balance)}
          </span>
        ) : (
          <span className="text-text-muted">Settled</span>
        )}
      </td>

      <td className="px-4 py-2.5">
        <StatusBadge kind="booking" value={row.status} />
      </td>

      <td className="px-4 py-2.5">
        <StatusBadge kind="payment" value={row.paymentStatus} />
      </td>
    </tr>
  );
}

/**
 * What the filtered ledger adds up to.
 *
 * Collected and outstanding are shown next to value rather than instead of it,
 * because "eleven lakh booked" and "two lakh still to collect" are different
 * facts and the desk acts on the second one.
 */
function StatBand({
  summary,
}: {
  summary: ReturnType<typeof summariseLedger>;
}) {
  const cells: { label: string; value: string; hint: string; tone?: "caution" }[] = [
    {
      label: "Bookings shown",
      value: String(summary.bookings),
      hint: `${summary.roomNights} room nights`,
    },
    {
      label: "Value",
      value: formatINRCompact(summary.value),
      hint: "Including GST, before any cancellation",
    },
    {
      label: "Collected",
      value: formatINRCompact(summary.collected),
      hint:
        summary.value > 0
          ? `${Math.round((summary.collected / summary.value) * 100)}% of the value shown`
          : "Nothing taken yet",
    },
    {
      label: "Outstanding",
      value: formatINRCompact(summary.outstanding),
      hint: "Due at or before check-in",
      tone: summary.outstanding > 0 ? "caution" : undefined,
    },
    {
      label: "Cancelled and no shows",
      value: formatINRCompact(summary.lost),
      hint: "Never counted in value above",
    },
  ];

  return (
    <div className="overflow-hidden rounded-[var(--radius-surface)] bg-hairline shadow-[var(--shadow-raised)]">
      <div className="grid grid-cols-2 gap-px sm:grid-cols-3 lg:grid-cols-5">
        {cells.map((cell) => (
          <div key={cell.label} className="bg-surface px-4 pb-2.5 pt-3">
            <p className="text-meta font-medium text-text-secondary">{cell.label}</p>
            <p
              data-numeric
              className={cn(
                "mt-1 text-section font-semibold leading-none tracking-[-0.02em]",
                cell.tone === "caution" ? "text-caution-700" : "text-text-primary",
              )}
            >
              {cell.value}
            </p>
            <p className="mt-1.5 text-meta leading-snug text-text-muted">{cell.hint}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
