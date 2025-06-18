"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useMapState } from "@/lib/url-state/map-state"
import { MousePointer, Lasso, Circle } from "lucide-react"

interface StatesControlsProps {
  onSearch: (stateName: string) => void
}

export function StatesControls({ onSearch }: StatesControlsProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const { 
    selectionMode, 
    setSelectionMode, 
    selectedRegions, 
    clearSelectedRegions 
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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Search States</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Input
              placeholder="Enter state name..."
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
                {selectedRegions.map((region) => (
                  <div
                    key={region}
                    className="text-sm p-2 bg-muted rounded"
                  >
                    {region}
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