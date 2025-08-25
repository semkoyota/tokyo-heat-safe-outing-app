import type { FacilityFull } from "../types";

function convertFacilitiesField(facilitiesField: unknown): string[] | Record<string, boolean> | undefined {
  if (!facilitiesField) return undefined;
  // if it's an object with boolean flags, convert to array of keys where true
  if (typeof facilitiesField === "object" && !Array.isArray(facilitiesField)) {
    const obj = facilitiesField as Record<string, unknown>;
    const keys = Object.keys(obj).filter((k) => !!obj[k]);
    return keys;
  }
  // otherwise return as-is (array)
  if (Array.isArray(facilitiesField)) return facilitiesField as string[];
  return undefined;
}

export async function fetchFacilities(): Promise<FacilityFull[]> {
  try {
    const res = await fetch("./data/facilities.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const raw = Array.isArray(json.facilities) ? json.facilities : [];

    const normalized: FacilityFull[] = raw.map((f: unknown) => {
      const obj = f as Record<string, unknown>;
      const nearest = obj.nearestStation as Record<string, unknown> | undefined;
      const coords = obj.coordinates as Record<string, number> | undefined;
      const ncoords = nearest && nearest.coordinates ? (nearest.coordinates as Record<string, number>) : undefined;

      return {
        id: (obj.id as string) || String(Math.random()),
        name: (obj.name as string) || "",
        type: (obj.type as string) || "",
        address: obj.address as string | undefined,
        coordinates: coords ? { lat: coords.lat, lng: coords.lng } : undefined,
        walkTime: nearest ? (nearest.walkTime as number | undefined) : (obj.walkTime as number | undefined),
        indoorRatio: obj.indoorRatio as number | undefined,
        facilities: convertFacilitiesField(obj.facilities),
        riskLevel: obj.heatRisk
          ? ((obj.heatRisk as Record<string, unknown>).level as string)
          : (obj.riskLevel as string | undefined),
        description: obj.description as string | undefined,
        admission: obj.admission as import("../types").Admission | undefined,
        highlights: obj.highlights as string[] | undefined,
        crowdLevel: obj.crowdLevel as Record<string, string> | undefined,
        nearestStation: nearest
          ? {
              name: nearest.name as string | undefined,
              walkTime: nearest.walkTime as number | undefined,
              lines: (nearest.lines as string[] | undefined) || undefined,
              coordinates: ncoords ? { lat: ncoords.lat, lng: ncoords.lng } : undefined,
            }
          : undefined,
        operatingHours: obj.operatingHours as import("../types").OperatingHours | undefined,
        price: obj.price as import("../types").FacilityFull["price"] | undefined,
        exertion: obj.exertion as import("../types").Exertion | undefined,
        photos: obj.photos as string[] | undefined,
        ageRange: obj.ageRange as FacilityFull["ageRange"] | undefined,
        lastUpdated: obj.lastUpdated as string | undefined,
      } as FacilityFull;
    });

    return normalized;
  } catch (e) {
    console.error("fetchFacilities error", e);
    return [];
  }
}
