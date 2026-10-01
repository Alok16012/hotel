import {
  BarChart3,
  Bed,
  CalendarCheck,
  CalendarClock,
  FileText,
  Gauge,
  GitBranch,
  Inbox,
  Plug,
  Settings,
  ShieldAlert,
  Tags,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Short description used by the command palette, not the sidebar. */
  description: string;
  /** Matched against pathname for the active state. */
  matchPrefix?: string;
  badgeKey?: "leadsNeedingReply" | "followUpsDue" | "openExceptions";
  badgeIntent?: "neutral" | "caution" | "critical";
}

export interface NavSection {
  id: string;
  label: string;
  items: NavItem[];
}

/**
 * Section order is deliberate and follows the operational day: see what is
 * happening, work the leads, run the property, then study and configure.
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    id: "overview",
    label: "Overview",
    items: [
      {
        href: "/dashboard",
        label: "Command Center",
        icon: Gauge,
        description: "Live commercial and guest operations overview",
      },
    ],
  },
  {
    id: "sales",
    label: "Sales",
    items: [
      {
        href: "/leads",
        label: "Leads",
        icon: Inbox,
        description: "Unified enquiry inbox across every channel",
        badgeKey: "leadsNeedingReply",
        badgeIntent: "caution",
      },
      {
        href: "/pipeline",
        label: "Pipeline",
        icon: GitBranch,
        description: "Deal stages from enquiry to confirmed booking",
      },
      {
        href: "/follow-ups",
        label: "Follow-ups",
        icon: CalendarClock,
        description: "Scheduled and automated guest follow-ups",
        badgeKey: "followUpsDue",
        badgeIntent: "neutral",
      },
      {
        href: "/guests",
        label: "Guests",
        icon: Users,
        description: "Guest profiles, stay history and lifetime value",
        matchPrefix: "/guests",
      },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    items: [
      {
        href: "/bookings",
        label: "Bookings",
        icon: CalendarCheck,
        description: "Confirmed reservations, arrivals and departures",
      },
      {
        href: "/availability",
        label: "Availability",
        icon: Bed,
        description: "Room inventory across dates and categories",
      },
      {
        href: "/pricing",
        label: "Pricing",
        icon: Tags,
        description: "Rate cards, discount rules and approval floors",
      },
      {
        href: "/exceptions",
        label: "Exceptions",
        icon: ShieldAlert,
        description: "Decisions that require human judgement",
        badgeKey: "openExceptions",
        badgeIntent: "critical",
      },
    ],
  },
  {
    id: "intelligence",
    label: "Intelligence",
    items: [
      {
        href: "/analytics",
        label: "Analytics",
        icon: BarChart3,
        description: "Conversion, revenue, channel and staff performance",
      },
      {
        href: "/reports",
        label: "Reports",
        icon: FileText,
        description: "Scheduled operational and commercial reports",
      },
    ],
  },
  {
    id: "system",
    label: "System",
    items: [
      {
        href: "/team",
        label: "Team",
        icon: UsersRound,
        description: "Roles, shifts and response performance",
      },
      {
        href: "/integrations",
        label: "Integrations",
        icon: Plug,
        description: "Channel and platform connections",
      },
      {
        href: "/settings",
        label: "Settings",
        icon: Settings,
        description: "Property profile, policies and automation",
      },
    ],
  },
];

export const ALL_NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((s) => s.items);

/** Longest-prefix match, so /guests/g_04 keeps "Guests" lit. */
export function findActiveNavItem(pathname: string): NavItem | undefined {
  let best: NavItem | undefined;
  for (const item of ALL_NAV_ITEMS) {
    const prefix = item.matchPrefix ?? item.href;
    const matches = pathname === prefix || pathname.startsWith(`${prefix}/`);
    if (matches && (!best || prefix.length > (best.matchPrefix ?? best.href).length)) {
      best = item;
    }
  }
  return best;
}
