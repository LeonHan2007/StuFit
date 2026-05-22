"use client";

import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CalendarSyncButton() {
  const [loading, setLoading] = useState(false);

  async function sync() {
    setLoading(true);
    try {
      const res = await fetch("/api/calendar/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Sync failed");
        return;
      }
      toast.success(`Scheduled ${data.scheduled} workout(s)`);
      if (data.errors?.length) {
        toast.warning(data.errors.join(", "));
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button className="h-12 w-full" onClick={sync} disabled={loading}>
      {loading ? (
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
      ) : (
        <RefreshCw className="mr-2 h-5 w-5" />
      )}
      Sync next 2 weeks
    </Button>
  );
}
