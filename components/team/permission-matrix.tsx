import { Check, Minus, ShieldCheck } from "lucide-react";
import { ColumnHead } from "@/components/common/panel";
import { cn } from "@/lib/utils";
import type { RolePermission, TeamRole } from "@/types";

/**
 * What each role may do, as a matrix (§40).
 *
 * Three states, not two. A tick is "may do this alone", a shield is "may start
 * it, someone else signs it off", and a dash is "cannot". The middle state is
 * the one hotels actually run on: the receptionist takes the cancellation at
 * midnight and the manager approves the refund in the morning. Collapsing it
 * into a tick would describe a property that does not exist, and collapsing it
 * into a dash would describe one that cannot function.
 *
 * Columns run from least authority to most, so the ticks form a staircase and a
 * role that can do something the role above it cannot stands out as the
 * exception it would be.
 */
export function PermissionMatrix({
  permissions,
  roleOrder,
  roleLabels,
}: {
  permissions: RolePermission[];
  roleOrder: TeamRole[];
  roleLabels: Record<TeamRole, string>;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[58rem] border-collapse">
        <thead className="border-b border-hairline">
          <tr>
            <ColumnHead className="w-[17rem] min-w-[17rem]">Capability</ColumnHead>
            {roleOrder.map((role) => (
              <ColumnHead key={role} className="min-w-[6.5rem] text-center">
                {roleLabels[role]}
              </ColumnHead>
            ))}
          </tr>
        </thead>
        <tbody>
          {permissions.map((permission) => (
            <tr key={permission.id} className="border-b border-hairline last:border-0">
              <th scope="row" className="px-4 py-2 text-left align-top">
                <span className="block text-body font-medium text-text-primary">
                  {permission.label}
                </span>
                <span className="mt-0.5 block text-micro font-normal text-text-muted">
                  {permission.description}
                </span>
              </th>

              {roleOrder.map((role) => {
                const granted = permission.granted.includes(role);
                const needsApproval = permission.needsApproval?.includes(role) ?? false;

                return (
                  <td key={role} className="px-4 py-2 align-middle">
                    <span className="flex justify-center">
                      <Cell state={granted ? "granted" : needsApproval ? "approval" : "denied"} />
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const CELL_LABEL = {
  granted: "Allowed",
  approval: "Needs approval",
  denied: "Not allowed",
} as const;

function Cell({ state }: { state: keyof typeof CELL_LABEL }) {
  const Icon = state === "granted" ? Check : state === "approval" ? ShieldCheck : Minus;

  return (
    <span
      title={CELL_LABEL[state]}
      className={cn(
        "grid size-6 place-items-center rounded-[var(--radius-sm)]",
        state === "granted"
          ? "bg-positive-100 text-positive-700"
          : state === "approval"
            ? "bg-caution-100 text-caution-700"
            : "text-ink-300",
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      <span className="sr-only">{CELL_LABEL[state]}</span>
    </span>
  );
}
