"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, LogIn, LogOut, Moon } from "lucide-react";
import { Panel } from "@/components/common/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDayMonth, formatFullDate, formatINR, formatWeekday } from "@/lib/format";
import type { BookingRow, DayBook as DayBookData } from "@/lib/booking-math";
import { cn } from "@/lib/utils";
import type { ISODate } from "@/types";

/**
 * The day book (§18).
 *
 * What the desk reads at the start of a shift: who arrives, who leaves, who is
 * staying on, and how much money is expected at the counter. It is deliberately
 * not a filtered view of the table below. The table is for finding one
 * reservation; this is for reading a day, so it is grouped by movement rather
 * than sorted by anything, and it shows the arithmetic the desk would otherwise
 * do on paper.
 */
export function DayBook({
  book,
  date,
  today,
  first,
  last,
  onStep,
  onToday,
  onOpen,
}: {
  book: DayBookData;
  date: ISODate;
  today: ISODate;
  first: ISODate;
  last: ISODate;
  onStep: (days: number) => void;
  onToday: () => void;
  onOpen: (id: string) => void;
}) {
  const isToday = date === today;

  return (
    <Panel
      title="Day book"
      description={
        isToday
          ? "Today at the desk. Arrivals hold rooms from 14:00, departures release them by 11:00."
          : `Movements on ${formatFullDate(date)}.`
      }
      aside={
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Previous day"
            disabled={date <= first}
            onClick={() => onStep(-1)}
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <div className="min-w-[8.5rem] px-1 text-center">
            <p data-numeric className="text-meta font-medium text-text-primary">
              {formatDayMonth(date)}
            </p>
            <p className="text-micro text-text-muted">
              {isToday ? "Today" : formatWeekday(date)}
            </p>
          </div>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Next day"
            disabled={date >= last}
            onClick={() => onStep(1)}
          >
            <ChevronRight aria-hidden="true" />
          </Button>
          {!isToday ? (
            <Button variant="ghost" size="sm" onClick={onToday}>
              Today
            </Button>
          ) : null}
        </div>
      }
      bodyClassName="p-0"
    >
      <div className="grid gap-px bg-hairline lg:grid-cols-3">
        <MovementColumn
          icon={LogIn}
          title="Arriving"
          rooms={book.roomsArriving}
          rows={book.arrivals}
          empty="Nobody checks in on this date."
          onOpen={onOpen}
          footer={
            book.balanceDue > 0 ? (
              <>
                <span className="text-text-secondary">Due at the desk</span>
                <span data-numeric className="font-semibold text-text-primary">
                  {formatINR(book.balanceDue)}
                </span>
              </>
            ) : book.arrivals.length > 0 ? (
              <span className="text-positive-700">Every arrival is settled in advance.</span>
            ) : null
          }
        />
        <MovementColumn
          icon={LogOut}
          title="Departing"
          rooms={book.roomsDeparting}
          rows={book.departures}
          empty="Nobody checks out on this date."
          onOpen={onOpen}
        />
        <MovementColumn
          icon={Moon}
          title="Staying over"
          rooms={book.roomsOccupied - book.roomsArriving}
          rows={book.stayovers}
          empty="No continuing stays on this date."
          onOpen={onOpen}
          footer={
            <>
              <span className="text-text-secondary">Rooms held tonight</span>
              <span data-numeric className="font-semibold text-text-primary">
                {book.roomsOccupied}
              </span>
            </>
          }
        />
      </div>
    </Panel>
  );
}

function MovementColumn({
  icon: Icon,
  title,
  rooms,
  rows,
  empty,
  footer,
  onOpen,
}: {
  icon: React.ElementType;
  title: string;
  rooms: number;
  rows: BookingRow[];
  empty: string;
  footer?: React.ReactNode;
  onOpen: (id: string) => void;
}) {
  return (
    <section className="flex flex-col bg-surface">
      <header className="flex items-center gap-2 border-b border-hairline px-4 py-2">
        <Icon className="size-3.5 text-text-muted" aria-hidden="true" />
        <h3 className="text-meta font-medium text-text-primary">{title}</h3>
        <span data-numeric className="ml-auto text-meta text-text-muted">
          {rows.length} {rows.length === 1 ? "booking" : "bookings"} · {rooms}{" "}
          {rooms === 1 ? "room" : "rooms"}
        </span>
      </header>

      {rows.length === 0 ? (
        <p className="px-4 py-6 text-meta text-text-muted">{empty}</p>
      ) : (
        <ul className="scrollbar-slim max-h-[19rem] divide-y divide-hairline/70 overflow-y-auto">
          {rows.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => onOpen(row.id)}
                className="flex w-full items-start gap-2 px-4 py-2 text-left transition-colors duration-[80ms] hover:bg-ink-50/70 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-500"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body text-text-primary">
                    {row.guestName}
                  </span>
                  <span className="mt-0.5 block truncate text-meta text-text-muted">
                    {row.roomTypeName} · {row.rooms === 1 ? "1 room" : `${row.rooms} rooms`}
                    {row.roomNumbers.length > 0 ? ` · ${row.roomNumbers.join(", ")}` : ""}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  {row.balance > 0 ? (
                    <span
                      data-numeric
                      className="block text-meta font-medium text-caution-700"
                    >
                      {formatINR(row.balance)}
                    </span>
                  ) : (
                    <Badge intent="positive">Settled</Badge>
                  )}
                  {row.nights > 0 ? (
                    <span data-numeric className="mt-0.5 block text-micro text-text-muted">
                      {row.nights} {row.nights === 1 ? "night" : "nights"}
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {footer ? (
        <div
          className={cn(
            "mt-auto flex items-center justify-between gap-2 border-t border-hairline px-4 py-2 text-meta",
          )}
        >
          {footer}
        </div>
      ) : null}
    </section>
  );
}
