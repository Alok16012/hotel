import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";

export default function NotFound() {
  return (
    <div className="grid h-dvh place-items-center bg-canvas">
      <EmptyState
        icon={Compass}
        title="No such screen"
        description="That address does not match anything in this application."
        action={
          <Button asChild variant="secondary" size="sm">
            <Link href="/dashboard">Go to Command Center</Link>
          </Button>
        }
      />
    </div>
  );
}
