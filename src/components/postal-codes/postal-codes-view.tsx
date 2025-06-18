"use client"

import { useState, useEffect } from "react"
import { PostalCodesMap } from "./postal-codes-map"
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