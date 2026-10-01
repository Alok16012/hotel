import { Badge, type BadgeProps } from "@/components/ui/badge";
import {
  BOOKING_STATUS,
  EXCEPTION_SEVERITY,
  EXCEPTION_STATUS,
  FOLLOW_UP_STATUS,
  GUEST_SEGMENT,
  LEAD_PRIORITY,
  LEAD_STAGE,
  PAYMENT_STATUS,
  ROOM_STATUS,
} from "@/lib/labels";
import type {
  BookingStatus,
  ExceptionSeverity,
  ExceptionStatus,
  FollowUpStatus,
  GuestSegment,
  LeadPriority,
  LeadStage,
  PaymentStatus,
  RoomStatus,
} from "@/types";

/**
 * One badge component for every domain status.
 *
 * The discriminated `kind` means a screen cannot accidentally colour a lead
 * stage with a booking palette, and adding a new enum value anywhere fails
 * type-checking here until it is given a label and an intent.
 */
type StatusBadgeProps = Omit<BadgeProps, "intent" | "children"> &
  (
    | { kind: "leadStage"; value: LeadStage }
    | { kind: "leadPriority"; value: LeadPriority }
    | { kind: "booking"; value: BookingStatus }
    | { kind: "payment"; value: PaymentStatus }
    | { kind: "room"; value: RoomStatus }
    | { kind: "followUp"; value: FollowUpStatus }
    | { kind: "exceptionSeverity"; value: ExceptionSeverity }
    | { kind: "exceptionStatus"; value: ExceptionStatus }
    | { kind: "segment"; value: GuestSegment }
  );

export function StatusBadge({ kind, value, ...props }: StatusBadgeProps) {
  const descriptor = resolve(kind, value);
  return (
    <Badge intent={descriptor.intent} {...props}>
      {descriptor.label}
    </Badge>
  );
}

function resolve(kind: StatusBadgeProps["kind"], value: string) {
  switch (kind) {
    case "leadStage":
      return LEAD_STAGE[value as LeadStage];
    case "leadPriority":
      return LEAD_PRIORITY[value as LeadPriority];
    case "booking":
      return BOOKING_STATUS[value as BookingStatus];
    case "payment":
      return PAYMENT_STATUS[value as PaymentStatus];
    case "room":
      return ROOM_STATUS[value as RoomStatus];
    case "followUp":
      return FOLLOW_UP_STATUS[value as FollowUpStatus];
    case "exceptionSeverity":
      return EXCEPTION_SEVERITY[value as ExceptionSeverity];
    case "exceptionStatus":
      return EXCEPTION_STATUS[value as ExceptionStatus];
    case "segment":
      return GUEST_SEGMENT[value as GuestSegment];
  }
}
