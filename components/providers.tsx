"use client";

import * as React from "react";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

/**
 * Client providers, kept in one file so the root layout stays a server
 * component and the font CSS is still emitted from the server.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    // delayDuration 250 is long enough that sweeping the pointer across a
    // toolbar does not fire a trail of tooltips, short enough to feel
    // deliberate when someone actually pauses. skipDelay keeps the second
    // tooltip instant once the first has opened.
    <TooltipProvider delayDuration={250} skipDelayDuration={400}>
      {children}
      <Toaster
        position="bottom-right"
        offset={16}
        gap={8}
        duration={4000}
        toastOptions={{
          classNames: {
            toast:
              "!rounded-[var(--radius-card)] !border-hairline !bg-surface-raised !text-text-primary !shadow-[var(--shadow-float)] !font-sans !text-body",
            description: "!text-text-muted !text-meta",
            actionButton: "!bg-brand-700 !text-white !rounded-[var(--radius-sm)]",
            cancelButton: "!bg-ink-100 !text-text-secondary !rounded-[var(--radius-sm)]",
          },
        }}
      />
    </TooltipProvider>
  );
}
