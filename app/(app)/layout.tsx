import { AppShell } from "@/components/shell/app-shell";

/**
 * Route group for everything behind the application chrome. Grouping rather
 * than nesting under a path segment keeps the URLs clean (`/leads`, not
 * `/app/leads`) while giving every operational screen the same shell.
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return <AppShell>{children}</AppShell>;
}
