"use client";

import { CalendarPlus, ChevronDown, DoorOpen, Plus, StickyNote, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Quick Add (§9). The four things a front-desk or reservations user starts
 * from scratch during a shift. Anything else is reached by opening an existing
 * record, so it does not belong here.
 *
 * The actions acknowledge with a toast rather than silently doing nothing:
 * this is a demo shell, and a dead menu item teaches the wrong thing about
 * what the product does.
 */
const ACTIONS = [
  {
    id: "lead",
    label: "New lead",
    hint: "Log an enquiry from any channel",
    icon: UserPlus,
  },
  {
    id: "booking",
    label: "New booking",
    hint: "Create a confirmed reservation",
    icon: CalendarPlus,
  },
  {
    id: "walk-in",
    label: "Walk-in guest",
    hint: "Check in without a prior booking",
    icon: DoorOpen,
  },
  {
    id: "note",
    label: "Add guest note",
    hint: "Record a preference or complaint",
    icon: StickyNote,
  },
];

export function QuickAdd() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="primary" size="sm" className="gap-1 pr-2">
          <Plus />
          <span className="hidden sm:inline">Create</span>
          <ChevronDown className="size-3 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Create</DropdownMenuLabel>
        {ACTIONS.map((action) => (
          <DropdownMenuItem
            key={action.id}
            onSelect={() =>
              toast(`${action.label} form`, {
                description: "Forms arrive with the records phase of this build.",
              })
            }
          >
            <action.icon />
            <span className="min-w-0">
              <span className="block truncate font-medium">{action.label}</span>
              <span className="block truncate text-meta text-text-muted">{action.hint}</span>
            </span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <p className="px-2 py-1 text-micro text-text-muted">
          Demo build. Nothing is written to a server.
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
