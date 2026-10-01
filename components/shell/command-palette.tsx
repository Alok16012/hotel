"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowRight,
  CalendarPlus,
  CornerDownLeft,
  DoorOpen,
  Search,
  StickyNote,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUi } from "@/lib/store";
import { ALL_NAV_ITEMS } from "./nav-config";
import { Kbd } from "@/components/ui/kbd";

const QUICK_ACTIONS = [
  { id: "new-lead", label: "New lead", icon: UserPlus, hint: "Capture an enquiry" },
  { id: "new-booking", label: "New booking", icon: CalendarPlus, hint: "Create a reservation" },
  { id: "walk-in", label: "Walk-in guest", icon: DoorOpen, hint: "Check in without a booking" },
  { id: "guest-note", label: "Add guest note", icon: StickyNote, hint: "Log a preference or issue" },
];

/**
 * ⌘K palette. Mounted once at the shell so every screen inherits it.
 *
 * Note the absence of an open/close animation on the list itself: the palette
 * is keyboard-initiated and triggered constantly, so motion here is pure
 * friction. Only the backdrop fades, to establish the layer.
 */
export function CommandPalette() {
  const router = useRouter();
  const open = useUi((s) => s.commandOpen);
  const setOpen = useUi((s) => s.setCommandOpen);
  const [query, setQuery] = React.useState("");

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        useUi.getState().toggleCommand();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // Clear the query on close so the next invocation starts fresh.
  React.useEffect(() => {
    if (!open) {
      const t = setTimeout(() => setQuery(""), 150);
      return () => clearTimeout(t);
    }
  }, [open]);

  const run = React.useCallback(
    (fn: () => void) => {
      setOpen(false);
      fn();
    },
    [setOpen],
  );

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="anim-overlay fixed inset-0 z-[50] bg-ink-950/25 backdrop-blur-[2px]" />
        <Dialog.Content
          className={cn(
            "anim-modal fixed left-1/2 top-[14vh] z-[70] w-[min(92vw,600px)] -translate-x-1/2",
            "overflow-hidden rounded-[var(--radius-surface)] material-float shadow-[var(--shadow-overlay)]",
          )}
          aria-label="Command palette"
        >
          <Dialog.Title className="sr-only">Search and commands</Dialog.Title>
          <Dialog.Description className="sr-only">
            Search guests, leads, bookings and navigate the application.
          </Dialog.Description>

          <Command loop shouldFilter className="flex flex-col">
            <div className="flex h-12 items-center gap-2.5 border-b border-hairline px-3.5">
              <Search className="size-4 shrink-0 text-text-muted" />
              <Command.Input
                value={query}
                onValueChange={setQuery}
                placeholder="Search guest, lead, booking, phone number…"
                className="h-full flex-1 bg-transparent text-body text-text-primary outline-none placeholder:text-text-muted"
              />
              <Kbd>Esc</Kbd>
            </div>

            <Command.List className="scrollbar-slim max-h-[min(56vh,380px)] overflow-y-auto p-1.5">
              <Command.Empty className="px-3 py-8 text-center">
                <p className="text-body font-medium text-text-primary">No matches</p>
                <p className="mt-0.5 text-meta text-text-muted">
                  Try a guest name, phone number or booking reference.
                </p>
              </Command.Empty>

              <Group heading="Quick actions">
                {QUICK_ACTIONS.map((action) => (
                  <Item
                    key={action.id}
                    value={`${action.label} ${action.hint}`}
                    icon={<action.icon />}
                    label={action.label}
                    hint={action.hint}
                    onSelect={() => run(() => router.push("/leads"))}
                  />
                ))}
              </Group>

              <Group heading="Go to">
                {ALL_NAV_ITEMS.map((item) => (
                  <Item
                    key={item.href}
                    value={`${item.label} ${item.description}`}
                    icon={<item.icon />}
                    label={item.label}
                    hint={item.description}
                    onSelect={() => run(() => router.push(item.href))}
                  />
                ))}
              </Group>
            </Command.List>

            <div className="flex items-center justify-between border-t border-hairline px-3 py-1.5">
              <span className="text-micro text-text-muted">
                Search is scoped to seeded demo data
              </span>
              <span className="flex items-center gap-2.5 text-micro text-text-muted">
                <span className="flex items-center gap-1">
                  <Kbd>↑</Kbd>
                  <Kbd>↓</Kbd>
                  navigate
                </span>
                <span className="flex items-center gap-1">
                  <Kbd>
                    <CornerDownLeft className="size-2.5" />
                  </Kbd>
                  open
                </span>
              </span>
            </div>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Group({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <Command.Group
      heading={heading}
      className={cn(
        "[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2",
        "[&_[cmdk-group-heading]]:text-micro [&_[cmdk-group-heading]]:font-semibold",
        "[&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.08em]",
        "[&_[cmdk-group-heading]]:text-text-muted",
      )}
    >
      {children}
    </Command.Group>
  );
}

function Item({
  value,
  icon,
  label,
  hint,
  onSelect,
}: {
  value: string;
  icon: React.ReactNode;
  label: string;
  hint?: string;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className={cn(
        "group flex cursor-pointer select-none items-center gap-2.5 rounded-[var(--radius-control)] px-2 py-1.5",
        "text-body text-text-primary outline-none",
        "data-[selected=true]:bg-brand-50 data-[selected=true]:text-brand-800",
        "[&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-text-muted",
        "data-[selected=true]:[&_svg]:text-brand-600",
      )}
    >
      {icon}
      <span className="min-w-0 flex-1 truncate font-medium">{label}</span>
      {hint ? (
        <span className="hidden min-w-0 max-w-[45%] truncate text-meta text-text-muted sm:block">
          {hint}
        </span>
      ) : null}
      <ArrowRight className="opacity-0 transition-opacity group-data-[selected=true]:opacity-100" />
    </Command.Item>
  );
}
