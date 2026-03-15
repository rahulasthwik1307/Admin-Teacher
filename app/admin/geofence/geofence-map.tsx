"use client"

import { useEffect, useRef, useCallback } from "react"
import maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"

interface GeofenceMapProps {
  center: { lat: number; lng: number }
  radius: number
  collegeName: string
  onMapClick?: (lat: number, lng: number) => void
}

export default function GeofenceMap({ center, radius, collegeName, onMapClick }: GeofenceMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markerRef = useRef<maplibregl.Marker | null>(null)
  const isInitialized = useRef(false)

  // Convert radius in meters to approximate degrees for GeoJSON circle
  const createGeoJSONCircle = useCallback(
    (center: [number, number], radiusMeters: number, points = 64) => {
      const coords = { lat: center[1], lng: center[0] }
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
        properties: {},
      }
    },
    []
  )

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || isInitialized.current) return
    isInitialized.current = true

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: [center.lng, center.lat],
      zoom: 17,
      attributionControl: false,
    })

    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right")
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right")
    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left")

    // Custom styled marker
    const el = document.createElement("div")
    el.innerHTML = `
      <div style="
        width: 36px; height: 36px;
        background: #3b82f6;
        border: 3px solid white;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 4px 14px rgba(59,130,246,0.5);
        cursor: grab;
      ">
        <div style="
          width: 10px; height: 10px;
          background: white;
          border-radius: 50%;
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
        "></div>
      </div>
    `
    el.style.width = "36px"
    el.style.height = "36px"

    const marker = new maplibregl.Marker({ element: el, draggable: true, anchor: "bottom" })
      .setLngLat([center.lng, center.lat])
      .setPopup(
        new maplibregl.Popup({ offset: 25, closeButton: false }).setHTML(`
          <div style="font-family: system-ui; font-size: 13px; font-weight: 600; color: #1e293b; padding: 2px 4px;">
            📍 ${collegeName}
          </div>
        `)
      )
      .addTo(map)

    // Drag marker to update coordinates
    marker.on("dragend", () => {
      const lngLat = marker.getLngLat()
      onMapClick?.(lngLat.lat, lngLat.lng)
    })

    // Click map to move marker
    map.on("click", (e) => {
      marker.setLngLat([e.lngLat.lng, e.lngLat.lat])
      onMapClick?.(e.lngLat.lat, e.lngLat.lng)
    })

    let intervalId: ReturnType<typeof setInterval>

    map.on("load", () => {
      const circleData = createGeoJSONCircle([center.lng, center.lat], radius)

      // Pulsing outer ring layer
      map.addSource("geofence-pulse", {
        type: "geojson",
        data: circleData,
      })
      map.addLayer({
        id: "geofence-pulse-layer",
        type: "fill",
        source: "geofence-pulse",
        paint: {
          "fill-color": "#3b82f6",
          "fill-opacity": 0.05,
        },
      })

      // Main circle fill
      map.addSource("geofence-circle", {
        type: "geojson",
        data: circleData,
      })
      map.addLayer({
        id: "geofence-fill",
        type: "fill",
        source: "geofence-circle",
        paint: {
          "fill-color": "#3b82f6",
          "fill-opacity": 0.12,
        },
      })

      // Circle border
      map.addLayer({
        id: "geofence-border",
        type: "line",
        source: "geofence-circle",
        paint: {
          "line-color": "#3b82f6",
          "line-width": 2.5,
          "line-dasharray": [4, 2],
        },
      })

      // Radius label
      map.addSource("geofence-label", {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [center.lng + (radius / 111320), center.lat],
          },
          properties: { label: `${radius}m` },
        },
      })
      map.addLayer({
        id: "geofence-label-layer",
        type: "symbol",
        source: "geofence-label",
        layout: {
          "text-field": ["get", "label"],
          "text-font": ["Noto Sans Bold"],
          "text-size": 13,
          "text-anchor": "left",
          "text-offset": [0.5, 0],
        },
        paint: {
          "text-color": "#3b82f6",
          "text-halo-color": "#ffffff",
          "text-halo-width": 2,
        },
      })

      // Pulse animation via opacity cycling
      let opacity = 0.12
      let increasing = false
      intervalId = setInterval(() => {
        if (!mapRef.current) return
        if (increasing) {
          opacity += 0.008
          if (opacity >= 0.18) increasing = false
        } else {
          opacity -= 0.008
          if (opacity <= 0.06) increasing = true
        }
        if (map.getLayer("geofence-fill")) {
          map.setPaintProperty("geofence-fill", "fill-opacity", opacity)
        }
      }, 50)
    })

    mapRef.current = map
    markerRef.current = marker

    return () => {
      clearInterval(intervalId)
      map.remove()
      mapRef.current = null
      markerRef.current = null
      isInitialized.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update marker + circle when props change
  useEffect(() => {
    const map = mapRef.current
    const marker = markerRef.current
    if (!map || !marker) return

    marker.setLngLat([center.lng, center.lat])
    marker.setPopup(
      new maplibregl.Popup({ offset: 25, closeButton: false }).setHTML(`
        <div style="font-family: system-ui; font-size: 13px; font-weight: 600; color: #1e293b; padding: 2px 4px;">
          📍 ${collegeName}
        </div>
      `)
    )

    if (!map.isStyleLoaded()) return

    const circleData = createGeoJSONCircle([center.lng, center.lat], radius)

    const circleSource = map.getSource("geofence-circle") as maplibregl.GeoJSONSource
    if (circleSource) circleSource.setData(circleData)

    const pulseSource = map.getSource("geofence-pulse") as maplibregl.GeoJSONSource
    if (pulseSource) pulseSource.setData(circleData)

    const labelSource = map.getSource("geofence-label") as maplibregl.GeoJSONSource
    if (labelSource) {
      labelSource.setData({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [center.lng + radius / 111320, center.lat],
        },
        properties: { label: `${radius}m` },
      })
    }

    map.easeTo({ center: [center.lng, center.lat], duration: 600 })
  }, [center.lat, center.lng, radius, collegeName, createGeoJSONCircle])

  return (
    <div ref={containerRef} style={{ height: "100%", width: "100%", minHeight: 480 }} className="z-0 rounded-xl" />
  )
}