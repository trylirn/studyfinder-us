import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";

// Fix default icon URLs (Vite bundles assets differently)
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });

export type MapPin = {
  id: string | number;
  lat: number;
  lng: number;
  facility: string | null;
  city: string | null;
  state: string | null;
  status: string | null;
  clinicSlug?: string | null;
};

function FitBounds({ pins }: { pins: MapPin[] }) {
  const map = useMap();
  useEffect(() => {
    if (pins.length === 0) return;
    if (pins.length === 1) {
      map.setView([pins[0].lat, pins[0].lng], 10);
      return;
    }
    const bounds = L.latLngBounds(pins.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [32, 32], maxZoom: 11 });
  }, [pins, map]);
  return null;
}

export default function TrialMapInner({ pins, height = 360 }: { pins: MapPin[]; height?: number }) {
  if (pins.length === 0) return null;
  const center: [number, number] = [pins[0].lat, pins[0].lng];
  return (
    <div className="overflow-hidden rounded-lg border border-border" style={{ height }}>
      <MapContainer center={center} zoom={5} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds pins={pins} />
        {pins.map((p) => (
          <Marker key={p.id} position={[p.lat, p.lng]}>
            <Popup>
              <div className="text-xs">
                <p className="font-semibold">{p.facility ?? "Research site"}</p>
                <p className="text-muted-foreground">{[p.city, p.state].filter(Boolean).join(", ")}</p>
                {p.status && <p className="mt-1">Status: {p.status}</p>}
                {p.clinicSlug && (
                  <a href={`/clinics/${p.clinicSlug}`} className="mt-1 inline-block text-primary underline">
                    View clinic profile
                  </a>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
