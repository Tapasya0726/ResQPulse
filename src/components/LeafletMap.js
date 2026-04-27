import { useEffect } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";

const DEFAULT_CENTER = [28.6139, 77.209];

function markerIcon(label, background) {
  return L.divIcon({
    className: "resqpulse-marker",
    html: `<span style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;background:${background};color:#fff;border:3px solid #fff;box-shadow:0 4px 12px rgba(15,23,42,.25);font-size:14px;font-weight:900">${label}</span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
  });
}

const icons = {
  user: markerIcon("SOS", "#dc2626"),
  ambulance: markerIcon("A", "#2563eb"),
  hospital: markerIcon("H", "#16a34a"),
};

function Recenter({ points }) {
  const map = useMap();

  useEffect(() => {
    const valid = points.filter(Boolean);
    if (valid.length === 0) return;
    if (valid.length === 1) {
      map.setView(valid[0], 13);
      return;
    }
    map.fitBounds(valid, { padding: [30, 30], maxZoom: 14 });
  }, [map, points]);

  return null;
}

function toPoint(location) {
  if (!location || location.lat === undefined || location.lng === undefined) return null;
  return [Number(location.lat), Number(location.lng)];
}

export default function LeafletMap({
  userLocation,
  ambulanceLocation,
  hospitalLocation,
  height = "100%",
  zoom = 13,
}) {
  const userPoint = toPoint(userLocation);
  const ambulancePoint = toPoint(ambulanceLocation);
  const hospitalPoint = toPoint(hospitalLocation);
  const center = userPoint || ambulancePoint || hospitalPoint || DEFAULT_CENTER;
  const route = [ambulancePoint, userPoint, hospitalPoint].filter(Boolean);

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      scrollWheelZoom={false}
      style={{ width: "100%", height, minHeight: 160 }}
      attributionControl={false}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Recenter points={[userPoint, ambulancePoint, hospitalPoint]} />
      {route.length > 1 && <Polyline positions={route} pathOptions={{ color: "#2563eb", weight: 4 }} />}
      {ambulancePoint && (
        <Marker position={ambulancePoint} icon={icons.ambulance}>
          <Popup>Assigned ambulance</Popup>
        </Marker>
      )}
      {userPoint && (
        <Marker position={userPoint} icon={icons.user}>
          <Popup>Emergency location</Popup>
        </Marker>
      )}
      {hospitalPoint && (
        <Marker position={hospitalPoint} icon={icons.hospital}>
          <Popup>Assigned hospital</Popup>
        </Marker>
      )}
    </MapContainer>
  );
}
