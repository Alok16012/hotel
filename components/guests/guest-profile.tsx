import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BedDouble,
  Building2,
  CalendarCheck,
  Info,
  Languages,
  Mail,
  MapPin,
  MessageSquareWarning,
  Phone,
  Utensils,
} from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { PageBody, PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { ColumnHead, Panel } from "@/components/common/panel";
import { Badge } from "@/components/ui/badge";
import {
  formatFullDate,
  formatINR,
  formatRelative,
  formatStayRange,
} from "@/lib/format";
import { DEMO_NOW } from "@/lib/clock";
import type { BookingRow } from "@/lib/bookings";
import type { GuestComplaint, GuestProfile as Profile } from "@/lib/guests";
import { EXCEPTION_KIND, MEAL_PLAN } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { LikelihoodMeter, LikelihoodTrace } from "./likelihood-meter";
import { lastStayLabel } from "./model";

/**
 * One guest, in full (§16).
 *
 * Ordered the way a manager reads a guest before picking up the phone: who they
 * are, what they are worth, what they have asked for before, and what went
 * wrong last time. The complaint log sits on the same page as the value figure
 * deliberately, because the two together are the decision, and a screen that
 * shows only the first one produces a very confident wrong answer.
 */
export function GuestProfileView({ profile }: { profile: Profile }) {
  const { guest, row, past, upcoming, inHouse, complaints, staysNotOnFile } = profile;
  const contact = [guest.phone, guest.email].filter(Boolean).join(" · ");

  return (
    <>
      <PageHeader
        eyebrow={
          <>
            <Link
              href="/guests"
              className="inline-flex items-center gap-1 text-text-muted transition-colors duration-[130ms] hover:text-text-primary"
            >
              <ArrowLeft className="size-3.5" aria-hidden="true" />
              Guests
            </Link>
            <span aria-hidden="true">/</span>
            <span>{guest.city ?? "Guest"}</span>
          </>
        }
        title={guest.name}
        description={contact}
        actions={
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            {inHouse ? (
              <Badge intent="brand" size="md">
                In house · room {inHouse.roomNumbers.join(", ") || "to be assigned"}
              </Badge>
            ) : null}
            {guest.segments.map((segment) => (
              <StatusBadge key={segment} kind="segment" value={segment} size="md" />
            ))}
          </div>
        }
      />

      <PageBody className="space-y-4">
        <ValueBand profile={profile} />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            <Panel
              title="Stay history"
              description={
                staysNotOnFile > 0
                  ? `${past.length} ${past.length === 1 ? "stay" : "stays"} held in this system. The property's record says ${guest.totalStays}, so ${staysNotOnFile} predate it and are not shown.`
                  : `${past.length} completed ${past.length === 1 ? "stay" : "stays"} on file.`
              }
              bodyClassName="overflow-x-auto"
            >
              {past.length === 0 && upcoming.length === 0 && !inHouse ? (
                <EmptyState
                  icon={BedDouble}
                  size="sm"
                  title="No stay on file"
                  description="This guest has enquired but has not yet stayed under this system."
                />
              ) : (
                <table className="w-full min-w-[44rem] border-collapse">
                  <thead className="border-b border-hairline bg-surface-sunken/50">
                    <tr>
                      <ColumnHead>Reference</ColumnHead>
                      <ColumnHead>Stay</ColumnHead>
                      <ColumnHead>Room type</ColumnHead>
                      <ColumnHead align="right">Rate paid</ColumnHead>
                      <ColumnHead align="right">Total</ColumnHead>
                      <ColumnHead>Status</ColumnHead>
                    </tr>
                  </thead>
                  <tbody>
                    {inHouse ? <StayRow key={inHouse.id} stay={inHouse} /> : null}
                    {upcoming.map((stay) => (
                      <StayRow key={stay.id} stay={stay} />
                    ))}
                    {past.map((stay) => (
                      <StayRow key={stay.id} stay={stay} />
                    ))}
                  </tbody>
                </table>
              )}
            </Panel>

            <Panel
              title="Complaints and resolutions"
              description="Everything raised to the exception queue about this guest, and what was decided."
              aside={
                complaints.length > 0 ? (
                  <Badge intent={row.openComplaints > 0 ? "critical" : "neutral"}>
                    {row.openComplaints > 0 ? `${row.openComplaints} open` : "All closed"}
                  </Badge>
                ) : null
              }
            >
              {complaints.length === 0 ? (
                <EmptyState
                  icon={MessageSquareWarning}
                  size="sm"
                  title="Nothing on record"
                  description="No complaint, refund or policy exception has been raised for this guest."
                />
              ) : (
                <ul className="divide-y divide-hairline">
                  {complaints.map((complaint) => (
                    <ComplaintItem key={complaint.id} complaint={complaint} />
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          <div className="space-y-4">
            <Panel
              title="Next stay likelihood"
              description="A score from what the property already knows, not a prediction."
              aside={<LikelihoodMeter likelihood={row.likelihood} />}
              bodyClassName="pb-1"
            >
              <LikelihoodTrace likelihood={row.likelihood} />
              <p className="border-t border-hairline px-4 py-2 text-meta text-text-muted">
                Score {row.likelihood.score} of 100. Move it by doing something, not by watching it.
              </p>
            </Panel>

            <Panel title="Identity and contact">
              <dl className="divide-y divide-hairline/70">
                <DetailRow icon={Phone} label="Phone" value={guest.phone} />
                <DetailRow icon={Mail} label="Email" value={guest.email ?? "Not on file"} />
                <DetailRow icon={MapPin} label="City" value={guest.city ?? "Not on file"} />
                {guest.company ? (
                  <DetailRow icon={Building2} label="Company" value={guest.company} />
                ) : null}
                <DetailRow
                  icon={Languages}
                  label="Language"
                  value={guest.preferredLanguage ?? "English, by default"}
                  hint={
                    guest.preferredLanguage
                      ? "Asked to be dealt with in this language."
                      : "No preference recorded. The desk works in English."
                  }
                />
                <DetailRow
                  icon={CalendarCheck}
                  label="Last contact"
                  value={formatRelative(guest.lastInteractionAt, DEMO_NOW)}
                  hint={`On the books since ${formatFullDate(guest.createdAt)}`}
                />
              </dl>
            </Panel>

            <Panel
              title="Preferences and requests"
              description="What the desk should have ready before this guest arrives."
            >
              <div className="space-y-3 px-4 py-3">
                <PreferenceGroup
                  label="Standing preferences"
                  items={guest.preferences}
                  empty="Nothing recorded yet."
                />

                <div className="flex flex-wrap items-center gap-2 text-meta text-text-secondary">
                  <Utensils className="size-3.5 text-text-muted" aria-hidden="true" />
                  {guest.mealPreference
                    ? `Usually books ${MEAL_PLAN[guest.mealPreference].toLowerCase()}`
                    : "No meal plan preference on file"}
                  {row.preferredRoomTypeName ? (
                    <>
                      <span aria-hidden="true" className="text-hairline-strong">
                        ·
                      </span>
                      <BedDouble className="size-3.5 text-text-muted" aria-hidden="true" />
                      Prefers {row.preferredRoomTypeName}
                    </>
                  ) : null}
                </div>

                <PreferenceGroup
                  label="Asked for on past stays"
                  items={dedupeRequests(profile)}
                  empty="No special requests on any booking."
                />

                {guest.tags.length > 0 ? (
                  <div>
                    <p className="text-micro font-semibold uppercase tracking-[0.08em] text-text-muted">
                      Tags
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {guest.tags.map((tag) => (
                        <Badge key={tag} intent="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}

                {guest.notes ? (
                  <p className="rounded-[var(--radius-card)] bg-surface-sunken px-3 py-2 text-meta leading-relaxed text-text-secondary">
                    {guest.notes}
                  </p>
                ) : null}
              </div>
            </Panel>
          </div>
        </div>

        <p className="flex items-start gap-1.5 pb-2 text-meta text-text-muted">
          <Info className="mt-px size-3.5 shrink-0" aria-hidden="true" />
          Lifetime value and stay count are the property&apos;s own record. Nights, average rate and
          revenue on file are counted from the bookings held in this system.
        </p>
      </PageBody>
    </>
  );
}

/** Requests repeat across stays, and a list that repeats them reads as noise. */
function dedupeRequests(profile: Profile): string[] {
  const seen = new Set<string>();
  for (const stay of profile.stays) {
    for (const request of stay.specialRequests) seen.add(request);
  }
  return [...seen];
}

function ValueBand({ profile }: { profile: Profile }) {
  const { row, guest } = profile;
  const cells = [
    {
      label: "Lifetime value",
      value: row.lifetimeValue > 0 ? formatINR(row.lifetimeValue) : "First stay pending",
      hint: `${guest.totalStays} ${guest.totalStays === 1 ? "stay" : "stays"} on the property's record`,
    },
    {
      label: "Revenue on file",
      value: row.revenueOnFile > 0 ? formatINR(row.revenueOnFile) : "Nothing yet",
      hint: `${row.staysOnFile} ${row.staysOnFile === 1 ? "stay" : "stays"} held in this system`,
    },
    {
      label: "Nights on file",
      value: String(row.nightsOnFile),
      hint: `${row.roomNightsOnFile} room ${row.roomNightsOnFile === 1 ? "night" : "nights"} sold`,
    },
    {
      label: "Average rate",
      value: row.averageRate > 0 ? formatINR(row.averageRate) : "Not on file",
      hint: "Per room night, from stays held here",
    },
    {
      label: "Last stay",
      ...lastStayLabel(row),
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
              className="mt-1 text-section font-semibold leading-none tracking-[-0.02em] text-text-primary"
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

function StayRow({ stay }: { stay: BookingRow }) {
  return (
    <tr className="border-b border-hairline/70 last:border-0">
      <td className="px-4 py-2.5">
        <span data-numeric className="text-meta font-medium text-text-primary">
          {stay.reference}
        </span>
        <span className="mt-0.5 block text-micro text-text-muted">
          {stay.rooms} {stay.rooms === 1 ? "room" : "rooms"} · {MEAL_PLAN[stay.mealPlan]}
        </span>
      </td>
      <td className="px-4 py-2.5 text-meta text-text-secondary">
        {formatStayRange(stay.checkIn, stay.checkOut, stay.nights)}
      </td>
      <td className="px-4 py-2.5 text-meta text-text-secondary">
        {stay.roomTypeName}
        {stay.roomNumbers.length > 0 ? (
          <span className="mt-0.5 block text-micro text-text-muted">
            Room {stay.roomNumbers.join(", ")}
          </span>
        ) : null}
      </td>
      <td data-numeric className="px-4 py-2.5 text-right text-meta text-text-secondary">
        {formatINR(stay.nightlyRate)}
      </td>
      <td data-numeric className="px-4 py-2.5 text-right text-body font-medium text-text-primary">
        {formatINR(stay.total)}
      </td>
      <td className="px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-1">
          <StatusBadge kind="booking" value={stay.status} />
          {stay.balance > 0 ? (
            <StatusBadge kind="payment" value={stay.paymentStatus} />
          ) : null}
        </div>
      </td>
    </tr>
  );
}

function ComplaintItem({ complaint }: { complaint: GuestComplaint }) {
  const open = complaint.status !== "approved" && complaint.status !== "rejected";

  return (
    <li className="px-4 py-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <StatusBadge kind="exceptionSeverity" value={complaint.severity} />
        <Badge intent="neutral">{EXCEPTION_KIND[complaint.kind]}</Badge>
        <span data-numeric className="text-micro text-text-muted">
          {complaint.reference}
        </span>
        <span className="ml-auto text-micro text-text-muted">
          {formatRelative(complaint.raisedAt, DEMO_NOW)}
        </span>
      </div>

      <p className="mt-1.5 text-body font-medium text-text-primary">{complaint.title}</p>
      <p className="mt-0.5 text-meta leading-relaxed text-text-secondary">{complaint.reason}</p>

      <div
        className={cn(
          "mt-2 rounded-[var(--radius-card)] px-3 py-2 text-meta leading-relaxed",
          open ? "bg-caution-100 text-caution-700" : "bg-surface-sunken text-text-secondary",
        )}
      >
        {open ? (
          <>
            <span className="font-medium">Still open. </span>
            {complaint.requestedAction}
          </>
        ) : (
          <>
            <span className="font-medium">
              {complaint.status === "approved" ? "Approved" : "Rejected"}
              {complaint.hoursToResolve !== undefined
                ? ` after ${complaint.hoursToResolve} ${complaint.hoursToResolve === 1 ? "hour" : "hours"}`
                : ""}
              .{" "}
            </span>
            {complaint.resolutionNote ?? complaint.requestedAction}
          </>
        )}
      </div>

      <p className="mt-1.5 text-micro text-text-muted">
        {complaint.bookingReference ? `Booking ${complaint.bookingReference} · ` : ""}
        {complaint.businessImpact !== 0
          ? `${formatINR(Math.abs(complaint.businessImpact))} ${complaint.businessImpact < 0 ? "given away" : "recovered"}`
          : "No money at stake"}
      </p>
    </li>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex items-start gap-3 px-4 py-2">
      <Icon className="mt-0.5 size-3.5 shrink-0 text-text-muted" aria-hidden="true" />
      <dt className="w-20 shrink-0 text-meta text-text-muted">{label}</dt>
      <dd className="min-w-0 flex-1">
        <span className="block break-words text-meta text-text-primary">{value}</span>
        {hint ? <span className="mt-0.5 block text-micro text-text-muted">{hint}</span> : null}
      </dd>
    </div>
  );
}

function PreferenceGroup({
  label,
  items,
  empty,
}: {
  label: string;
  items: string[];
  empty: string;
}) {
  return (
    <div>
      <p className="text-micro font-semibold uppercase tracking-[0.08em] text-text-muted">
        {label}
      </p>
      {items.length === 0 ? (
        <p className="mt-1 text-meta text-text-muted">{empty}</p>
      ) : (
        <ul className="mt-1 space-y-1">
          {items.map((item) => (
            <li key={item} className="flex gap-2 text-meta leading-snug text-text-secondary">
              <span aria-hidden="true" className="mt-1.5 size-1 shrink-0 rounded-full bg-ink-400" />
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
