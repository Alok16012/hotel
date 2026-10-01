"use client";

import * as React from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowUpRight, Info, X } from "lucide-react";
import { SourceBadge } from "@/components/common/source-badge";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import type { BookingRow, CancellationStanding } from "@/lib/booking-math";
import {
  formatDayMonth,
  formatFullDate,
  formatINR,
  formatStayRange,
} from "@/lib/format";
import { MEAL_PLAN } from "@/lib/labels";
import { MEAL_PLAN_INCLUSION, gstRateFor } from "@/lib/quote";
import { cn } from "@/lib/utils";
import type { CancellationPolicy } from "@/types";

/**
 * One reservation, opened from either the day book or the ledger (§18, §37).
 *
 * The drawer exists to answer the two questions that come up on a phone call:
 * what does this stay cost and what happens if it is cancelled. Both are
 * answered with the arithmetic shown, not just the result, because a guest who
 * is told "eight thousand four hundred" without the working assumes a mistake
 * and asks for a manager.
 */
export function BookingDrawer({
  booking,
  standing,
  policy,
  onClose,
}: {
  booking: BookingRow | null;
  standing: CancellationStanding | null;
  policy: CancellationPolicy;
  onClose: () => void;
}) {
  return (
    <Dialog.Root open={booking !== null} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="anim-overlay fixed inset-0 z-[var(--z-overlay)] bg-ink-950/25 backdrop-blur-[2px]" />
        <Dialog.Content className="anim-drawer anim-drawer-right fixed inset-y-0 right-0 z-[var(--z-drawer)] flex w-[min(94vw,32rem)] flex-col bg-surface shadow-[var(--shadow-overlay)]">
          {booking && standing ? (
            <DrawerBody
              booking={booking}
              standing={standing}
              policy={policy}
              onClose={onClose}
            />
          ) : (
            <Dialog.Title className="sr-only">Booking</Dialog.Title>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DrawerBody({
  booking,
  standing,
  policy,
  onClose,
}: {
  booking: BookingRow;
  standing: CancellationStanding;
  policy: CancellationPolicy;
  onClose: () => void;
}) {
  const gst = gstRateFor(booking.nightlyRate);
  const roomNights = booking.rooms * booking.nights;
  /** Already off the books, so the ladder is reference rather than a live quote. */
  const closed = booking.status === "cancelled" || booking.status === "no_show";

  return (
    <>
      <header className="flex items-start gap-3 border-b border-hairline px-5 py-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Dialog.Title
              data-numeric
              className="truncate text-card font-semibold tracking-[-0.01em] text-text-primary"
            >
              {booking.reference}
            </Dialog.Title>
            <StatusBadge kind="booking" value={booking.status} />
          </div>
          <Dialog.Description className="mt-1 text-meta text-text-secondary">
            <Link
              href={`/guests/${booking.guestId}`}
              className="font-medium text-text-primary underline-offset-2 hover:text-brand-700 hover:underline"
            >
              {booking.guestName}
            </Link>
            {booking.guestCompany ? ` · ${booking.guestCompany}` : ""}
            {booking.guestCity ? ` · ${booking.guestCity}` : ""}
          </Dialog.Description>
        </div>
        <Dialog.Close asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Close booking">
            <X aria-hidden="true" />
          </Button>
        </Dialog.Close>
      </header>

      <div className="scrollbar-slim min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
        <section>
          <SectionTitle>The stay</SectionTitle>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2.5">
            <Fact label="Dates">
              {formatStayRange(booking.checkIn, booking.checkOut, booking.nights)}
            </Fact>
            <Fact label="Room type">{booking.roomTypeName}</Fact>
            <Fact label="Rooms">
              {booking.rooms} · {booking.adults} {booking.adults === 1 ? "adult" : "adults"}
              {booking.children > 0
                ? `, ${booking.children} ${booking.children === 1 ? "child" : "children"}`
                : ""}
            </Fact>
            <Fact label="Rooms assigned">
              {booking.roomNumbers.length > 0 ? (
                booking.roomNumbers.join(", ")
              ) : (
                <span className="text-text-muted">Allocated at check-in</span>
              )}
            </Fact>
            <Fact label="Meal plan">
              {MEAL_PLAN[booking.mealPlan]}
              <span className="mt-0.5 block text-micro text-text-muted">
                {MEAL_PLAN_INCLUSION[booking.mealPlan]}
              </span>
            </Fact>
            <Fact label="Booked through">
              <SourceBadge source={booking.source} showLabel />
              <span className="mt-0.5 block text-micro text-text-muted">
                {formatDayMonth(booking.createdAt)}
              </span>
            </Fact>
          </dl>
        </section>

        <section>
          <SectionTitle>Rate breakdown</SectionTitle>
          <div className="mt-2 overflow-hidden rounded-[var(--radius-card)] border border-hairline">
            <LineItem
              label={`${formatINR(booking.nightlyRate)} per room night`}
              hint={`${booking.rooms} ${booking.rooms === 1 ? "room" : "rooms"} × ${booking.nights} ${booking.nights === 1 ? "night" : "nights"} = ${roomNights} room nights`}
              value={formatINR(booking.subtotal)}
            />
            <LineItem
              label={`GST at ${Math.round(gst * 100)}%`}
              hint={
                gst === 0.12
                  ? "Room nights at or under ₹7,500 attract 12%."
                  : "Room nights above ₹7,500 attract 18%."
              }
              value={formatINR(booking.taxes)}
            />
            <LineItem label="Total" value={formatINR(booking.total)} emphasis />
            <LineItem
              label="Received"
              hint={<StatusBadge kind="payment" value={booking.paymentStatus} />}
              value={formatINR(booking.amountPaid)}
            />
            {booking.status === "cancelled" ? (
              <p className="px-3 py-2 text-meta text-text-secondary">
                This reservation was cancelled, so nothing further is due. Whatever was retained
                under the policy is shown below.
              </p>
            ) : (
              <>
                <LineItem
                  label={booking.balance > 0 ? "Balance due" : "Nothing outstanding"}
                  value={formatINR(booking.balance)}
                  tone={booking.balance > 0 ? "caution" : "positive"}
                  emphasis
                />
                {booking.status === "no_show" ? (
                  <p className="border-t border-hairline/70 px-3 py-2 text-meta text-text-secondary">
                    Recorded as a no show. The policy retains the full stay, so the balance stands
                    until a manager waives it.
                  </p>
                ) : null}
              </>
            )}
          </div>
        </section>

        <section>
          <SectionTitle>{closed ? "Cancellation policy" : "If this is cancelled now"}</SectionTitle>
          <div className="mt-2 rounded-[var(--radius-card)] border border-hairline bg-surface-sunken/60 p-3">
            {closed ? (
              <p className="text-body text-text-secondary">
                {booking.status === "cancelled"
                  ? "This reservation is already cancelled."
                  : "This reservation was recorded as a no show."}{" "}
                What was retained at the time is not held in this build, so the ladder below is
                the current policy rather than a record of that decision.
              </p>
            ) : standing.stayStarted ? (
              <p className="text-body text-text-secondary">
                The stay has already started, so the cancellation ladder no longer applies. An
                early departure is a rate decision rather than a cancellation, and goes to a
                manager.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-body font-medium text-text-primary">
                    {standing.band.label}
                  </p>
                  <p data-numeric className="text-meta text-text-muted">
                    {Math.round(standing.hoursToCheckIn)} hours to check-in
                  </p>
                </div>
                <p className="mt-1 text-meta text-text-secondary">{standing.band.terms}</p>

                <dl className="mt-3 grid grid-cols-3 gap-px overflow-hidden rounded-[var(--radius-sm)] bg-hairline">
                  <Standing label="Retained" value={formatINR(standing.charge)} />
                  <Standing
                    label="Refunded"
                    value={formatINR(standing.refund)}
                    tone={standing.refund > 0 ? "positive" : undefined}
                  />
                  <Standing
                    label="Still owed"
                    value={formatINR(standing.shortfall)}
                    tone={standing.shortfall > 0 ? "critical" : undefined}
                  />
                </dl>
              </>
            )}

            <ol className="mt-3 space-y-1 border-t border-hairline pt-3">
              {policy.bands.map((band) => {
                const current = !closed && !standing.stayStarted && band.id === standing.band.id;
                return (
                  <li
                    key={band.id}
                    className={cn(
                      "flex items-baseline gap-2 text-meta",
                      current ? "text-text-primary" : "text-text-muted",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "mt-1 size-1.5 shrink-0 rounded-full",
                        current ? "bg-brand-600" : "bg-ink-300",
                      )}
                    />
                    <span className={cn(current && "font-medium")}>{band.label}</span>
                    <span className="ml-auto shrink-0">
                      {band.chargeShare !== undefined
                        ? `${Math.round(band.chargeShare * 100)}% retained`
                        : band.chargeNights
                          ? `${band.chargeNights} night per room`
                          : "No charge"}
                    </span>
                  </li>
                );
              })}
            </ol>

            <p className="mt-3 flex items-start gap-1.5 text-micro leading-snug text-text-muted">
              <Info className="mt-px size-3 shrink-0" aria-hidden="true" />
              Measured against {policy.anchor}. {policy.channelNote}
            </p>
          </div>
        </section>

        {booking.specialRequests.length > 0 ? (
          <section>
            <SectionTitle>Requests on this booking</SectionTitle>
            <ul className="mt-2 space-y-1">
              {booking.specialRequests.map((request) => (
                <li key={request} className="flex items-start gap-2 text-body text-text-secondary">
                  <span
                    aria-hidden="true"
                    className="mt-1.5 size-1 shrink-0 rounded-full bg-ink-400"
                  />
                  {request}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {booking.segments.length > 0 ? (
          <section>
            <SectionTitle>Who this guest is</SectionTitle>
            <div className="mt-2 flex flex-wrap gap-1">
              {booking.segments.map((segment) => (
                <StatusBadge key={segment} kind="segment" value={segment} />
              ))}
            </div>
          </section>
        ) : null}

        <p className="pb-1 text-micro text-text-muted">
          Created {formatFullDate(booking.createdAt)}
          {booking.leadId ? " from an enquiry in the inbox." : "."}
        </p>
      </div>

      <footer className="flex items-center gap-2 border-t border-hairline px-5 py-3">
        <Button variant="secondary" size="sm" asChild>
          <Link href={`/guests/${booking.guestId}`}>
            Open guest
            <ArrowUpRight aria-hidden="true" />
          </Link>
        </Button>
        {booking.leadId ? (
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/leads?lead=${booking.leadId}`}>Original enquiry</Link>
          </Button>
        ) : null}
        <Button variant="ghost" size="sm" className="ml-auto" onClick={onClose}>
          Close
        </Button>
      </footer>
    </>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-micro font-medium uppercase tracking-[0.08em] text-text-muted">
      {children}
    </h3>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-micro text-text-muted">{label}</dt>
      <dd className="mt-0.5 text-body text-text-primary">{children}</dd>
    </div>
  );
}

function LineItem({
  label,
  hint,
  value,
  emphasis = false,
  tone,
}: {
  label: string;
  hint?: React.ReactNode;
  value: string;
  emphasis?: boolean;
  tone?: "caution" | "positive";
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-hairline/70 px-3 py-2 last:border-0">
      <div className="min-w-0">
        <p
          className={cn(
            "text-body",
            emphasis ? "font-medium text-text-primary" : "text-text-secondary",
          )}
        >
          {label}
        </p>
        {hint ? <div className="mt-0.5 text-micro text-text-muted">{hint}</div> : null}
      </div>
      <p
        data-numeric
        className={cn(
          "shrink-0 text-body tabular-nums",
          emphasis ? "font-semibold" : "text-text-secondary",
          tone === "caution"
            ? "text-caution-700"
            : tone === "positive"
              ? "text-positive-700"
              : emphasis
                ? "text-text-primary"
                : undefined,
        )}
      >
        {value}
      </p>
    </div>
  );
}

function Standing({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "positive" | "critical";
}) {
  return (
    <div className="bg-surface px-3 py-2">
      <dt className="text-micro text-text-muted">{label}</dt>
      <dd
        data-numeric
        className={cn(
          "mt-0.5 text-body font-semibold tabular-nums",
          tone === "positive"
            ? "text-positive-700"
            : tone === "critical"
              ? "text-critical-700"
              : "text-text-primary",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
