import type { Coordinates, RouteResult } from "../types";

const OSRM_BASE = "https://router.project-osrm.org/route/v1/walking";

export async function calculateRoute(start: Coordinates, dest: Coordinates): Promise<RouteResult> {
  const url = `${OSRM_BASE}/${start.lng},${start.lat};${dest.lng},${dest.lat}?overview=full&geometries=geojson&steps=true&annotations=true`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`);
  const json = await res.json();
  if (!json.routes || json.routes.length === 0) throw new Error("no routes");
  const r = json.routes[0];
  return {
    geometry: r.geometry,
    distance: r.distance,
    duration: r.duration,
    steps:
      r.legs && r.legs[0] && r.legs[0].steps
        ? r.legs[0].steps.map((s: any) => ({
            instruction: s.maneuver && s.maneuver.type,
            name: s.name || "",
            distance: s.distance,
            duration: s.duration,
            coordinates: s.geometry ? s.geometry.coordinates : [],
          }))
        : [],
    coordinates: r.geometry && r.geometry.coordinates ? r.geometry.coordinates : [],
  };
}
