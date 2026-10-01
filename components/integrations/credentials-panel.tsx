"use client";

import { Lock } from "lucide-react";
import type { Integration } from "@/types";

/**
 * Webhook and key placeholders, deliberately dead.
 *
 * These fields exist because the shape of the real screen is worth showing:
 * somebody evaluating this needs to see that each channel has an endpoint to
 * point at and a secret to hold. They are read only, they carry an example
 * host that resolves nowhere, and the key is a row of dots rather than a
 * plausible looking string, because a plausible looking key is the kind of
 * detail a screenshot turns into a claim.
 *
 * There is no copy button. Copying an endpoint that does not exist can only
 * waste somebody's afternoon.
 */
export function CredentialsPanel({ integrations }: { integrations: Integration[] }) {
  const withWebhooks = integrations.filter((integration) => integration.webhookPath);

  return (
    <div className="px-4 py-3">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] border-collapse text-meta">
          <thead>
            <tr className="border-b border-hairline text-left">
              <th className="pb-1.5 pr-4 text-micro font-medium uppercase tracking-[0.08em] text-text-muted">
                Service
              </th>
              <th className="pb-1.5 pr-4 text-micro font-medium uppercase tracking-[0.08em] text-text-muted">
                Endpoint it would call
              </th>
              <th className="pb-1.5 text-micro font-medium uppercase tracking-[0.08em] text-text-muted">
                Signing secret
              </th>
            </tr>
          </thead>
          <tbody>
            {withWebhooks.map((integration) => (
              <tr key={integration.id} className="border-b border-hairline last:border-0">
                <td className="py-2 pr-4 align-middle text-text-primary">{integration.name}</td>
                <td className="py-2 pr-4 align-middle">
                  <code className="rounded-[var(--radius-micro)] bg-surface-sunken px-1.5 py-0.5 text-micro text-text-secondary">
                    https://example.invalid{integration.webhookPath}
                  </code>
                </td>
                <td className="py-2 align-middle">
                  <span className="inline-flex items-center gap-1.5 text-micro text-text-muted">
                    <Lock className="size-3" aria-hidden="true" />
                    <span aria-hidden="true">••••••••••••</span>
                    <span className="sr-only">Not generated in this build</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-micro text-text-muted">
        The host above is a reserved example domain and answers nothing. No secret has been
        generated, stored or masked from a real value. A working build would issue these per
        property and rotate them from this screen.
      </p>
    </div>
  );
}
