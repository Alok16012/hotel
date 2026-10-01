"use client";

import * as React from "react";
import * as Popover from "@radix-ui/react-popover";
import { Layers, LayoutGrid } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/common/panel";
import type { FloorMap, MapRoom } from "@/lib/availability";
import { ROOM_STATUS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { RoomStatus } from "@/types";

/**
 * The building, floor by floor (§18).
 *
 * Front desk staff do not think in room types; they think in floors and
 * corridors, and "which end of three is free tonight" is a question a table
 * cannot answer. So the plan is drawn, and drawn in the order a person walking
 * the building would read it, top floor first.
 *
 * The stacked view tilts the plates back a few degrees on the Z axis. That is
 * the whole 3D budget: enough to read as a building rather than a spreadsheet,
 * not so much that a room number needs a second look. Anyone who prefers the
 * flat plan gets it with one click, and the preference is remembered for the
 * session.
 */

const STATUS_TILE: Record<RoomStatus, string> = {
  available: "bg-surface text-text-secondary border-hairline-strong",
  occupied: "bg-brand-500 text-text-onDark border-brand-600",
  arriving: "bg-accent-300 text-ink-950 border-accent-500",
  departing: "bg-caution-100 text-caution-700 border-caution-500/60",
  held: "bg-caution-500 text-ink-950 border-caution-600",
  reserved: "bg-accent-100 text-accent-700 border-accent-300",
  maintenance:
    "bg-ink-200 text-text-muted border-ink-300 [background-image:repeating-linear-gradient(135deg,transparent_0_3px,oklch(0.216_0.026_265/0.07)_3px_6px)]",
};

const LEGEND: RoomStatus[] = [
  "occupied",
  "arriving",
  "departing",
  "held",
  "maintenance",
  "available",
];

export function FloorMapPanel({ map }: { map: FloorMap }) {
  const [stacked, setStacked] = React.useState(true);

  return (
    <Panel
      title="The building tonight"
      description={`${map.occupiedTonight} of ${map.sellable} sellable rooms committed. Rooms are assigned at arrival, so a held key is a real key.`}
      aside={
        <button
          type="button"
          onClick={() => setStacked((s) => !s)}
          aria-pressed={stacked}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-[var(--radius-control)] border border-hairline-strong",
            "bg-surface px-2 py-1 text-micro font-medium text-text-secondary",
            "transition-colors duration-[130ms] ease-[var(--ease-out-quint)]",
            "hover:border-ink-400 hover:text-text-primary active:scale-[0.97]",
          )}
        >
          {stacked ? (
            <LayoutGrid className="size-3" aria-hidden="true" />
          ) : (
            <Layers className="size-3" aria-hidden="true" />
          )}
          {stacked ? "Flat plan" : "Stacked"}
        </button>
      }
      footer={
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {LEGEND.map((status) => (
            <span key={status} className="flex items-center gap-1.5 text-micro text-text-muted">
              <span
                className={cn(
                  "size-2.5 rounded-[var(--radius-micro)] border",
                  STATUS_TILE[status],
                )}
              />
              {ROOM_STATUS[status].label}
              <span data-numeric className="text-text-secondary">
                {map.counts[status]}
              </span>
            </span>
          ))}
        </div>
      }
    >
      <div
        className={cn(
          "overflow-x-auto px-4 py-4 scrollbar-slim",
          stacked && "[perspective:1500px] [perspective-origin:50%_25%]",
        )}
      >
        <div
          className={cn(
            "flex min-w-max flex-col gap-2",
            stacked && "[transform-style:preserve-3d] [transform:rotateX(11deg)] gap-1.5",
          )}
        >
          {map.floors.map((floor, index) => (
            <div
              key={floor.floor}
              style={
                stacked
                  ? { transform: `translateZ(${(map.floors.length - index) * 14}px)` }
                  : undefined
              }
              className={cn(
                "flex items-center gap-3 rounded-[var(--radius-card)] px-2 py-1.5",
                "transition-transform duration-[240ms] ease-[var(--ease-spatial)]",
                stacked
                  ? "bg-surface-sunken/80 shadow-[var(--shadow-raised)]"
                  : "border border-hairline",
              )}
            >
              <p className="w-16 shrink-0">
                <span className="block text-body font-semibold text-text-primary">
                  Floor {floor.floor}
                </span>
                <span data-numeric className="block text-micro text-text-muted">
                  {floor.rooms.filter((r) => r.status === "available").length} free
                </span>
              </p>

              <div className="flex flex-wrap gap-1">
                {floor.rooms.map((room) => (
                  <RoomTile key={room.number} room={room} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function RoomTile({ room }: { room: MapRoom }) {
  const descriptor = ROOM_STATUS[room.status];

  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label={`Room ${room.number}, ${descriptor.label.toLowerCase()}`}
        className={cn(
          "flex h-9 w-11 items-center justify-center rounded-[var(--radius-sm)] border",
          "text-meta font-medium tabular-nums",
          "transition-[transform,box-shadow] duration-[130ms] ease-[var(--ease-out-quint)]",
          "hover:-translate-y-0.5 hover:shadow-[var(--shadow-float)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40",
          "active:scale-[0.96] data-[state=open]:-translate-y-0.5 data-[state=open]:shadow-[var(--shadow-float)]",
          STATUS_TILE[room.status],
        )}
      >
        {room.number}
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          sideOffset={8}
          collisionPadding={12}
          className={cn(
            "anim-pop z-[var(--z-dropdown)] w-56 rounded-[var(--radius-card)] p-3",
            "material-float shadow-[var(--shadow-float)]",
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-card font-semibold text-text-primary">Room {room.number}</p>
              <p className="text-meta text-text-muted">{room.roomTypeName}</p>
            </div>
            <Badge intent={descriptor.intent} size="sm">
              {descriptor.label}
            </Badge>
          </div>

          {room.guestName ? (
            <p className="mt-2 border-t border-hairline pt-2 text-meta text-text-secondary">
              <span className="text-text-primary">{room.guestName}</span>
              {room.status === "departing" ? " leaves this morning" : null}
              {room.status === "arriving" ? " arrives today" : null}
            </p>
          ) : null}

          {room.note ? (
            <p className="mt-2 border-t border-hairline pt-2 text-meta leading-relaxed text-text-secondary">
              {room.note}
            </p>
          ) : null}

          {!room.guestName && !room.note ? (
            <p className="mt-2 border-t border-hairline pt-2 text-meta text-text-muted">
              Clean and sellable. No arrival assigned.
            </p>
          ) : null}
          <Popover.Arrow className="fill-surface" width={10} height={5} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
