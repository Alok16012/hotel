"use client";

import * as React from "react";
import { RotateCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";

/**
 * Route-level error boundary. Recovery is a real action, not a suggestion to
 * reload the page: `reset` re-renders the segment with the shell intact, so the
 * operator does not lose their place in the application.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Stays a console error in this build. A real deployment forwards it to an
    // error reporter here, which is the only line that would change.
    console.error(error);
  }, [error]);

  return (
    <EmptyState
      icon={TriangleAlert}
      title="This screen could not be loaded"
      description={
        error.digest
          ? `Something failed while rendering. Reference ${error.digest}.`
          : "Something failed while rendering this screen. Your other work is unaffected."
      }
      action={
        <Button variant="secondary" size="sm" onClick={reset}>
          <RotateCw />
          Try again
        </Button>
      }
    />
  );
}
