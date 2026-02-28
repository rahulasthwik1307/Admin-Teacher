"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MapPin, Info } from "lucide-react"

export default function GeofencePage() {
  const [lat, setLat] = useState("17.4944")
  const [lng, setLng] = useState("78.3996")
  const [radius, setRadius] = useState("250")
  const [collegeName, setCollegeName] = useState("NNRG College")

  function handleSave() {
    if (!lat || !lng || !radius || !collegeName) {
      toast.error("Please fill all fields")
      return
    }
    toast.success("Geofence updated successfully.")
  }

  function handleTestLocation() {
    toast.info("Location test initiated. Your current position will be checked against the geofence boundary.")
  }

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
          Geofence Active — {collegeName}
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

      {/* Map placeholder */}
      <Card>
        <CardContent className="p-0">
          <div className="flex flex-col items-center justify-center gap-3 rounded-lg bg-muted/50 py-24 px-6 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-muted">
              <MapPin className="size-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">
              Map Preview — Campus Boundary
            </p>
            <p className="text-xs text-muted-foreground">
              Interactive map will be available after backend integration
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button onClick={handleSave} className="gap-2">
          Save Geofence
        </Button>
        <Button variant="outline" onClick={handleTestLocation} className="gap-2">
          <MapPin className="size-4" />
          Test Location
        </Button>
      </div>

      {/* Info card */}
      <div className="flex gap-3 rounded-lg border border-border bg-accent/50 px-4 py-3">
        <Info className="size-4 shrink-0 mt-0.5 text-primary" />
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-foreground">Current Setting</span>
          <span className="text-xs text-muted-foreground">
            Radius {radius} meters covers approximately the main campus buildings. Students outside this boundary cannot mark attendance.
          </span>
        </div>
      </div>
    </div>
  )
}
