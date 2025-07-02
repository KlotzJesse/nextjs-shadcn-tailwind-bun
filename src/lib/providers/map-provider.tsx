"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
} from "react";
import type { MapData, Granularity, PerformanceMetrics } from "@/lib/types";

interface MapState {
  selectedRegions: string[];
  currentGranularity: Granularity | null;
  isLoading: boolean;
  error: string | null;
  data: MapData | null;
  performanceMetrics: PerformanceMetrics[];
}

type MapAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_DATA"; payload: MapData }
  | { type: "SET_GRANULARITY"; payload: Granularity }
  | { type: "SELECT_REGION"; payload: string }
  | { type: "DESELECT_REGION"; payload: string }
  | { type: "CLEAR_SELECTION" }
  | { type: "SET_REGIONS"; payload: string[] }
  | { type: "ADD_PERFORMANCE_METRIC"; payload: PerformanceMetrics }
  | { type: "CLEAR_PERFORMANCE_METRICS" };

const initialState: MapState = {
  selectedRegions: [],
  currentGranularity: null,
  isLoading: false,
  error: null,
  data: null,
  performanceMetrics: [],
};

function mapReducer(state: MapState, action: MapAction): MapState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };

    case "SET_ERROR":
      return { ...state, error: action.payload, isLoading: false };

    case "SET_DATA":
      return { ...state, data: action.payload, isLoading: false, error: null };

    case "SET_GRANULARITY":
      return { ...state, currentGranularity: action.payload };

    case "SELECT_REGION":
      return {
        ...state,
        selectedRegions: state.selectedRegions.includes(action.payload)
          ? state.selectedRegions
          : [...state.selectedRegions, action.payload],
      };

    case "DESELECT_REGION":
      return {
        ...state,
        selectedRegions: state.selectedRegions.filter(
          (id) => id !== action.payload
        ),
      };

    case "CLEAR_SELECTION":
      return { ...state, selectedRegions: [] };

    case "SET_REGIONS":
      return { ...state, selectedRegions: action.payload };

    case "ADD_PERFORMANCE_METRIC":
      return {
        ...state,
        performanceMetrics: [
          action.payload,
          ...state.performanceMetrics.slice(0, 9),
        ],
      };

    case "CLEAR_PERFORMANCE_METRICS":
      return { ...state, performanceMetrics: [] };

    default:
      return state;
  }
}

interface MapContextValue extends MapState {
  actions: {
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    setData: (data: MapData) => void;
    setGranularity: (granularity: Granularity) => void;
    selectRegion: (id: string) => void;
    deselectRegion: (id: string) => void;
    clearSelection: () => void;
    setRegions: (ids: string[]) => void;
    addPerformanceMetric: (metric: PerformanceMetrics) => void;
    clearPerformanceMetrics: () => void;
    toggleRegion: (id: string) => void;
    selectMultipleRegions: (ids: string[]) => void;
  };
}

const MapContext = createContext<MapContextValue | null>(null);

export function MapProvider({
  children,
  initialData,
}: {
  children: React.ReactNode;
  initialData?: Partial<MapState>;
}) {
  const [state, dispatch] = useReducer(mapReducer, {
    ...initialState,
    ...initialData,
  });

  const actions = {
    setLoading: useCallback((loading: boolean) => {
      dispatch({ type: "SET_LOADING", payload: loading });
    }, []),

    setError: useCallback((error: string | null) => {
      dispatch({ type: "SET_ERROR", payload: error });
    }, []),

    setData: useCallback((data: MapData) => {
      dispatch({ type: "SET_DATA", payload: data });
    }, []),

    setGranularity: useCallback((granularity: Granularity) => {
      dispatch({ type: "SET_GRANULARITY", payload: granularity });
    }, []),

    selectRegion: useCallback((id: string) => {
      dispatch({ type: "SELECT_REGION", payload: id });
    }, []),

    deselectRegion: useCallback((id: string) => {
      dispatch({ type: "DESELECT_REGION", payload: id });
    }, []),

    clearSelection: useCallback(() => {
      dispatch({ type: "CLEAR_SELECTION" });
    }, []),

    setRegions: useCallback((ids: string[]) => {
      dispatch({ type: "SET_REGIONS", payload: ids });
    }, []),

    addPerformanceMetric: useCallback((metric: PerformanceMetrics) => {
      dispatch({ type: "ADD_PERFORMANCE_METRIC", payload: metric });
    }, []),

    clearPerformanceMetrics: useCallback(() => {
      dispatch({ type: "CLEAR_PERFORMANCE_METRICS" });
    }, []),

    toggleRegion: useCallback(
      (id: string) => {
        dispatch({
          type: state.selectedRegions.includes(id)
            ? "DESELECT_REGION"
            : "SELECT_REGION",
          payload: id,
        });
      },
      [state.selectedRegions]
    ),

    selectMultipleRegions: useCallback(
      (ids: string[]) => {
        const newRegions = [...new Set([...state.selectedRegions, ...ids])];
        dispatch({ type: "SET_REGIONS", payload: newRegions });
      },
      [state.selectedRegions]
    ),
  };

  const contextValue: MapContextValue = {
    ...state,
    actions,
  };

  return (
    <MapContext.Provider value={contextValue}>{children}</MapContext.Provider>
  );
}

export function useMapContext() {
  const context = useContext(MapContext);
  if (!context) {
    throw new Error("useMapContext must be used within a MapProvider");
  }
  return context;
}

// Specialized hooks for common operations
export function useMapSelection() {
  const { selectedRegions, actions } = useMapContext();

  return {
    selectedRegions,
    selectRegion: actions.selectRegion,
    deselectRegion: actions.deselectRegion,
    clearSelection: actions.clearSelection,
    toggleRegion: actions.toggleRegion,
    selectMultiple: actions.selectMultipleRegions,
    selectedCount: selectedRegions.length,
    hasSelection: selectedRegions.length > 0,
  };
}

export function useMapData() {
  const { data, isLoading, error, actions } = useMapContext();

  return {
    data,
    isLoading,
    error,
    setData: actions.setData,
    setLoading: actions.setLoading,
    setError: actions.setError,
    hasData: Boolean(data),
  };
}

export function useMapPerformance() {
  const { performanceMetrics, actions } = useMapContext();

  return {
    metrics: performanceMetrics,
    addMetric: actions.addPerformanceMetric,
    clearMetrics: actions.clearPerformanceMetrics,
    latestMetric: performanceMetrics[0] || null,
    averageTime:
      performanceMetrics.length > 0
        ? performanceMetrics.reduce((sum, m) => sum + m.duration, 0) /
          performanceMetrics.length
        : 0,
  };
}
