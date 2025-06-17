import { create } from "zustand"

type SelectionMode = 'cursor' | 'lasso' | 'radius'

interface MapState {
  selectedRegions: string[]
  setSelectedRegions: (regions: string[]) => void
  selectionMode: SelectionMode
  setSelectionMode: (mode: SelectionMode) => void
  addSelectedRegion: (region: string) => void
  removeSelectedRegion: (region: string) => void
  clearSelectedRegions: () => void
}

export const useMapStore = create<MapState>((set) => ({
  selectedRegions: [],
  setSelectedRegions: (regions) => set({ selectedRegions: regions }),
  selectionMode: 'cursor',
  setSelectionMode: (mode) => set({ selectionMode: mode }),
  addSelectedRegion: (region) =>
    set((state) => ({
      selectedRegions: [...state.selectedRegions, region],
    })),
  removeSelectedRegion: (region) =>
    set((state) => ({
      selectedRegions: state.selectedRegions.filter((r) => r !== region),
    })),
  clearSelectedRegions: () => set({ selectedRegions: [] }),
})) 