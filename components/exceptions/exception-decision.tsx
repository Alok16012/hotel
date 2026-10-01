"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CircleSlash,
  Gavel,
  PencilLine,
  RotateCcw,
  ScrollText,
  Sparkles,
  UserRoundCog,
} from "lucide-react";
import { SourceBadge } from "@/components/common/source-badge";
import { StatusBadge } from "@/components/common/status-badge";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input, Textarea } from "@/components/ui/input";
import { DEMO_NOW } from "@/lib/clock";
import type { ExceptionRow, ExceptionStay } from "@/lib/exceptions";
import {
  formatDuration,
  formatINR,
  formatINRCompact,
  formatRelative,
  formatStayRange,
} from "@/lib/format";
import { EXCEPTION_KIND, LEAD_STAGE, MEAL_PLAN } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { TeamMember } from "@/types";
import { modifiedValueLine, modifyPrompt, parseRupees, type Decision } from "./model";

/**
 * The decision panel (§20).
 *
 * Four things have to be on screen at the same moment or the decision is not a
 * decision: who is asking, what they are asking for, which rule that breaks,
 * and what it costs. They are laid out in that order, top to bottom, because
 * that is the order a manager asks the questions in. The system's own
 * recommendation sits underneath all of it and is labelled advisory, not
 * because the label is decorative but because the entire premise of this screen
 * is that a person overrules the software (§42).
 */
