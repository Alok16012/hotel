/**
 * The standing report library (§22).
 *
 * Five reports, not fifty. A library that lists everything a database could
 * group by is a menu nobody reads; these are the five sheets a property of
 * this size actually circulates, each with one audience and one decision
 * behind it.
 *
 * `answers` is the field that keeps a report honest. A report that cannot
 * name the questions it settles is a table looking for a reason, and the
 * library shows those questions before it shows a single figure.
 *
 * The schedules below are seeded delivery instructions. They are editable on
 * screen and they send nothing: there is no mail service in this build, and
 * the Integrations screen says so in the same words.
 */

import type { ReportDefinition, ReportSchedule } from "@/types";

export const REPORT_DEFINITIONS: ReportDefinition[] = [
  {
    id: "rep_daily_ops",
    name: "Daily operations",
    cadence: "daily",
    audience: "Reception and the duty manager",
    summary:
      "The shape of one day: who arrives, who leaves, what came in and what is still owed a reply at the end of it.",
    answers: [
      "How many rooms are occupied tonight",
      "Which enquiries came in and how fast they were answered",
      "What is still unanswered when the shift changes",
    ],
    sourceNote:
      "Counted from the reservation ledger and the enquiry inbox. Nothing on this sheet is typed in by hand.",
  },
  {
    id: "rep_weekly_commercial",
    name: "Weekly commercial",
    cadence: "weekly",
    audience: "General manager and sales",
    summary:
      "Where the week's enquiries came from, what share of them turned into a reservation, and what the discounting cost.",
    answers: [
      "Which channel is worth the effort this week",
      "What was lost and for what reason",
      "How much was given away below rack rate",
    ],
    sourceNote:
      "Conversion is measured on enquiries created in the period, so a late booking against an older enquiry is credited to the week the enquiry arrived.",
  },
  {
    id: "rep_monthly_performance",
    name: "Monthly performance",
    cadence: "monthly",
    audience: "Owner",
    summary:
      "The month against the one before it: revenue, average rate, channel mix, repeat guests and how quickly the desk replied.",
    answers: [
      "Is revenue moving, and on rate or on volume",
      "How much of the month came through channels that charge commission",
      "Whether service held up as volume changed",
    ],
    sourceNote:
      "Compared against the same length of time immediately before. Where the ledger does not reach that far back, the comparison is withheld rather than estimated.",
  },
  {
    id: "rep_gst_summary",
    name: "Tax summary",
    cadence: "monthly",
    audience: "Accounts",
    summary:
      "Taxable value and GST split by the rate band each reservation falls into, ready to sit beside the return.",
    answers: [
      "How much GST was collected at each band",
      "Which reservations crossed the 7,500 a night line",
      "What the gross figure reconciles to",
    ],
    sourceNote:
      "Banded on the nightly rate actually sold: 12 per cent up to 7,500 a night, 18 per cent above it. This is a working figure for the desk, not a filed return.",
  },
  {
    id: "rep_response_sla",
    name: "Response and SLA",
    cadence: "weekly",
    audience: "General manager",
    summary:
      "First reply times by channel and by person, against the thirty minute target, with the slowest case named.",
    answers: [
      "Which channel is being left waiting",
      "Who is carrying the replies and how fast they are",
      "Where the target was missed and by how much",
    ],
    sourceNote:
      "Measured on the first reply a colleague wrote. Automatic acknowledgements are excluded, or the median would report how fast the software is rather than how fast the desk is.",
  },
];

export const REPORT_BY_ID: Record<string, ReportDefinition> = Object.fromEntries(
  REPORT_DEFINITIONS.map((report) => [report.id, report]),
);

/**
 * Who currently receives what.
 *
 * Deliberately not one schedule per report. The tax summary goes out on the
 * first of the month and nobody has asked for the SLA sheet to be pushed at
 * all, which is the normal state of affairs at a property this size and more
 * informative than five tidy rows.
 */
export const REPORT_SCHEDULES: ReportSchedule[] = [
  {
    id: "sch_daily_ops",
    reportId: "rep_daily_ops",
    enabled: true,
    sendAt: "07:30",
    channel: "email",
    recipients: ["reception@grandmeridian.in", "anjali@grandmeridian.in"],
  },
  {
    id: "sch_daily_ops_wa",
    reportId: "rep_daily_ops",
    enabled: true,
    sendAt: "21:00",
    channel: "whatsapp",
    recipients: ["Duty manager group"],
  },
  {
    id: "sch_weekly_commercial",
    reportId: "rep_weekly_commercial",
    enabled: true,
    sendAt: "09:00",
    dayLabel: "Monday",
    channel: "email",
    recipients: ["anjali@grandmeridian.in", "meera@grandmeridian.in"],
  },
  {
    id: "sch_monthly_performance",
    reportId: "rep_monthly_performance",
    enabled: true,
    sendAt: "08:00",
    dayLabel: "1st of the month",
    channel: "email",
    recipients: ["vikram@grandmeridian.in", "anjali@grandmeridian.in"],
  },
  {
    id: "sch_gst_summary",
    reportId: "rep_gst_summary",
    enabled: false,
    sendAt: "10:00",
    dayLabel: "1st of the month",
    channel: "email",
    recipients: ["accounts@grandmeridian.in"],
  },
];
