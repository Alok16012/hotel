"use client";

import * as React from "react";
import { AlertTriangle, Check, CircleSlash, Minus } from "lucide-react";
import { Panel } from "@/components/common/panel";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Field, Select } from "@/components/ui/select";
import { formatDayMonth, formatINR, formatPct, formatWeekday } from "@/lib/format";
import { GUEST_SEGMENT, LEAD_SOURCE, TEAM_ROLE } from "@/lib/labels";
import { simulateQuote } from "@/lib/repository";
import { cn } from "@/lib/utils";
import type { GuestSegment, ISODate, LeadSource, PricingRule, RoomType } from "@/types";

/** Segments a rate conversation actually turns on. The rest never price. */
const SEGMENTS: GuestSegment[] = ["corporate", "vip", "returning", "family", "long_stay", "new"];

const CHANNELS: LeadSource[] = ["whatsapp", "website", "phone", "email", "booking_com", "walk_in"];

/**
 * Try an enquiry against the draft policy before anyone lives with it (§19).
 *
 * The output that matters is not the number, it is the trace under it. A desk
 * agent told "twelve percent" learns nothing; a desk agent shown that the
 * corporate contract set the ceiling and the long stay rule would have allowed
 * less knows what to say when the guest pushes.
 *
 * Occupancy and lead time are derived from the arrival date rather than typed,
 * because those are the two inputs an operator would otherwise guess at, and a
 * guess makes the whole simulation advisory.
 */