export function ExceptionDecision({
  row,
  team,
  currentUser,
  onDecide,
  onAssign,
  onComment,
  onReopen,
}: {
  row: ExceptionRow;
  team: TeamMember[];
  currentUser: TeamMember;
  onDecide: (
    row: ExceptionRow,
    decision: Decision,
    detail: { note?: string; modifiedValue?: number },
  ) => void;
  onAssign: (row: ExceptionRow, member: TeamMember) => void;
  onComment: (row: ExceptionRow, body: string) => void;
  /** Only for decisions taken in this session. Seeded history is not editable. */
  onReopen?: (row: ExceptionRow) => void;
}) {
  const [pending, setPending] = React.useState<Decision | null>(null);
  const [note, setNote] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [comment, setComment] = React.useState("");

  // A decision half-typed against one exception must not follow the reader to
  // the next one. The caller keys this component on the exception id, so the
  // form is a fresh mount per item and there is nothing to reset by hand.

  const prompt = modifyPrompt(row.kind);
  const parsedAmount = parseRupees(amount);
  const amountRejected = pending === "modify" && amount.trim() !== "" && parsedAmount === undefined;

  function confirm() {
    if (!pending) return;
    if (amountRejected) return;
    onDecide(row, pending, {
      note: note.trim() || undefined,
      modifiedValue: pending === "modify" ? parsedAmount : undefined,
    });
    setPending(null);
    setNote("");
    setAmount("");
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[var(--radius-surface)] bg-surface shadow-[var(--shadow-raised)]">
      <header className="shrink-0 border-b border-hairline px-4 py-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span data-numeric className="text-meta font-medium text-text-secondary">
            {row.reference}
          </span>
          <Badge intent="outline">{EXCEPTION_KIND[row.kind]}</Badge>
          <StatusBadge kind="exceptionSeverity" value={row.severity} />
          <StatusBadge kind="exceptionStatus" value={row.status} />
        </div>

        <h2 className="mt-1.5 text-section font-semibold leading-tight tracking-[-0.01em] text-text-primary">
          {row.title}
        </h2>

        {/* "Unassigned" is a fact about an open item. On a closed one it reads
            as a criticism of a decision somebody already made, so the clause
            is dropped once the item is decided. */}
        <p className="mt-1 text-meta text-text-muted">
          Raised {formatRelative(row.raisedAt, DEMO_NOW)}
          {!row.isOpen
            ? ""
            : row.assigneeName
              ? ` · with ${row.assigneeName}`
              : " · nobody has picked it up"}
        </p>
      </header>

      <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto">
        <StakesBand row={row} />

        <div className="flex flex-col gap-4 px-4 py-4">
          <Section title="Who is asking" icon={UserRoundCog}>
            <div className="flex items-start gap-2.5">
              <Avatar size="md" initials={row.guestInitials} />
              <div className="min-w-0 flex-1">
                <Link
                  href={`/guests/${row.guestId}`}
                  className="text-body font-medium text-text-primary underline-offset-2 hover:text-brand-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                >
                  {row.guestName}
                </Link>
                <p className="mt-0.5 text-meta text-text-muted">
                  {[row.guestCompany, row.guestCity].filter(Boolean).join(" · ") || "Direct guest"}
                </p>
                <p data-numeric className="mt-1 text-meta text-text-secondary">
                  {row.guestStays} {row.guestStays === 1 ? "stay" : "stays"} on the property&apos;s
                  record, worth {formatINR(row.guestLifetimeValue)} in lifetime spend
                </p>
              </div>
            </div>
          </Section>

          <Section title="What is being asked" icon={ScrollText}>
            <p className="text-body leading-relaxed text-text-primary">{row.reason}</p>

            {row.stay ? (
              <p data-numeric className="mt-2 text-meta text-text-secondary">
                {formatStayRange(row.stay.checkIn, row.stay.checkOut, row.stay.nights)} ·{" "}
                {row.stay.rooms} {row.stay.rooms === 1 ? "room" : "rooms"}
                {row.stay.roomTypeName ? ` · ${row.stay.roomTypeName}` : ""}
                {row.stay.mealPlan ? ` · ${MEAL_PLAN[row.stay.mealPlan]}` : ""}
              </p>
            ) : null}

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {row.leadReference && row.leadStage ? (
                <Link
                  href={`/leads?lead=${row.leadId}`}
                  className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] bg-ink-50 px-1.5 py-0.5 text-micro text-text-secondary transition-colors duration-[80ms] hover:bg-ink-100 hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-500"
                >
                  <span data-numeric>{row.leadReference}</span>
                  <span className="text-text-muted">{LEAD_STAGE[row.leadStage].label}</span>
                  <ArrowRight className="size-2.5" aria-hidden="true" />
                </Link>
              ) : null}
              {row.bookingReference ? (
                <Link
                  href="/bookings"
                  className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] bg-ink-50 px-1.5 py-0.5 text-micro text-text-secondary transition-colors duration-[80ms] hover:bg-ink-100 hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-500"
                >
                  <span data-numeric>{row.bookingReference}</span>
                  <ArrowRight className="size-2.5" aria-hidden="true" />
                </Link>
              ) : null}
              {row.leadSource ? <SourceBadge source={row.leadSource} /> : null}
            </div>
          </Section>

          <Section title="The rule it breaks" icon={Gavel}>
            {row.policyThreshold ? (
              <p className="text-body text-text-primary">{row.policyThreshold}</p>
            ) : (
              <p className="text-body text-text-secondary">
                No numeric threshold. This one sits outside written policy rather than below a
                figure, which is why it needs a person rather than a rule.
              </p>
            )}

            {row.quotedValue || row.requestedValue || row.floorValue ? (
              <>
                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
                  <Figure
                    label="Quoted for the stay"
                    value={row.quotedValue}
                    absent="Not quoted yet"
                    stay={row.stay}
                  />
                  <Figure
                    label="Guest's counter"
                    value={row.requestedValue}
                    absent="None recorded"
                    stay={row.stay}
                  />
                  <Figure
                    label="Policy floor"
                    value={row.floorValue}
                    absent="No floor set"
                    stay={row.stay}
                  />
                </dl>

                {/* The policy line above is almost always quoted per night while
                    these are whole-stay totals, so the unit is spelled out
                    rather than left for the reader to infer from the size. */}
                {row.stay ? (
                  <p data-numeric className="mt-1.5 text-micro text-text-muted">
                    Totals cover {row.stay.nights} {row.stay.nights === 1 ? "night" : "nights"} across{" "}
                    {row.stay.rooms} {row.stay.rooms === 1 ? "room" : "rooms"}.
                  </p>
                ) : null}
              </>
            ) : null}

            <p className="mt-2 text-meta text-text-secondary">
              Decision required: {row.requestedAction.toLowerCase()}.
            </p>
          </Section>

          <Section title="What the system would do" icon={Sparkles} tone="intel">
            <p className="text-body leading-relaxed text-text-primary">
              {row.systemRecommendation}
            </p>
            <p className="mt-1.5 text-micro text-text-muted">
              Advisory. It was refused the authority to act on this, which is why the item is here.
            </p>
          </Section>

          {row.isOpen ? null : (
            <ResolutionRecord row={row} onReopen={onReopen ? () => onReopen(row) : undefined} />
          )}

          <CommentThread
            row={row}
            currentUser={currentUser}
            value={comment}
            onChange={setComment}
            onSubmit={() => {
              const body = comment.trim();
              if (!body) return;
              onComment(row, body);
              setComment("");
            }}
          />
        </div>
      </div>

      {row.isOpen ? (
        <footer className="shrink-0 border-t border-hairline bg-surface-sunken/60 px-4 py-2.5">
          {pending ? (
            <div className="flex flex-col gap-2">
              <p className="text-meta font-medium text-text-primary">
                {pending === "approve"
                  ? "Approving as asked"
                  : pending === "reject"
                    ? "Declining and holding the rule"
                    : "Approving a different figure"}
              </p>

              {pending === "modify" ? (
                <label className="flex flex-col gap-1">
                  <span className="text-meta text-text-secondary">{prompt.label}</span>
                  <div className="relative">
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-body text-text-muted"
                    >
                      ₹
                    </span>
                    <Input
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      inputMode="decimal"
                      placeholder="4,300"
                      className="pl-6"
                      aria-invalid={amountRejected}
                      aria-describedby="modify-help"
                    />
                  </div>
                  <span
                    id="modify-help"
                    className={cn(
                      "text-micro",
                      amountRejected ? "text-critical-700" : "text-text-muted",
                    )}
                  >
                    {amountRejected ? "That is not a rupee figure." : prompt.help}
                  </span>
                </label>
              ) : null}

              <label className="flex flex-col gap-1">
                <span className="text-meta text-text-secondary">
                  Why {pending === "reject" ? "you are holding it" : "you are allowing it"}
                </span>
                <Textarea
                  rows={2}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="The reason, for whoever reads this in six weeks."
                />
              </label>

              <div className="flex items-center gap-1.5">
                <Button
                  variant={pending === "reject" ? "critical" : "primary"}
                  size="sm"
                  onClick={confirm}
                  disabled={amountRejected}
                >
                  <Check aria-hidden="true" />
                  Record the decision
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setPending(null)}>
                  Back
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5">
              <Button variant="primary" size="sm" onClick={() => setPending("approve")}>
                <Check aria-hidden="true" />
                Approve
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setPending("modify")}>
                <PencilLine aria-hidden="true" />
                Modify
              </Button>
              <Button variant="critical" size="sm" onClick={() => setPending("reject")}>
                <CircleSlash aria-hidden="true" />
                Reject
              </Button>

              <AssignMenu row={row} team={team} onAssign={onAssign} />
            </div>
          )}
        </footer>
      ) : null}
    </div>
  );
}

