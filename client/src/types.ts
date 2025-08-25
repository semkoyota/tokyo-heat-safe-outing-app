export type Coordinates = {
  lat: number;
  lng: number;
};

export type Facility = {
  id: string;
  name: string;
  type: string;
  address?: string;
  coordinates?: Coordinates;
  indoorRatio?: number;
  walkTime?: number;
  lastUpdated?: string;
};

export type NearestStation = {
  name?: string;
  walkTime?: number;
  lines?: string[];
  coordinates?: Coordinates;
};

export type OperatingHours = {
  weekday?: string;
  weekend?: string;
  holiday?: string;
};

export type Admission = {
  adult?: number;
  senior?: number;
  child?: number;
  notes?: string;
};

export type Exertion = {
  level?: string;
  score?: number;
  description?: string;
};

export type FacilityFull = Facility & {
  description?: string;
  photos?: string[];
  nearestStation?: NearestStation;
  operatingHours?: OperatingHours;
  // facilities may be represented as an array of keys or an object with boolean flags
  facilities?: string[] | Record<string, boolean>;
  ageRange?: { min?: number; max?: number; recommended?: string };
  admission?: Admission;
  price?: { avgPerPerson?: number; currency?: string };
  exertion?: Exertion;
  riskLevel?: string;
  highlights?: string[];
  crowdLevel?: Record<string, string>;
};

export type RouteStep = {
  instruction?: string;
  name?: string;
  distance: number;
  duration: number;
  coordinates?: number[][];
};

export type RouteResult = {
  geometry: GeoJSON.GeoJsonObject;
  distance: number;
  duration: number;
  steps: RouteStep[];
  coordinates?: number[][];
};
