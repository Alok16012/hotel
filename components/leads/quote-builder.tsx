"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle, Minus, Plus, ShieldAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatFullDate, formatINR, formatStayRange } from "@/lib/format";
import { MEAL_PLAN } from "@/lib/labels";
import type { LeadDetail, QuoteOption } from "@/lib/leads";
import { GST_SLAB_PAISE, MEAL_PLAN_INCLUSION, discountPct, quoteTotals } from "@/lib/quote";
import { cn } from "@/lib/utils";
import type { MealPlan, Paise } from "@/types";

/**
 * The quote builder (§14, §19).
 *
 * A quote is the first number a guest is allowed to hold the hotel to, so the
 * builder is arithmetic rather than a form: every figure on screen is derived
 * from the three inputs above it, GST is the same banded rule the booking
 * ledger uses, and the discount is stated against the published rack rate
 * instead of being hidden inside a rounder total.
 *
 * Two guards are deliberately soft. Going under the floor rate and selling more
 * rooms than are free are both things a duty manager legitimately does, so the
 * builder warns, names the approval, and gets out of the way.
 */

export interface QuoteResult {
  roomTypeId: string;
  roomTypeName: string;
  nightlyRate: Paise;
  rooms: number;
  nights: number;
  mealPlan: MealPlan;
  total: Paise;
  /** Set when the operator priced below the floor and acknowledged it. */
  needsApproval: boolean;
}

const RATE_STEP: Paise = 25_000; // Rs 250 a night, the increment a desk thinks in.