/**
 * The four numbers that decide the order of the queue, on the item itself.
 *
 * Money at stake is shown as a giveaway rather than a signed figure, because
 * "−₹37,800" and "₹37,800 given away" are the same number and only one of them
 * is a sentence anybody reads correctly at speed.
 */
function StakesBand({ row }: { row: ExceptionRow }) {
  const giveaway = Math.max(0, -row.businessImpact);

  const cells: { label: string; value: string; hint: string; tone?: "critical" }[] = [
    {
      label: row.isOpen ? "Money at stake" : "Was at stake",
      value: giveaway > 0 ? formatINRCompact(giveaway) : "None",
      hint:
        giveaway > 0
          ? row.isOpen
            ? "Given away against policy"
            : "On the request as it arrived"
          : "No rupee value on this one",
      tone: giveaway > 0 && row.isOpen ? "critical" : undefined,
    },
    {
      label: "Guest is worth",
      value: formatINRCompact(row.guestLifetimeValue),
      hint: `Across ${row.guestStays} ${row.guestStays === 1 ? "stay" : "stays"}`,
    },
    {
      label: row.isOpen ? "Waiting" : "Time to decision",
      value: formatDuration(row.elapsedSec),
      hint: row.isOpen ? "Since it was raised" : "From raised to decided",
      tone: row.isOpen && row.elapsedSec > 4 * 3600 ? "critical" : undefined,
    },
    {
      label: row.isOpen ? "Sitting with" : "Decided by",
      value: row.isOpen ? (row.assigneeName ?? "Nobody") : (row.resolvedByName ?? "The desk"),
      hint: row.isOpen ? "Owns the decision" : "Signed it off",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-px border-b border-hairline bg-hairline sm:grid-cols-4">
      {cells.map((cell) => (
        <div key={cell.label} className="bg-surface px-4 pb-2.5 pt-3">
          <p className="text-micro font-medium uppercase tracking-[0.08em] text-text-muted">
            {cell.label}
          </p>
          <p
            data-numeric
            className={cn(
              "mt-1 truncate text-card font-semibold leading-none tracking-[-0.01em]",
              cell.tone === "critical" ? "text-critical-700" : "text-text-primary",
            )}
          >
            {cell.value}
          </p>
          <p className="mt-1.5 text-micro leading-snug text-text-muted">{cell.hint}</p>
        </div>
      ))}
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  tone,
  children,
}: {
  title: string;
  icon: React.ElementType;
  tone?: "intel";
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-[var(--radius-card)] px-3 py-2.5",
        tone === "intel"
          ? "bg-intel-100/45 shadow-[var(--shadow-hairline)]"
          : "bg-surface-sunken/60",
      )}
    >
      <h3
        className={cn(
          "mb-1.5 flex items-center gap-1.5 text-micro font-semibold uppercase tracking-[0.08em]",
          tone === "intel" ? "text-intel-700" : "text-text-muted",
        )}
      >
        <Icon className="size-3" aria-hidden="true" />
        {title}
      </h3>
      {children}
    </section>
  );
}

