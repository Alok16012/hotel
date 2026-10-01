"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useUi } from "@/lib/store";
import { SidebarContent } from "./sidebar";

/**
 * Off-canvas navigation below the lg breakpoint.
 *
 * It renders the same `SidebarContent` as the desktop rail, permanently
 * expanded. Building a second, simplified mobile menu is how navigation drifts:
 * one surface, two viewports.
 */
export function MobileNav() {
  const open = useUi((s) => s.mobileNavOpen);
  const setOpen = useUi((s) => s.setMobileNavOpen);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="anim-overlay fixed inset-0 z-[60] bg-ink-950/40 lg:hidden" />
        <Dialog.Content
          className="anim-drawer anim-drawer-left fixed inset-y-0 left-0 z-[60] w-[268px] shadow-[var(--shadow-overlay)] lg:hidden"
          aria-label="Navigation"
        >
          <Dialog.Title className="sr-only">Navigation</Dialog.Title>
          <Dialog.Description className="sr-only">
            Move between the sections of Hotel OS.
          </Dialog.Description>

          <Dialog.Close
            className="absolute right-2 top-2 z-10 grid size-7 place-items-center rounded-[var(--radius-sm)] text-text-onDark-muted transition-colors hover:bg-white/10 hover:text-text-onDark"
            aria-label="Close navigation"
          >
            <X className="size-4" />
          </Dialog.Close>

          {/* Tapping an item closes the drawer — otherwise the destination
              renders behind a panel the user has to dismiss by hand. */}
          <SidebarContent collapsed={false} onNavigate={() => setOpen(false)} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
