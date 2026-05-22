"use client";

import { MapPin, MapPinOff, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export type LocationTrackingStatus = "idle" | "checking" | "ok" | "out" | "denied" | "unavailable";

export function LocationStatus({
  status,
  hasLocations,
}: {
  status: LocationTrackingStatus;
  hasLocations: boolean;
}) {
  if (!hasLocations) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
        <p className="text-amber-800 dark:text-amber-200">
          Add a workout location in Accountability settings for this session to
          count toward your streak.
        </p>
      </div>
    );
  }

  const config = {
    idle: {
      icon: MapPin,
      text: "Starting location check-ins…",
      className: "border-border/60 bg-muted/30 text-muted-foreground",
    },
    checking: {
      icon: MapPin,
      text: "Checking location…",
      className: "border-border/60 bg-muted/30 text-muted-foreground",
    },
    ok: {
      icon: MapPin,
      text: "At an approved workout location",
      className: "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400",
    },
    out: {
      icon: MapPinOff,
      text: "Outside approved locations — streak won’t count",
      className: "border-destructive/30 bg-destructive/10 text-destructive",
    },
    denied: {
      icon: AlertTriangle,
      text: "Location permission denied — enable GPS for streak credit",
      className: "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200",
    },
    unavailable: {
      icon: AlertTriangle,
      text: "Location unavailable on this device",
      className: "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200",
    },
  }[status];

  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg border px-3 py-2 text-sm",
        config.className
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="min-w-0 break-words">{config.text}</span>
    </div>
  );
}
