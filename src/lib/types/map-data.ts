export interface MapData {
  type: "FeatureCollection"
  features: Array<{
    type: "Feature"
    properties: {
      id: string
      plz?: string
      PLZ99?: string
      PLZ?: string
      plz99?: string
      code?: string
      [key: string]: unknown
    }
    geometry: {
      type: "Polygon" | "MultiPolygon"
      coordinates: number[][][] | number[][][][]
    }
  }>
} 