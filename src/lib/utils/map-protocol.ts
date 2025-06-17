import maplibregl from 'maplibre-gl';
import { VectorTextProtocol, VectorTextSourceSpecification } from 'maplibre-gl-vector-text-protocol';

// Initialize the protocol
VectorTextProtocol.addProtocols(maplibregl);

// Helper function to create a TopoJSON source
export function createTopoJSONSource(level: string): VectorTextSourceSpecification {
  return {
    type: 'geojson',
    data: `topojson:///api/topojson?level=${level}`
  };
}

// Helper function to create a GeoJSON source
export function createGeoJSONSource(url: string): VectorTextSourceSpecification {
  return {
    type: 'geojson',
    data: url
  };
}

// Example layer configuration
export const exampleLayerConfig = {
  id: 'us-congress-113-fill',
  type: 'fill',
  source: 'us-congress-113',
  minzoom: 0,
  maxzoom: 20,
  paint: {
    'fill-opacity': 0.25,
    'fill-color': 'yellow',
    'fill-outline-color': 'gray'
  }
}; 