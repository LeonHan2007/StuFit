"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { recordLocationSample } from "@/app/actions/workout";
import type { LocationTrackingStatus } from "@/components/workout/location-status";
import { LOCATION_SAMPLE_INTERVAL_SECONDS } from "@/lib/workout/streak-validation";

export function useSessionLocationTracking(
  sessionId: string,
  enabled: boolean
) {
  const [status, setStatus] = useState<LocationTrackingStatus>(
    enabled ? "idle" : "unavailable"
  );
  const checkingRef = useRef(false);

  const checkLocation = useCallback(async () => {
    if (!enabled || checkingRef.current) return;
    if (!navigator.geolocation) {
      setStatus("unavailable");
      return;
    }

    checkingRef.current = true;
    setStatus((s) => (s === "denied" ? "denied" : "checking"));

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { withinBounds } = await recordLocationSample(
            sessionId,
            pos.coords.latitude,
            pos.coords.longitude
          );
          setStatus(withinBounds ? "ok" : "out");
        } catch {
          setStatus("out");
        } finally {
          checkingRef.current = false;
        }
      },
      (err) => {
        checkingRef.current = false;
        if (err.code === err.PERMISSION_DENIED) {
          setStatus("denied");
        } else {
          setStatus("unavailable");
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30_000 }
    );
  }, [sessionId, enabled]);

  useEffect(() => {
    if (!enabled) {
      setStatus("unavailable");
      return;
    }

    checkLocation();
    const interval = setInterval(
      checkLocation,
      LOCATION_SAMPLE_INTERVAL_SECONDS * 1000
    );
    return () => clearInterval(interval);
  }, [enabled, checkLocation]);

  return { status, checkLocation };
}
