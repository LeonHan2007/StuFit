"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import {
  Dumbbell,
  History,
  LayoutDashboard,
  ListChecks,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const sideNavItems = [
  [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/plan", label: "Plan", icon: ListChecks },
  ],
  [
    { href: "/workout/history", label: "History", icon: History },
    { href: "/social", label: "Social", icon: Users },
  ],
] as const;

function WorkoutNavIcon({ active }: { active: boolean }) {
  const { pending } = useLinkStatus();

  return (
    <Dumbbell
      className={cn("h-7 w-7 text-white", pending && !active && "opacity-70")}
      strokeWidth={2.25}
    />
  );
}

function NavPending({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) {
  const { pending } = useLinkStatus();

  return (
    <span
      className={cn(
        "flex flex-col items-center gap-1",
        pending && !active && "text-primary"
      )}
    >
      {children}
    </span>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const workoutActive =
    pathname === "/workout" || pathname.startsWith("/workout/live");

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur-md pb-safe">
      <div className="mx-auto flex max-w-5xl items-end justify-around px-2 py-2">
        {sideNavItems[0].map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-w-[64px] flex-col items-center gap-1 rounded-lg px-2 py-2 text-xs transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <NavPending active={active}>
                <Icon className="h-5 w-5" />
                <span className="max-[360px]:sr-only">{label}</span>
              </NavPending>
            </Link>
          );
        })}

        <Link
          href="/workout"
          aria-label="Workout"
          className={cn(
            "relative -mt-7 flex h-16 w-16 shrink-0 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95",
            workoutActive
              ? "bg-primary ring-4 ring-primary/30"
              : "bg-primary hover:bg-primary/90"
          )}
        >
          <WorkoutNavIcon active={workoutActive} />
        </Link>

        {sideNavItems[1].map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-w-[64px] flex-col items-center gap-1 rounded-lg px-2 py-2 text-xs transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <NavPending active={active}>
                <Icon className="h-5 w-5" />
                <span className="max-[360px]:sr-only">{label}</span>
              </NavPending>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
