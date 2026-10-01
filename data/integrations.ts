/**
 * The services this product would sit between (§41).
 *
 * Every entry here is either `demo` or `not_connected`, and that is a fact
 * about this build rather than an oversight. Nothing in this repository opens a
 * socket to WhatsApp, Booking.com, Razorpay or anything else. The enquiry
 * channels are marked `demo` because seeded records stand in for what they
 * would deliver and the rest of the product reads those records as if they had
 * arrived; the services with nothing to stand in for are marked
 * `not_connected` and say so.
 *
 * `standIn` is the field that keeps this honest. It states, per service, what
 * is actually happening instead, so a card can never be read as a working
 * connection with an unlucky status label.
 */

import type { Integration } from "@/types";

export const INTEGRATIONS: Integration[] = [
  // --- Enquiry channels ----------------------------------------------------
  {
    id: "int_whatsapp",
    name: "WhatsApp Business",
    vendor: "Meta",
    category: "channel",
    state: "demo",
    source: "whatsapp",
    summary: "The channel most enquiries arrive on, and the one guests expect a reply on.",
    syncs: [
      { direction: "in", label: "Incoming messages, media and delivery receipts" },
      { direction: "out", label: "Replies, quotes and payment links sent from the inbox" },
      { direction: "in", label: "Contact profile name and phone number" },
    ],
    standIn:
      "Seeded conversations. Sending a reply in this build updates the thread on screen and nothing leaves the browser.",
    credentials: ["Phone number ID", "Permanent access token", "App secret"],
    webhookPath: "/webhooks/whatsapp",
  },
  {
    id: "int_website",
    name: "Website enquiry form",
    vendor: "Grand Meridian site",
    category: "channel",
    state: "demo",
    source: "website",
    summary: "The booking form and the callback request on the property's own pages.",
    syncs: [
      { direction: "in", label: "Form submissions with dates, guest count and message" },
      { direction: "in", label: "Page and campaign the enquiry came from" },
    ],
    standIn: "Seeded enquiries carrying the same fields the form would post.",
    credentials: ["Form endpoint secret"],
    webhookPath: "/webhooks/website-form",
  },
  {
    id: "int_phone",
    name: "Call tracking",
    vendor: "Exotel",
    category: "channel",
    state: "demo",
    source: "phone",
    summary: "Numbers on listings and ads, so a call becomes a record rather than a memory.",
    syncs: [
      { direction: "in", label: "Call start, duration, outcome and recording link" },
      { direction: "in", label: "Missed calls outside desk hours" },
      { direction: "out", label: "Click to call from a lead record" },
    ],
    standIn:
      "Seeded call enquiries with durations and outcomes. No number is dialled from this build.",
    credentials: ["Account SID", "API token", "Virtual number"],
    webhookPath: "/webhooks/calls",
  },
  {
    id: "int_email",
    name: "Reservations mailbox",
    vendor: "Google Workspace",
    category: "channel",
    state: "demo",
    source: "email",
    summary: "The reservations address, read into the same inbox as every other channel.",
    syncs: [
      { direction: "in", label: "Incoming mail, threaded by conversation" },
      { direction: "out", label: "Replies and quote attachments sent as the property" },
    ],
    standIn: "Seeded email threads. Nothing is fetched and nothing is sent.",
    credentials: ["OAuth client ID", "Client secret", "Mailbox address"],
  },
  {
    id: "int_instagram",
    name: "Instagram",
    vendor: "Meta",
    category: "channel",
    state: "demo",
    source: "instagram",
    summary: "Direct messages and story replies, which arrive as enquiries more often than expected.",
    syncs: [
      { direction: "in", label: "Direct messages and story replies" },
      { direction: "out", label: "Replies sent from the inbox" },
    ],
    standIn: "Seeded direct messages on the same thread model as WhatsApp.",
    credentials: ["Instagram business account ID", "Page access token"],
    webhookPath: "/webhooks/instagram",
  },
  {
    id: "int_google",
    name: "Google Business Profile",
    vendor: "Google",
    category: "channel",
    state: "demo",
    source: "google_business",
    summary: "Messages and booking clicks from the property's map listing.",
    syncs: [
      { direction: "in", label: "Listing messages and review replies" },
      { direction: "out", label: "Published room rates and availability" },
    ],
    standIn: "Seeded listing enquiries. Reviews are not modelled in this build.",
    credentials: ["Location ID", "Service account key"],
  },
  {
    id: "int_booking_com",
    name: "Booking.com",
    vendor: "Booking Holdings",
    category: "channel",
    state: "demo",
    source: "booking_com",
    summary: "Reservations that arrive already sold, plus the messages attached to them.",
    syncs: [
      { direction: "in", label: "New, modified and cancelled reservations" },
      { direction: "in", label: "Guest messages on a reservation" },
      { direction: "out", label: "Rates, availability and restrictions" },
    ],
    standIn:
      "Seeded OTA reservations and enquiries. Rates shown on the pricing screen are not pushed anywhere.",
    credentials: ["Property ID", "Machine account and password"],
  },

  // --- Money ---------------------------------------------------------------
  {
    id: "int_razorpay",
    name: "Payment links",
    vendor: "Razorpay",
    category: "commerce",
    state: "not_connected",
    summary: "Advance and balance collection against a quote or a confirmed booking.",
    syncs: [
      { direction: "out", label: "Payment link with amount, purpose and expiry" },
      { direction: "in", label: "Capture, failure and refund events" },
      { direction: "in", label: "Settlement reference for reconciliation" },
    ],
    standIn:
      "Payments in this build are recorded by hand on the booking. No link is generated and no money moves.",
    credentials: ["Key ID", "Key secret", "Webhook signing secret"],
    webhookPath: "/webhooks/payments",
  },
  {
    id: "int_tally",
    name: "Accounting export",
    vendor: "Tally",
    category: "commerce",
    state: "not_connected",
    summary: "Daily sales and tax figures handed to the accounts team in their own format.",
    syncs: [
      { direction: "out", label: "Daily sales register with GST split" },
      { direction: "out", label: "Advance and refund entries" },
    ],
    standIn:
      "The reports screen produces the same figures as a download. Nothing is posted to a ledger.",
    credentials: ["Company name", "Export path"],
  },

  // --- Operations ----------------------------------------------------------
  {
    id: "int_channel_manager",
    name: "Channel manager",
    vendor: "STAAH",
    category: "operations",
    state: "not_connected",
    summary: "One inventory and one rate, distributed to every listing at once.",
    syncs: [
      { direction: "out", label: "Availability and rate changes to all connected OTAs" },
      { direction: "in", label: "Reservations from every channel in one feed" },
      { direction: "both", label: "Stop sell and minimum stay restrictions" },
    ],
    standIn:
      "Availability and pricing are computed from the seed inside this build. Changes stay in this session.",
    credentials: ["Hotel code", "API key"],
  },
  {
    id: "int_pms",
    name: "Property management system",
    vendor: "eZee Absolute",
    category: "operations",
    state: "not_connected",
    summary: "The system of record for rooms, folios and housekeeping once a guest is in house.",
    syncs: [
      { direction: "both", label: "Room status, blocks and housekeeping state" },
      { direction: "out", label: "Confirmed reservations and guest profiles" },
      { direction: "in", label: "Check in, check out and folio charges" },
    ],
    standIn:
      "Rooms, blocks and the floor map are seeded here. This build does not claim to be the system of record.",
    credentials: ["Hotel code", "Auth token"],
  },
  {
    id: "int_govt_form_c",
    name: "Form C filing",
    vendor: "Bureau of Immigration",
    category: "operations",
    state: "not_connected",
    summary: "The foreign guest registration a property is required to file on arrival.",
    syncs: [{ direction: "out", label: "Passport and visa details for foreign nationals" }],
    standIn:
      "The stay policy names the requirement. No document is captured or transmitted in this build.",
    credentials: ["FRRO login", "Property registration number"],
  },

  // --- Platform ------------------------------------------------------------
  {
    id: "int_supabase",
    name: "Database and auth",
    vendor: "Supabase",
    category: "platform",
    state: "not_connected",
    summary: "Where records, sessions and permissions would actually live.",
    syncs: [
      { direction: "both", label: "Leads, bookings, guests, rooms and events" },
      { direction: "in", label: "Sign in, roles and row level access" },
    ],
    standIn:
      "Every record is a seeded array in this repository. Edits last until the page is reloaded.",
    credentials: ["Project URL", "Anon key", "Service role key"],
  },
  {
    id: "int_n8n",
    name: "Workflow automation",
    vendor: "n8n",
    category: "platform",
    state: "not_connected",
    summary: "The follow-up sequences, escalations and reminders that run without anyone pressing a key.",
    syncs: [
      { direction: "out", label: "Enquiry and booking events that start a workflow" },
      { direction: "in", label: "Scheduled follow-ups and reminders written back" },
    ],
    standIn:
      "Follow-ups are seeded and the timings are modelled. No schedule is running behind this screen.",
    credentials: ["Instance URL", "Webhook token"],
    webhookPath: "/webhooks/automation",
  },
  {
    id: "int_ai",
    name: "Language model",
    vendor: "Anthropic",
    category: "platform",
    state: "not_connected",
    summary: "Intent reading, summaries and drafted replies across every channel.",
    syncs: [
      { direction: "out", label: "Conversation text for intent, language and sentiment" },
      { direction: "in", label: "Summaries, suggested replies and confidence" },
    ],
    standIn:
      "Intent, sentiment and suggested replies are seeded per conversation. Nothing is generated while you read this.",
    credentials: ["API key", "Model name"],
  },
];
