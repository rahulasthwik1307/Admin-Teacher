"use client"

import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"

export interface GeofenceSettingsData {
  id: string
  college_name: string
  latitude: number
  longitude: number
  radius_meters: number
  updated_at?: string
}

export async function fetchGeofenceSettings(): Promise<GeofenceSettingsData | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("geofence_settings")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== "PGRST116") {
    console.error("Fetch geofence error:", error)
  }

  return data || null
}

export function useGeofenceSettings() {
  return useQuery({
    queryKey: ["admin-geofence-settings"],
    queryFn: fetchGeofenceSettings,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  })
}
