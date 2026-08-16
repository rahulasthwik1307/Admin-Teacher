"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import { Globe, Map as MapIcon, Crosshair, Sparkles } from "lucide-react"

export interface GeofenceMapProps {
  center: { lat: number; lng: number }
  radius: number
  collegeName: string
  onMapClick?: (lat: number, lng: number) => void
  onRadiusChange?: (radius: number) => void
}

// Esri World Imagery raster tile source with maxzoom: 18 to allow overzooming without "Map data not available" tiles
const SATELLITE_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    "esri-satellite": {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      maxzoom: 18,
      attribution: "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, USDA, USGS, AeroGRID, IGN",
    },
  },
  layers: [
    {
      id: "esri-satellite-layer",
      type: "raster",
      source: "esri-satellite",
      minzoom: 0,
      maxzoom: 22,
    },
  ],
}

const STREET_STYLE = "https://tiles.openfreemap.org/styles/liberty"

function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000 // Earth's radius in meters
  const phi1 = (lat1 * Math.PI) / 180
  const phi2 = (lat2 * Math.PI) / 180
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) *
    Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c)
}

export default function GeofenceMap({
  center,
  radius,
  collegeName,
  onMapClick,
  onRadiusChange,
}: GeofenceMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markerRef = useRef<maplibregl.Marker | null>(null)
  const radiusHandleRef = useRef<maplibregl.Marker | null>(null)
  const isDraggingRadiusRef = useRef(false)
  const isInitialized = useRef(false)
  const [mapStyleType, setMapStyleType] = useState<"streets" | "satellite">("streets")
  const [liveRadius, setLiveRadius] = useState(radius)

  // Track latest center and radius in refs for event callbacks and style reload listeners
  const centerRef = useRef(center)
  const radiusRef = useRef(radius)
  const collegeNameRef = useRef(collegeName)
  centerRef.current = center
  radiusRef.current = radius
  collegeNameRef.current = collegeName

  // Sync internal live radius with prop when not actively dragging
  useEffect(() => {
    if (!isDraggingRadiusRef.current) {
      setLiveRadius(radius)
    }
  }, [radius])

  // Convert radius in meters to GeoJSON Polygon
  const createGeoJSONCircle = useCallback(
    (centerCoords: [number, number], radiusMeters: number, points = 64) => {
      const coords = { lat: centerCoords[1], lng: centerCoords[0] }
      const km = radiusMeters / 1000
      const distLat = km / 110.574
      const distLng = km / (111.32 * Math.cos((coords.lat * Math.PI) / 180))
      const polyCoords: [number, number][] = []
      for (let i = 0; i < points; i++) {
        const theta = (i / points) * (2 * Math.PI)
        polyCoords.push([
          coords.lng + distLng * Math.cos(theta),
          coords.lat + distLat * Math.sin(theta),
        ])
      }
      polyCoords.push(polyCoords[0])
      return {
        type: "Feature" as const,
        geometry: { type: "Polygon" as const, coordinates: [polyCoords] },
        properties: { radius: radiusMeters },
      }
    },
    []
  )

  // GeoJSON for concentric guide rings (at 33% and 66%)
  const createGuideRingsGeoJSON = useCallback(
    (centerCoords: [number, number], radiusMeters: number) => {
      const r1 = Math.round(radiusMeters * 0.33)
      const r2 = Math.round(radiusMeters * 0.66)
      return {
        type: "FeatureCollection" as const,
        features: [
          createGeoJSONCircle(centerCoords, r1),
          createGeoJSONCircle(centerCoords, r2),
        ],
      }
    },
    [createGeoJSONCircle]
  )

  // GeoJSON for distance guide labels
  const createGuideLabelsGeoJSON = useCallback(
    (centerCoords: [number, number], radiusMeters: number) => {
      const coords = { lat: centerCoords[1], lng: centerCoords[0] }
      const r1 = Math.round(radiusMeters * 0.33)
      const r2 = Math.round(radiusMeters * 0.66)
      const distLng1 = (r1 / 1000) / (111.32 * Math.cos((coords.lat * Math.PI) / 180))
      const distLng2 = (r2 / 1000) / (111.32 * Math.cos((coords.lat * Math.PI) / 180))
      const distLngMax = (radiusMeters / 1000) / (111.32 * Math.cos((coords.lat * Math.PI) / 180))

      return {
        type: "FeatureCollection" as const,
        features: [
          {
            type: "Feature" as const,
            geometry: { type: "Point" as const, coordinates: [coords.lng + distLng1, coords.lat] },
            properties: { label: `${r1}m` },
          },
          {
            type: "Feature" as const,
            geometry: { type: "Point" as const, coordinates: [coords.lng + distLng2, coords.lat] },
            properties: { label: `${r2}m` },
          },
          {
            type: "Feature" as const,
            geometry: { type: "Point" as const, coordinates: [coords.lng + distLngMax, coords.lat] },
            properties: { label: `${radiusMeters}m Boundary` },
          },
        ],
      }
    },
    []
  )

  // Get East handle position on the circle perimeter
  const getHandlePosition = useCallback(
    (centerCoords: { lat: number; lng: number }, radiusMeters: number): [number, number] => {
      const km = radiusMeters / 1000
      const distLng = km / (111.32 * Math.cos((centerCoords.lat * Math.PI) / 180))
      return [centerCoords.lng + distLng, centerCoords.lat]
    },
    []
  )

  // Add / Re-add map sources & layers (called on style.load)
  const setupLayersAndSources = useCallback(
    (map: maplibregl.Map, currentCenter: { lat: number; lng: number }, currentRadius: number) => {
      const circleData = createGeoJSONCircle([currentCenter.lng, currentCenter.lat], currentRadius)
      const guideRingsData = createGuideRingsGeoJSON([currentCenter.lng, currentCenter.lat], currentRadius)
      const guideLabelsData = createGuideLabelsGeoJSON([currentCenter.lng, currentCenter.lat], currentRadius)

      // 1. Outer Pulse Layer
      if (!map.getSource("geofence-pulse")) {
        map.addSource("geofence-pulse", { type: "geojson", data: circleData })
      } else {
        ;(map.getSource("geofence-pulse") as maplibregl.GeoJSONSource).setData(circleData)
      }

      if (!map.getLayer("geofence-pulse-layer")) {
        map.addLayer({
          id: "geofence-pulse-layer",
          type: "fill",
          source: "geofence-pulse",
          paint: {
            "fill-color": "#3b82f6",
            "fill-opacity": 0.08,
          },
        })
      }

      // 2. Concentric Guide Rings
      if (!map.getSource("geofence-guides")) {
        map.addSource("geofence-guides", { type: "geojson", data: guideRingsData })
      } else {
        ;(map.getSource("geofence-guides") as maplibregl.GeoJSONSource).setData(guideRingsData)
      }

      if (!map.getLayer("geofence-guides-layer")) {
        map.addLayer({
          id: "geofence-guides-layer",
          type: "line",
          source: "geofence-guides",
          paint: {
            "line-color": "#6366f1",
            "line-width": 1.5,
            "line-opacity": 0.5,
            "line-dasharray": [3, 3],
          },
        })
      }

      // 3. Main Geofence Fill
      if (!map.getSource("geofence-circle")) {
        map.addSource("geofence-circle", { type: "geojson", data: circleData })
      } else {
        ;(map.getSource("geofence-circle") as maplibregl.GeoJSONSource).setData(circleData)
      }

      if (!map.getLayer("geofence-fill")) {
        map.addLayer({
          id: "geofence-fill",
          type: "fill",
          source: "geofence-circle",
          paint: {
            "fill-color": "#3b82f6",
            "fill-opacity": 0.12,
          },
        })
      }

      // 4. Main Geofence Border Glow & Dashed Line
      if (!map.getLayer("geofence-border-glow")) {
        map.addLayer({
          id: "geofence-border-glow",
          type: "line",
          source: "geofence-circle",
          paint: {
            "line-color": "#3b82f6",
            "line-width": 6,
            "line-opacity": 0.3,
            "line-blur": 3,
          },
        })
      }

      if (!map.getLayer("geofence-border")) {
        map.addLayer({
          id: "geofence-border",
          type: "line",
          source: "geofence-circle",
          paint: {
            "line-color": "#2563eb",
            "line-width": 2.5,
            "line-dasharray": [4, 2],
          },
        })
      }

      // 5. Distance Labels
      if (!map.getSource("geofence-labels")) {
        map.addSource("geofence-labels", { type: "geojson", data: guideLabelsData })
      } else {
        ;(map.getSource("geofence-labels") as maplibregl.GeoJSONSource).setData(guideLabelsData)
      }

      if (!map.getLayer("geofence-labels-layer")) {
        map.addLayer({
          id: "geofence-labels-layer",
          type: "symbol",
          source: "geofence-labels",
          layout: {
            "text-field": ["get", "label"],
            "text-font": ["Noto Sans Bold", "Open Sans Bold"],
            "text-size": 11,
            "text-anchor": "left",
            "text-offset": [0.6, 0],
            "text-allow-overlap": true,
          },
          paint: {
            "text-color": "#1d4ed8",
            "text-halo-color": "#ffffff",
            "text-halo-width": 2.5,
          },
        })
      }
    },
    [createGeoJSONCircle, createGuideRingsGeoJSON, createGuideLabelsGeoJSON]
  )

  // Initialize Map
  useEffect(() => {
    if (!containerRef.current || isInitialized.current) return
    isInitialized.current = true

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STREET_STYLE,
      center: [center.lng, center.lat],
      zoom: 16.5,
      attributionControl: false,
    })

    // Native controls: clean Zoom +/- without inactive compass, plus Fullscreen and Geolocate
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right")
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right")
    map.addControl(new maplibregl.FullscreenControl(), "top-right")
    map.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: false,
      }),
      "top-right"
    )
    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left")

    // ── 1. Create Glowing Campus Center Marker ──
    const markerEl = document.createElement("div")
    markerEl.className = "group relative cursor-grab active:cursor-grabbing"
    markerEl.innerHTML = `
      <div class="relative flex items-center justify-center">
        <div class="absolute size-10 rounded-full bg-blue-500/25 animate-ping opacity-75"></div>
        <div class="absolute size-8 rounded-full bg-indigo-500/30 blur-[2px]"></div>
        <div class="relative flex size-9 items-center justify-center rounded-2xl bg-linear-to-tr from-blue-600 to-indigo-600 border-2 border-white shadow-xl shadow-blue-500/40 transition-transform duration-200 group-hover:scale-110">
          <svg class="size-4.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
      </div>
    `

    const popupHtml = `
      <div style="font-family: inherit; padding: 4px 6px; min-width: 140px;">
        <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: #2563eb; margin-bottom: 2px;">
          Campus Geofence Center
        </div>
        <div style="font-size: 13px; font-weight: 700; color: #0f172a; line-height: 1.2;">
          ${collegeName || "Campus Center"}
        </div>
        <div style="font-size: 11px; color: #64748b; margin-top: 3px; font-family: monospace; font-weight: 600;">
          ${center.lat.toFixed(5)}°N, ${center.lng.toFixed(5)}°E
        </div>
      </div>
    `

    const marker = new maplibregl.Marker({ element: markerEl, draggable: true, anchor: "center" })
      .setLngLat([center.lng, center.lat])
      .setPopup(new maplibregl.Popup({ offset: 22, closeButton: false }).setHTML(popupHtml))
      .addTo(map)

    marker.on("dragend", () => {
      const lngLat = marker.getLngLat()
      onMapClick?.(lngLat.lat, lngLat.lng)
    })

    // Click map to reposition center
    map.on("click", (e) => {
      marker.setLngLat([e.lngLat.lng, e.lngLat.lat])
      onMapClick?.(e.lngLat.lat, e.lngLat.lng)
    })

    // ── 2. Create Draggable Radius Perimeter Handle ──
    const handleEl = document.createElement("div")
    handleEl.className = "radius-drag-handle group relative cursor-ew-resize select-none"
    handleEl.innerHTML = `
      <div class="relative flex items-center justify-center">
        <div class="absolute size-9 rounded-full bg-indigo-500/20 blur-[1px]"></div>
        <div class="relative flex h-7 items-center gap-1 rounded-full bg-indigo-600 px-2.5 py-1 text-white border-2 border-white shadow-lg shadow-indigo-600/40 transition-all group-hover:scale-110 group-hover:bg-indigo-700 active:scale-95">
          <svg class="size-3 text-white/90" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="m9 18-6-6 6-6"/>
            <path d="m15 6 6 6-6 6"/>
          </svg>
          <span class="handle-radius-text text-[11px] font-extrabold tracking-tight font-mono">${radius}m</span>
        </div>
      </div>
    `

    const initialHandlePos = getHandlePosition(center, radius)
    const radiusHandle = new maplibregl.Marker({ element: handleEl, draggable: true, anchor: "center" })
      .setLngLat(initialHandlePos)
      .addTo(map)

    // Handle Dragging
    radiusHandle.on("dragstart", () => {
      isDraggingRadiusRef.current = true
    })

    radiusHandle.on("drag", () => {
      const handleLngLat = radiusHandle.getLngLat()
      const centerLngLat = marker.getLngLat()
      const distMeters = calculateDistanceMeters(
        centerLngLat.lat,
        centerLngLat.lng,
        handleLngLat.lat,
        handleLngLat.lng
      )

      // Clamp between 50m and 1000m
      const clampedRadius = Math.max(50, Math.min(1000, distMeters))
      setLiveRadius(clampedRadius)

      // Update handle text live
      const textEl = handleEl.querySelector(".handle-radius-text")
      if (textEl) textEl.textContent = `${clampedRadius}m`

      // Realtime update of map layers
      if (map.isStyleLoaded()) {
        const circleData = createGeoJSONCircle([centerLngLat.lng, centerLngLat.lat], clampedRadius)
        const guideRingsData = createGuideRingsGeoJSON([centerLngLat.lng, centerLngLat.lat], clampedRadius)
        const guideLabelsData = createGuideLabelsGeoJSON([centerLngLat.lng, centerLngLat.lat], clampedRadius)

        ;(map.getSource("geofence-circle") as maplibregl.GeoJSONSource)?.setData(circleData)
        ;(map.getSource("geofence-pulse") as maplibregl.GeoJSONSource)?.setData(circleData)
        ;(map.getSource("geofence-guides") as maplibregl.GeoJSONSource)?.setData(guideRingsData)
        ;(map.getSource("geofence-labels") as maplibregl.GeoJSONSource)?.setData(guideLabelsData)
      }

      onRadiusChange?.(clampedRadius)
    })

    radiusHandle.on("dragend", () => {
      const handleLngLat = radiusHandle.getLngLat()
      const centerLngLat = marker.getLngLat()
      const distMeters = calculateDistanceMeters(
        centerLngLat.lat,
        centerLngLat.lng,
        handleLngLat.lat,
        handleLngLat.lng
      )
      const finalRadius = Math.max(50, Math.min(1000, distMeters))

      // Snap handle directly to East axis
      const snappedPos = getHandlePosition({ lat: centerLngLat.lat, lng: centerLngLat.lng }, finalRadius)
      radiusHandle.setLngLat(snappedPos)

      const textEl = handleEl.querySelector(".handle-radius-text")
      if (textEl) textEl.textContent = `${finalRadius}m`

      isDraggingRadiusRef.current = false
      setLiveRadius(finalRadius)
      onRadiusChange?.(finalRadius)
    })

    // ── Style Load Listener (Fires on initial load AND on every setStyle() call) ──
    map.on("style.load", () => {
      setupLayersAndSources(map, centerRef.current, radiusRef.current)
      map.resize()
    })

    // Initial resize calls to prevent canvas sizing gaps
    map.on("load", () => {
      map.resize()
    })
    requestAnimationFrame(() => {
      map.resize()
    })

    // Dual Pulse Animation (smoothly breathes opacity and border glow)
    let animationFrameId: number
    let startTimestamp: number | null = null

    const animatePulse = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp
      const progress = (timestamp - startTimestamp) / 2400 // 2.4s cycle
      const sine = Math.sin(progress * Math.PI * 2)

      if (mapRef.current && mapRef.current.isStyleLoaded()) {
        const fillOpacity = 0.08 + 0.06 * ((sine + 1) / 2) // 0.08 -> 0.14
        const glowOpacity = 0.15 + 0.15 * ((sine + 1) / 2) // 0.15 -> 0.30
        const glowWidth = 4 + 3 * ((sine + 1) / 2) // 4px -> 7px

        if (mapRef.current.getLayer("geofence-fill")) {
          mapRef.current.setPaintProperty("geofence-fill", "fill-opacity", fillOpacity)
        }
        if (mapRef.current.getLayer("geofence-border-glow")) {
          mapRef.current.setPaintProperty("geofence-border-glow", "line-opacity", glowOpacity)
          mapRef.current.setPaintProperty("geofence-border-glow", "line-width", glowWidth)
        }
      }
      animationFrameId = requestAnimationFrame(animatePulse)
    }
    animationFrameId = requestAnimationFrame(animatePulse)

    // ResizeObserver to guarantee 100% edge-to-edge canvas sizing with 0 dead gaps
    const resizeObserver = new ResizeObserver(() => {
      map.resize()
    })
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    mapRef.current = map
    markerRef.current = marker
    radiusHandleRef.current = radiusHandle

    return () => {
      cancelAnimationFrame(animationFrameId)
      resizeObserver.disconnect()
      map.remove()
      mapRef.current = null
      markerRef.current = null
      radiusHandleRef.current = null
      isInitialized.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Handle Style Switch (Street / Satellite)
  const handleStyleChange = useCallback(
    (newStyle: "streets" | "satellite") => {
      const map = mapRef.current
      if (!map || mapStyleType === newStyle) return

      setMapStyleType(newStyle)
      const targetStyle = newStyle === "satellite" ? SATELLITE_STYLE : STREET_STYLE

      map.setStyle(targetStyle)
    },
    [mapStyleType]
  )

  // Update marker, handle, and circle when props change from external inputs
  useEffect(() => {
    const map = mapRef.current
    const marker = markerRef.current
    const radiusHandle = radiusHandleRef.current
    if (!map || !marker || !radiusHandle) return

    marker.setLngLat([center.lng, center.lat])
    marker.setPopup(
      new maplibregl.Popup({ offset: 22, closeButton: false }).setHTML(`
        <div style="font-family: inherit; padding: 4px 6px; min-width: 140px;">
          <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: #2563eb; margin-bottom: 2px;">
            Campus Geofence Center
          </div>
          <div style="font-size: 13px; font-weight: 700; color: #0f172a; line-height: 1.2;">
            ${collegeName || "Campus Center"}
          </div>
          <div style="font-size: 11px; color: #64748b; margin-top: 3px; font-family: monospace; font-weight: 600;">
            ${center.lat.toFixed(5)}°N, ${center.lng.toFixed(5)}°E
          </div>
        </div>
      `)
    )

    if (!isDraggingRadiusRef.current) {
      const handlePos = getHandlePosition(center, radius)
      radiusHandle.setLngLat(handlePos)

      const textEl = radiusHandle.getElement().querySelector(".handle-radius-text")
      if (textEl) textEl.textContent = `${radius}m`
    }

    if (!map.isStyleLoaded()) return

    const circleData = createGeoJSONCircle([center.lng, center.lat], radius)
    const guideRingsData = createGuideRingsGeoJSON([center.lng, center.lat], radius)
    const guideLabelsData = createGuideLabelsGeoJSON([center.lng, center.lat], radius)

    ;(map.getSource("geofence-circle") as maplibregl.GeoJSONSource)?.setData(circleData)
    ;(map.getSource("geofence-pulse") as maplibregl.GeoJSONSource)?.setData(circleData)
    ;(map.getSource("geofence-guides") as maplibregl.GeoJSONSource)?.setData(guideRingsData)
    ;(map.getSource("geofence-labels") as maplibregl.GeoJSONSource)?.setData(guideLabelsData)

    map.easeTo({ center: [center.lng, center.lat], duration: 450 })
  }, [center, radius, collegeName, createGeoJSONCircle, createGuideRingsGeoJSON, createGuideLabelsGeoJSON, getHandlePosition])

  const handleRecenter = () => {
    mapRef.current?.flyTo({ center: [center.lng, center.lat], zoom: 16.5, duration: 800 })
  }

  return (
    <div className="relative w-full h-full min-h-137.5 lg:min-h-180 overflow-hidden rounded-2xl bg-muted/40">
      {/* MapLibre Canvas Container: absolute inset-0 fills the entire parent card edge-to-edge */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />

      {/* Floating Style Toggle (Top-Left) */}
      <div className="absolute left-3.5 top-3.5 z-10 flex items-center gap-1 rounded-xl border border-white/40 bg-background/90 p-1 shadow-lg backdrop-blur-md dark:border-border/80 dark:bg-card/90">
        <button
          type="button"
          onClick={() => handleStyleChange("streets")}
          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
            mapStyleType === "streets"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <MapIcon className="size-3.5" />
          <span>Street</span>
        </button>
        <button
          type="button"
          onClick={() => handleStyleChange("satellite")}
          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
            mapStyleType === "satellite"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Globe className="size-3.5" />
          <span>Satellite</span>
        </button>
      </div>

      {/* Floating Interactive Guide HUD (Bottom-Left) */}
      <div className="absolute bottom-3.5 left-3.5 z-10 hidden sm:flex items-center gap-2 rounded-xl border border-white/40 bg-background/90 px-3 py-2 shadow-lg backdrop-blur-md dark:border-border/80 dark:bg-card/90">
        <button
          type="button"
          onClick={handleRecenter}
          className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer"
          title="Center on Campus"
        >
          <Crosshair className="size-3.5" />
        </button>
        <div className="h-4 w-px bg-border/80" />
        <div className="flex items-center gap-2 text-xs font-medium text-foreground">
          <span className="flex items-center gap-1 font-bold text-primary">
            <Sparkles className="size-3 text-indigo-500" />
            {liveRadius}m
          </span>
          <span className="text-[11px] text-muted-foreground">
            Drag perimeter handle or click map to reposition
          </span>
        </div>
      </div>
    </div>
  )
}