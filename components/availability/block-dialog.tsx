"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Field, Select } from "@/components/ui/select";
import { formatDayMonth, formatINR, formatWeekday } from "@/lib/format";
import type { InventoryMatrix } from "@/lib/availability";
import { cn } from "@/lib/utils";
import type { ISODate } from "@/types";
import { capacityAcross, type BlockForm } from "./model";

/**
 * Taking rooms off sale (§18).
 *
 * The form refuses to let the operator block more than is free, because a
 * block that oversells is worse than no block: the matrix would read as
 * available while the rooms are spoken for twice. The cost of the decision is
 * shown before it is made, since two suites held over a weekend is a number the
 * owner will ask about later.
 */
export function BlockDialog({
  open,
  matrix,
  initial,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  matrix: InventoryMatrix;
  /** Pre-fill from whichever cell the operator opened this on. */
  initial: { roomTypeId: string; date: ISODate } | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (form: BlockForm) => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="anim-overlay fixed inset-0 z-[var(--z-overlay)] bg-ink-950/25 backdrop-blur-[2px]" />
        <Dialog.Content
          className={cn(
            "anim-modal fixed left-1/2 top-1/2 z-[var(--z-modal)] w-[min(94vw,30rem)]",
            "-translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[var(--radius-surface)]",
            "material-float shadow-[var(--shadow-overlay)]",
          )}
        >
          {open ? (
            <BlockRoomsForm
              key={`${initial?.roomTypeId}-${initial?.date}`}
              matrix={matrix}
              initial={initial}
              onConfirm={onConfirm}
            />
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function BlockRoomsForm({
  matrix,
  initial,
  onConfirm,
}: {
  matrix: InventoryMatrix;
  initial: { roomTypeId: string; date: ISODate } | null;
  onConfirm: (form: BlockForm) => void;
}) {
  const dates = matrix.dates;
  const [roomTypeId, setRoomTypeId] = React.useState(
    initial?.roomTypeId ?? matrix.rows[0].roomType.id,
  );
  const [from, setFrom] = React.useState<ISODate>(initial?.date ?? dates[0]);
  const [to, setTo] = React.useState<ISODate>(initial?.date ?? dates[0]);
  const [rooms, setRooms] = React.useState(1);
  const [reason, setReason] = React.useState("");

  // The end of a range can never precede its start, so moving the start drags
  // the end along rather than putting the form into a state it must scold the
  // operator about.
  const end = to < from ? from : to;
  const capacity = capacityAcross(matrix, roomTypeId, from, end);
  const overcommitted = rooms > capacity.available;
  const roomType = matrix.rows.find((r) => r.roomType.id === roomTypeId)?.roomType;
  const cost = (roomType?.rackRate ?? 0) * rooms * capacity.nights;

  const valid = reason.trim().length > 2 && rooms > 0 && !overcommitted;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!valid) return;
        onConfirm({ roomTypeId, from, to: end, rooms, reason: reason.trim() });
      }}
    >
      <header className="flex items-start justify-between gap-3 border-b border-hairline px-4 py-3">
        <div>
          <Dialog.Title className="text-section font-semibold text-text-primary">
            Block rooms
          </Dialog.Title>
          <Dialog.Description className="mt-0.5 text-meta text-text-muted">
            Withheld rooms stay off sale until someone releases them. Holds expire on their own.
          </Dialog.Description>
        </div>
        <Dialog.Close
          className={cn(
            "-mr-1 -mt-1 rounded-[var(--radius-control)] p-1 text-text-muted",
            "transition-colors duration-[130ms] hover:bg-surface-sunken hover:text-text-primary",
          )}
          aria-label="Close"
        >
          <X className="size-4" />
        </Dialog.Close>
      </header>

      <div className="space-y-3 px-4 py-4">
        <Field label="Category" htmlFor="block-type">
          <Select
            id="block-type"
            value={roomTypeId}
            onChange={(e) => setRoomTypeId(e.target.value)}
          >
            {matrix.rows.map((row) => (
              <option key={row.roomType.id} value={row.roomType.id}>
                {row.roomType.name}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="First night" htmlFor="block-from">
            <Select
              id="block-from"
              value={from}
              onChange={(e) => {
                const next = e.target.value;
                setFrom(next);
                if (to < next) setTo(next);
              }}
            >
              {dates.map((d) => (
                <option key={d} value={d}>
                  {formatWeekday(d).slice(0, 3)} {formatDayMonth(d)}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Last night" htmlFor="block-to">
            <Select id="block-to" value={end} onChange={(e) => setTo(e.target.value)}>
              {dates
                .filter((d) => d >= from)
                .map((d) => (
                  <option key={d} value={d}>
                    {formatWeekday(d).slice(0, 3)} {formatDayMonth(d)}
                  </option>
                ))}
            </Select>
          </Field>
        </div>

        <Field
          label="Rooms"
          htmlFor="block-rooms"
          hint={`${capacity.available} free across ${capacity.nights} night${capacity.nights === 1 ? "" : "s"} on the tightest night.`}
        >
          <Input
            id="block-rooms"
            type="number"
            min={1}
            max={Math.max(1, capacity.available)}
            value={rooms}
            onChange={(e) => setRooms(Math.max(1, Number(e.target.value) || 1))}
            aria-invalid={overcommitted}
          />
        </Field>

        <Field label="Reason" htmlFor="block-reason">
          <Textarea
            id="block-reason"
            rows={2}
            value={reason}
            placeholder="Fire safety audit, owner's family, held for a group deciding numbers"
            onChange={(e) => setReason(e.target.value)}
          />
        </Field>

        {overcommitted ? (
          <p className="flex items-start gap-1.5 text-meta text-critical-700">
            <AlertTriangle className="mt-px size-3.5 shrink-0" aria-hidden="true" />
            Only {capacity.available} left to sell on the tightest night in that range. Blocking
            more would oversell the category.
          </p>
        ) : (
          <p className="text-meta text-text-muted">
            Holds back{" "}
            <span data-numeric className="font-medium text-text-primary">
              {rooms * capacity.nights}
            </span>{" "}
            room nights, worth up to{" "}
            <span data-numeric className="font-medium text-text-primary">
              {formatINR(cost)}
            </span>{" "}
            at rack.
          </p>
        )}
      </div>

      <footer className="flex items-center justify-end gap-2 border-t border-hairline bg-surface-sunken/60 px-4 py-3">
        <Dialog.Close asChild>
          <Button type="button" variant="ghost" size="sm">
            Cancel
          </Button>
        </Dialog.Close>
        <Button type="submit" variant="primary" size="sm" disabled={!valid}>
          Block {rooms} {roomType?.name.toLowerCase()}
        </Button>
      </footer>
    </form>
  );
}
