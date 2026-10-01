"use client";

import * as React from "react";
import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";
import { Topbar } from "./topbar";
import { CommandPalette } from "./command-palette";

/**
 * AppShell (§35).
 *
 * The scroll container is the main region, not the document. That choice makes
 * the sidebar and topbar genuinely fixed without `position: fixed` hacks, and
 * it gives the topbar a single element to observe for its scrolled state.
 * Pages therefore control their own vertical rhythm and never fight a
 * page-level scrollbar.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    /* `relative` is load-bearing, not decoration. Visually hidden labels use
       `position: absolute`, and without a positioned ancestor their containing
       block is the page itself: they escape this frame's `overflow-hidden`,
       give the document a scroll height of its own, and let the whole shell be
       scrolled off into blank space. */
    <div className="relative flex h-dvh overflow-hidden bg-canvas">
      <Sidebar />
      <MobileNav />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main
          id="app-scroll"
          className="scrollbar-slim min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
        >
          {children}
        </main>
      </div>

      <CommandPalette />
    </div>
  );
}
