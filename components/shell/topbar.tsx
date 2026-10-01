"use client";

import * as React from "react";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUi } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Breadcrumb } from "./breadcrumb";
import { SearchTrigger } from "./search-trigger";
import { TodayIndicator } from "./today-indicator";
import { AutomationStatus } from "./automation-status";
import { Notifications } from "./notifications";
import { QuickAdd } from "./quick-add";

/**
 * Topbar (§9). Left: where you are. Centre: how you find anything. Right: the
 * state of the operation and the things you start.
 *
 * It gains a hairline and a translucent material only once the canvas scrolls
 * under it. At rest it should read as part of the page, not as a bar bolted to
 * the top — the separation only needs to exist when content is actually
 * sliding beneath it.
 */
export function Topbar() {
  const setMobileNavOpen = useUi((s) => s.setMobileNavOpen);
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const el = document.getElementById("app-scroll");
    if (!el) return;
    // Threshold rather than `> 0` so a trackpad's elastic overscroll does not
    // make the bar flicker between states.
    const onScroll = () => setScrolled(el.scrollTop > 8);
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      data-scrolled={scrolled || undefined}
      className={cn(
        "sticky top-0 z-[30] flex h-[var(--spacing-topbar)] shrink-0 items-center gap-3 px-3 sm:px-4",
        "transition-[background-color,border-color,backdrop-filter] duration-[180ms] ease-[var(--ease-out-quint)]",
        scrolled
          ? "material-float border-b border-hairline"
          : "border-b border-transparent bg-canvas",
      )}
    >
      <Button
        variant="ghost"
        size="icon-sm"
        className="lg:hidden"
        onClick={() => setMobileNavOpen(true)}
        aria-label="Open navigation"
      >
        <Menu />
      </Button>

      <div className="hidden min-w-0 shrink-0 md:block lg:w-[13rem]">
        <Breadcrumb />
      </div>

      {/* The search block stays flexible at every width. Pinning it with
          `flex-none` at md pushed the right-hand cluster past the header's own
          padding in the 768–1023 band, clipping the Create button against the
          viewport edge. A max-width keeps it from dominating wide screens
          without ever taking space the actions need. */}
      <div className="min-w-0 flex-1 md:max-w-[30rem] lg:max-w-none">
        <SearchTrigger />
      </div>

      <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
        <TodayIndicator />
        <AutomationStatus />
        <span className="hidden h-5 w-px bg-hairline md:block" aria-hidden="true" />
        <Notifications />
        <QuickAdd />
      </div>
    </header>
  );
}
