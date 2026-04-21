/**
 * Lightweight, lazily-loaded Leaflet map showing a single payment location.
 * Uses free OpenStreetMap tiles — no API key required.
 *
 * Imported only by admin views (so the leaflet bundle stays out of the main
 * teen/parent app chunks).
 */
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Props {
  latitude: number;
  longitude: number;
  city?: string | null;
  country?: string | null;
  className?: string;
}

const PaymentLocationMap = ({ latitude, longitude, city, country, className = "" }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) {
      mapRef.current.setView([latitude, longitude], 13);
      return;
    }

    const map = L.map(containerRef.current, {
      center: [latitude, longitude],
      zoom: 13,
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: false,
    });
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OSM",
      className: "map-tiles-dark",
    }).addTo(map);

    const goldIcon = L.divIcon({
      className: "",
      html: `<div style="
        width:18px;height:18px;border-radius:50%;
        background:radial-gradient(circle,hsl(42 78% 55%) 30%,hsl(42 78% 35%) 70%);
        box-shadow:0 0 0 4px hsl(42 78% 55% / 0.25),0 0 16px hsl(42 78% 55% / 0.6);
        border:2px solid hsl(42 78% 75%);
      "></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });

    L.marker([latitude, longitude], { icon: goldIcon })
      .addTo(map)
      .bindPopup(
        `<div style="color:#0a0c0f;font-size:12px;font-weight:600">${city || "Unknown"}${country ? `, ${country}` : ""}</div>`
      );

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latitude, longitude]);

  return (
    <>
      <style>{`
        .map-tiles-dark {
          filter: brightness(0.65) contrast(1.1) saturate(0.7) hue-rotate(-10deg);
        }
        .leaflet-container {
          background: hsl(220 18% 8%) !important;
          font-family: inherit;
        }
        .leaflet-popup-content-wrapper, .leaflet-popup-tip {
          background: hsl(42 78% 80%) !important;
        }
        .leaflet-control-attribution {
          background: hsl(220 18% 8% / 0.7) !important;
          color: hsl(0 0% 60%) !important;
          font-size: 9px !important;
        }
        .leaflet-control-attribution a { color: hsl(42 78% 55%) !important; }
        .leaflet-control-zoom a {
          background: hsl(220 18% 10%) !important;
          color: hsl(42 78% 55%) !important;
          border-color: hsl(0 0% 100% / 0.06) !important;
        }
      `}</style>
      <div ref={containerRef} className={`rounded-xl overflow-hidden border border-white/[0.06] ${className}`} style={{ height: 200 }} />
    </>
  );
};

export default PaymentLocationMap;
