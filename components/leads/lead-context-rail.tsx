"use client";

import * as React from "react";
import {
  BedDouble,
  CalendarClock,
  Check,
  ChevronDown,
  IndianRupee,
  Mail,
  MapPin,
  Phone,
  RotateCcw,
  UserRound,
} from "lucide-react";
import { StatusBadge } from "@/components/common/status-badge";
import { Avatar, toneForName } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DEMO_NOW } from "@/lib/clock";
import {
  formatDuration,
  formatFullDate,
  formatINR,
  formatRelative,
  formatStayRange,
  formatTime,
} from "@/lib/format";
import { LEAD_PRIORITY, LEAD_STAGE, LEAD_STAGE_ORDER, LOST_REASON, MEAL_PLAN } from "@/lib/labels";
import type { LeadDetail } from "@/lib/leads";
import { cn, initials } from "@/lib/utils";
import type { LeadPriority, LeadStage, TeamMember } from "@/types";

/**
 * Everything about the enquiry that is not the conversation (§12).
 *
 * The order is the order a person works in: what to do next, what they asked
 * for and whether we have it, what it is worth, who they are, who owns it, and
 * only then the history. History last is deliberate. It is the section most
 * often read and the least often acted on.
 */
export function LeadContextRail({
  detail,
  stage,
  priority,
  owner,
  team,
  actionDone,
  onStageChange,
  onPriorityChange,
  onAssign,
  onCompleteAction,
  className,
}: {
  detail: LeadDetail;
  stage: LeadStage;
  priority: LeadPriority;
  owner?: TeamMember;
  team: TeamMember[];
  actionDone: boolean;
  onStageChange: (stage: LeadStage) => void;
  onPriorityChange: (priority: LeadPriority) => void;
  onAssign: (memberId: string | undefined) => void;
  onCompleteAction: () => void;
  className?: string;
}) {
  const { lead, guest, roomType, events, roomsAvailable, inventory, tightestNight } = detail;
  const req = lead.requirement;
  const com = lead.commercials;
  const shortfall = req.rooms - roomsAvailable;

  return (
    <div className={cn("scrollbar-slim divide-y divide-hairline", className)}>
      {/* 1. Next action */}
      <Section title="Next action">
        <div
          className={cn(
            "rounded-[var(--radius-card)] px-3 py-2.5",
            actionDone
              ? "bg-positive-100/50"
              : lead.nextActionDueAt && lead.nextActionDueAt < DEMO_NOW.toISOString()
                ? "bg-critical-100/40"
                : "bg-surface-sunken",
          )}
        >
          <p
            className={cn(
              "text-body font-medium text-text-primary",
              actionDone && "line-through decoration-positive-600/60",
            )}
          >
            {lead.nextAction}
          </p>
          {lead.nextActionDueAt ? (
            <p data-numeric className="mt-1 flex items-center gap-1.5 text-meta text-text-muted">
              <CalendarClock className="size-3.5" aria-hidden="true" />
              {lead.nextActionDueAt < DEMO_NOW.toISOString() ? "Overdue by" : "Due in"}{" "}
              {formatDuration(
                Math.abs(
                  (new Date(lead.nextActionDueAt).getTime() - DEMO_NOW.getTime()) / 1000,
                ),
              )}
              <span className="text-text-muted">
                · {formatFullDate(lead.nextActionDueAt)}, {formatTime(lead.nextActionDueAt)}
              </span>
            </p>
          ) : (
            <p className="mt-1 text-meta text-text-muted">No due date set.</p>
          )}

          <Button
            variant={actionDone ? "ghost" : "secondary"}
            size="sm"
            className="mt-2 w-full"
            onClick={onCompleteAction}
          >
            {/* The card already reads as done: green ground, struck-through
                sentence. The button only has to offer the way back. */}
            {actionDone ? (
              <>
                <RotateCcw aria-hidden="true" />
                Undo
              </>
            ) : (
              <>
                <Check aria-hidden="true" />
                Mark done
              </>
            )}
          </Button>
        </div>
      </Section>

      {/* 2. Stay requirement, checked against the ledger */}
      <Section title="Stay requirement" icon={BedDouble}>
        <Row label="Dates" value={formatStayRange(req.checkIn, req.checkOut, req.nights)} />
        <Row
          label="Rooms"
          value={`${req.rooms} ${req.rooms === 1 ? "room" : "rooms"}, ${req.adults} ${
            req.adults === 1 ? "adult" : "adults"
          }${req.children > 0 ? `, ${req.children} ${req.children === 1 ? "child" : "children"}` : ""}`}
        />
        <Row label="Category" value={roomType?.name ?? "Not chosen yet"} />
        {req.mealPlan ? <Row label="Meal plan" value={MEAL_PLAN[req.mealPlan]} /> : null}
        {req.budgetPerNight ? (
          <Row label="Budget stated" value={`${formatINR(req.budgetPerNight)} a night`} />
        ) : null}

        {/* The claim the rest of the workspace prices against, so it is counted
            across every night rather than read off a field. */}
        <div className="mt-2 rounded-[var(--radius-card)] bg-surface-sunken px-3 py-2 shadow-[var(--shadow-hairline)]">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-meta text-text-secondary">Free across every night</p>
            <p
              data-numeric
              className={cn(
                "text-card font-semibold",
                shortfall > 0 ? "text-critical-700" : "text-positive-700",
              )}
            >
              {roomsAvailable} of {inventory}
            </p>
          </div>
          <p className="mt-1 text-micro leading-relaxed text-text-muted">
            {shortfall > 0
              ? `${shortfall} short of the ${req.rooms} asked for${tightestNight ? `. Tightest night is ${formatFullDate(tightestNight)}` : ""}.`
              : `Enough to confirm all ${req.rooms}${tightestNight ? `. Tightest night is ${formatFullDate(tightestNight)}` : ""}.`}
          </p>
        </div>

        {req.specialRequests.length > 0 ? (
          <div className="mt-2">
            <p className="text-meta text-text-secondary">Requests, not yet granted</p>
            <ul className="mt-1 space-y-0.5">
              {req.specialRequests.map((request) => (
                <li key={request} className="flex gap-1.5 text-meta text-text-primary">
                  <span className="text-text-muted" aria-hidden="true">
                    •
                  </span>
                  {request}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Section>

      {/* 3. Commercials */}
      <Section title="Commercials" icon={IndianRupee}>
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-meta text-text-secondary">
            {com.quotedValue ? "Quoted" : "Estimated"}
          </p>
          <p data-numeric className="text-section font-semibold text-text-primary">
            {formatINR(com.quotedValue ?? com.estimatedValue)}
          </p>
        </div>
        <p className="mb-2 text-micro text-text-muted">
          {com.quotedValue
            ? "What the guest has in writing, including GST."
            : "Requirement priced at the current rate card. Nothing sent yet."}
        </p>

        {com.requestedValue ? (
          <Row
            label="Guest asked for"
            value={formatINR(com.requestedValue)}
            tone={com.requestedValue < com.floorValue ? "critical" : "default"}
          />
        ) : null}
        <Row label="Floor for this stay" value={formatINR(com.floorValue)} />
        {com.discountPct ? <Row label="Discount given" value={`${com.discountPct}%`} /> : null}
        <div className="mt-1.5 flex items-center gap-1.5">
          <StatusBadge kind="payment" value={com.paymentStatus} />
          {lead.convertedBookingId ? (
            <span data-numeric className="text-micro text-text-muted">
              Booking {lead.convertedBookingId}
            </span>
          ) : null}
        </div>
      </Section>

      {/* 4. Guest */}
      <Section title="Guest" icon={UserRound}>
        <div className="flex items-center gap-2">
          <Avatar size="md" initials={initials(guest.name)} tone={toneForName(guest.name)} />
          <div className="min-w-0">
            <p className="truncate text-body font-medium text-text-primary">{guest.name}</p>
            {guest.company ? (
              <p className="truncate text-meta text-text-muted">{guest.company}</p>
            ) : null}
          </div>
        </div>

        <div className="mt-2 space-y-1">
          <Contact icon={Phone} value={guest.phone} />
          {guest.email ? <Contact icon={Mail} value={guest.email} /> : null}
          {guest.city ? <Contact icon={MapPin} value={guest.city} /> : null}
        </div>

        {guest.segments.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {guest.segments.map((segment) => (
              <StatusBadge key={segment} kind="segment" value={segment} />
            ))}
          </div>
        ) : null}

        <div className="mt-2 grid grid-cols-2 gap-2">
          <Stat label="Previous stays" value={String(guest.totalStays)} />
          <Stat label="Lifetime value" value={formatINR(guest.lifetimeValue)} />
        </div>
        {guest.lastStayDate ? (
          <p className="mt-1.5 text-micro text-text-muted">
            Last stayed {formatFullDate(guest.lastStayDate)}.
          </p>
        ) : (
          <p className="mt-1.5 text-micro text-text-muted">First enquiry from this guest.</p>
        )}

        {guest.preferences.length > 0 ? (
          <p className="mt-1.5 text-meta leading-relaxed text-text-secondary">
            Prefers {guest.preferences.map((p) => p.toLowerCase()).join(", ")}.
          </p>
        ) : null}
        {guest.notes ? (
          <p className="mt-1.5 text-meta leading-relaxed text-text-secondary">{guest.notes}</p>
        ) : null}
      </Section>

      {/* 5. Ownership and state */}
      <Section title="Ownership">
        <div className="space-y-2">
          <Picker label="Stage">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-between">
                  {LEAD_STAGE[stage].label}
                  <ChevronDown aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[12rem]">
                <DropdownMenuLabel>Move to stage</DropdownMenuLabel>
                {LEAD_STAGE_ORDER.map((value) => (
                  <DropdownMenuItem key={value} onSelect={() => onStageChange(value)}>
                    {LEAD_STAGE[value].label}
                    {value === stage ? <Check className="ml-auto text-brand-600" /> : null}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </Picker>

          <Picker label="Priority">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-between">
                  {LEAD_PRIORITY[priority].label}
                  <ChevronDown aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[10rem]">
                <DropdownMenuLabel>Priority</DropdownMenuLabel>
                {(["urgent", "high", "normal", "low"] as LeadPriority[]).map((value) => (
                  <DropdownMenuItem key={value} onSelect={() => onPriorityChange(value)}>
                    {LEAD_PRIORITY[value].label}
                    {value === priority ? <Check className="ml-auto text-brand-600" /> : null}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </Picker>

          <Picker label="Owner">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-between">
                  <span className="flex min-w-0 items-center gap-1.5">
                    {owner ? (
                      <Avatar size="xs" initials={owner.avatarInitials} tone="neutral" />
                    ) : null}
                    <span className="truncate">{owner?.name ?? "Unassigned"}</span>
                  </span>
                  <ChevronDown aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[14rem]">
                {/* The trailing number is the reason a desk picks one colleague
                    over another, so it gets a column heading rather than being
                    left as an unexplained digit. */}
                <DropdownMenuLabel className="flex items-center justify-between gap-4">
                  <span>Assign to</span>
                  <span className="font-normal normal-case tracking-normal">Open now</span>
                </DropdownMenuLabel>
                {team.map((member) => (
                  <DropdownMenuItem key={member.id} onSelect={() => onAssign(member.id)}>
                    <Avatar size="xs" initials={member.avatarInitials} tone="neutral" />
                    <span className="min-w-0 truncate">{member.name}</span>
                    <span className="ml-auto shrink-0 text-micro text-text-muted" data-numeric>
                      {member.assignedLeadCount}
                      <span className="sr-only"> open enquiries</span>
                    </span>
                  </DropdownMenuItem>
                ))}
                {owner ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => onAssign(undefined)}>
                      Leave unassigned
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </Picker>
        </div>

        <div className="mt-2 space-y-1.5">
          <Row label="Reference" value={lead.reference} />
          <Row label="First heard from" value={formatRelative(lead.createdAt, DEMO_NOW)} />
          {lead.firstResponseSec !== undefined ? (
            <Row label="First human reply" value={formatDuration(lead.firstResponseSec)} />
          ) : (
            <Row label="First human reply" value="Not yet" tone="critical" />
          )}
          {lead.lostReason ? (
            <Row label="Lost because" value={LOST_REASON[lead.lostReason]} tone="critical" />
          ) : null}
        </div>

        {lead.tags.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {lead.tags.map((tag) => (
              <Badge key={tag} intent="neutral">
                {tag}
              </Badge>
            ))}
          </div>
        ) : null}
      </Section>

      {/* 6. History */}
      <Section title="Timeline">
        {events.length === 0 ? (
          <p className="text-meta text-text-muted">
            Nothing logged against this enquiry yet.
          </p>
        ) : (
          <ol className="relative space-y-3 pl-4">
            <span
              aria-hidden="true"
              className="absolute bottom-1 left-[3px] top-1 w-px bg-hairline-strong"
            />
            {events.map((event) => (
              <li key={event.id} className="relative">
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute -left-4 top-1.5 size-[7px] rounded-full ring-2 ring-canvas",
                    event.resolvedAutonomously ? "bg-intel-500" : "bg-ink-400",
                  )}
                />
                <p className="text-meta leading-snug text-text-primary">{event.summary}</p>
                <p data-numeric className="mt-0.5 text-micro text-text-muted">
                  {event.actorName} · {formatRelative(event.occurredAt, DEMO_NOW)}
                  {event.resolvedAutonomously ? " · automatic" : ""}
                </p>
              </li>
            ))}
          </ol>
        )}
      </Section>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: typeof BedDouble;
  children: React.ReactNode;
}) {
  return (
    <section className="px-3 py-3">
      <h3 className="mb-2 flex items-center gap-1.5 text-micro font-semibold uppercase tracking-[0.08em] text-text-muted">
        {Icon ? <Icon className="size-3.5" aria-hidden="true" /> : null}
        {title}
      </h3>
      {children}
    </section>
  );
}

function Row({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "critical";
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-0.5">
      <span className="shrink-0 text-meta text-text-muted">{label}</span>
      <span
        data-numeric
        className={cn(
          "min-w-0 text-right text-meta",
          tone === "critical" ? "font-medium text-critical-700" : "text-text-primary",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function Contact({ icon: Icon, value }: { icon: typeof Phone; value: string }) {
  return (
    <p data-numeric className="flex items-center gap-1.5 text-meta text-text-secondary">
      <Icon className="size-3.5 shrink-0 text-text-muted" aria-hidden="true" />
      <span className="truncate">{value}</span>
    </p>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-sm)] bg-surface-sunken px-2 py-1.5">
      <p className="text-micro text-text-muted">{label}</p>
      <p data-numeric className="text-body font-semibold text-text-primary">
        {value}
      </p>
    </div>
  );
}

function Picker({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-meta text-text-muted">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
