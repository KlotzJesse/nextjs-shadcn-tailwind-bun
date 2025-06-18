"use client"

import { useState } from "react"
import { StatesMap } from "./states-map"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useMapState } from "@/lib/url-state/map-state"
import type { MapData } from "@/lib/types/map-data"

interface StatesViewProps {
  data: MapData;
}

export function StatesView({ data }: StatesViewProps) {
  const [searchResults, setSearchResults] = useState<string[]>([])
  const { selectedRegions } = useMapState()

  const handleSearch = (stateName: string) => {
    // Simple search implementation - in a real app, you'd want more sophisticated search
    const results = data.features
      .filter(feature => 
        feature.properties?.name?.toLowerCase().includes(stateName.toLowerCase()) ||
        feature.properties?.id?.toLowerCase().includes(stateName.toLowerCase())
      )
      .map(feature => feature.properties?.id || feature.properties?.name || '')
      .filter(Boolean)
      .slice(0, 5) // Limit to 5 results

    setSearchResults(results)
  }

  return (
    <div className="h-full relative">
      {/* Search Results Panel - Only show when there are results */}
      {searchResults.length > 0 && (
        <div className="absolute top-4 right-4 z-10 w-64">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Search Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {searchResults.map((result: string) => (
                  <div
                    key={result}
                    className="text-sm p-2 bg-muted rounded cursor-pointer hover:bg-muted/80"
                    onClick={() => {
                      // Handle result selection
                      console.log('Selected result:', result)
                      setSearchResults([]) // Clear results after selection
                    }}
                  >
                    {result}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Map with integrated tools */}
      <div className="h-full">
        <StatesMap data={data} onSearch={handleSearch} />
      </div>
    </div>
  )
} 