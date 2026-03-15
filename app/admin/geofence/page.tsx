"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { MapPin, Info, Loader2, Search, Navigation, Target, Maximize2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import dynamic from "next/dynamic"
import type { ComponentType } from "react"

interface GeofenceMapProps {
  center: { lat: number; lng: number }
  radius: number
  collegeName: string
  onMapClick?: (lat: number, lng: number) => void
}

const GeofenceMap = dynamic(
  () => import("./geofence-map") as Promise<{ default: ComponentType<GeofenceMapProps> }>,
  { ssr: false, loading: () => (
    <div className="flex h-full min-h-[480px] items-center justify-center rounded-xl bg-muted/30">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="size-8 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Loading map…</span>
      </div>
    </div>
  )}
)

export default function GeofencePage() {
  const [lat, setLat] = useState("17.4944")
  const [lng, setLng] = useState("78.3996")
  const [radius, setRadius] = useState("250")
  const [collegeName, setCollegeName] = useState("NNRG College")
  const [existingId, setExistingId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isFetchingLocation, setIsFetchingLocation] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [savedValues, setSavedValues] = useState({ lat: "17.4944", lng: "78.3996", radius: "250", name: "NNRG College" })

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
        console.error("Fetch geofence error:", error)
      }

      if (data) {
        setExistingId(data.id)
        setCollegeName(data.college_name)
        setLat(String(data.latitude))
        setLng(String(data.longitude))
        setRadius(String(data.radius_meters))
        setSavedValues({
          lat: String(data.latitude),
          lng: String(data.longitude),
          radius: String(data.radius_meters),
          name: data.college_name,
        })
      }
    } catch {
      console.error("Unexpected error fetching geofence")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetchSettings() }, [fetchSettings])

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
        const { error } = await supabase.from("geofence_settings").update(payload).eq("id", existingId)
        saveError = error
      } else {
        const { data, error } = await supabase.from("geofence_settings").insert(payload).select("id").single()
        saveError = error
        if (data) setExistingId(data.id)
      }
      if (saveError) {
        toast.error(`Save failed: ${saveError.message}`)
        return
      }
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from("system_logs").insert({
          performed_by: user.id,
          action_type: "update",
          description: `Geofence updated with radius ${radius} meters`,
        })
      }
      setSavedValues({ lat, lng, radius, name: collegeName })
      toast.success("Geofence updated successfully.")
    } catch {
      toast.error("An unexpected error occurred.")
    } finally {
      setIsSaving(false)
    }
  }

  function handleTestLocation() {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.")
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
          toast.error("Location access denied. Please allow location access.")
        } else {
          toast.error(`Failed to get location: ${error.message}`)
        }
      },
      { enableHighAccuracy: true, timeout: 15000 }
    )
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return
    setIsSearching(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1`,
        { headers: { "Accept-Language": "en" } }
      )
      const data = await res.json()
      if (data && data.length > 0) {
        const result = data[0]
        setLat(parseFloat(result.lat).toFixed(6))
        setLng(parseFloat(result.lon).toFixed(6))
        if (!collegeName || collegeName === "NNRG College") setCollegeName(result.display_name.split(",")[0])
        toast.success(`Found: ${result.display_name.split(",").slice(0, 2).join(",")}`)
      } else {
        toast.error("Location not found. Try a more specific name.")
      }
    } catch {
      toast.error("Search failed. Check your connection.")
    } finally {
      setIsSearching(false)
    }
  }

  const handleMapClick = useCallback((newLat: number, newLng: number) => {
    setLat(newLat.toFixed(6))
    setLng(newLng.toFixed(6))
  }, [])

  const mapCenter = useMemo(() => ({
    lat: parseFloat(lat) || 17.4944,
    lng: parseFloat(lng) || 78.3996,
  }), [lat, lng])

  const mapRadius = parseInt(radius, 10) || 250

  // Coverage area calculation
  const coverageArea = useMemo(() => {
    const r = parseInt(radius, 10) || 0
    const area = Math.PI * r * r
    if (area >= 1_000_000) return `${(area / 1_000_000).toFixed(2)} km²`
    return `${Math.round(area)} m²`
  }, [radius])

  const radiusNum = parseInt(radius, 10) || 250

  return (
    <div className="flex flex-col gap-5">

      {/* Status banner */}
      <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
          </span>
          <span className="text-sm font-semibold text-emerald-700">
            {isLoading ? "Loading geofence…" : `Geofence Active — ${savedValues.name}`}
          </span>
        </div>
        {!isLoading && (
          <div className="hidden sm:flex items-center gap-4 text-xs text-emerald-600">
            <span className="flex items-center gap-1"><Target className="size-3" />{savedValues.radius}m radius</span>
            <span className="flex items-center gap-1"><MapPin className="size-3" />{parseFloat(savedValues.lat).toFixed(4)}, {parseFloat(savedValues.lng).toFixed(4)}</span>
          </div>
        )}
      </div>

      {/* Stat chips */}
      {!isLoading && (
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
            <Target className="size-3.5" /> Radius: {radiusNum}m
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-700">
            <Maximize2 className="size-3.5" /> Coverage: {coverageArea}
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-700">
            <Navigation className="size-3.5" /> {parseFloat(lat).toFixed(4)}°N, {parseFloat(lng).toFixed(4)}°E
          </div>
        </div>
      )}

      {/* Main layout: form left, map right on desktop */}
      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">

        {/* LEFT — Form */}
        <div className="flex flex-col gap-4">

          {/* Address Search */}
          <Card>
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Search className="size-4 text-primary" /> Search Location
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. NNRG College Hyderabad"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="text-sm"
                />
                <Button size="sm" onClick={handleSearch} disabled={isSearching} className="shrink-0">
                  {isSearching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                </Button>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">Or click directly on the map to set location</p>
            </CardContent>
          </Card>

          {/* Configuration */}
          <Card>
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm font-semibold">Geofence Configuration</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 pb-4">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">College Name</Label>
                <Input value={collegeName} onChange={(e) => setCollegeName(e.target.value)} className="text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Latitude</Label>
                  <Input
                    type="number" step="0.0001" value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    className="text-sm font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Longitude</Label>
                  <Input
                    type="number" step="0.0001" value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    className="text-sm font-mono"
                  />
                </div>
              </div>

              {/* Radius slider */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Radius</Label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number" value={radius}
                      onChange={(e) => setRadius(e.target.value)}
                      className="h-7 w-20 text-center text-xs font-mono"
                    />
                    <span className="text-xs text-muted-foreground">m</span>
                  </div>
                </div>
                <Slider
                  min={50} max={1000} step={10}
                  value={[radiusNum]}
                  onValueChange={([v]) => setRadius(String(v))}
                  className="mt-1"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>50m</span>
                  <span>500m</span>
                  <span>1000m</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Live coordinates card */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="size-3.5 text-primary" />
                <span className="text-xs font-semibold text-primary">Current Coordinates</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-background/80 px-3 py-2">
                  <div className="text-[10px] text-muted-foreground mb-0.5">Latitude</div>
                  <div className="font-mono font-semibold text-foreground">{parseFloat(lat).toFixed(6) || "—"}</div>
                </div>
                <div className="rounded-lg bg-background/80 px-3 py-2">
                  <div className="text-[10px] text-muted-foreground mb-0.5">Longitude</div>
                  <div className="font-mono font-semibold text-foreground">{parseFloat(lng).toFixed(6) || "—"}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            <Button onClick={handleSave} disabled={isSaving} className="w-full gap-2">
              {isSaving ? <><Loader2 className="size-4 animate-spin" />Saving…</> : "Save Geofence"}
            </Button>
            <Button variant="outline" onClick={handleTestLocation} disabled={isFetchingLocation} className="w-full gap-2">
              {isFetchingLocation
                ? <><Loader2 className="size-4 animate-spin" />Fetching…</>
                : <><Navigation className="size-4" />Use My Current Location</>
              }
            </Button>
          </div>

          {/* Info */}
          <div className="flex gap-3 rounded-xl border border-border bg-accent/40 px-4 py-3">
            <Info className="size-4 shrink-0 mt-0.5 text-primary" />
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold text-foreground">How it works</span>
              <span className="text-xs text-muted-foreground leading-relaxed">
                Students must be within <strong>{radiusNum}m</strong> of the college to scan attendance QR codes. Coverage area: {coverageArea}.
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT — Map */}
        <Card className="overflow-hidden min-h-[500px] lg:min-h-0">
          <CardContent className="p-0 h-full" style={{ minHeight: 500 }}>
            <GeofenceMap
              center={mapCenter}
              radius={mapRadius}
              collegeName={collegeName}
              onMapClick={handleMapClick}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}