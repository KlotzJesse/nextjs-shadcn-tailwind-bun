"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useMapStore } from "@/lib/store/map-store"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MousePointer, Lasso, Circle } from "lucide-react"

const POSTAL_CODE_GRANULARITIES = [
  { value: "plz-1stellig", label: "PLZ 1-stellig" },
  { value: "plz-2stellig", label: "PLZ 2-stellig" },
  { value: "plz-3stellig", label: "PLZ 3-stellig" },
  { value: "plz-4stellig", label: "PLZ 4-stellig" },
  { value: "plz-5stellig", label: "PLZ 5-stellig" },
]

interface MapControlsProps {
  onSearch: (plz: string) => void
  granularity: string
  onGranularityChange: (granularity: string) => void
  mode: 'states' | 'postal'
  onModeChange: (mode: 'states' | 'postal') => void
}

export function MapControls({
  onSearch,
  granularity,
  onGranularityChange,
  mode,
  onModeChange,
}: MapControlsProps) {
  const [searchPlz, setSearchPlz] = useState("")
  const [error, setError] = useState("")
  const { selectedRegions, setSelectedRegions, selectionMode, setSelectionMode } = useMapStore()

  const handleGranularityChange = (value: string) => {
    onGranularityChange(value)
  }

  const handleSearch = () => {
    setError("")
    if (!searchPlz) {
      setError("Please enter a postal code")
      return
    }

    // Validate postal code format
    if (!searchPlz.startsWith("D-")) {
      setError("Postal code must start with 'D-'")
      return
    }

    // Validate postal code format (D-XXXXX)
    const plzRegex = /^D-\d{5}$/
    if (!plzRegex.test(searchPlz)) {
      setError("Invalid postal code format. Use D-XXXXX")
      return
    }

    onSearch(searchPlz)
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Map Controls</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={mode} onValueChange={(value) => onModeChange(value as 'states' | 'postal')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="states">States</TabsTrigger>
            <TabsTrigger value="postal">Postal Codes</TabsTrigger>
          </TabsList>
          <TabsContent value="states" className="space-y-4">
            <div className="text-sm text-muted-foreground">
              View and select German states
            </div>
          </TabsContent>
          <TabsContent value="postal" className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Granularity</label>
              <Select value={granularity} onValueChange={handleGranularityChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select granularity" />
                </SelectTrigger>
                <SelectContent>
                  {POSTAL_CODE_GRANULARITIES.map((g) => (
                    <SelectItem key={g.value} value={g.value}>
                      {g.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Postal Code Search</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter postal code (D-XXXXX)"
                  value={searchPlz}
                  onChange={(e) => setSearchPlz(e.target.value)}
                  className={error ? "border-red-500" : ""}
                />
                <Button onClick={handleSearch}>Search</Button>
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
          </TabsContent>
        </Tabs>

        {selectedRegions.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Selected Regions</label>
            <div className="text-sm text-muted-foreground">
              {selectedRegions.length} region{selectedRegions.length !== 1 ? "s" : ""} selected
            </div>
            <Button
              variant="outline"
              onClick={() => setSelectedRegions([])}
              className="w-full"
            >
              Clear Selection
            </Button>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Selection Mode</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button
                variant={selectionMode === 'cursor' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setSelectionMode('cursor')}
                title="Cursor Selection"
              >
                <MousePointer className="h-4 w-4" />
              </Button>
              <Button
                variant={selectionMode === 'lasso' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setSelectionMode('lasso')}
                title="Lasso Selection"
              >
                <Lasso className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  )
} 