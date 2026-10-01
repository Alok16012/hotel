"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { DateRangePreset } from "@/types";
import { HOTEL } from "@/data/hotel";

/**
 * UI-only global state. Deliberately narrow: this holds chrome preferences and
 * transient overlay state, never domain data. Domain state lives in the
 * repository layer so a real backend can replace it without touching this.
 */
interface UiState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;

  /** Mobile off-canvas nav — separate from the desktop collapse preference. */
  mobileNavOpen: boolean;
  setMobileNavOpen: (v: boolean) => void;

  commandOpen: boolean;
  setCommandOpen: (v: boolean) => void;
  toggleCommand: () => void;

  activePropertyId: string;
  setActiveProperty: (id: string) => void;

  dateRange: DateRangePreset;
  setDateRange: (r: DateRangePreset) => void;
}

export const useUi = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),

      mobileNavOpen: false,
      setMobileNavOpen: (v) => set({ mobileNavOpen: v }),

      commandOpen: false,
      setCommandOpen: (v) => set({ commandOpen: v }),
      toggleCommand: () => set((s) => ({ commandOpen: !s.commandOpen })),

      activePropertyId: HOTEL.id,
      setActiveProperty: (id) => set({ activePropertyId: id }),

      dateRange: "today",
      setDateRange: (r) => set({ dateRange: r }),
    }),
    {
      name: "hotel-os-ui",
      storage: createJSONStorage(() => localStorage),
      // Overlay state must never be restored from a previous session:
      // reloading into an open command palette would be a bug.
      partialize: (s) => ({
        sidebarCollapsed: s.sidebarCollapsed,
        activePropertyId: s.activePropertyId,
        dateRange: s.dateRange,
      }),
    },
  ),
);
