"use client"

import { useState, useEffect } from "react"
import { PostalCodesMap } from "./postal-codes-map"
import { PostalCodesControls } from "./postal-codes-controls"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useMapState } from "@/lib/url-state/map-state"
import type { MapData } from "@/lib/types/map-data"

interface PostalCodesViewProps {
  initialData: MapData
  defaultGranularity: string
}

export function PostalCodesView({ initialData, defaultGranularity }: PostalCodesViewProps) {
  const [searchResults, setSearchResults] = useState<string[]>([])
  const [data, setData] = useState<MapData>(initialData)
  const [isLoading, setIsLoading] = useState(false)
  const { selectedRegions, granularity } = useMapState()

  // Fetch data when granularity changes
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/postal-codes?granularity=${granularity}`)
        if (response.ok) {
          const newData = await response.json()
          setData(newData)
        }
      } catch (error) {
        console.error('Failed to fetch postal codes data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (granularity !== defaultGranularity) {
      fetchData()
    }
  }, [granularity, defaultGranularity])

  const handleSearch = (plz: string) => {
    // Simple search implementation - in a real app, you'd want more sophisticated search
    const results = data.features
      .filter(feature => 
        feature.properties?.id?.toLowerCase().includes(plz.toLowerCase()) ||
        feature.properties?.PLZ?.toLowerCase().includes(plz.toLowerCase()) ||
        feature.properties?.plz?.toLowerCase().includes(plz.toLowerCase())
      )
      .map(feature => feature.properties?.id || feature.properties?.PLZ || feature.properties?.plz || '')
      .filter(Boolean)
      .slice(0, 5) // Limit to 5 results

    setSearchResults(results)
  }

  return (
    <div className="grid grid-cols-12 gap-4 px-4 lg:px-6 @container/main:h-full h-full">
      <div className="col-span-3 space-y-4">
        <PostalCodesControls onSearch={handleSearch} />
        
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
        <Card className="h-full">
          <CardHeader>
            <CardTitle>
              German Postal Codes Map - {granularity.toUpperCase()}
              {isLoading && <span className="text-sm text-muted-foreground ml-2">(Loading...)</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="h-full p-0">
            <PostalCodesMap 
              data={data} 
              onSearch={handleSearch} 
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 