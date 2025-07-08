declare module 'maplibre-gl-vector-text-protocol' {
  export interface VectorTextSourceSpecification {
    type: 'vector-text';
    url: string;
    format: 'topojson' | 'geojson';
  }

  export const VectorTextProtocol: {
    addProtocols: (maplibregl: unknown) => void;
  };
}

declare module 'maplibre-gl' {
  interface SourceSpecification {
    type: 'vector' | 'raster' | 'geojson' | 'image' | 'video' | 'canvas';
    data?: string;
    url?: string;
  }
} 