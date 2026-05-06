export const VISUAL = {
  opacity: {
    min: 0.15,
    max: 0.5,
    infrastructure: 0.4,
    heatmap: 0.35,
    contour: 0.3,
    arc: 0.6,
    traffic: 0.45,
    speedLimit: 0.42,
    flood: 0.35,
    risk: 0.4,
  },
  transition: { duration: 250 },
  heatmap: {
    intensity: 1,
    radiusPixels: 60,
    threshold: 0.05,
  },
  roads: {
    widthMinPixels: 2,
    widthMaxPixels: 4,
  },
  traffic: {
    width: 3,
    widthMinPixels: 2,
    widthMaxPixels: 5,
  },
  speedLimit: {
    width: 3,
    widthMinPixels: 2,
    widthMaxPixels: 5,
  },
  flood: {
    cellSize: 100,
  },
  risk: {
    cellSize: 110,
  },
  metro: {
    cellSize: 120,
    influenceThresholds: [0.02, 0.01, 0.005] as const,
    influenceAlphas: [180, 120, 70] as const,
  },
  infrastructure: {
    radiusPixels: 6,
  },
  connectivity: {
    arcWidth: 3,
    routeWidth: 2,
    routeMinPixels: 1,
    routeMaxPixels: 3,
  },
  isochrone: {
    width: 3,
    widthMinPixels: 2,
    widthMaxPixels: 5,
  },
  density: {
    elevationScale: 4,
    radius: 300,
  },
  contour: {
    defaultThresholds: [
      { threshold: 1, color: [0, 188, 212, 80] },
      { threshold: 5, color: [255, 193, 7, 100] },
      { threshold: 10, color: [244, 67, 54, 120] },
    ],
  },
  colors: {
    metro: [33, 150, 243, 180],
    hospital: [244, 67, 54, 180],
    school: [255, 235, 59, 180],
    mall: [156, 39, 176, 180],
    bestBuy: [76, 175, 80, 200],
    risk: [244, 67, 54, 150],
    value: [[0, 128, 0], [255, 165, 0], [255, 0, 0]],
    aqi: [[0, 200, 0], [255, 165, 0], [255, 0, 0]],
    isochroneBlue: [0, 100, 255],
    isochroneRed: [255, 50, 0],
    roads: [200, 200, 200, 120],
    connectivityFast: [0, 200, 0, 180],
    connectivitySlow: [255, 0, 0, 180],
    infrastructureFallback: [100, 100, 100, 180],
  },
};
