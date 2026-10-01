/**
 * The desk, as people rather than as a list of rows (§40).
 *
 * Two different kinds of number meet on this screen and they must not be
 * allowed to blur into each other. The workload figures are counted from the
 * live inbox right now: how many enquiries are open on someone's name, how many
 * of those are waiting on a reply, what is due today. The performance figures
 * are a trailing measurement over the last thirty days, and they do not change
 * when a lead is reassigned this morning.
 *
 * Every row therefore carries both, labelled, and the screen says which is
 * which. A manager comparing a colleague's live queue against their monthly
 * conversion rate is comparing two windows; the interface should make that
 * obvious rather than leave it to be discovered.
 */

import { OPEN_EXCEPTIONS } from "@/data/exceptions";
import { FOLLOW_UPS } from "@/data/followups";
import { AUTHORITY_BY_ROLE, DISCOUNT_AUTHORITY } from "@/data/pricing";
import { ROLE_LABEL, ROLE_PERMISSIONS, SHIFT_LABEL, TEAM } from "@/data/team";
import { DEMO_NOW } from "@/lib/clock";
import {
  AWAITING_REPLY,
  BREACHED_LEADS,
  OPEN_LEADS,
  SLA_TARGET_SEC,
  leadValue,
} from "@/lib/metrics";
import type { DiscountAuthority, Paise, RolePermission, TeamMember, TeamRole } from "@/types";

// ---------------------------------------------------------------------------
// Directory rows
// ---------------------------------------------------------------------------

export interface TeamRow {
  member: TeamMember;
  roleLabel: string;
  shiftLabel: string;
  /** "08:00 to 17:00", formed once here rather than in three components. */
  shiftWindow: string;
  /**
   * Whether the clock says this person is inside their shift.
   *
   * Presence and shift are different facts and the seed keeps them apart on
   * purpose: someone can be marked available while off shift, or offline in the
   * middle of one. Where they disagree, the row says so instead of picking a
   * winner.
   */
  onShift: boolean;
  presenceLabel: string;

  // --- Live queue, counted from the inbox as it stands -----------------------
  openLeads: number;
  awaitingReply: number;
  breached: number;
  followUpsToday: number;
  openExceptions: number;
  /** Value of the open enquiries on this person's name. */
  pipelineValue: Paise;

  // --- Trailing thirty days, read from the measurement --------------------
  medianResponseSec: number;
  slaComplianceRate: number;
  conversionRate: number;
  handledLeadCount: number;

  /** What this person can discount alone, and who it goes to beyond that. */
  authority?: DiscountAuthority;
  /** The escalation target as it reads inside a sentence, article and all. */
  escalatesToLabel?: string;
}

/**
 * Role names shaped to sit inside a sentence rather than head a column.
 *
 * "It goes to the Reservations" is not English. Two of these roles are
 * departments and take no article, the rest are posts held by one person and
 * do, so the phrasing is stored rather than assembled from the display label.
 */
const ESCALATION_TARGET: Record<TeamRole, string> = {
  owner: "the owner",
  manager: "the general manager",
  reception: "reception",
  reservations: "reservations",
  sales: "sales",
  accountant: "accounts",
};

const PRESENCE_LABEL: Record<TeamMember["status"], string> = {
  available: "Available",
  busy: "On a call",
  on_call: "On call",
  offline: "Offline",
};

