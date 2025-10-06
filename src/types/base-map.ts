import type {
  FeatureCollection,
  GeoJsonProperties,
  MultiPolygon,
  Polygon,
} from "geojson";
import type { Layer } from "@/lib/hooks/use-areas";

export interface BaseMapProps {
  data: FeatureCollection<Polygon | MultiPolygon, GeoJsonProperties>;
  layerId: string;
  onSearch?: (query: string) => void;
  center?: [number, number];
  zoom?: number;
  statesData?: FeatureCollection<
    Polygon | MultiPolygon,
    GeoJsonProperties
  > | null;
  granularity?: string;
  onGranularityChange?: (granularity: string) => void;
  layers?: Layer[];
  activeLayerId?: number | null;
  areaId?: number | null;
}

export interface MapConfig {
  center: [number, number];
  zoom: number;
  style: string;
  minHeight: string;
}

export interface MapErrorMessageProps {
  message: string;
}

export interface ToggleButtonProps {
  onClick: () => void;
  title: string;
  ariaLabel: string;
  children: React.ReactNode;
}

export interface MapToolsProps {
  currentMode: string;
  onModeChange: (mode: string) => void;
  onClearAll: () => void;
  onToggleVisibility: () => void;
  granularity?: string;
  onGranularityChange?: (granularity: string) => void;
  postalCodesData: FeatureCollection<Polygon | MultiPolygon, GeoJsonProperties>;
}
