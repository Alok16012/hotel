import type { RolePermission, TeamMember } from "@/types";

export const TEAM: TeamMember[] = [
  {
    id: "tm_owner",
    name: "Vikram Nair",
    role: "owner",
    email: "vikram@grandmeridian.in",
    phone: "+91 98450 11020",
    shift: "morning",
    shiftStart: "09:00",
    shiftEnd: "18:00",
    status: "available",
    assignedLeadCount: 0,
    medianResponseSec: 0,
    slaComplianceRate: 1,
    conversionRate: 0,
    avatarInitials: "VN",
  },
  {
    id: "tm_manager",
    name: "Anjali Deshpande",
    role: "manager",
    email: "anjali@grandmeridian.in",
    phone: "+91 98451 33104",
    shift: "morning",
    shiftStart: "08:00",
    shiftEnd: "17:00",
    status: "busy",
    assignedLeadCount: 6,
    medianResponseSec: 540,
    slaComplianceRate: 0.94,
    conversionRate: 0.52,
    avatarInitials: "AD",
  },
  {
    id: "tm_reservations",
    name: "Sneha Iyer",
    role: "reservations",
    email: "sneha@grandmeridian.in",
    phone: "+91 98452 77815",
    shift: "morning",
    shiftStart: "07:00",
    shiftEnd: "15:00",
    status: "available",
    assignedLeadCount: 14,
    medianResponseSec: 420,
    slaComplianceRate: 0.91,
    conversionRate: 0.44,
    avatarInitials: "SI",
  },
  {
    id: "tm_reception",
    name: "Karthik Reddy",
    role: "reception",
    email: "karthik@grandmeridian.in",
    phone: "+91 98453 20647",
    shift: "afternoon",
    shiftStart: "15:00",
    shiftEnd: "23:00",
    status: "on_call",
    assignedLeadCount: 9,
    medianResponseSec: 780,
    slaComplianceRate: 0.83,
    conversionRate: 0.36,
    avatarInitials: "KR",
  },
  {
    id: "tm_sales",
    name: "Meera Krishnan",
    role: "sales",
    email: "meera@grandmeridian.in",
    phone: "+91 98454 91238",
    shift: "morning",
    shiftStart: "09:30",
    shiftEnd: "18:30",
    status: "busy",
    assignedLeadCount: 11,
    medianResponseSec: 360,
    slaComplianceRate: 0.96,
    conversionRate: 0.58,
    avatarInitials: "MK",
  },
  {
    id: "tm_telecaller",
    name: "Arjun Pillai",
    role: "sales",
    email: "arjun@grandmeridian.in",
    phone: "+91 98455 60492",
    shift: "afternoon",
    shiftStart: "12:00",
    shiftEnd: "21:00",
    status: "available",
    assignedLeadCount: 7,
    medianResponseSec: 960,
    slaComplianceRate: 0.76,
    conversionRate: 0.31,
    avatarInitials: "AP",
  },
  {
    id: "tm_night",
    name: "Fatima Sheikh",
    role: "reception",
    email: "fatima@grandmeridian.in",
    phone: "+91 98456 18375",
    shift: "night",
    shiftStart: "23:00",
    shiftEnd: "07:00",
    status: "offline",
    assignedLeadCount: 3,
    medianResponseSec: 1320,
    slaComplianceRate: 0.71,
    conversionRate: 0.28,
    avatarInitials: "FS",
  },
];

export const TEAM_BY_ID = Object.fromEntries(TEAM.map((m) => [m.id, m])) as Record<
  string,
  TeamMember
>;

/**
 * Who is "signed in" for this demo. The owner persona is the default because
 * the Command Center is written for them (§39 step 1). Swapping this id is the
 * single seam a real auth layer plugs into.
 */
export const CURRENT_USER_ID = "tm_manager";

export const CURRENT_USER = TEAM_BY_ID[CURRENT_USER_ID];

export const ROLE_LABEL: Record<TeamMember["role"], string> = {
  owner: "Owner",
  manager: "General Manager",
  reception: "Reception",
  reservations: "Reservations",
  sales: "Sales",
  accountant: "Accounts",
};

export const SHIFT_LABEL: Record<TeamMember["shift"], string> = {
  morning: "Morning shift",
  afternoon: "Afternoon shift",
  night: "Night shift",
  off: "Off duty",
};

/**
 * What each role is allowed to do (§40).
 *
 * Written as capabilities rather than as screens, because a hotel does not
 * think in routes. "Can Karthik take a payment at eleven at night" is the
 * question; which page the form happens to live on is not.
 *
 * The discount ceilings are deliberately absent from this list. They live once
 * in `DISCOUNT_AUTHORITY` in `data/pricing.ts`, where the quote simulator and
 * the exception queue already read them, and the team screen shows the same
 * figures rather than a second copy that can drift.
 */
export const ROLE_PERMISSIONS: RolePermission[] = [
  {
    id: "perm_reply",
    label: "Answer enquiries",
    description: "Reply on any channel and move an enquiry through the pipeline.",
    granted: ["owner", "manager", "reservations", "sales", "reception"],
  },
  {
    id: "perm_quote",
    label: "Send a quote",
    description: "Build and send a priced quote inside the published rate floor.",
    granted: ["owner", "manager", "reservations", "sales"],
    needsApproval: ["reception"],
  },
  {
    id: "perm_book",
    label: "Confirm a booking",
    description: "Hold inventory and turn a quote into a confirmed reservation.",
    granted: ["owner", "manager", "reservations", "reception"],
    needsApproval: ["sales"],
  },
  {
    id: "perm_payment",
    label: "Record a payment",
    description: "Log an advance, a balance or a settlement against a booking.",
    granted: ["owner", "manager", "accountant", "reception"],
  },
  {
    id: "perm_refund",
    label: "Cancel or refund",
    description: "Cancel a confirmed booking and release money already taken.",
    granted: ["owner", "manager"],
    needsApproval: ["accountant", "reception"],
  },
  {
    id: "perm_rates",
    label: "Change published rates",
    description: "Edit the rate calendar or the seasonal rules that drive it.",
    granted: ["owner", "manager"],
    needsApproval: ["reservations"],
  },
  {
    id: "perm_inventory",
    label: "Block or release rooms",
    description: "Take rooms out of sale for maintenance, groups or an owner hold.",
    granted: ["owner", "manager", "reservations"],
  },
  {
    id: "perm_automation",
    label: "Edit automation rules",
    description: "Decide which enquiries the software may answer without a person.",
    granted: ["owner"],
    needsApproval: ["manager"],
  },
  {
    id: "perm_team",
    label: "Add or remove colleagues",
    description: "Invite a new member, change a role, or revoke access.",
    granted: ["owner"],
  },
  {
    id: "perm_reports",
    label: "See revenue reporting",
    description: "Open the analytics screens and export commercial reports.",
    granted: ["owner", "manager", "accountant"],
  },
];