function Figure({
  label,
  value,
  absent,
  stay,
}: {
  label: string;
  value?: number;
  absent: string;
  stay?: ExceptionStay;
}) {
  // Per night per room, so the total can be held against a policy line that is
  // almost always written per night. Only where the stay is known.
  const unit = stay && stay.nights > 0 && stay.rooms > 0 ? stay.nights * stay.rooms : 0;

  return (
    <div>
      <dt className="text-micro text-text-muted">{label}</dt>
      <dd data-numeric className="text-meta font-medium text-text-primary">
        {value === undefined ? <span className="text-text-muted">{absent}</span> : formatINR(value)}
      </dd>
      {value !== undefined && unit > 0 ? (
        <p data-numeric className="text-micro text-text-muted">
          {formatINR(Math.round(value / unit))} per night
        </p>
      ) : null}
    </div>
  );
}

function ResolutionRecord({ row, onReopen }: { row: ExceptionRow; onReopen?: () => void }) {
  return (
    <Section title="How it was decided" icon={Gavel}>
      <p className="text-body text-text-primary">
        <StatusBadge kind="exceptionStatus" value={row.status} size="md" />{" "}
        {row.resolvedByName ? `by ${row.resolvedByName}` : "by the desk"}
        {row.resolvedAt ? `, ${formatRelative(row.resolvedAt, DEMO_NOW)}` : ""}
      </p>

      {row.modifiedValue !== undefined ? (
        <p data-numeric className="mt-1.5 text-meta text-text-secondary">
          {modifiedValueLine(row.kind, row.modifiedValue)}
        </p>
      ) : null}

      {row.decisionNote ? (
        <p className="mt-1.5 text-body leading-relaxed text-text-primary">{row.decisionNote}</p>
      ) : (
        <p className="mt-1.5 text-meta text-text-muted">No reason was recorded at the time.</p>
      )}

      <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p data-numeric className="text-micro text-text-muted">
          {formatDuration(row.elapsedSec)} from raised to decided.
        </p>
        {/* Undo lives on the toast, and the toast is gone in four seconds. A
            decision taken a minute ago should not need a page reload to take
            back. Seeded history has no reopen, because there is nothing local
            to unwind. */}
        {onReopen ? (
          <Button variant="ghost" size="xs" onClick={onReopen}>
            <RotateCcw aria-hidden="true" />
            Put it back in the queue
          </Button>
        ) : null}
      </div>
    </Section>
  );
}

