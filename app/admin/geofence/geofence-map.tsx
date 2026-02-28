"use client"

import { useEffect, useRef } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

// Fix Leaflet's default icon paths for bundlers (use CDN URLs to avoid TS import issues)
// @ts-expect-error — overriding protected property
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
})

interface GeofenceMapProps {
  center: { lat: number; lng: number }
  radius: number
  collegeName: string
}

export default function GeofenceMap({ center, radius, collegeName }: GeofenceMapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const circleRef = useRef<L.Circle | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center: [center.lat, center.lng],
      zoom: 16,
      scrollWheelZoom: true,
    })

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map)

    const marker = L.marker([center.lat, center.lng]).addTo(map)
    marker.bindPopup(collegeName)

    const circle = L.circle([center.lat, center.lng], {
      radius,
      color: "#3b82f6",
      fillColor: "#3b82f6",
      fillOpacity: 0.12,
      weight: 2,
    }).addTo(map)

    mapRef.current = map
    markerRef.current = marker
    circleRef.current = circle

    // Invalidate size after mount (prevents grey tiles)
    setTimeout(() => map.invalidateSize(), 200)

    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
      circleRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update marker, circle, and center when props change
  useEffect(() => {
    if (!mapRef.current || !markerRef.current || !circleRef.current) return

    const latLng: L.LatLngExpression = [center.lat, center.lng]
    markerRef.current.setLatLng(latLng)
    markerRef.current.setPopupContent(collegeName)
    circleRef.current.setLatLng(latLng)
    circleRef.current.setRadius(radius)
    mapRef.current.setView(latLng, mapRef.current.getZoom())
  }, [center.lat, center.lng, radius, collegeName])

  return (
    <div
      ref={containerRef}
      style={{ height: 400, width: "100%" }}
      className="z-0"
    />
  )
}
