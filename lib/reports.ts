/**
 * Report rendering (§22).
 *
 * A report here is not a file. It is a shape: a period, a set of sections, and
 * a sentence naming what the figures were counted from. The screen renders
 * that shape, and the CSV export flattens the same shape, so the sheet a
 * colleague opens in Excel cannot disagree with the one they read on screen.
 *
 * Every figure is recomputed from the seed arrays each time. Nothing on these
 * sheets is a stored result, which is why a report can be run over a period
 * the seed only partly covers and still say so rather than filling the gap.
 *
 * All rendering happens here, on the server, and the finished shapes are
 * handed to the client. The period switch is therefore instant and offline in
 * this build; against a real warehouse each switch becomes one query for one
 * shape and nothing else on the screen changes.
 */

import { BOOKINGS } from "@/data/bookings";
import { AUTONOMY_RATE } from "@/data/events";
import { EXCEPTIONS } from "@/data/exceptions";
import { FOLLOW_UPS } from "@/data/followups";
import { GUEST_BY_ID } from "@/data/guests";
import { HOTEL, PROPERTIES, ROOM_TYPE_BY_ID } from "@/data/hotel";
import { LEADS } from "@/data/leads";
import { REPORT_DEFINITIONS, REPORT_SCHEDULES } from "@/data/reports";
import { TEAM_BY_ID } from "@/data/team";
import { DEMO_TODAY, demoDayOf } from "@/lib/clock";
import { formatDeltaPct, formatDuration, formatFullDate, formatINR, formatPct } from "@/lib/format";
import { LEAD_SOURCE, LOST_REASON } from "@/lib/labels";
import { SLA_TARGET_SEC, leadValue } from "@/lib/metrics";
import type {
  Booking,
  ISODate,
  Lead,
  LeadSource,
  Paise,
  ReportCadence,
  ReportDefinition,
  ReportSchedule,
} from "@/types";

// ---------------------------------------------------------------------------
// Periods
// ---------------------------------------------------------------------------

export type ReportPeriodId =
  | "today"
  | "yesterday"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month";

export interface ReportPeriod {
  id: ReportPeriodId;
  /** Short form for the selector. */
  label: string;
  /** Long form for the sheet itself, with the actual dates in it. */
  rangeLabel: string;
  from: ISODate;
  to: ISODate;
  /**
   * True when the period has not finished yet.
   *
   * A part-finished week compared against a finished one is the most common
   * way a report lies, so the sheet carries the fact rather than the reader
   * being expected to remember what day it is.
   */
  running: boolean;
}