function CommentThread({
  row,
  currentUser,
  value,
  onChange,
  onSubmit,
}: {
  row: ExceptionRow;
  currentUser: TeamMember;
  value: string;
  onChange: (next: string) => void;
  onSubmit: () => void;
}) {
  return (
    <section>
      <h3 className="mb-1.5 flex items-baseline gap-1.5 text-micro font-semibold uppercase tracking-[0.08em] text-text-muted">
        Thread
        <span data-numeric className="text-micro font-normal normal-case tracking-normal">
          {row.comments.length}
        </span>
      </h3>

      {row.comments.length === 0 ? (
        <p className="text-meta text-text-muted">
          Nobody has weighed in yet. Anything written here stays internal to the team.
        </p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {row.comments.map((comment) => (
            <li key={comment.id} className="flex gap-2">
              <Avatar size="sm" tone="neutral" initials={comment.authorInitials} />
              <div className="min-w-0 flex-1">
                <p className="flex items-baseline gap-1.5">
                  <span className="text-meta font-medium text-text-primary">
                    {comment.authorName}
                  </span>
                  <span className="text-micro text-text-muted">
                    {formatRelative(comment.createdAt, DEMO_NOW)}
                  </span>
                </p>
                <p className="mt-0.5 text-body leading-relaxed text-text-secondary">
                  {comment.body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-2.5 flex gap-2">
        <Avatar size="sm" tone="brand" initials={currentUser.avatarInitials} />
        <div className="min-w-0 flex-1">
          <Textarea
            rows={2}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={`Add context for the rest of the team, ${currentUser.name.split(" ")[0]}.`}
          />
          <div className="mt-1.5 flex justify-end">
            <Button variant="secondary" size="sm" onClick={onSubmit} disabled={!value.trim()}>
              Post to thread
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function AssignMenu({
  row,
  team,
  onAssign,
}: {
  row: ExceptionRow;
  team: TeamMember[];
  onAssign: (row: ExceptionRow, member: TeamMember) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="ml-auto">
          <UserRoundCog aria-hidden="true" />
          {row.assigneeName ? `With ${row.assigneeName.split(" ")[0]}` : "Assign"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[13rem]">
        <DropdownMenuLabel>Who decides this</DropdownMenuLabel>
        {team.map((member) => (
          <DropdownMenuItem key={member.id} onSelect={() => onAssign(row, member)}>
            <Avatar size="xs" tone="neutral" initials={member.avatarInitials} />
            {member.name}
            {member.id === row.assigneeId ? (
              <Check className="ml-auto text-brand-600" />
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
