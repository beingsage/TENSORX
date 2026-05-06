export interface LatLng {
  lat: number;
  lng: number;
}

export interface Bounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

const EARTH_RADIUS_KM = 6371;

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function haversineDistanceKm(a: LatLng, b: LatLng) {
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const deltaLat = ((b.lat - a.lat) * Math.PI) / 180;
  const deltaLng = ((b.lng - a.lng) * Math.PI) / 180;

  const h =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function metersPerDegreeLongitude(latitude: number) {
  return 111320 * Math.cos((latitude * Math.PI) / 180);
}

export function toLocalMeters(point: LatLng, origin: LatLng) {
  return {
    x: (point.lng - origin.lng) * metersPerDegreeLongitude(origin.lat),
    y: (point.lat - origin.lat) * 111320,
  };
}

export function centroidOfPolygon(points: LatLng[]) {
  if (points.length === 0) {
    return { lat: 0, lng: 0 };
  }

  const closedPoints =
    points.length > 2 &&
    (points[0].lat !== points[points.length - 1].lat ||
      points[0].lng !== points[points.length - 1].lng)
      ? [...points, points[0]]
      : points;

  let doubleArea = 0;
  let latitudeSum = 0;
  let longitudeSum = 0;

  for (let index = 0; index < closedPoints.length - 1; index += 1) {
    const current = closedPoints[index];
    const next = closedPoints[index + 1];
    const cross = current.lng * next.lat - next.lng * current.lat;
    doubleArea += cross;
    latitudeSum += (current.lat + next.lat) * cross;
    longitudeSum += (current.lng + next.lng) * cross;
  }

  if (Math.abs(doubleArea) < 1e-9) {
    const lat = points.reduce((sum, point) => sum + point.lat, 0) / points.length;
    const lng = points.reduce((sum, point) => sum + point.lng, 0) / points.length;
    return { lat, lng };
  }

  return {
    lat: latitudeSum / (3 * doubleArea),
    lng: longitudeSum / (3 * doubleArea),
  };
}

export function polygonAreaSqM(points: LatLng[]) {
  if (points.length < 3) return 0;

  const origin = points[0];
  const closedPoints =
    points[0].lat === points[points.length - 1].lat &&
    points[0].lng === points[points.length - 1].lng
      ? points
      : [...points, points[0]];

  let area = 0;
  for (let index = 0; index < closedPoints.length - 1; index += 1) {
    const current = toLocalMeters(closedPoints[index], origin);
    const next = toLocalMeters(closedPoints[index + 1], origin);
    area += current.x * next.y - next.x * current.y;
  }

  return Math.abs(area) / 2;
}

export function polylineLengthKm(points: LatLng[]) {
  if (points.length < 2) return 0;

  let total = 0;
  for (let index = 0; index < points.length - 1; index += 1) {
    total += haversineDistanceKm(points[index], points[index + 1]);
  }
  return total;
}

export function pointInPolygon(point: LatLng, polygon: LatLng[]) {
  if (polygon.length < 3) return false;

  let inside = false;
  for (
    let index = 0, previous = polygon.length - 1;
    index < polygon.length;
    previous = index, index += 1
  ) {
    const current = polygon[index];
    const prior = polygon[previous];
    const intersects =
      current.lat > point.lat !== prior.lat > point.lat &&
      point.lng <
        ((prior.lng - current.lng) * (point.lat - current.lat)) /
          (prior.lat - current.lat + Number.EPSILON) +
          current.lng;
    if (intersects) inside = !inside;
  }

  return inside;
}

export function distanceToPolylineKm(point: LatLng, polyline: LatLng[]) {
  if (polyline.length === 0) return Number.POSITIVE_INFINITY;
  if (polyline.length === 1) return haversineDistanceKm(point, polyline[0]);

  const origin = point;
  const localPoint = { x: 0, y: 0 };
  let closest = Number.POSITIVE_INFINITY;

  for (let index = 0; index < polyline.length - 1; index += 1) {
    const start = toLocalMeters(polyline[index], origin);
    const end = toLocalMeters(polyline[index + 1], origin);
    const segmentX = end.x - start.x;
    const segmentY = end.y - start.y;
    const segmentLengthSquared = segmentX ** 2 + segmentY ** 2;

    if (segmentLengthSquared === 0) {
      closest = Math.min(
        closest,
        Math.hypot(localPoint.x - start.x, localPoint.y - start.y)
      );
      continue;
    }

    const projection =
      ((localPoint.x - start.x) * segmentX + (localPoint.y - start.y) * segmentY) /
      segmentLengthSquared;
    const t = clamp(projection, 0, 1);
    const projectedX = start.x + segmentX * t;
    const projectedY = start.y + segmentY * t;
    closest = Math.min(
      closest,
      Math.hypot(localPoint.x - projectedX, localPoint.y - projectedY)
    );
  }

  return closest / 1000;
}

export function boundsFromCollections(
  collections: LatLng[][],
  fallback: LatLng,
  padDegrees = 0.0012
): Bounds {
  const points = collections.flat().filter(Boolean);
  if (points.length === 0) {
    return {
      minLat: fallback.lat - padDegrees,
      maxLat: fallback.lat + padDegrees,
      minLng: fallback.lng - padDegrees,
      maxLng: fallback.lng + padDegrees,
    };
  }

  return {
    minLat: Math.min(...points.map((point) => point.lat)) - padDegrees,
    maxLat: Math.max(...points.map((point) => point.lat)) + padDegrees,
    minLng: Math.min(...points.map((point) => point.lng)) - padDegrees,
    maxLng: Math.max(...points.map((point) => point.lng)) + padDegrees,
  };
}