// Plain-date arithmetic, anchored to UTC midnight so nothing can drift across
// a zone. These never touch a wall clock; the only "now" in this file is the
// demo clock's calendar day.
function toMs(date: ISODate): number {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function toDate(ms: number): ISODate {
  return new Date(ms).toISOString().slice(0, 10);
}

function addDays(date: ISODate, n: number): ISODate {
  return toDate(toMs(date) + n * 86_400_000);
}

function startOfMonth(date: ISODate): ISODate {
  return `${date.slice(0, 7)}-01`;
}

function endOfMonth(date: ISODate): ISODate {
  const [y, m] = date.split("-").map(Number);
  return toDate(Date.UTC(y, m, 0));
}

/** Monday, because the commercial week at a hotel turns over with the weekend. */
function startOfWeek(date: ISODate): ISODate {
  const weekday = new Date(toMs(date)).getUTCDay();
  return addDays(date, weekday === 0 ? -6 : 1 - weekday);
}

function daysBetween(from: ISODate, to: ISODate): number {
  return Math.round((toMs(to) - toMs(from)) / 86_400_000) + 1;
}

function rangeLabel(from: ISODate, to: ISODate): string {
  return from === to ? formatFullDate(from) : `${formatFullDate(from)} to ${formatFullDate(to)}`;
}

function period(id: ReportPeriodId, label: string, from: ISODate, to: ISODate): ReportPeriod {
  return { id, label, rangeLabel: rangeLabel(from, to), from, to, running: to >= DEMO_TODAY };
}

/**
 * The periods a report can honestly be run over.
 *
 * Two per cadence: the one in progress and the last finished one. Offering a
 * free date range would be easy and mostly useless, because every standing
 * report is read against the period it was designed for.
 */
export function periodsFor(cadence: ReportCadence): ReportPeriod[] {
  if (cadence === "daily") {
    const yesterday = addDays(DEMO_TODAY, -1);
    return [
      period("today", "Today", DEMO_TODAY, DEMO_TODAY),
      period("yesterday", "Yesterday", yesterday, yesterday),
    ];
  }

  if (cadence === "weekly") {
    const thisWeek = startOfWeek(DEMO_TODAY);
    const lastWeek = addDays(thisWeek, -7);
    return [
      period("this_week", "This week", thisWeek, DEMO_TODAY),
      period("last_week", "Last week", lastWeek, addDays(thisWeek, -1)),
    ];
  }

  const thisMonth = startOfMonth(DEMO_TODAY);
  const lastMonth = startOfMonth(addDays(thisMonth, -1));
  return [
    period("this_month", "This month", thisMonth, DEMO_TODAY),
    period("last_month", "Last month", lastMonth, endOfMonth(lastMonth)),
  ];
}

/** The same length of time immediately before a period, for a comparison. */
function previousPeriod(p: ReportPeriod): { from: ISODate; to: ISODate } {
  const length = daysBetween(p.from, p.to);
  return { from: addDays(p.from, -length), to: addDays(p.from, -1) };
}

// ---------------------------------------------------------------------------
// The shape of a sheet
// ---------------------------------------------------------------------------

export interface ReportLine {
  label: string;
  value: string;
  /** Context that belongs to this figure rather than to the section. */
  hint?: string;
  /** Marks the total row so the sheet can weight it without guessing. */
  emphasis?: boolean;
}

export interface ReportTable {
  columns: string[];
  /** Per column, so money and counts sit right and names sit left. */
  numeric: boolean[];
  rows: string[][];
  /** Rendered as a closing row in bold, where a total makes sense. */
  total?: string[];
}

export interface ReportSection {
  id: string;
  title: string;
  note?: string;
  lines?: ReportLine[];
  table?: ReportTable;
  /** Said instead of an empty table, in words rather than a row of zeroes. */
  empty?: string;
}

export interface RenderedReport {
  definition: ReportDefinition;
  period: ReportPeriod;
  sections: ReportSection[];
  /** How many source records the period actually contains. */
  recordCount: number;
  /** What was counted, named in one sentence at the foot of the sheet. */
  coverage: string;
}

// ---------------------------------------------------------------------------
// Slicing
// ---------------------------------------------------------------------------

function within(day: ISODate, from: ISODate, to: ISODate): boolean {
  return day >= from && day <= to;
}

/** Reservations created in a window. Cancellations are counted separately. */
function bookingsCreatedIn(from: ISODate, to: ISODate): Booking[] {
  return BOOKINGS.filter(
    (b) => within(demoDayOf(b.createdAt), from, to) && b.status !== "cancelled",
  );
}

function leadsCreatedIn(from: ISODate, to: ISODate): Lead[] {
  return LEADS.filter((l) => within(demoDayOf(l.createdAt), from, to));
}

function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function share(part: number, whole: number): string {
  return whole === 0 ? "n/a" : formatPct(part / whole, 0);
}

/**
 * A counted noun.
 *
 * The coverage sentence at the foot of every sheet is the one line a reader
 * checks when a figure looks wrong, and "1 reservations" is enough to make
 * them doubt the rest of it.
 */
function count(n: number, singular: string, plural = `${singular}s`): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

/**
 * Room nights sold, which is the denominator for an average rate.
 *
 * Rooms times nights, not reservations. A four-night booking of two rooms is
 * eight room nights, and dividing revenue by reservations instead would
 * report a number that rises whenever guests stay longer.
 */
function roomNights(bookings: Booking[]): number {
  return sum(bookings.map((b) => b.rooms * b.nights));
}

/** What the same stay would have cost at rack rate, for the discount figure. */
function rackValue(booking: Booking): Paise {
  const type = ROOM_TYPE_BY_ID[booking.roomTypeId];
  if (!type) return booking.subtotal;
  return type.rackRate * booking.rooms * booking.nights;
}

const CHANNEL_ORDER: LeadSource[] = [
  "whatsapp",
  "website",
  "phone",
  "booking_com",
  "email",
  "instagram",
  "google_business",
  "walk_in",
];

// ---------------------------------------------------------------------------
// Daily operations
// ---------------------------------------------------------------------------

function renderDailyOps(definition: ReportDefinition, p: ReportPeriod): RenderedReport {
  const day = p.from;
  const live = BOOKINGS.filter((b) => b.status !== "cancelled" && b.status !== "no_show");
  const arrivals = live.filter((b) => b.checkIn === day);
  const departures = live.filter((b) => b.checkOut === day);
  const inHouse = live.filter((b) => b.checkIn <= day && b.checkOut > day);
  const roomsOccupied = sum(inHouse.map((b) => b.rooms));

  const leads = leadsCreatedIn(day, day);
  const answered = leads.filter((l) => l.firstResponseSec !== undefined);
  const taken = bookingsCreatedIn(day, day);

  const followUpsDue = FOLLOW_UPS.filter((f) => demoDayOf(f.dueAt) === day);
  const raised = EXCEPTIONS.filter((e) => demoDayOf(e.raisedAt) === day);

  const byChannel = CHANNEL_ORDER.map((source) => {
    const rows = leads.filter((l) => l.source === source);
    const replied = rows.filter((l) => l.firstResponseSec !== undefined);
    return { source, rows, replied };
  }).filter((entry) => entry.rows.length > 0);

  const sections: ReportSection[] = [
    {
      id: "desk",
      title: "Front desk",
      lines: [
        {
          label: "Arrivals",
          value: `${arrivals.length}`,
          hint: arrivals.length ? `${sum(arrivals.map((b) => b.rooms))} rooms` : undefined,
        },
        { label: "Departures", value: `${departures.length}` },
        { label: "Staying overnight", value: `${inHouse.length}` },
        {
          label: "Rooms occupied",
          value: `${roomsOccupied} of ${HOTEL.totalRooms}`,
          hint: share(roomsOccupied, HOTEL.totalRooms),
          emphasis: true,
        },
      ],
    },
    {
      id: "enquiries",
      title: "Enquiries received",
      note: "Reply time is measured to the first message a colleague wrote.",
      empty: byChannel.length ? undefined : "No enquiries arrived on this day.",
      table: byChannel.length
        ? {
            columns: ["Channel", "Enquiries", "Answered", "Median first reply"],
            numeric: [false, true, true, true],
            rows: byChannel.map((entry) => [
              LEAD_SOURCE[entry.source].label,
              `${entry.rows.length}`,
              `${entry.replied.length}`,
              entry.replied.length
                ? formatDuration(median(entry.replied.map((l) => l.firstResponseSec ?? 0)))
                : "not yet",
            ]),
            total: [
              "All channels",
              `${leads.length}`,
              `${answered.length}`,
              answered.length
                ? formatDuration(median(answered.map((l) => l.firstResponseSec ?? 0)))
                : "not yet",
            ],
          }
        : undefined,
    },
    {
      id: "owed",
      title: "Still owed",
      note: "Unanswered messages are the state of the inbox now, not a figure frozen at midnight.",
      lines: [
        {
          label: "Enquiries with an unread message",
          value: `${LEADS.filter((l) => l.unreadCount > 0).length}`,
        },
        {
          label: "Follow-ups due",
          value: `${followUpsDue.length}`,
          hint: followUpsDue.length
            ? `${followUpsDue.filter((f) => f.status === "done").length} done`
            : undefined,
        },
        {
          label: "Exceptions raised",
          value: `${raised.length}`,
          hint: raised.length
            ? `${raised.filter((e) => e.status === "open").length} still waiting on a decision`
            : undefined,
        },
      ],
    },
    {
      id: "money",
      title: "Reservations taken",
      empty: taken.length ? undefined : "No reservations were created on this day.",
      lines: taken.length
        ? [
            { label: "Reservations", value: `${taken.length}` },
            { label: "Room revenue", value: formatINR(sum(taken.map((b) => b.subtotal))) },
            { label: "GST", value: formatINR(sum(taken.map((b) => b.taxes))) },
            {
              label: "Total billed",
              value: formatINR(sum(taken.map((b) => b.total))),
              emphasis: true,
            },
            {
              label: "Collected so far",
              value: formatINR(sum(taken.map((b) => b.amountPaid))),
              hint: share(sum(taken.map((b) => b.amountPaid)), sum(taken.map((b) => b.total))),
            },
          ]
        : undefined,
    },
  ];

  return {
    definition,
    period: p,
    sections,
    recordCount: leads.length + taken.length + arrivals.length + departures.length,
    coverage: `Counted from ${count(leads.length, "enquiry", "enquiries")} and ${count(taken.length, "reservation")} dated ${formatFullDate(day)}, plus every stay live over that night.`,
  };
}

// ---------------------------------------------------------------------------
// Weekly commercial
// ---------------------------------------------------------------------------

function renderWeeklyCommercial(definition: ReportDefinition, p: ReportPeriod): RenderedReport {
  const leads = leadsCreatedIn(p.from, p.to);
  const booked = leads.filter((l) => l.stage === "booked");
  const lost = leads.filter((l) => l.stage === "lost");
  const taken = bookingsCreatedIn(p.from, p.to);

  /**
   * Enquiries still in play.
   *
   * A young cohort converts at zero because nobody has decided yet, not
   * because every guest walked away, and a conversion column standing on its
   * own says the second thing. The open count is printed beside it so a week
   * read on the Monday after is read for what it is.
   */
  const open = leads.filter((l) => l.stage !== "booked" && l.stage !== "lost");

  const byChannel = CHANNEL_ORDER.map((source) => {
    const rows = leads.filter((l) => l.source === source);
    const won = rows.filter((l) => l.stage === "booked");
    const undecided = rows.filter((l) => l.stage !== "booked" && l.stage !== "lost");
    return { source, rows, won, undecided, value: sum(won.map(leadValue)) };
  }).filter((entry) => entry.rows.length > 0);

  const byReason = Object.entries(
    lost.reduce<Record<string, Lead[]>>((acc, lead) => {
      const key = lead.lostReason ?? "not_serious";
      (acc[key] ??= []).push(lead);
      return acc;
    }, {}),
  ).sort((a, b) => b[1].length - a[1].length);

  /** Reservations with no enquiry behind them, which conversion cannot see. */
  const direct = taken.filter((b) => !b.leadId);

  const discounted = taken.filter((b) => rackValue(b) > b.subtotal);
  const givenAway = sum(discounted.map((b) => rackValue(b) - b.subtotal));
  const nights = roomNights(taken);

  const sections: ReportSection[] = [
    {
      id: "conversion",
      title: "Enquiries and conversion",
      note: `An enquiry is credited to the week it arrived, whichever week it was later booked in. ${
        open.length
          ? `${count(open.length, "enquiry", "enquiries")} from this period ${open.length === 1 ? "is" : "are"} still open, so the conversion figure can only rise.`
          : "Every enquiry from this period has been settled one way or the other."
      }`,
      empty: byChannel.length ? undefined : "No enquiries arrived in this period.",
      table: byChannel.length
        ? {
            columns: ["Channel", "Enquiries", "Booked", "Open", "Conversion", "Value booked"],
            numeric: [false, true, true, true, true, true],
            rows: byChannel.map((entry) => [
              LEAD_SOURCE[entry.source].label,
              `${entry.rows.length}`,
              `${entry.won.length}`,
              `${entry.undecided.length}`,
              share(entry.won.length, entry.rows.length),
              entry.value ? formatINR(entry.value) : "nil",
            ]),
            total: [
              "All channels",
              `${leads.length}`,
              `${booked.length}`,
              `${open.length}`,
              share(booked.length, leads.length),
              booked.length ? formatINR(sum(booked.map(leadValue))) : "nil",
            ],
          }
        : undefined,
    },
    {
      id: "revenue",
      title: "Revenue booked",
      /**
       * The two sections above and below count different things, and the gap
       * between them is the first thing a reader queries. Reservations arrive
       * from the channel manager, the switchboard and the front desk without
       * ever being an enquiry in this product, so the count is stated rather
       * than left to be inferred from a conversion rate that looks broken.
       */
      note: `Reservations created in the period, whenever the stay itself falls. ${
        direct.length
          ? `${direct.length === taken.length ? `All ${taken.length}` : `${direct.length} of the ${taken.length}`} arrived with no enquiry on file, through the channel manager, the switchboard or the front desk, so ${direct.length === 1 ? "it sits" : "they sit"} outside the conversion figures above.`
          : ""
      }`.trim(),
      empty: taken.length ? undefined : "No reservations were created in this period.",
      lines: taken.length
        ? [
            { label: "Reservations", value: `${taken.length}` },
            { label: "Room nights", value: `${nights}` },
            { label: "Room revenue", value: formatINR(sum(taken.map((b) => b.subtotal))) },
            {
              label: "Average rate a night",
              value: nights ? formatINR(Math.round(sum(taken.map((b) => b.subtotal)) / nights)) : "n/a",
              hint: "Room revenue divided by room nights",
            },
            {
              label: "Total billed",
              value: formatINR(sum(taken.map((b) => b.total))),
              emphasis: true,
            },
          ]
        : undefined,
    },
    {
      id: "discount",
      title: "Discounting",
      note: "Measured against the rack rate of the room type sold, not against the quoted figure.",
      lines: [
        {
          label: "Reservations sold below rack",
          value: `${discounted.length} of ${taken.length}`,
          hint: taken.length ? share(discounted.length, taken.length) : undefined,
        },
        {
          label: "Given away",
          value: givenAway ? formatINR(givenAway) : "nil",
          hint: givenAway ? "Against rack rate for the same stay" : undefined,
          emphasis: true,
        },
      ],
    },
    {
      id: "lost",
      title: "What was lost",
      empty: byReason.length ? undefined : "No enquiry from this period has been marked lost.",
      table: byReason.length
        ? {
            columns: ["Reason", "Enquiries", "Value"],
            numeric: [false, true, true],
            rows: byReason.map(([reason, rows]) => [
              LOST_REASON[reason as keyof typeof LOST_REASON] ?? reason,
              `${rows.length}`,
              formatINR(sum(rows.map(leadValue))),
            ]),
            total: ["All reasons", `${lost.length}`, formatINR(sum(lost.map(leadValue)))],
          }
        : undefined,
    },
  ];

  return {
    definition,
    period: p,
    sections,
    recordCount: leads.length + taken.length,
    coverage: `Counted from ${count(leads.length, "enquiry", "enquiries")} and ${count(taken.length, "reservation")} created between ${formatFullDate(p.from)} and ${formatFullDate(p.to)}.`,
  };
}

// ---------------------------------------------------------------------------
// Monthly performance
// ---------------------------------------------------------------------------

function renderMonthlyPerformance(definition: ReportDefinition, p: ReportPeriod): RenderedReport {
  const taken = bookingsCreatedIn(p.from, p.to);
  const prev = previousPeriod(p);
  const before = bookingsCreatedIn(prev.from, prev.to);

  // The ledger begins part-way through the previous month. Comparing against a
  // window the records do not cover reports where the seed starts rather than
  // anything the property did, so the comparison is withheld instead.
  const ledgerStart = BOOKINGS.map((b) => demoDayOf(b.createdAt)).sort()[0];
  const comparable = ledgerStart !== undefined && ledgerStart <= prev.from;

  const revenue = sum(taken.map((b) => b.total));
  const previousRevenue = sum(before.map((b) => b.total));
  const nights = roomNights(taken);

  const leads = leadsCreatedIn(p.from, p.to);
  const answered = leads.filter((l) => l.firstResponseSec !== undefined);
  const onTarget = answered.filter((l) => (l.firstResponseSec ?? 0) <= SLA_TARGET_SEC);

  const guests = new Set(taken.map((b) => b.guestId));
  const returning = [...guests].filter((id) => {
    const guest = GUEST_BY_ID[id];
    return guest ? guest.totalStays > 1 : false;
  });

  const byChannel = CHANNEL_ORDER.map((source) => {
    const rows = taken.filter((b) => b.source === source);
    return { source, rows, value: sum(rows.map((b) => b.total)) };
  })
    .filter((entry) => entry.rows.length > 0)
    .sort((a, b) => b.value - a.value);

  const sections: ReportSection[] = [
    {
      id: "revenue",
      title: "Revenue",
      note: comparable
        ? `Compared against ${formatFullDate(prev.from)} to ${formatFullDate(prev.to)}.`
        : "The ledger does not reach back a full period, so no comparison is shown.",
      empty: taken.length ? undefined : "No reservations were created in this period.",
      lines: taken.length
        ? [
            { label: "Total billed", value: formatINR(revenue), emphasis: true },
            {
              // Signed, because an unsigned 92% beside a revenue figure reads
              // as a share of it rather than as growth on the period before.
              label: "Against the period before",
              value: comparable
                ? previousRevenue
                  ? formatDeltaPct(((revenue - previousRevenue) / previousRevenue) * 100, 0)
                  : "no base to compare"
                : "withheld",
              hint:
                comparable && previousRevenue
                  ? `${revenue >= previousRevenue ? "up from" : "down from"} ${formatINR(previousRevenue)}`
                  : undefined,
            },
            { label: "Reservations", value: `${taken.length}` },
            {
              label: "Average rate a night",
              value: nights ? formatINR(Math.round(sum(taken.map((b) => b.subtotal)) / nights)) : "n/a",
            },
            {
              label: "Average value of a reservation",
              value: formatINR(Math.round(revenue / taken.length)),
            },
          ]
        : undefined,
    },
    {
      id: "mix",
      title: "Where it came from",
      note: "Reservations attributed to the channel the guest arrived through.",
      empty: byChannel.length ? undefined : "No reservations to attribute.",
      table: byChannel.length
        ? {
            columns: ["Channel", "Reservations", "Revenue", "Share"],
            numeric: [false, true, true, true],
            rows: byChannel.map((entry) => [
              LEAD_SOURCE[entry.source].label,
              `${entry.rows.length}`,
              formatINR(entry.value),
              share(entry.value, revenue),
            ]),
            total: ["All channels", `${taken.length}`, formatINR(revenue), "100%"],
          }
        : undefined,
    },
    {
      id: "guests",
      title: "Guests",
      lines: [
        { label: "Distinct guests booked", value: `${guests.size}` },
        {
          label: "Staying with us again",
          value: `${returning.length}`,
          hint: guests.size ? share(returning.length, guests.size) : undefined,
        },
        { label: "First time", value: `${guests.size - returning.length}` },
      ],
    },
    {
      id: "service",
      title: "Service",
      note: `Target is a first reply inside ${formatDuration(SLA_TARGET_SEC)}.`,
      lines: [
        {
          label: "Enquiries answered",
          value: `${answered.length} of ${leads.length}`,
          hint: leads.length ? share(answered.length, leads.length) : undefined,
        },
        {
          label: "Median first reply",
          value: answered.length
            ? formatDuration(median(answered.map((l) => l.firstResponseSec ?? 0)))
            : "n/a",
        },
        {
          label: "Answered inside target",
          value: answered.length ? share(onTarget.length, answered.length) : "n/a",
        },
        {
          label: "Handled without a person",
          value: formatPct(AUTONOMY_RATE, 0),
          hint: "Routine enquiries closed by automation",
        },
      ],
    },
  ];

  return {
    definition,
    period: p,
    sections,
    recordCount: taken.length + leads.length,
    coverage: `Counted from ${count(taken.length, "reservation")} and ${count(leads.length, "enquiry", "enquiries")} dated between ${formatFullDate(p.from)} and ${formatFullDate(p.to)}.`,
  };
}

// ---------------------------------------------------------------------------
// Tax summary
// ---------------------------------------------------------------------------

/** The band a reservation falls into, decided on the rate actually sold (§34). */
const GST_BANDS = [
  { id: "low", label: "12% (up to ₹7,500 a night)", test: (b: Booking) => b.nightlyRate <= 750000 },
  { id: "high", label: "18% (above ₹7,500 a night)", test: (b: Booking) => b.nightlyRate > 750000 },
];

function renderTaxSummary(definition: ReportDefinition, p: ReportPeriod): RenderedReport {
  const taken = bookingsCreatedIn(p.from, p.to);
  const bands = GST_BANDS.map((band) => {
    const rows = taken.filter(band.test);
    return {
      band,
      rows,
      taxable: sum(rows.map((b) => b.subtotal)),
      tax: sum(rows.map((b) => b.taxes)),
    };
  }).filter((entry) => entry.rows.length > 0);

  const taxable = sum(taken.map((b) => b.subtotal));
  const tax = sum(taken.map((b) => b.taxes));

  const sections: ReportSection[] = [
    {
      id: "bands",
      title: "GST by band",
      note: "The band follows the nightly rate sold, so a discount that crosses the line moves the whole reservation.",
      empty: bands.length ? undefined : "No reservations were created in this period.",
      table: bands.length
        ? {
            columns: ["Band", "Reservations", "Taxable value", "GST"],
            numeric: [false, true, true, true],
            rows: bands.map((entry) => [
              entry.band.label,
              `${entry.rows.length}`,
              formatINR(entry.taxable),
              formatINR(entry.tax),
            ]),
            total: ["All bands", `${taken.length}`, formatINR(taxable), formatINR(tax)],
          }
        : undefined,
    },
    {
      id: "reconcile",
      title: "Reconciliation",
      lines: [
        { label: "Taxable value", value: formatINR(taxable) },
        { label: "GST collected", value: formatINR(tax) },
        { label: "Gross billed", value: formatINR(taxable + tax), emphasis: true },
        {
          label: "Collected from guests so far",
          value: formatINR(sum(taken.map((b) => b.amountPaid))),
          hint: "Balances are due at or before check-in",
        },
      ],
    },
    {
      id: "registration",
      title: "Registration",
      lines: [
        { label: "Property", value: HOTEL.name },
        { label: "GSTIN", value: HOTEL.gstin ?? "not recorded" },
        { label: "Place of supply", value: `${HOTEL.city}, ${HOTEL.state}` },
      ],
    },
  ];

  return {
    definition,
    period: p,
    sections,
    recordCount: taken.length,
    coverage: `Counted from ${count(taken.length, "reservation")} created between ${formatFullDate(p.from)} and ${formatFullDate(p.to)}. A working figure for the desk, not a filed return.`,
  };
}

// ---------------------------------------------------------------------------
// Response and SLA
// ---------------------------------------------------------------------------

function renderResponseSla(definition: ReportDefinition, p: ReportPeriod): RenderedReport {
  const leads = leadsCreatedIn(p.from, p.to);
  const answered = leads.filter((l) => l.firstResponseSec !== undefined);
  const onTarget = answered.filter((l) => (l.firstResponseSec ?? 0) <= SLA_TARGET_SEC);
  const slowest = [...answered].sort(
    (a, b) => (b.firstResponseSec ?? 0) - (a.firstResponseSec ?? 0),
  )[0];

  const byChannel = CHANNEL_ORDER.map((source) => {
    const rows = answered.filter((l) => l.source === source);
    return { source, rows };
  }).filter((entry) => entry.rows.length > 0);

  const byPerson = Object.entries(
    answered.reduce<Record<string, Lead[]>>((acc, lead) => {
      if (!lead.assigneeId) return acc;
      (acc[lead.assigneeId] ??= []).push(lead);
      return acc;
    }, {}),
  ).sort((a, b) => b[1].length - a[1].length);

  const sections: ReportSection[] = [
    {
      id: "headline",
      title: "First reply",
      note: `Target is ${formatDuration(SLA_TARGET_SEC)}. Automatic acknowledgements are not counted.`,
      lines: [
        {
          label: "Enquiries answered",
          value: `${answered.length} of ${leads.length}`,
          hint: leads.length ? share(answered.length, leads.length) : undefined,
        },
        {
          label: "Median first reply",
          value: answered.length
            ? formatDuration(median(answered.map((l) => l.firstResponseSec ?? 0)))
            : "n/a",
          emphasis: true,
        },
        {
          label: "Inside target",
          value: answered.length ? share(onTarget.length, answered.length) : "n/a",
          hint: answered.length ? `${answered.length - onTarget.length} missed` : undefined,
        },
        {
          label: "Slowest",
          value: slowest ? formatDuration(slowest.firstResponseSec ?? 0) : "n/a",
          hint: slowest ? `${slowest.reference} on ${LEAD_SOURCE[slowest.source].label}` : undefined,
        },
      ],
    },
    {
      id: "channel",
      title: "By channel",
      empty: byChannel.length ? undefined : "No enquiry in this period has been replied to yet.",
      table: byChannel.length
        ? {
            columns: ["Channel", "Answered", "Median", "Inside target"],
            numeric: [false, true, true, true],
            rows: byChannel.map((entry) => [
              LEAD_SOURCE[entry.source].label,
              `${entry.rows.length}`,
              formatDuration(median(entry.rows.map((l) => l.firstResponseSec ?? 0))),
              share(
                entry.rows.filter((l) => (l.firstResponseSec ?? 0) <= SLA_TARGET_SEC).length,
                entry.rows.length,
              ),
            ]),
          }
        : undefined,
    },
    {
      id: "person",
      title: "By person",
      note: "Credited to whoever the enquiry is assigned to now, which is not always who typed the first reply.",
      empty: byPerson.length ? undefined : "No answered enquiry in this period carries an owner.",
      table: byPerson.length
        ? {
            columns: ["Colleague", "Replies", "Median", "Inside target"],
            numeric: [false, true, true, true],
            rows: byPerson.map(([id, rows]) => [
              TEAM_BY_ID[id]?.name ?? "Unassigned",
              `${rows.length}`,
              formatDuration(median(rows.map((l) => l.firstResponseSec ?? 0))),
              share(
                rows.filter((l) => (l.firstResponseSec ?? 0) <= SLA_TARGET_SEC).length,
                rows.length,
              ),
            ]),
          }
        : undefined,
    },
  ];

  return {
    definition,
    period: p,
    sections,
    recordCount: leads.length,
    coverage: `Counted from ${count(leads.length, "enquiry", "enquiries")} created between ${formatFullDate(p.from)} and ${formatFullDate(p.to)}, of which ${answered.length} ${answered.length === 1 ? "has" : "have"} had a reply written.`,
  };
}

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

const RENDERERS: Record<
  string,
  (definition: ReportDefinition, period: ReportPeriod) => RenderedReport
> = {
  rep_daily_ops: renderDailyOps,
  rep_weekly_commercial: renderWeeklyCommercial,
  rep_monthly_performance: renderMonthlyPerformance,
  rep_gst_summary: renderTaxSummary,
  rep_response_sla: renderResponseSla,
};

export interface ReportEntry {
  definition: ReportDefinition;
  periods: ReportPeriod[];
  /** One finished sheet per period, keyed by period id. */
  renders: Record<string, RenderedReport>;
}

export interface ReportsView {
  entries: ReportEntry[];
  schedules: ReportSchedule[];
  property: string;
  /** Properties the reports could be scoped to, and which of them hold records. */
  scopes: { id: string; name: string; hasRecords: boolean }[];
}

/**
 * Every report, over every period it can be run for, rendered up front.
 *
 * Ten sheets is a small enough payload to hand over whole, and doing so keeps
 * the whole of `data/` on the server where the rest of this application keeps
 * it. Against a warehouse this becomes one query per selection.
 */
export function getReportsView(): ReportsView {
  const entries = REPORT_DEFINITIONS.map((definition) => {
    const periods = periodsFor(definition.cadence);
    const render = RENDERERS[definition.id];
    return {
      definition,
      periods,
      renders: Object.fromEntries(periods.map((p) => [p.id, render(definition, p)])),
    };
  });

  return {
    entries,
    schedules: REPORT_SCHEDULES,
    property: HOTEL.name,
    // The second property is real in the switcher and empty in the ledger.
    // Listing it with that fact attached is more useful than hiding it and
    // letting somebody assume the reports cover the whole group.
    scopes: PROPERTIES.map((p) => ({ id: p.id, name: p.name, hasRecords: p.id === HOTEL.id })),
  };
}
