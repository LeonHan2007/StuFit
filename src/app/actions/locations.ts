"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const DEFAULT_LOCATION_RADIUS_METERS = 150;

export async function addWorkoutLocation(
  name: string,
  latitude: number,
  longitude: number
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  if (!name.trim()) throw new Error("Name is required");
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new Error("Invalid coordinates");
  }

  const { error } = await supabase.from("workout_locations").insert({
    user_id: user.id,
    name: name.trim(),
    latitude,
    longitude,
    radius_meters: DEFAULT_LOCATION_RADIUS_METERS,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/settings/accountability");
}

export async function removeWorkoutLocation(locationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("workout_locations")
    .delete()
    .eq("id", locationId)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/settings/accountability");
}
