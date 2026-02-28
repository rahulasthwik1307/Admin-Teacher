"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MapPin, Info, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import dynamic from "next/dynamic"

// Dynamically import the map component to avoid SSR issues with Leaflet
const GeofenceMap = dynamic(() => import("./geofence-map"), { ssr: false })

export default function GeofencePage() {
  const [lat, setLat] = useState("17.4944")
  const [lng, setLng] = useState("78.3996")
  const [radius, setRadius] = useState("250")
  const [collegeName, setCollegeName] = useState("NNRG College")
  const [existingId, setExistingId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isFetchingLocation, setIsFetchingLocation] = useState(false)

  // Fetch existing geofence settings
  const fetchSettings = useCallback(async () => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("geofence_settings")
        .select("*")
        .limit(1)
        .single()

      if (error && error.code !== "PGRST116") {
        // PGRST116 = no rows found — that's ok, we keep defaults
        console.error("Fetch geofence error:", error)
      }

      if (data) {
        setExistingId(data.id)
        setCollegeName(data.college_name)
        setLat(String(data.latitude))
        setLng(String(data.longitude))
        setRadius(String(data.radius_meters))
      }
    } catch {
      console.error("Unexpected error fetching geofence")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  async function handleSave() {
    if (!lat || !lng || !radius || !collegeName) {
      toast.error("Please fill all fields")
      return
    }

    setIsSaving(true)
    try {
      const supabase = createClient()

      const payload = {
        college_name: collegeName,
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
        radius_meters: parseInt(radius, 10),
        updated_at: new Date().toISOString(),
      }

      let saveError

      if (existingId) {
        // Update existing record
        const { error } = await supabase
          .from("geofence_settings")
          .update(payload)
          .eq("id", existingId)
        saveError = error
      } else {
        // Insert new record
        const { data, error } = await supabase
          .from("geofence_settings")
          .insert(payload)
          .select("id")
          .single()
        saveError = error
        if (data) setExistingId(data.id)
      }

      if (saveError) {
        toast.error(`Save failed: ${saveError.message}`, {
          style: { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" },
        })
        return
      }

      // System log
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from("system_logs").insert({
          performed_by: user.id,
          action_type: "update",
          description: `Geofence updated with radius ${radius} meters`,
        })
      }

      toast.success("Geofence updated successfully.")
    } catch {
      toast.error("An unexpected error occurred.", {
        style: { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" },
      })
    } finally {
      setIsSaving(false)
    }
  }

  function handleTestLocation() {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.", {
        style: { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" },
      })
      return
    }

    setIsFetchingLocation(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLat = position.coords.latitude.toFixed(6)
        const newLng = position.coords.longitude.toFixed(6)
        setLat(newLat)
        setLng(newLng)
        setIsFetchingLocation(false)
        toast.success(`Location detected: ${newLat}, ${newLng}`)
      },
      (error) => {
        setIsFetchingLocation(false)
        if (error.code === error.PERMISSION_DENIED) {
          toast.error("Location access denied. Please allow location access and try again.", {
            style: { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" },
          })
        } else {
          toast.error(`Failed to get location: ${error.message}`, {
            style: { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" },
          })
        }
      },
      { enableHighAccuracy: true, timeout: 15000 }
    )
  }

  // Memoize map props to avoid unnecessary re-renders
  const mapCenter = useMemo(
    () => ({
      lat: parseFloat(lat) || 17.4944,
      lng: parseFloat(lng) || 78.3996,
    }),
    [lat, lng]
  )
  const mapRadius = parseInt(radius, 10) || 250

  return (
    <div className="flex flex-col gap-6">
      {/* Subtitle */}
      <p className="text-sm text-muted-foreground">
        Define the campus boundary for attendance verification.
      </p>

      {/* Status banner */}
      <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
        <span className="relative flex size-2.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
        </span>
        <span className="text-sm font-medium text-emerald-700">
          {isLoading ? "Loading geofence…" : `Geofence Active — ${collegeName}`}
        </span>
      </div>

      {/* Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Geofence Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="geo-lat">Latitude</Label>
              <Input
                id="geo-lat"
                type="number"
                step="0.0001"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="geo-lng">Longitude</Label>
              <Input
                id="geo-lng"
                type="number"
                step="0.0001"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="geo-radius">Radius (meters)</Label>
              <Input
                id="geo-radius"
                type="number"
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="geo-name">College Name</Label>
              <Input
                id="geo-name"
                value={collegeName}
                onChange={(e) => setCollegeName(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interactive Map */}
      <Card>
        <CardContent className="p-0 overflow-hidden rounded-lg">
          <GeofenceMap center={mapCenter} radius={mapRadius} collegeName={collegeName} />
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button onClick={handleSave} className="gap-2" disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Geofence"
          )}
        </Button>
        <Button variant="outline" onClick={handleTestLocation} className="gap-2" disabled={isFetchingLocation}>
          {isFetchingLocation ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Fetching...
            </>
          ) : (
            <>
              <MapPin className="size-4" />
              Test Location
            </>
          )}
        </Button>
      </div>

      {/* Info card */}
      <div className="flex gap-3 rounded-lg border border-border bg-accent/50 px-4 py-3">
        <Info className="size-4 shrink-0 mt-0.5 text-primary" />
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-foreground">Current Setting</span>
          <span className="text-xs text-muted-foreground">
            Radius {radius} meters covers approximately the main campus buildings. Students outside
            this boundary cannot mark attendance.
          </span>
        </div>
      </div>
    </div>
  )
}
