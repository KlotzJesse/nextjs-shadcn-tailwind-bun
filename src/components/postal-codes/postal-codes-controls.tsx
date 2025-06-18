"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useMapState } from "@/lib/url-state/map-state"
import { MousePointer, Lasso, Circle } from "lucide-react"

const POSTAL_CODE_GRANULARITIES = [
  { value: "plz-1stellig", label: "PLZ 1-stellig" },
  { value: "plz-2stellig", label: "PLZ 2-stellig" },
  { value: "plz-3stellig", label: "PLZ 3-stellig" },
  { value: "plz-5stellig", label: "PLZ 5-stellig" },
]

interface PostalCodesControlsProps {
  onSearch: (plz: string) => void
}

export function PostalCodesControls({ onSearch }: PostalCodesControlsProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const { 
    selectionMode, 
    setSelectionMode, 
    selectedRegions, 
    clearSelectedRegions,
    granularity,
    setGranularity
  } = useMapState()

  const handleSearch = () => {
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim())
      setSearchQuery("")
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  const handleGranularityChange = (newGranularity: string) => {
    setGranularity(newGranularity)
    // Clear search results when changing granularity
    clearSelectedRegions()
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Search Postal Codes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Input
              placeholder="Enter postal code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
            />
            <Button onClick={handleSearch}>Search</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Granularity</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={granularity} onValueChange={handleGranularityChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select granularity" />
            </SelectTrigger>
            <SelectContent>
              {POSTAL_CODE_GRANULARITIES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Selection Mode</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            <Button
              variant={selectionMode === "cursor" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectionMode("cursor")}
            >
              <MousePointer className="h-4 w-4 mr-2" />
              Cursor
            </Button>
            <Button
              variant={selectionMode === "lasso" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectionMode("lasso")}
            >
              <Lasso className="h-4 w-4 mr-2" />
              Lasso
            </Button>
            <Button
              variant={selectionMode === "radius" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectionMode("radius")}
            >
              <Circle className="h-4 w-4 mr-2" />
              Radius
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Selected Regions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {selectedRegions.length} regions selected
              </span>
              {selectedRegions.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearSelectedRegions}
                >
                  Clear All
                </Button>
              )}
            </div>
            {selectedRegions.length > 0 && (
              <div className="max-h-32 overflow-y-auto space-y-1">
                {selectedRegions.map((region: string) => (
                  <div
                    key={region}
                    className="text-sm p-2 bg-muted rounded"
                  >
                    D-{region}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 