export function QuoteBuilder({
  open,
  onOpenChange,
  detail,
  onAttach,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detail: LeadDetail;
  onAttach: (quote: QuoteResult) => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="anim-overlay fixed inset-0 z-[50] bg-ink-950/25 backdrop-blur-[2px]" />
        <Dialog.Content
          className={cn(
            "anim-modal fixed left-1/2 top-1/2 z-[70] w-[min(94vw,620px)] -translate-x-1/2 -translate-y-1/2",
            "max-h-[88dvh] overflow-y-auto rounded-[var(--radius-surface)] material-float shadow-[var(--shadow-overlay)]",
          )}
        >
          {/* The form is unmounted with the dialog and keyed on the enquiry, so
              reopening always starts from that lead's own numbers rather than
              from whatever was left on screen for the previous one. */}
          <QuoteForm key={detail.lead.id} detail={detail} onAttach={onAttach} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function QuoteForm({
  detail,
  onAttach,
}: {
  detail: LeadDetail;
  onAttach: (quote: QuoteResult) => void;
}) {
  const { lead, guest, options, suggestedRate } = detail;
  const req = lead.requirement;

  const [roomTypeId, setRoomTypeId] = React.useState(
    req.roomTypeId ?? options[0]?.roomTypeId ?? "",
  );
  const [rooms, setRooms] = React.useState(req.rooms);
  const [rate, setRate] = React.useState<Paise>(suggestedRate);
  const [mealPlan, setMealPlan] = React.useState<MealPlan>(req.mealPlan ?? "breakfast");

  const option = options.find((o) => o.roomTypeId === roomTypeId) ?? options[0];
  const totals = quoteTotals(rate, rooms, req.nights);
  const discount = option ? discountPct(rate, option.rackRate) : 0;
  const belowFloor = option ? rate < option.floorRate : false;
  const overbooking = option ? rooms > option.available : false;

  function bumpRate(delta: number) {
    setRate((current) => Math.max(RATE_STEP, current + delta));
  }

  if (!option) return null;

  return (
    <>
      <header className="flex items-start justify-between gap-3 border-b border-hairline px-4 py-3">
        <div className="min-w-0">
          <Dialog.Title className="text-card font-semibold text-text-primary">
            Build a quote
          </Dialog.Title>
          <Dialog.Description className="mt-0.5 text-meta text-text-muted">
            {guest.name} · {formatStayRange(req.checkIn, req.checkOut, req.nights)} ·{" "}
            {lead.reference}
          </Dialog.Description>
        </div>
        <Dialog.Close asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Close">
            <X aria-hidden="true" />
          </Button>
        </Dialog.Close>
      </header>

      <div className="space-y-4 px-4 py-4">
        <Field label="Room category" hint="Availability counted across every night of the stay">
          <div className="grid gap-1.5 sm:grid-cols-2">
            {options.map((item) => (
              <RoomTypeChoice
                key={item.roomTypeId}
                option={item}
                selected={item.roomTypeId === option.roomTypeId}
                requested={item.roomTypeId === req.roomTypeId}
                onSelect={() => {
                  setRoomTypeId(item.roomTypeId);
                  // Moving category without moving the rate would quote a
                  // suite at a deluxe price by accident.
                  setRate(item.rackRate);
                }}
              />
            ))}
          </div>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Rooms" hint={`${option.available} free of ${option.inventory}`}>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="One room fewer"
                disabled={rooms <= 1}
                onClick={() => setRooms((n) => Math.max(1, n - 1))}
              >
                <Minus aria-hidden="true" />
              </Button>
              <span
                data-numeric
                aria-live="polite"
                className="min-w-8 text-center text-section font-semibold text-text-primary"
              >
                {rooms}
              </span>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="One room more"
                onClick={() => setRooms((n) => n + 1)}
              >
                <Plus aria-hidden="true" />
              </Button>
            </div>
          </Field>

          <Field
            label="Nightly rate"
            hint={`Rack ${formatINR(option.rackRate)} · floor ${formatINR(option.floorRate)}`}
          >
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Reduce the nightly rate"
                onClick={() => bumpRate(-RATE_STEP)}
              >
                <Minus aria-hidden="true" />
              </Button>
              <span
                data-numeric
                aria-live="polite"
                className={cn(
                  "min-w-24 text-center text-section font-semibold",
                  belowFloor ? "text-critical-700" : "text-text-primary",
                )}
              >
                {formatINR(rate)}
              </span>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Raise the nightly rate"
                onClick={() => bumpRate(RATE_STEP)}
              >
                <Plus aria-hidden="true" />
              </Button>
            </div>
          </Field>
        </div>

        <Field label="Meal plan" hint={MEAL_PLAN_INCLUSION[mealPlan]}>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(MEAL_PLAN) as MealPlan[]).map((plan) => (
              <button
                key={plan}
                type="button"
                aria-pressed={plan === mealPlan}
                onClick={() => setMealPlan(plan)}
                className={cn(
                  "cursor-pointer rounded-[var(--radius-control)] px-2.5 py-1 text-meta",
                  "transition-colors duration-[80ms]",
                  plan === mealPlan
                    ? "bg-ink-900 font-medium text-text-onDark"
                    : "bg-ink-100 text-text-secondary hover:bg-ink-200 hover:text-text-primary",
                )}
              >
                {MEAL_PLAN[plan]}
              </button>
            ))}
          </div>
        </Field>

        {/* The arithmetic, laid out the way it will read in the message. */}
        <dl className="rounded-[var(--radius-card)] bg-surface-sunken p-3 shadow-[var(--shadow-hairline)]">
          <Line
            label={`${formatINR(rate)} × ${rooms} ${rooms === 1 ? "room" : "rooms"} × ${req.nights} ${req.nights === 1 ? "night" : "nights"}`}
            value={formatINR(totals.subtotal)}
          />
          <Line
            label={`GST at ${Math.round(totals.gstRate * 100)}%`}
            value={formatINR(totals.taxes)}
            hint={
              totals.gstRate === 0.12
                ? `Tariff at or below ${formatINR(GST_SLAB_PAISE)} a night`
                : `Tariff above ${formatINR(GST_SLAB_PAISE)} a night`
            }
          />
          <div className="mt-2 flex items-baseline justify-between border-t border-hairline pt-2">
            <dt className="text-body font-medium text-text-primary">Total for the stay</dt>
            <dd data-numeric className="text-section font-semibold text-text-primary">
              {formatINR(totals.total)}
            </dd>
          </div>
          {discount > 0 ? (
            <p data-numeric className="mt-1 text-meta text-text-muted">
              {discount}% below the published rack rate
            </p>
          ) : null}
        </dl>

        {belowFloor ? (
          <Warning
            icon={ShieldAlert}
            tone="critical"
            title="Below the approved floor"
            body={`${formatINR(rate)} is under the ${formatINR(option.floorRate)} floor for ${option.name}. Attaching this quote raises an approval for the duty manager before it can be sent.`}
          />
        ) : null}

        {overbooking ? (
          <Warning
            icon={AlertTriangle}
            tone="caution"
            title="More rooms than are free"
            body={`${rooms} rooms are quoted but only ${option.available} are free across every night${detail.tightestNight ? `, the tightest being ${formatFullDate(detail.tightestNight)}` : ""}. The block cannot be confirmed without moving a category or a date.`}
          />
        ) : null}
      </div>

      <footer className="sticky bottom-0 flex items-center justify-between gap-2 border-t border-hairline bg-surface px-4 py-3">
        <p className="text-micro text-text-muted">
          Nothing is sent yet. The quote goes into the reply for you to check.
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <Dialog.Close asChild>
            <Button variant="ghost" size="sm">
              Cancel
            </Button>
          </Dialog.Close>
          <Button
            variant="primary"
            size="sm"
            onClick={() =>
              onAttach({
                roomTypeId: option.roomTypeId,
                roomTypeName: option.name,
                nightlyRate: rate,
                rooms,
                nights: req.nights,
                mealPlan,
                total: totals.total,
                needsApproval: belowFloor,
              })
            }
          >
            Add to reply
          </Button>
        </div>
      </footer>
    </>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-baseline gap-x-2">
        <p className="text-meta font-medium text-text-primary">{label}</p>
        {hint ? <p className="text-micro text-text-muted">{hint}</p> : null}
      </div>
      {children}
    </div>
  );
}

