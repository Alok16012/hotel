import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A native select wearing the Input's clothes.
 *
 * Deliberately not a Radix listbox. These are short, known lists inside forms
 * that are filled quickly and often on a phone at the front desk, where the
 * platform picker is faster, works with the keyboard for free and never traps
 * focus. The custom listbox is reserved for the filter menus, where multi
 * select and checkable state genuinely need it.
 */
export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <div className="relative">
    <select
      ref={ref}
      className={cn(
        "h-8 w-full appearance-none rounded-[var(--radius-control)] bg-surface pl-2.5 pr-7",
        "text-body text-text-primary",
        "border border-hairline-strong shadow-[var(--shadow-bezel)]",
        "transition-[border-color,box-shadow] duration-[130ms] ease-[var(--ease-out-quint)]",
        "hover:border-ink-400",
        "focus:outline-none focus-visible:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-500/25",
        "disabled:cursor-not-allowed disabled:opacity-45",
        className,
      )}
      {...props}
    >
      {children}
    </select>
    <ChevronDown
      className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-text-muted"
      aria-hidden="true"
    />
  </div>
));
Select.displayName = "Select";

/** Label and control as one unit, so no field ever ships without its name. */
export function Field({
  label,
  hint,
  htmlFor,
  children,
  className,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <label
        htmlFor={htmlFor}
        className="mb-1 block text-micro font-semibold uppercase tracking-[0.08em] text-text-muted"
      >
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1 text-meta text-text-muted">{hint}</p> : null}
    </div>
  );
}
