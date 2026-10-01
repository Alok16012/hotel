/**
 * The service boundary.
 *
 * Every screen in this build reads its data from one seeded process, which is
 * convenient and completely unlike the thing it is standing in for. A real
 * property's records live behind a network call that can be slow, can fail,
 * and can answer a page in a different order than it was asked. Code written
 * against synchronous constants tends to assume none of that, and the
 * assumption is invisible until the day it is wrong.
 *
 * So this file states the contract the screens are actually written against:
 * every method is async, every method can be awaited, and nothing above this
 * line knows where the answer came from. `mockService` below satisfies it out
 * of the seed. A Supabase implementation would satisfy it out of Postgres, and
 * no page, component or view model would change.
 *
 * What belongs here
 * -----------------
 * The reads a route performs to render itself. One method per view function,
 * at the granularity the pages already use, so the boundary is a description of
 * what the product fetches rather than a new abstraction over it.
 *
 * What deliberately does not
 * --------------------------
 * Derivations over data already in hand: `dayBookRange(rows)` and
 * `summariseDirectory(rows)` take rows that were fetched a line earlier and do
 * arithmetic on them. Routing them through a service would imply a second
 * round trip that will never exist.
 *
 * Nor the handful of accessors the app shell calls from client components:
 * `getNavCounts`, `getAutomationStatus`, `getCurrentUser` in the sidebar
 * footer, `getProperties` in the property switcher, `simulateQuote` in the
 * pricing simulator. Those stay on the synchronous repository, because making
 * them async would push a fetch into the render path of chrome that is meant
 * to be immediate. When a backend lands they become part of the layout's
 * server-side fetch and are handed down as props.
 */

import type {
  AnalyticsRange,
  AnalyticsView,
} from "@/lib/analytics";
import type { FloorMap, InventoryMatrix, RateCalendar } from "@/lib/availability";
import type { BookingRow, DayBookRange } from "@/lib/bookings";
import type { ExceptionRow } from "@/lib/exceptions";
import type { FollowUpRow } from "@/lib/followups";
import type { DirectorySummary, GuestProfile, GuestRow } from "@/lib/guests";
import type { IntegrationsView } from "@/lib/integrations";
import type { LeadDetail, LeadRow } from "@/lib/leads";
import * as repository from "@/lib/repository";
import type { ReportsView } from "@/lib/reports";
import type { SettingsView } from "@/lib/settings";
import type { TeamView } from "@/lib/team";
import type {
  AutomationMode,
  Booking,
  CancellationPolicy,
  ChannelPerformance,
  DashboardMetric,
  DiscountAuthority,
  EventRecord,
  ExceptionItem,
  Guest,
  Hotel,
  InventoryBlock,
  PricingRule,
  ResponsePerformance,
  RevenueOpportunity,
  RoomType,
  TeamMember,
} from "@/types";

export interface HotelService {
  // The property and the people working in it.
  getHotel(id?: string): Promise<Hotel>;
  getTeam(): Promise<TeamMember[]>;
  getCurrentUser(): Promise<TeamMember>;
  getRoomTypes(): Promise<RoomType[]>;

  // Command Center. Ten reads because the screen answers ten questions; a
  // composite method would only hide that from whoever has to make it fast.
  getDashboardMetrics(): Promise<DashboardMetric[]>;
  getRevenueOpportunity(): Promise<RevenueOpportunity>;
  getOpenExceptions(): Promise<ExceptionItem[]>;
  getResponsePerformance(): Promise<ResponsePerformance>;
  getChannelPerformance(): Promise<ChannelPerformance[]>;
  getEventsToday(limit?: number): Promise<EventRecord[]>;
  getArrivalsToday(): Promise<Booking[]>;
  getDeparturesToday(): Promise<Booking[]>;
  getInHouse(): Promise<Booking[]>;
  getGuests(): Promise<Guest[]>;

  // Enquiries, and the two queues that come out of them.
  getLeadRows(): Promise<LeadRow[]>;
  getLeadDetails(): Promise<Record<string, LeadDetail>>;
  getFollowUpRows(): Promise<FollowUpRow[]>;
  getExceptionRows(): Promise<ExceptionRow[]>;

