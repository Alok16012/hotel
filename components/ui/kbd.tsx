import { cn } from "@/lib/utils";

/**
 * Keyboard hint. Rendered with a bezel so it reads as a physical key cap
 * rather than a code span.
 */
export function Kbd({
  children,
  className,
  tone = "light",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "light" | "dark";
}) {
  return (
    <kbd
      className={cn(
        "inline-grid h-[18px] min-w-[18px] place-items-center rounded-[var(--radius-micro)] px-1",
        "font-sans text-micro font-medium leading-none",
        tone === "light"
          ? "bg-surface text-text-muted shadow-[0_0_0_1px_var(--color-hairline-strong),var(--shadow-bezel)]"
          : "bg-white/10 text-text-onDark-muted shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