export function Simulator({
  dates,
  occupancy,
  roomTypes,
  rules,
  dirty,
}: {
  dates: ISODate[];
  occupancy: number[];
  roomTypes: RoomType[];
  /** The draft list, so the simulation answers for unpublished edits. */
  rules: PricingRule[];
  dirty: boolean;
}) {
  const [roomTypeId, setRoomTypeId] = React.useState("rt_deluxe");
  const [arrival, setArrival] = React.useState(4);
  const [nights, setNights] = React.useState(3);
  const [rooms, setRooms] = React.useState(2);
  const [channel, setChannel] = React.useState<LeadSource>("whatsapp");
  const [segments, setSegments] = React.useState<GuestSegment[]>(["corporate", "returning"]);

  const date = dates[arrival] ?? dates[0];
  const occupancyPct = Math.round((occupancy[arrival] ?? 0) * 100);

  const result = React.useMemo(
    () =>
      simulateQuote(
        { roomTypeId, nights, rooms, leadTimeDays: arrival, segments, channel, occupancyPct },
        date,
        rules,
      ),
    [roomTypeId, nights, rooms, arrival, segments, channel, occupancyPct, date, rules],
  );

  const { evaluation } = result;
  const paused = rules.filter((r) => !r.enabled).length;

  return (
    <Panel
      title="Simulate an enquiry"
      description={
        dirty
          ? "Running against the draft, including changes nobody else can see yet."
          : "Running against the published policy."
      }
      aside={
        dirty ? (
          <Badge intent="caution" size="sm">
            Draft
          </Badge>
        ) : null
      }
    >
      <div className="grid gap-3 px-4 py-3 sm:grid-cols-2">
        <Field label="Category" htmlFor="sim-type">
          <Select
            id="sim-type"
            value={roomTypeId}
            onChange={(e) => setRoomTypeId(e.target.value)}
          >
            {roomTypes.map((rt) => (
              <option key={rt.id} value={rt.id}>
                {rt.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Arrival"
          htmlFor="sim-arrival"
          hint={`${occupancyPct}% sold, ${arrival === 0 ? "arriving today" : `${arrival} days out`}`}
        >
          <Select
            id="sim-arrival"
            value={String(arrival)}
            onChange={(e) => setArrival(Number(e.target.value))}
          >
            {dates.map((d, i) => (
              <option key={d} value={i}>
                {formatWeekday(d).slice(0, 3)} {formatDayMonth(d)}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Nights" htmlFor="sim-nights">
          <Input
            id="sim-nights"
            type="number"
            min={1}
            max={30}
            value={nights}
            onChange={(e) => setNights(Math.max(1, Number(e.target.value) || 1))}
          />
        </Field>

        <Field label="Rooms" htmlFor="sim-rooms">
          <Input
            id="sim-rooms"
            type="number"
            min={1}
            max={20}
            value={rooms}
            onChange={(e) => setRooms(Math.max(1, Number(e.target.value) || 1))}
          />
        </Field>

        <Field label="Channel" htmlFor="sim-channel" className="sm:col-span-2">
          <Select
            id="sim-channel"
            value={channel}
            onChange={(e) => setChannel(e.target.value as LeadSource)}
          >
            {CHANNELS.map((c) => (
              <option key={c} value={c}>
                {LEAD_SOURCE[c].label}
              </option>
            ))}
          </Select>
        </Field>

        <div className="sm:col-span-2">
          <p className="mb-1 text-micro font-semibold uppercase tracking-[0.08em] text-text-muted">
            Guest segments
          </p>
          <div className="flex flex-wrap gap-1.5">
            {SEGMENTS.map((segment) => {
              const on = segments.includes(segment);
              return (
                <button
                  key={segment}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    setSegments((current) =>
                      on ? current.filter((s) => s !== segment) : [...current, segment],
                    )
                  }
                  className={cn(
                    "rounded-[var(--radius-sm)] border px-2 py-0.5 text-meta",
                    "transition-colors duration-[130ms] ease-[var(--ease-out-quint)]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40",
                    on
                      ? "border-brand-500 bg-brand-50 font-medium text-brand-700"
                      : "border-hairline-strong bg-surface text-text-secondary hover:border-ink-400",
                  )}
                >
                  {GUEST_SEGMENT[segment].label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="border-t border-hairline bg-surface-sunken/50 px-4 py-3">
        <div className="grid grid-cols-3 gap-3">
          <Money label="Rate card" value={result.listRate} />
          <Money
            label="Sells at"
            value={result.sellRate}
            note={
              evaluation.automatic > 0
                ? `${formatPct(evaluation.automatic, 0)} applied`
                : "no automatic discount"
            }
          />
          <Money
            label="Floor of authority"
            value={result.bestRate}
            note={
              evaluation.blocked
                ? "discounting closed"
                : `${formatPct(evaluation.ceiling, 0)} ceiling`
            }
            emphasis={evaluation.ceiling > 0 && !evaluation.blocked}
          />
        </div>

        {result.floorBinds ? (
          <p className="mt-2 flex items-start gap-1.5 text-meta text-caution-700">
            <AlertTriangle className="mt-px size-3.5 shrink-0" aria-hidden="true" />
            The ceiling would take this under the policy floor of{" "}
            {formatINR(result.floorRate)}. The floor wins, so the real limit is{" "}
            {formatINR(result.bestRate)}.
          </p>
        ) : null}

        <dl className="mt-3 space-y-1 border-t border-hairline pt-2.5">
          <Row
            label={`${rooms} room${rooms === 1 ? "" : "s"} × ${nights} night${nights === 1 ? "" : "s"}`}
            value={formatINR(result.subtotal)}
          />
          <Row label="GST" value={formatINR(result.taxes)} />
          <Row label="Guest pays" value={formatINR(result.total)} strong />
        </dl>

        {/*
          A block outranks an approval requirement. Saying "needs a signature"
          beside a rate nobody may sign for is how a desk agent ends up asking
          the manager for something the manager also cannot give.
        */}
        <p className="mt-2 text-meta text-text-muted">
          {evaluation.blocked ? (
            "Discounting is closed on this enquiry. The rate card price is the price."
          ) : evaluation.ceiling > 0 ? (
            <>
              {evaluation.requiresApproval
                ? "Any concession on this enquiry needs a signature. "
                : ""}
              Signed off by{" "}
              {result.canApprove.length ? (
                <span className="text-text-primary">
                  {result.canApprove.map((role) => TEAM_ROLE[role]).join(", ")}
                </span>
              ) : (
                <span className="text-critical-700">nobody at this property</span>
              )}
              .
            </>
          ) : (
            "Nothing to approve. The rate holds."
          )}
        </p>
      </div>

      <div className="border-t border-hairline px-4 py-3">
        <p className="mb-2 text-micro font-semibold uppercase tracking-[0.08em] text-text-muted">
          How it got there
        </p>

        {evaluation.matches.length ? (
          <ol className="space-y-1.5">
            {evaluation.matches.map(({ rule, outcome, effect }) => (
              <li key={rule.id} className="flex items-start gap-2">
                {outcome === "applied" ? (
                  <Check className="mt-0.5 size-3.5 shrink-0 text-positive-600" aria-hidden="true" />
                ) : (
                  <Minus className="mt-0.5 size-3.5 shrink-0 text-text-muted" aria-hidden="true" />
                )}
                <span className="min-w-0">
                  <span
                    className={cn(
                      "text-meta font-medium",
                      outcome === "applied" ? "text-text-primary" : "text-text-muted",
                    )}
                  >
                    {rule.priority}. {rule.name}
                  </span>
                  <span className="block text-meta text-text-muted">{effect}.</span>
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="flex items-start gap-2 text-meta text-text-muted">
            <CircleSlash className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            No rule matched this enquiry, so the rate card price stands with nothing to give away.
          </p>
        )}

        {evaluation.skipped.length || paused ? (
          <details className="mt-2.5 group">
            <summary
              className={cn(
                "cursor-pointer list-none text-meta text-text-muted",
                "transition-colors duration-[130ms] hover:text-text-secondary",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40",
              )}
            >
              {evaluation.skipped.length} rule{evaluation.skipped.length === 1 ? "" : "s"} did not
              match
              {paused ? `, ${paused} paused` : ""}
            </summary>
            <ul className="mt-1.5 space-y-1">
              {evaluation.skipped.map((rule) => (
                <li key={rule.id} className="text-meta text-text-muted">
                  {rule.priority}. {rule.name}
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>
    </Panel>
  );
}

function Money({
  label,
  value,
  note,
  emphasis,
}: {
  label: string;
  value: number;
  note?: string;
  emphasis?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-micro uppercase tracking-[0.06em] text-text-muted">{label}</p>
      <p
        data-numeric
        className={cn(
          "mt-0.5 text-card font-semibold",
          emphasis ? "text-brand-700" : "text-text-primary",
        )}
      >
        {formatINR(value)}
      </p>
      {note ? <p className="text-micro text-text-muted">{note}</p> : null}
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className={cn("text-meta", strong ? "text-text-primary" : "text-text-secondary")}>
        {label}
      </dt>
      <dd
        data-numeric
        className={cn(
          "text-meta tabular-nums",
          strong ? "font-semibold text-text-primary" : "text-text-secondary",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
