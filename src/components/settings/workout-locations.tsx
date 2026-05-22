"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MapPin, Plus, Trash2, Crosshair } from "lucide-react";
import {
  addWorkoutLocation,
  removeWorkoutLocation,
} from "@/app/actions/locations";
import {
  AddressAutocomplete,
  type AddressSuggestion,
} from "@/components/settings/address-autocomplete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export interface WorkoutLocationRow {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
}

function readCoords(position: GeolocationPosition) {
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  };
}

export function WorkoutLocationsManager({
  locations,
}: {
  locations: WorkoutLocationRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState<{
    latitude: number;
    longitude: number;
    source: "gps" | "address";
  } | null>(null);
  const [locating, setLocating] = useState(false);

  function captureCurrentLocation() {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported on this device");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ ...readCoords(pos), source: "gps" });
        setLocating(false);
        toast.success("Current location captured");
      },
      (err) => {
        setLocating(false);
        toast.error(err.message || "Could not get location");
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  function handleAddressSelect(suggestion: AddressSuggestion) {
    setAddress(suggestion.label);
    setCoords({
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
      source: "address",
    });
    if (!name.trim()) {
      const short =
        suggestion.label.split(",")[0]?.trim() || suggestion.label;
      setName(short);
    }
    toast.success("Address selected");
  }

  function handleAdd() {
    if (!coords) {
      toast.error("Set a location using your address or current GPS");
      return;
    }
    startTransition(async () => {
      try {
        await addWorkoutLocation(name, coords.latitude, coords.longitude);
        setName("");
        setAddress("");
        setCoords(null);
        toast.success("Location saved");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to save");
      }
    });
  }

  function handleRemove(id: string) {
    startTransition(async () => {
      try {
        await removeWorkoutLocation(id);
        toast.success("Location removed");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to remove");
      }
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Streaks only count when you finish a planned workout, spend a reasonable
        amount of time training, and stay inside an approved location for the
        full session.
      </p>

      {locations.length > 0 ? (
        <ul className="space-y-2">
          {locations.map((loc) => (
            <li
              key={loc.id}
              className="flex flex-col gap-2 rounded-lg border px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-medium">{loc.name}</p>
                <p className="break-all text-xs text-muted-foreground">
                  {loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 shrink-0 self-end text-destructive sm:self-center"
                onClick={() => handleRemove(loc.id)}
                disabled={pending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
          No locations yet. Add your gym, home setup, or campus rec center.
        </p>
      )}

      <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <MapPin className="h-4 w-4 text-primary" />
          Add location
        </div>
        <div className="space-y-2">
          <Label htmlFor="loc-name">Name</Label>
          <Input
            id="loc-name"
            placeholder="e.g. Campus gym"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <AddressAutocomplete
          value={address}
          onChange={(v) => {
            setAddress(v);
            if (coords?.source === "address") setCoords(null);
          }}
          onSelect={handleAddressSelect}
          disabled={pending}
        />
        <div className="relative flex items-center gap-2 py-1 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full gap-2"
          onClick={captureCurrentLocation}
          disabled={locating}
        >
          <Crosshair className="h-4 w-4" />
          {locating ? "Getting location…" : "Use my current location"}
        </Button>
        {coords && (
          <Badge variant="secondary" className="w-fit">
            {coords.source === "gps" ? "GPS" : "Address"} ·{" "}
            {coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)}
          </Badge>
        )}
        <Button
          type="button"
          className="h-11 w-full gap-2"
          onClick={handleAdd}
          disabled={pending || !name.trim() || !coords}
        >
          <Plus className="h-4 w-4" />
          Save location
        </Button>
      </div>
    </div>
  );
}
