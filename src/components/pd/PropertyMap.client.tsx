import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Property } from "@/lib/matching/types";

interface Props {
  properties: Property[];
  selectedId: string | null;
  onSelect?: (id: string) => void;
  className?: string;
}

export default function PropertyMap({ properties, selectedId, onSelect, className }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markers = useRef(new Map<string, L.CircleMarker>());

  useEffect(() => {
    if (!el.current || map.current) return;
    map.current = L.map(el.current, { scrollWheelZoom: false }).setView([42.355, -83.065], 13);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map.current);
    return () => { map.current?.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    markers.current.forEach((mk) => mk.remove());
    markers.current.clear();
    const css = getComputedStyle(document.documentElement);
    const primary = css.getPropertyValue("--primary").trim();
    const pts: L.LatLngExpression[] = [];
    for (const p of properties) {
      if (p.lat == null || p.lng == null) continue;
      const mk = L.circleMarker([p.lat, p.lng], { radius: 8, color: primary, weight: 2, fillColor: primary, fillOpacity: 0.85 })
        .addTo(m)
        .bindTooltip(`${p.name}${p.coord_precision === "approximate" ? " (approximate location)" : ""}`);
      mk.on("click", () => onSelect?.(p.id));
      markers.current.set(p.id, mk);
      pts.push([p.lat, p.lng]);
    }
    if (pts.length > 1) m.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 15 });
    else if (pts.length === 1) m.setView(pts[0]!, 15);
  }, [properties, onSelect]);

  useEffect(() => {
    const css = getComputedStyle(document.documentElement);
    const primary = css.getPropertyValue("--primary").trim();
    const hi = css.getPropertyValue("--status-potential").trim();
    markers.current.forEach((mk, id) => {
      const sel = id === selectedId;
      mk.setStyle({ radius: sel ? 12 : 8, fillColor: sel ? hi : primary, color: sel ? hi : primary });
      if (sel) { mk.bringToFront(); mk.openTooltip(); map.current?.panTo(mk.getLatLng()); }
    });
  }, [selectedId, properties]);

  return <div ref={el} className={className} />;
}
