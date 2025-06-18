"use client"

import { useState } from "react"
import { StatesMap } from "./states-map"
import { StatesControls } from "./states-controls"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
    <div className="grid grid-cols-12 gap-4 px-4 lg:px-6 @container/main:h-full h-full">
      <div className="col-span-3 space-y-4">
        <StatesControls onSearch={handleSearch} />
        
        {searchResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Search Results</CardTitle>
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
                    }}
                  >
                    {result}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      
      <div className="col-span-9">
        <Card className="h-full gap-0 p-0">
          <CardContent className="h-full p-0">
            <StatesMap data={data} onSearch={handleSearch} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 