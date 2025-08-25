import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import L from "leaflet";
import type { Coordinates } from "../types";

type MapViewProps = {
  center?: { lat: number; lng: number };
  zoom?: number;
  facilities?: { id: string; name: string; coordinates?: { lat: number; lng: number } }[];
  onMarkerClick?: (id: string) => void;
};

type MapHandle = {
  fitToBounds: (bounds: [Coordinates, Coordinates]) => void;
  showGeoJSON: (geojson: GeoJSON.GeoJsonObject) => void;
};

const MapView = forwardRef<MapHandle, MapViewProps>(function MapView(
  { center = { lat: 35.681236, lng: 139.767125 }, zoom = 12, facilities, onMarkerClick }: MapViewProps,
  ref
) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const routeLayerRef = useRef<L.Layer | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;
    if (leafletMapRef.current) return; // already initialized

    const map = L.map(mapRef.current).setView([center.lat, center.lng], zoom);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    leafletMapRef.current = map;

    return () => {
      map.remove();
      leafletMapRef.current = null;
    };
  }, [center.lat, center.lng, zoom]);

  // markers
  useEffect(() => {
    if (!leafletMapRef.current) return;
    const markers: L.Layer[] = [];
    if (facilities && facilities.length > 0) {
      facilities.forEach((f) => {
        if (!f.coordinates) return;
        const m = L.marker([f.coordinates.lat, f.coordinates.lng]).addTo(leafletMapRef.current!);
        m.on("click", () => onMarkerClick && onMarkerClick(f.id));
        markers.push(m);
      });
    }
    return () => markers.forEach((m) => leafletMapRef.current?.removeLayer(m));
  }, [facilities, onMarkerClick]);

  useImperativeHandle(ref, () => ({
    fitToBounds(bounds: [Coordinates, Coordinates]) {
      if (!leafletMapRef.current) return;
      const sw = [Math.min(bounds[0].lat, bounds[1].lat), Math.min(bounds[0].lng, bounds[1].lng)] as [number, number];
      const ne = [Math.max(bounds[0].lat, bounds[1].lat), Math.max(bounds[0].lng, bounds[1].lng)] as [number, number];
      leafletMapRef.current.fitBounds([sw, ne]);
    },
    showGeoJSON(geojson: GeoJSON.GeoJsonObject) {
      if (!leafletMapRef.current) return;
      if (routeLayerRef.current) {
        leafletMapRef.current.removeLayer(routeLayerRef.current);
        routeLayerRef.current = null;
      }
      const layer = L.geoJSON(geojson, { style: { color: "#28a745", weight: 4 } }).addTo(leafletMapRef.current);
      routeLayerRef.current = layer;
    },
  }));

  return <div id="map" ref={mapRef} style={{ width: "100%", height: 480, borderRadius: 10 }} />;
});

export default MapView;
