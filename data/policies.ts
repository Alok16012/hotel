import type { CancellationPolicy, StayPolicy } from "@/types";

/**
 * The property's written policy (§37).
 *
 * Seeded here rather than hardcoded into the booking drawer because three
 * screens need the same sentences: the folio on a booking, the terms attached
 * to a quote, and the settings page where an owner would change them. A policy
 * that is typed out twice is a policy that will eventually disagree with itself
 * in front of a guest.
 *
 * The ladder is expressed as data, so the booking detail can work out which
 * rung a specific reservation is standing on right now instead of printing a
 * paragraph and leaving the arithmetic to whoever is on the desk.
 */
export const CANCELLATION_POLICY: CancellationPolicy = {
  anchor: "14:00 IST on the day of arrival",
  bands: [
    {
      id: "cb_free",
      fromHoursBefore: null,
      toHoursBefore: 168,
      label: "More than 7 days out",
      chargeNights: 0,
      terms: "Cancel at no charge. Any advance already taken is returned in full.",
    },
    {
      id: "cb_one_night",
      fromHoursBefore: 168,
      toHoursBefore: 48,
      label: "7 days to 48 hours",
      chargeNights: 1,
      terms: "One night per room is retained. The rest of the stay is released.",
    },
    {
      id: "cb_half",
      fromHoursBefore: 48,
      toHoursBefore: 12,
      label: "48 to 12 hours",
      chargeShare: 0.5,
      terms: "Half the stay is retained. The room goes back on sale immediately.",
    },
    {
      id: "cb_full",
      fromHoursBefore: 12,
      toHoursBefore: 0,
      label: "Inside 12 hours, and no shows",
      chargeShare: 1,
      terms: "The full stay is retained. A waiver needs a manager.",
    },
  ],
  channelNote:
    "Stays sold through an OTA carry that channel's own terms. This build does not read them, so the desk should check the extranet before quoting a refund.",
};

export const STAY_POLICY: StayPolicy = {
  checkInTime: "14:00",
  checkOutTime: "11:00",
  earlyCheckIn: "From 09:00 when the room is free. Guaranteed only against the previous night.",
  lateCheckOut: "Until 14:00 at no charge. Beyond that, half a night.",
  childFreeUnderAge: 6,
  childPolicy:
    "Children under 6 stay free on existing bedding. From 6 to 12 an extra bed is charged at half the adult rate.",
  extraBed: "One extra bed per room, ₹1,200 a night including breakfast.",
  idRequirement:
    "Photo ID for every adult at check-in. Passport and visa for foreign nationals, as Form C requires.",
};
