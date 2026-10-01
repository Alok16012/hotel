import { ShieldCheck } from "lucide-react";
import { ColumnHead, Panel } from "@/components/common/panel";
import { Badge } from "@/components/ui/badge";
import { formatPct } from "@/lib/format";
import { TEAM_ROLE } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { DiscountAuthority, TeamRole } from "@/types";

/**
 * Who can sign for how much (§19).
 *
 * The escalation column is the load-bearing one. A ceiling on its own tells
 * someone they cannot do the thing; a ceiling with a name beside it tells them
 * who to ask, which is the difference between a policy and an obstacle.
 *
 * Roles that carry no authority are shown rather than hidden. Reception holding
 * zero is a decision the property made on purpose, and a list that omitted them
 * would read as an oversight.
 */
export function AuthorityPanel({
  authority,
  currentRole,
}: {
  authority: DiscountAuthority[];
  currentRole: TeamRole;
}) {
  return (
    <Panel
      title="Approval authority"
      description="The most anyone may take off a rate without escalating."
      aside={<ShieldCheck className="size-4 text-text-muted" aria-hidden="true" />}
    >
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-hairline">
            <ColumnHead className="w-full max-w-0">Role</ColumnHead>
            <ColumnHead align="right">Can sign</ColumnHead>
            <ColumnHead className="hidden sm:table-cell">Escalates to</ColumnHead>
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline">
          {authority.map((row) => (
            <tr
              key={row.role}
              className={cn(row.role === currentRole && "bg-brand-50/60")}
            >
              <td className="truncate px-4 py-2">
                <span className="text-body text-text-primary">{TEAM_ROLE[row.role]}</span>
                {row.role === currentRole ? (
                  <Badge intent="brand" size="sm" className="ml-1.5">
                    You
                  </Badge>
                ) : null}
              </td>
              <td className="px-4 py-2 text-right">
                <span
                  data-numeric
                  className={cn(
                    "text-body font-semibold",
                    row.ceiling === 0 ? "text-text-muted" : "text-text-primary",
                  )}
                >
                  {row.ceiling === 0 ? "None" : formatPct(row.ceiling, 0)}
                </span>
              </td>
              <td className="hidden px-4 py-2 text-meta text-text-muted sm:table-cell">
                {row.escalatesTo ? TEAM_ROLE[row.escalatesTo] : "Final say"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}