function RoomTypeChoice({
  option,
  selected,
  requested,
  onSelect,
}: {
  option: QuoteOption;
  selected: boolean;
  requested: boolean;
  onSelect: () => void;
}) {
  const soldOut = option.available <= 0;
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "cursor-pointer rounded-[var(--radius-card)] border px-2.5 py-2 text-left",
        "transition-[background-color,border-color] duration-[130ms] ease-[var(--ease-out-quint)]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
        selected
          ? "border-brand-500 bg-brand-50"
          : "border-hairline-strong bg-surface hover:border-ink-400",
      )}
    >
      <span className="flex items-baseline justify-between gap-2">
        <span className="truncate text-body font-medium text-text-primary">{option.name}</span>
        <span data-numeric className="shrink-0 text-meta text-text-secondary">
          {formatINR(option.rackRate)}
        </span>
      </span>
      <span className="mt-0.5 flex items-center gap-1.5">
        <span
          data-numeric
          className={cn("text-micro", soldOut ? "text-critical-700" : "text-text-muted")}
        >
          {soldOut ? "None free on these dates" : `${option.available} free`}
        </span>
        {requested ? (
          <span className="text-micro text-text-muted">· asked for</span>
        ) : null}
      </span>
    </button>
  );
}

function Line({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-0.5">
      <dt className="min-w-0 text-meta text-text-secondary">
        <span data-numeric>{label}</span>
        {hint ? <span className="ml-1.5 text-micro text-text-muted">{hint}</span> : null}
      </dt>
      <dd data-numeric className="shrink-0 text-meta text-text-primary">
        {value}
      </dd>
    </div>
  );
}

function Warning({
  icon: Icon,
  tone,
  title,
  body,
}: {
  icon: typeof AlertTriangle;
  tone: "critical" | "caution";
  title: string;
  body: string;
}) {
  return (
    <div
      className={cn(
        "flex gap-2 rounded-[var(--radius-card)] border px-3 py-2",
        tone === "critical"
          ? "border-critical-500/25 bg-critical-100/50"
          : "border-caution-500/25 bg-caution-100/50",
      )}
    >
      <Icon
        className={cn(
          "mt-0.5 size-4 shrink-0",
          tone === "critical" ? "text-critical-600" : "text-caution-600",
        )}
        aria-hidden="true"
      />
      <div>
        <p
          className={cn(
            "text-meta font-semibold",
            tone === "critical" ? "text-critical-700" : "text-caution-700",
          )}
        >
          {title}
        </p>
        <p className="mt-0.5 text-meta leading-relaxed text-text-secondary">{body}</p>
      </div>
    </div>
  );
}
