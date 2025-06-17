"use client"

import { useState } from "react"
import { Map } from "./map"
import { MapControls } from "./map-controls"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useMapStore } from "@/lib/store/map-store"
import type { MapData } from "@/app/map/[granularity]/map-data"


interface MapViewProps {
  data: {
    geoData: MapData;
    stateGeo: MapData;
  };
  granularity: string;
}

export function MapView({ data, granularity: initialGranularity }: MapViewProps) {
  const [granularity, setGranularity] = useState(initialGranularity)
  const [mode, setMode] = useState<'states' | 'postal'>('states')
  const { selectedRegions, removeSelectedRegion } = useMapStore()

  const handleSearch = (plz: string) => {
    // Handle postal code search
    console.log("Searching for:", plz)
  }

  const handleGranularityChange = (newGranularity: string) => {
    setGranularity(newGranularity)
    // You might want to fetch new data here based on the new granularity
  }

  const handleModeChange = (newMode: 'states' | 'postal') => {
    setMode(newMode)
    // Reset granularity when switching modes
    if (newMode === 'states') {
      setGranularity('states')
    } else {
      setGranularity('plz-5stellig') // Default to 5-digit postal codes
    }
  }

  return (
    <div className="grid grid-cols-[300px_1fr] gap-4 h-full">
      <div className="space-y-4">
        <MapControls
          onSearch={handleSearch}
          granularity={granularity}
          onGranularityChange={handleGranularityChange}
          mode={mode}
          onModeChange={handleModeChange}
        />

        {selectedRegions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Selected Regions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {selectedRegions.map((regionId) => (
                <div key={regionId} className="flex items-center justify-between">
                  <span className="text-sm">{regionId}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSelectedRegion(regionId)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      <Map
        data={mode === 'states' ? data.stateGeo : data.geoData}
        granularity={granularity}
        onSearch={handleSearch}
      />
    </div>
  )
} 