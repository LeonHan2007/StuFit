"use client";

import { useCallback, useRef, useState } from "react";
import { checkUsernameAvailable } from "@/app/actions/profile";
import { normalizeUsername } from "@/lib/profile/username";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function UsernameField({
  defaultValue,
  onChange,
}: {
  defaultValue: string;
  onChange: (value: string) => void;
}) {
  const [value, setValue] = useState(defaultValue);
  const [status, setStatus] = useState<"idle" | "checking" | "ok" | "error">(
    "idle"
  );
  const [message, setMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleCheck = useCallback(
    (next: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);

      const normalized = normalizeUsername(next);
      const unchanged = normalized === normalizeUsername(defaultValue);

      if (!normalized || unchanged) {
        setStatus("idle");
        setMessage(null);
        return;
      }

      setStatus("checking");
      setMessage(null);

      timerRef.current = setTimeout(async () => {
        const result = await checkUsernameAvailable(normalized);
        if (result.available) {
          setStatus("ok");
          setMessage("Username available");
        } else {
          setStatus("error");
          setMessage(result.error ?? "Unavailable");
        }
      }, 400);
    },
    [defaultValue]
  );

  return (
    <div className="space-y-2">
      <Label htmlFor="username">Username</Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          @
        </span>
        <Input
          id="username"
          value={value}
          onChange={(e) => {
            const next = normalizeUsername(e.target.value).replace(
              /[^a-z0-9_]/g,
              ""
            );
            setValue(next);
            onChange(next);
            scheduleCheck(next);
          }}
          className="pl-7"
          autoComplete="username"
          maxLength={30}
        />
      </div>
      {status === "checking" && (
        <p className="text-xs text-muted-foreground">Checking…</p>
      )}
      {status === "ok" && (
        <p className="text-xs text-green-600">{message}</p>
      )}
      {status === "error" && message && (
        <p className="text-xs text-destructive">{message}</p>
      )}
      <p className="text-xs text-muted-foreground">
        3–30 characters, lowercase letters, numbers, underscores
      </p>
    </div>
  );
}
