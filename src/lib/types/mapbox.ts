// Shared types for Mapbox GL JS integration

// You may need to install @types/mapbox-gl if not already present
// import type { Map, MapLayerMouseEvent } from 'mapbox-gl';

// If you want to avoid the dependency, you can define minimal types here:


// Minimal MapboxMap interface for use in hooks
export interface MapboxSource {
  type: string;
  data?: object;
  [key: string]: unknown;
}

export interface MapboxLayer {
  id: string;
  type: string;
  source?: string;
  [key: string]: unknown;
}

export interface MapboxMap {
  on(type: string, listener: (e: MapboxEvent) => void): void;
  off(type: string, listener: (e: MapboxEvent) => void): void;
  addSource(id: string, source: MapboxSource): void;
  removeSource(id: string): void;
  addLayer(layer: MapboxLayer): void;
  removeLayer(id: string): void;
  getSource(id: string): MapboxSource | undefined;
  setFilter(layerId: string, filter: unknown[]): void;
  remove(): void;
  getCanvas(): HTMLCanvasElement;
  dragPan: { disable: () => void; enable: () => void };
  dragRotate: { disable: () => void; enable: () => void };
  scrollZoom: { disable: () => void; enable: () => void };
  doubleClickZoom: { disable: () => void; enable: () => void };
  touchZoomRotate: { disable: () => void; enable: () => void };
  getLayer(id: string): MapboxLayer | undefined;
  setPaintProperty(layer: string, prop: string, value: unknown): void;
  setLayoutProperty(layer: string, prop: string, value: unknown): void;
  isStyleLoaded(): boolean;
  getContainer(): HTMLElement;
  getStyle(): object;
}

// Minimal GeoJSON Feature type
export interface GeoJSONFeature<Properties extends object = Record<string, unknown>, Coordinates = unknown> {
  type: 'Feature';
  geometry: {
    type: 'Polygon' | 'Point' | 'MultiPolygon' | 'LineString' | string;
    coordinates: Coordinates;
  };
  properties: Properties & { id?: string };
}

export interface MapboxEvent {
  features?: GeoJSONFeature[];
}
