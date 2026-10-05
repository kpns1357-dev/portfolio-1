"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ExternalLink, Layers, Flame, MapPin } from "lucide-react";

export interface MapPinData {
  id: string;
  caseId: string;
  title: string;
  status: string;
  priorityScore: number;
  priorityLabel: string;
  latitude: number;
  longitude: number;
  address: string;
  areaName: string;
  slaStatus: string;
  category?: { name: string; slug: string };
  department?: { name: string };
  _count?: { reports: number };
}

interface LeafletMapProps {
  pins: MapPinData[];
  center?: [number, number];
  zoom?: number;
  selectedPinId?: string;
  onSelectPin?: (pin: MapPinData) => void;
  showHeatmapToggle?: boolean;
}

export function LeafletMap({
  pins,
  center = [40.7250, -73.9980],
  zoom = 13,
  selectedPinId,
  onSelectPin,
  showHeatmapToggle = true,
}: LeafletMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const [viewMode, setViewMode] = useState<"markers" | "heatmap">("markers");
  const [activePin, setActivePin] = useState<MapPinData | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;

    let L: any;
    import("leaflet").then((leafletModule) => {
      L = leafletModule.default || leafletModule;

      // Initialize map only once
      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, {
          center,
          zoom,
          zoomControl: false,
        });

        L.control.zoom({ position: "bottomright" }).addTo(map);

        // OpenStreetMap clean carto tiles
        L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
          attribution: '&copy; <a href="https://carto.com/">CARTO</a> & OpenStreetMap',
          maxZoom: 19,
        }).addTo(map);

        markersLayerRef.current = L.layerGroup().addTo(map);
        mapInstanceRef.current = map;
      }

      const map = mapInstanceRef.current;
      const markersLayer = markersLayerRef.current;
      markersLayer.clearLayers();

      // Render Pins or Heat circles
      pins.forEach((pin) => {
        const isCritical = pin.priorityLabel === "CRITICAL";
        const isHigh = pin.priorityLabel === "HIGH";
        const isResolved = pin.status === "RESOLVED";

        const color = isResolved
          ? "#10b981"
          : isCritical
          ? "#ef4444"
          : isHigh
          ? "#f97316"
          : "#2563eb";

        if (viewMode === "heatmap") {
          // Heatmap analytical representation via density circles
          const heatCircle = L.circle([pin.latitude, pin.longitude], {
            radius: isCritical ? 260 : 180,
            fillColor: color,
            fillOpacity: isCritical ? 0.45 : 0.3,
            stroke: false,
          });
          heatCircle.addTo(markersLayer);
        } else {
          // Sharp custom SVG marker icon
          const iconHtml = `
            <div style="
              background-color: ${color};
              width: ${isCritical ? "28px" : "24px"};
              height: ${isCritical ? "28px" : "24px"};
              border-radius: 50%;
              border: 2px solid white;
              box-shadow: 0 2px 6px rgba(0,0,0,0.35);
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-family: monospace;
              font-size: 11px;
              font-weight: bold;
              cursor: pointer;
            ">
              ${pin.priorityScore}
            </div>
          `;

          const customIcon = L.divIcon({
            html: iconHtml,
            className: "civic-custom-marker",
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          });

          const marker = L.marker([pin.latitude, pin.longitude], { icon: customIcon });

          marker.on("click", () => {
            setActivePin(pin);
            if (onSelectPin) onSelectPin(pin);
          });

          marker.addTo(markersLayer);
        }
      });
    });

    return () => {
      // Keep map instance alive during life of component
    };
  }, [pins, viewMode]);

  return (
    <div className="relative w-full h-full min-h-[450px] rounded-xl overflow-hidden border border-slate-200 shadow-2xs">
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Map Control Overlay */}
      {showHeatmapToggle && (
        <div className="absolute top-3 right-3 z-20 flex items-center bg-white/95 backdrop-blur-md rounded-lg p-1 border border-slate-200 shadow-md">
          <button
            onClick={() => setViewMode("markers")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              viewMode === "markers"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> Markers ({pins.length})
          </button>
          <button
            onClick={() => setViewMode("heatmap")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              viewMode === "heatmap"
                ? "bg-rose-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Flame className="w-3.5 h-3.5" /> Heatmap
          </button>
        </div>
      )}

      {/* Marker Info Card Popover */}
      {activePin && (
        <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:w-88 z-20 bg-white/95 backdrop-blur-md rounded-xl border border-slate-200 shadow-xl p-4 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-mono font-bold text-blue-600">
                {activePin.caseId}
              </span>
              <h4 className="text-xs font-bold text-slate-900 mt-0.5 line-clamp-1">
                {activePin.title}
              </h4>
            </div>
            <button
              onClick={() => setActivePin(null)}
              className="text-slate-400 hover:text-slate-600 text-xs p-1"
            >
              ✕
            </button>
          </div>

          <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 line-clamp-1">
            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
            {activePin.address}
          </p>

          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 text-xs">
            <div className="flex items-center space-x-1.5">
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                {activePin.status.replace("_", " ")}
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                Priority {activePin.priorityScore}
              </span>
            </div>

            <Link
              href={`/incidents/${activePin.caseId}`}
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded text-xs font-medium transition-colors"
            >
              Open Case <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
