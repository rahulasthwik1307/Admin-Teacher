"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import {
  MapPin,
  Info,
  Loader2,
  Search,
  Navigation,
  Target,
  Maximize2,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Save,
  RotateCcw,
  Compass,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import dynamic from "next/dynamic"
import type { ComponentType } from "react"
import { MapSkeleton } from "@/components/ui/skeletons"

interface GeofenceMapProps {
  center: { lat: number; lng: number }
  radius: number
  collegeName: string
  onMapClick?: (lat: number, lng: number) => void
  onRadiusChange?: (radius: number) => void
}

const GeofenceMap = dynamic(
  () => import("./geofence-map") as Promise<{ default: ComponentType<GeofenceMapProps> }>,
  { ssr: false, loading: () => <MapSkeleton /> }
)

const RADIUS_PRESETS = [100, 250, 500, 750, 1000]

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
  const [searchResults, setSearchResults] = useState<{ display_name: string; lat: string; lon: string }[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [savedValues, setSavedValues] = useState({ lat: "17.4944", lng: "78.3996", radius: "250", name: "NNRG College" })

  const fetchSettings = useCallback(async () => {
    setIsLoading(true)
    try {
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
      toast.success("Geofence settings updated successfully.")
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

  function handleSearchInput(value: string) {
    setSearchQuery(value)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    if (value.trim().length < 3) {
      setSearchResults([])
      setShowDropdown(false)
      return
    }
    searchTimerRef.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const params = new URLSearchParams({
          q: value.trim(),
          format: "json",
          limit: "5",
          countrycodes: "in",
          addressdetails: "1",
        })
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?${params.toString()}`,
          { headers: { "Accept-Language": "en", "User-Agent": "FactorAttendance/1.0" } }
        )
        const data = await res.json()
        if (data && data.length > 0) {
          setSearchResults(data.map((r: any) => ({ display_name: r.display_name, lat: r.lat, lon: r.lon })))
          setShowDropdown(true)
        } else {
          setSearchResults([])
          setShowDropdown(true)
        }
      } catch {
        setSearchResults([])
        setShowDropdown(false)
      } finally {
        setIsSearching(false)
      }
    }, 400)
  }

  function handleSelectResult(result: { display_name: string; lat: string; lon: string }) {
    setLat(parseFloat(result.lat).toFixed(6))
    setLng(parseFloat(result.lon).toFixed(6))
    if (!collegeName || collegeName === "NNRG College") {
      setCollegeName(result.display_name.split(",")[0])
    }
    setShowDropdown(false)
    setSearchQuery("")
    setSearchResults([])
  }

  const handleMapClick = useCallback((newLat: number, newLng: number) => {
    setLat(newLat.toFixed(6))
    setLng(newLng.toFixed(6))
  }, [])

  const handleRadiusChange = useCallback((newRadius: number) => {
    setRadius(String(newRadius))
  }, [])

  const handleResetToSaved = () => {
    setLat(savedValues.lat)
    setLng(savedValues.lng)
    setRadius(savedValues.radius)
    setCollegeName(savedValues.name)
    toast.info("Reverted to saved settings.")
  }

  const mapCenter = useMemo(
    () => ({
      lat: parseFloat(lat) || 17.4944,
      lng: parseFloat(lng) || 78.3996,
    }),
    [lat, lng]
  )

  const mapRadius = parseInt(radius, 10) || 250
  const radiusNum = parseInt(radius, 10) || 250

  // Coverage area calculation
  const coverageArea = useMemo(() => {
    const r = parseInt(radius, 10) || 0
    const area = Math.PI * r * r
    if (area >= 1_000_000) return `${(area / 1_000_000).toFixed(2)} km²`
    return `${Math.round(area).toLocaleString()} m²`
  }, [radius])

  // Check if there are unsaved modifications
  const hasUnsavedChanges = useMemo(() => {
    return (
      lat !== savedValues.lat ||
      lng !== savedValues.lng ||
      radius !== savedValues.radius ||
      collegeName !== savedValues.name
    )
  }, [lat, lng, radius, collegeName, savedValues])

  return (
    <div className="flex flex-col gap-6">

      {/* ── Status Banner & Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-linear-to-r from-card via-card to-emerald-500/5 p-4 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="relative flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <span className="absolute inline-flex size-full animate-ping rounded-xl bg-emerald-400/40 opacity-75" />
            <ShieldCheck className="relative size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-foreground">
                {isLoading ? "Loading geofence configuration…" : savedValues.name || "Campus Geofence"}
              </h2>
              <Badge
                variant="outline"
                className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider"
              >
                Active & Enforced
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              Strict attendance verification boundary for student mobile QR check-ins
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {hasUnsavedChanges && (
            <Badge
              variant="outline"
              className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 text-xs font-semibold px-2.5 py-1 gap-1"
            >
              <Sparkles className="size-3" /> Unsaved Changes
            </Badge>
          )}
          {!isLoading && (
            <div className="hidden sm:flex items-center gap-3 text-xs font-medium text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-xl border border-border/60">
              <span className="flex items-center gap-1 font-semibold text-foreground">
                <Target className="size-3.5 text-primary" /> {savedValues.radius}m
              </span>
              <span className="text-border">|</span>
              <span className="flex items-center gap-1 font-mono">
                <MapPin className="size-3.5 text-emerald-600" />
                {parseFloat(savedValues.lat).toFixed(4)}°, {parseFloat(savedValues.lng).toFixed(4)}°
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Metric Stat Cards Row ── */}
      {!isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: Center Point */}
          <Card className="relative overflow-hidden rounded-xl border border-sky-200/80 bg-linear-to-b from-sky-500/5 via-card to-card p-3.5 lg:p-4 shadow-2xs transition-all hover:shadow-md dark:border-sky-800/60">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1 min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300">
                  Campus Center
                </span>
                <div
                  className="text-sm font-bold tracking-tight text-foreground leading-snug wrap-break-word"
                  title={collegeName || "Campus Anchor"}
                >
                  {collegeName || "Campus Anchor"}
                </div>
                <span className="text-xs font-mono text-muted-foreground">
                  {parseFloat(lat).toFixed(4)}°N, {parseFloat(lng).toFixed(4)}°E
                </span>
              </div>
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
                <MapPin className="size-4.5" />
              </div>
            </div>
          </Card>

          {/* Card 2: Boundary Radius */}
          <Card className="relative overflow-hidden rounded-xl border border-violet-200/80 bg-linear-to-b from-violet-500/5 via-card to-card p-3.5 lg:p-4 shadow-2xs transition-all hover:shadow-md dark:border-violet-800/60">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1 min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300">
                  Geofence Radius
                </span>
                <div className="text-xl font-black tracking-tight text-foreground">
                  {radiusNum} <span className="text-xs font-semibold text-muted-foreground">meters</span>
                </div>
                <span className="text-xs text-muted-foreground font-medium">
                  Interactive Draggable Boundary
                </span>
              </div>
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                <Target className="size-4.5" />
              </div>
            </div>
          </Card>

          {/* Card 3: Total Coverage Area */}
          <Card className="relative overflow-hidden rounded-xl border border-emerald-200/80 bg-linear-to-b from-emerald-500/5 via-card to-card p-3.5 lg:p-4 shadow-2xs transition-all hover:shadow-md dark:border-emerald-800/60">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1 min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  Campus Coverage
                </span>
                <div className="text-xl font-black tracking-tight text-foreground">
                  {coverageArea}
                </div>
                <span className="text-xs text-muted-foreground font-medium">
                  Verified Active Footprint
                </span>
              </div>
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Maximize2 className="size-4.5" />
              </div>
            </div>
          </Card>

          {/* Card 4: Location Detection */}
          <Card className="relative overflow-hidden rounded-xl border border-amber-200/80 bg-linear-to-b from-amber-500/5 via-card to-card p-3.5 lg:p-4 shadow-2xs transition-all hover:shadow-md dark:border-amber-800/60">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1 min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                  GPS Verification
                </span>
                <div className="text-sm sm:text-base font-bold tracking-tight text-foreground leading-snug">
                  Live & High Accuracy
                </div>
                <span className="text-xs text-muted-foreground font-medium">
                  Anti-Spoofing Active
                </span>
              </div>
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Compass className="size-4.5" />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── Main Workspace: Left Controls + Right Map Showcase ── */}
      <div className="grid gap-6 lg:grid-cols-[400px_1fr] items-stretch">

        {/* ── LEFT COLUMN: Configuration Controls ── */}
        <div className="flex flex-col gap-4.5 min-w-0">

          {/* 1. Address Search & GPS */}
          <Card className="rounded-2xl border border-border/80 shadow-xs overflow-visible">
            <CardHeader className="pb-3 pt-4 border-b border-border/60 bg-muted/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Search className="size-3.5" />
                  </div>
                  <CardTitle className="text-sm font-bold text-foreground">Find Campus Location</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3.5 p-4 overflow-visible">
              <div className="relative">
                <div className="relative">
                  <Input
                    ref={searchInputRef}
                    placeholder="Search address or college name in India..."
                    value={searchQuery}
                    onChange={(e) => handleSearchInput(e.target.value)}
                    className="h-10 pr-9 text-xs font-medium rounded-xl border-border/80"
                  />
                  {isSearching ? (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="size-4 animate-spin text-primary" />
                    </div>
                  ) : (
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/60 pointer-events-none" />
                  )}
                </div>

                {/* Dropdown Results */}
                {showDropdown && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-60 overflow-y-auto rounded-xl border border-border/90 bg-popover/95 p-1 shadow-xl backdrop-blur-md">
                    {searchResults.length > 0 ? (
                      searchResults.map((result, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors border-b border-border/40 last:border-0 cursor-pointer flex items-start gap-2"
                          onMouseDown={() => handleSelectResult(result)}
                        >
                          <MapPin className="size-3.5 shrink-0 mt-0.5 text-primary" />
                          <span className="leading-snug line-clamp-2">{result.display_name}</span>
                        </button>
                      ))
                    ) : (
                      !isSearching && (
                        <div className="px-3 py-3 text-xs text-muted-foreground text-center">
                          No locations found. Add city or state name for best results.
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestLocation}
                  disabled={isFetchingLocation}
                  className="w-full h-9 rounded-xl font-semibold text-xs gap-1.5 shadow-2xs hover:bg-muted/80 cursor-pointer"
                >
                  {isFetchingLocation ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin text-primary" />
                      Detecting Coordinates…
                    </>
                  ) : (
                    <>
                      <Navigation className="size-3.5 text-primary" />
                      Use My Current GPS Location
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 2. Geofence Parameters */}
          <Card className="rounded-2xl border border-border/80 shadow-xs">
            <CardHeader className="pb-3 pt-4 border-b border-border/60 bg-muted/20">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  <Target className="size-3.5" />
                </div>
                <CardTitle className="text-sm font-bold text-foreground">Boundary Parameters</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 p-4">
              {/* College Name */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Campus / Institution Name
                </Label>
                <Input
                  value={collegeName}
                  onChange={(e) => setCollegeName(e.target.value)}
                  className="h-10 text-xs font-semibold rounded-xl border-border/80"
                  placeholder="e.g. NNRG College"
                />
              </div>

              {/* Coordinates Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Latitude (°N)
                  </Label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    className="h-10 text-xs font-mono font-semibold rounded-xl border-border/80"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Longitude (°E)
                  </Label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    className="h-10 text-xs font-mono font-semibold rounded-xl border-border/80"
                  />
                </div>
              </div>

              {/* Radius Distance Slider & Presets */}
              <div className="flex flex-col gap-2.5 pt-1">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <span>Radius Distance</span>
                  </Label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min={50}
                      max={1000}
                      value={radius}
                      onChange={(e) => setRadius(e.target.value)}
                      className="h-7 w-20 text-center text-xs font-mono font-bold rounded-lg border-border/80"
                    />
                    <span className="text-xs font-bold text-muted-foreground">m</span>
                  </div>
                </div>

                <Slider
                  min={50}
                  max={1000}
                  step={10}
                  value={[radiusNum]}
                  onValueChange={([v]) => setRadius(String(v))}
                  className="py-1"
                />

                {/* Quick Presets */}
                <div className="flex items-center justify-between gap-1 mt-1">
                  {RADIUS_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setRadius(String(preset))}
                      className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer border ${
                        radiusNum === preset
                          ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                          : "bg-muted/50 text-muted-foreground border-border/60 hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      {preset}m
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 3. Actions & Live Status */}
          <div className="flex flex-col gap-2.5">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full h-11 rounded-xl text-xs font-bold gap-2 shadow-md shadow-primary/20 hover:shadow-lg transition-all cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving Geofence Settings…
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  Save Geofence Configuration
                </>
              )}
            </Button>

            {hasUnsavedChanges && (
              <Button
                variant="outline"
                onClick={handleResetToSaved}
                className="w-full h-9 rounded-xl text-xs font-semibold gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <RotateCcw className="size-3.5" /> Revert Unsaved Changes
              </Button>
            )}
          </div>

          {/* 4. How It Works Callout */}
          <div className="rounded-2xl border border-border/80 bg-muted/30 p-4">
            <div className="flex items-start gap-3">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary mt-0.5">
                <Info className="size-3.5" />
              </div>
              <div className="flex flex-col gap-1 text-xs">
                <span className="font-bold text-foreground">How Verification Works</span>
                <p className="text-muted-foreground leading-relaxed">
                  Students must be within <strong>{radiusNum} meters</strong> of the campus center coordinate to successfully scan dynamic attendance QR codes. Scans outside this perimeter are rejected automatically.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: Interactive Geofence Map Showcase ── */}
        <div className="flex flex-col min-h-137.5 lg:min-h-180 h-full min-w-0">
          <Card className="h-full flex flex-col overflow-hidden rounded-2xl border border-border/80 shadow-sm p-0 py-0 gap-0">
            <CardContent className="p-0 px-0 py-0 flex-1 relative w-full h-full min-h-137.5 lg:min-h-180 overflow-hidden">
              <GeofenceMap
                center={mapCenter}
                radius={mapRadius}
                collegeName={collegeName}
                onMapClick={handleMapClick}
                onRadiusChange={handleRadiusChange}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}