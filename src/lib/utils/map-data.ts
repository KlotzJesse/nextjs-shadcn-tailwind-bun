import area from '@turf/area'
import centroid from '@turf/centroid'
import { point } from '@turf/helpers'
import type { Feature, FeatureCollection, GeoJsonProperties, MultiPolygon, Polygon } from "geojson"


/**
 * Returns an empty GeoJSON FeatureCollection.
 */
export function emptyFeatureCollection(): FeatureCollection {
  return { type: 'FeatureCollection', features: [] }
}

/**
 * Returns a FeatureCollection containing only features with the given IDs.
 */
export function featureCollectionFromIds(data: FeatureCollection, ids: string[]): FeatureCollection {
  if (!data || !Array.isArray(data.features)) return emptyFeatureCollection();
  return {
    type: 'FeatureCollection',
    features: (data.features as Feature[]).filter((f) => ids.includes(f.properties?.id)).map(f => f)
  }
}

/**
 * Returns the centroid of the largest polygon in a feature.
 */
export function getLargestPolygonCentroid(feature: Feature<Polygon | MultiPolygon, GeoJsonProperties>) {
  if (feature.geometry.type === 'Polygon') {
    return centroid(feature).geometry.coordinates
  }
  if (feature.geometry.type === 'MultiPolygon') {
    let maxArea = 0
    let maxPoly: Polygon | null = null
    for (const coords of feature.geometry.coordinates) {
      const poly: Polygon = { type: 'Polygon', coordinates: coords }
      const polyArea = area(poly)
      if (polyArea > maxArea) {
        maxArea = polyArea
        maxPoly = poly
      }
    }
    if (maxPoly) {
      return centroid(maxPoly).geometry.coordinates
    }
  }
  return centroid(feature).geometry.coordinates
}

/**
 * Creates a FeatureCollection of label points from a polygon FeatureCollection.
 */
export function makeLabelPoints(features: FeatureCollection) {
  return {
    type: 'FeatureCollection',
    features: (features.features as Feature[]).map((f) => {
      const coords = getLargestPolygonCentroid(f as Feature<Polygon | MultiPolygon, GeoJsonProperties>);
      return point(coords, f.properties);
    })
  }
}