/** "08:00" as minutes past midnight. */
function minutesOfDay(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Whether the demo clock falls inside a shift, including the ones that wrap.
 *
 * The night shift runs 23:00 to 07:00, which is not a range in the arithmetic
 * sense. Treating it as one would mark Fatima on duty for the sixteen hours she
 * is asleep, so a wrapping window is tested as two.
 */
function isOnShift(member: TeamMember, nowMinutes: number): boolean {
  if (member.shift === "off") return false;
  const start = minutesOfDay(member.shiftStart);
  const end = minutesOfDay(member.shiftEnd);
  return start <= end
    ? nowMinutes >= start && nowMinutes < end
    : nowMinutes >= start || nowMinutes < end;
}

export function getTeamRows(): TeamRow[] {
  const nowMinutes = DEMO_NOW.getHours() * 60 + DEMO_NOW.getMinutes();
  const dueCutoff = DEMO_NOW.getTime() + 24 * 3600 * 1000;

  return TEAM.map((member) => {
    const mine = OPEN_LEADS.filter((lead) => lead.assigneeId === member.id);
    const authority = AUTHORITY_BY_ROLE[member.role];

    return {
      member,
      roleLabel: ROLE_LABEL[member.role],
      shiftLabel: SHIFT_LABEL[member.shift],
      shiftWindow: `${member.shiftStart} to ${member.shiftEnd}`,
      onShift: isOnShift(member, nowMinutes),
      presenceLabel: PRESENCE_LABEL[member.status],

      openLeads: mine.length,
      awaitingReply: AWAITING_REPLY.filter((lead) => lead.assigneeId === member.id).length,
      breached: BREACHED_LEADS.filter((lead) => lead.assigneeId === member.id).length,
      followUpsToday: FOLLOW_UPS.filter(
        (followUp) =>
          followUp.ownerId === member.id &&
          (followUp.status === "pending" || followUp.status === "overdue") &&
          new Date(followUp.dueAt).getTime() <= dueCutoff,
      ).length,
      openExceptions: OPEN_EXCEPTIONS.filter((item) => item.assigneeId === member.id).length,
      pipelineValue: mine.reduce((total, lead) => total + leadValue(lead), 0),

      medianResponseSec: member.medianResponseSec,
      slaComplianceRate: member.slaComplianceRate,
      conversionRate: member.conversionRate,
      handledLeadCount: member.assignedLeadCount,

      authority,
      escalatesToLabel: authority?.escalatesTo
        ? ESCALATION_TARGET[authority.escalatesTo]
        : undefined,
    };
  });
}

// ---------------------------------------------------------------------------
// The screen
// ---------------------------------------------------------------------------

export interface TeamSummary {
  total: number;
  onShift: number;
  /** Open enquiries with nobody's name on them, which is the actionable gap. */
  unassigned: number;
  /** Everyone with at least one enquiry past the reply target. */
  membersBreaching: number;
  slaTargetSec: number;
  /** The fastest and the slowest median on the desk, for the spread. */
  fastestSec: number;
  slowestSec: number;
}

export interface TeamView {
  rows: TeamRow[];
  summary: TeamSummary;
  permissions: RolePermission[];
  authority: DiscountAuthority[];
  roleLabels: Record<TeamRole, string>;
  /** The order the permission matrix puts its columns in: least authority to most. */
  roleOrder: TeamRole[];
}

export function getTeamView(): TeamView {
  const rows = getTeamRows();

  // The owner has no measured response time, so including their zero would
  // report the desk as instantaneous. Only people who actually answer
  // enquiries count toward the spread.
  const measured = rows.filter((row) => row.medianResponseSec > 0);

  return {
    rows,
    summary: {
      total: rows.length,
      onShift: rows.filter((row) => row.onShift).length,
      unassigned: OPEN_LEADS.filter((lead) => !lead.assigneeId).length,
      membersBreaching: rows.filter((row) => row.breached > 0).length,
      slaTargetSec: SLA_TARGET_SEC,
      fastestSec: measured.length ? Math.min(...measured.map((r) => r.medianResponseSec)) : 0,
      slowestSec: measured.length ? Math.max(...measured.map((r) => r.medianResponseSec)) : 0,
    },
    permissions: ROLE_PERMISSIONS,
    authority: DISCOUNT_AUTHORITY,
    roleLabels: ROLE_LABEL,
    // Ascending authority, so the matrix reads left to right as trust rising
    // and the ticks form a staircase rather than a scatter.
    roleOrder: ["reception", "accountant", "reservations", "sales", "manager", "owner"],
  };
}
