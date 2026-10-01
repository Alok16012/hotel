"use client";

import Link from "next/link";
import { LogOut, Settings, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCurrentUser } from "@/lib/repository";
import { ROLE_LABEL, SHIFT_LABEL } from "@/data/team";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function SidebarFooter({ collapsed }: { collapsed: boolean }) {
  const user = getCurrentUser();

  const trigger = (
    <button
      type="button"
      className={cn(
        "group flex w-full items-center rounded-[var(--radius-card)] text-left",
        "transition-colors duration-[130ms] ease-[var(--ease-out-quint)]",
        "hover:bg-white/[0.06] active:bg-white/[0.09]",
        collapsed ? "justify-center p-1.5" : "gap-2 p-1.5",
      )}
      aria-label={`Signed in as ${user.name}. Open account menu`}
    >
      <Avatar
        initials={user.avatarInitials}
        size="sm"
        tone="accent"
        presence={user.status}
        className="shrink-0"
      />
      {!collapsed ? (
        <span className="min-w-0 flex-1">
          <span className="block truncate text-meta font-semibold leading-tight text-text-onDark">
            {user.name}
          </span>
          <span className="block truncate text-micro leading-tight text-text-onDark-muted">
            {ROLE_LABEL[user.role]} · {user.shiftStart}-{user.shiftEnd}
          </span>
        </span>
      ) : null}
    </button>
  );

  return (
    <div className="border-t border-hairline-inverse p-2">
      <DropdownMenu>
        {collapsed ? (
          <Tooltip delayDuration={120}>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={10}>
              {user.name}
            </TooltipContent>
          </Tooltip>
        ) : (
          <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
        )}

        <DropdownMenuContent align="start" side="top" sideOffset={8} className="w-56">
          <DropdownMenuLabel>{ROLE_LABEL[user.role]}</DropdownMenuLabel>
          <div className="px-2 pb-1.5">
            <p className="truncate text-body font-medium text-text-primary">{user.name}</p>
            <p className="truncate text-meta text-text-muted">{user.email}</p>
          </div>
          <DropdownMenuSeparator />
          <div className="flex items-center justify-between px-2 py-1.5 text-meta">
            <span className="text-text-muted">{SHIFT_LABEL[user.shift]}</span>
            <span className="font-medium tabular-nums text-text-secondary">
              {user.shiftStart} - {user.shiftEnd}
            </span>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/team">
              <UserRound />
              My profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings">
              <Settings />
              Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem intent="critical" disabled>
            <LogOut />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
