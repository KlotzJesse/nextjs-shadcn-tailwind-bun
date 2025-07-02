// Core data types for the application
export interface MapFeature {
  id: string;
  name?: string;
  code?: string;
  PLZ?: string;
  plz?: string;
  [key: string]: unknown;
}

export interface MapGeometry {
  type: "Polygon" | "MultiPolygon";
  coordinates: number[][][] | number[][][][];
}

export interface GeoFeature {
  type: "Feature";
  properties: MapFeature;
  geometry: MapGeometry;
}

export interface MapData {
  type: "FeatureCollection";
  features: GeoFeature[];
}

// API Response types with proper error handling
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
  timestamp?: string;
  requestId?: string;
}

export interface PostalCodeResponse extends ApiResponse<MapData> {
  granularity?: string;
  totalFeatures?: number;
  processingTime?: number;
}

export interface StateDataResponse extends ApiResponse<MapData> {
  totalFeatures?: number;
  bounds?: [number, number, number, number];
}

// Component Props types with proper generics
export interface BaseMapProps {
  data: MapData;
  center?: [number, number];
  zoom?: number;
  className?: string;
  onFeatureSelect?: (featureId: string) => void;
  selectedFeatures?: string[];
  loading?: boolean;
  error?: string;
}

export interface ToolbarProps {
  selectedCount: number;
  onClearSelection?: () => void;
  onExport?: (format: ExportFormat) => Promise<void>;
  isLoading?: boolean;
  disabled?: boolean;
}

// Form and Input types with validation
export interface SearchFormData {
  query: string;
  type: "address" | "postal-code" | "region";
  filters?: SearchFilters;
}

export interface SearchFilters {
  granularity?: Granularity;
  bounds?: [number, number, number, number];
  includeAdjacent?: boolean;
}

export interface FilterOptions {
  granularity?: string;
  bounds?: [number, number, number, number];
  simplifyTolerance?: number;
  maxFeatures?: number;
  cacheKey?: string;
}

// State management types with proper structure
export interface MapState {
  selectedRegions: string[];
  currentView: "states" | "postal-codes";
  granularity?: string;
  isLoading: boolean;
  error?: string;
  lastUpdated?: Date;
  center?: [number, number];
  zoom?: number;
}

export interface UIState {
  sidebarOpen: boolean;
  toolsVisible: boolean;
  theme: "light" | "dark" | "system";
  performanceMode: boolean;
}

// Performance and Analytics types
export interface PerformanceMetrics {
  operation: string;
  duration: number;
  featuresProcessed: number;
  timestamp: Date;
  memory?: number;
  errors?: string[];
}

export interface AnalyticsEvent {
  type: "selection" | "export" | "search" | "navigation";
  data: Record<string, unknown>;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
}

// Spatial index types with better structure
export interface SpatialBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface QuadTreeNode {
  id: string;
  x: number;
  y: number;
  bounds: SpatialBounds;
  feature: GeoFeature;
  children?: QuadTreeNode[];
}

// Export and Import types
export type ExportFormat = "xlsx" | "csv" | "json" | "geojson" | "kml";

export interface ExportOptions {
  format: ExportFormat;
  includeGeometry: boolean;
  selectedOnly: boolean;
  compression?: boolean;
  fileName?: string;
}

export interface ImportResult {
  success: boolean;
  featuresImported: number;
  errors: string[];
  warnings: string[];
  data?: MapData;
}

// Server Action types
export interface ServerActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: Record<string, string[]>;
  redirect?: string;
}

// Cache types
export interface CacheConfig {
  ttl: number;
  tags: string[];
  revalidateOnStale?: boolean;
  key?: string;
}

// Constants with proper typing
export const POSTAL_CODE_GRANULARITIES = [
  "plz-1stellig",
  "plz-2stellig",
  "plz-3stellig",
  "plz-5stellig",
] as const;

export const MAP_DEFAULTS = {
  CENTER: [10.4515, 51.1657] as [number, number],
  ZOOM: 6,
  MAX_ZOOM: 15,
  MIN_ZOOM: 5,
  ANIMATION_DURATION: 300,
} as const;

export const PERFORMANCE_THRESHOLDS = {
  FAST: 100,
  MEDIUM: 500,
  SLOW: 1000,
  TIMEOUT: 10000,
} as const;

export const EXPORT_LIMITS = {
  MAX_FEATURES: 50000,
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  CHUNK_SIZE: 1000,
} as const;

// Derived types
export type Granularity = (typeof POSTAL_CODE_GRANULARITIES)[number];
export type PerformanceLevel = "fast" | "medium" | "slow";
export type ViewType = "states" | "postal-codes";
export type SelectionMode =
  | "single"
  | "multiple"
  | "rectangle"
  | "lasso"
  | "radius";

// Utility types for better type safety
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredKeys<T, K extends keyof T> = Required<Pick<T, K>> &
  Omit<T, K>;

// Event types for proper event handling
export interface MapEvent<T = unknown> {
  type: string;
  target: string;
  data: T;
  timestamp: Date;
  preventDefault?: () => void;
}

export interface SelectionEvent extends MapEvent<string[]> {
  type: "selection";
  mode: SelectionMode;
  added: string[];
  removed: string[];
}

export interface SearchEvent extends MapEvent<SearchFormData> {
  type: "search";
  results: number;
  duration: number;
}