  /** One automation rule's mode, which is what sets the queue's chase limit. */
  getAutomationMode(ruleId: string): Promise<AutomationMode>;

  // Bookings and guests.
  getBookingRows(): Promise<BookingRow[]>;
  getCancellationPolicy(): Promise<CancellationPolicy>;
  getGuestRows(): Promise<GuestRow[]>;
  getGuestProfile(id: string): Promise<GuestProfile | undefined>;

  // Inventory and rates.
  getInventoryMatrix(): Promise<InventoryMatrix>;
  getFloorMap(): Promise<FloorMap>;
  getInventoryBlocks(): Promise<InventoryBlock[]>;
  getRateCalendar(): Promise<RateCalendar>;
  getPricingRules(): Promise<PricingRule[]>;
  getDiscountAuthority(): Promise<DiscountAuthority[]>;

  // Screens that are fetched whole, because half of one is not readable.
  getAnalytics(range: AnalyticsRange): Promise<AnalyticsView>;
  getIntegrationsView(): Promise<IntegrationsView>;
  getReportsView(): Promise<ReportsView>;
  getSettingsView(): Promise<SettingsView>;
  getTeamView(): Promise<TeamView>;
}

/**
 * The seeded implementation.
 *
 * Every method resolves immediately. It does not pretend to be slow, because a
 * fake delay in a demo is a lie told to the person using it and a nuisance to
 * everyone developing against it. What it does provide is the shape: each call
 * is a promise, so a screen that forgets to await one fails here rather than in
 * production.
 */
export const mockService: HotelService = {
  getHotel: async (id) => repository.getHotel(id),
  getTeam: async () => repository.getTeam(),
  getCurrentUser: async () => repository.getCurrentUser(),
  getRoomTypes: async () => repository.getRoomTypes(),

  getDashboardMetrics: async () => repository.getDashboardMetrics(),
  getRevenueOpportunity: async () => repository.getRevenueOpportunity(),
  getOpenExceptions: async () => repository.getOpenExceptions(),
  getResponsePerformance: async () => repository.getResponsePerformance(),
  getChannelPerformance: async () => repository.getChannelPerformance(),
  getEventsToday: async (limit) => repository.getEventsToday(limit),
  getArrivalsToday: async () => repository.getArrivalsToday(),
  getDeparturesToday: async () => repository.getDeparturesToday(),
  getInHouse: async () => repository.getInHouse(),
  getGuests: async () => repository.getGuests(),

  getLeadRows: async () => repository.getLeadRows(),
  getLeadDetails: async () => repository.getLeadDetails(),
  getFollowUpRows: async () => repository.getFollowUpRows(),
  getExceptionRows: async () => repository.getExceptionRows(),
  getAutomationMode: async (ruleId) => repository.getAutomationMode(ruleId),

  getBookingRows: async () => repository.getBookingRows(),
  getCancellationPolicy: async () => repository.getCancellationPolicy(),
  getGuestRows: async () => repository.getGuestRows(),
  getGuestProfile: async (id) => repository.getGuestProfile(id),

  getInventoryMatrix: async () => repository.getInventoryMatrix(),
  getFloorMap: async () => repository.getFloorMap(),
  getInventoryBlocks: async () => repository.getInventoryBlocks(),
  getRateCalendar: async () => repository.getRateCalendar(),
  getPricingRules: async () => repository.getPricingRules(),
  getDiscountAuthority: async () => repository.getDiscountAuthority(),

  getAnalytics: async (range) => repository.getAnalytics(range),
  getIntegrationsView: async () => repository.getIntegrationsView(),
  getReportsView: async () => repository.getReportsView(),
  getSettingsView: async () => repository.getSettingsView(),
  getTeamView: async () => repository.getTeamView(),
};

/**
 * The one place an implementation is chosen.
 *
 * A function rather than a bare export, so the day a real one exists the swap
 * is a branch here and not fifteen changed imports. Pages call `service()` at
 * the top of the render and await what they need.
 */
export function service(): HotelService {
  return mockService;
}

/** Re-exported so callers do not need a second import for the pure helpers. */
export { dayBookRange, summariseDirectory } from "@/lib/repository";
export type { DayBookRange, DirectorySummary };
