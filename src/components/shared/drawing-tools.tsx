"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { 
  MousePointer, 
  Lasso, 
  Circle, 
  Square, 
  Triangle, 
  Minus, 
  Plus,
  RotateCcw,
  Trash2,
  Eye,
  EyeOff,
  Search,
  X,
  PieChart,
  SquareStack,
  Diamond,
  FileSpreadsheet,
  Copy
} from "lucide-react"
import { TerraDrawMode } from "@/lib/hooks/use-terradraw"
import { useMapState } from "@/lib/url-state/map-state"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { exportPostalCodesXLSX, copyPostalCodesCSV } from '@/lib/utils/export-utils'

interface DrawingToolsProps {
  currentMode: TerraDrawMode | null
  onModeChange: (mode: TerraDrawMode | null) => void
  onClearAll: () => void
  onToggleVisibility: () => void
  isVisible: boolean
  onSearch?: (query: string) => void
  granularity?: string
  onGranularityChange?: (granularity: string) => void
  postalCodesData?: any
}

const AngledRectangleIcon = (props: any) => (
  <Square className={"rotate-45 scale-90 " + (props.className || "")} {...props} />
)

const drawingModes = [
  {
    id: 'cursor' as const,
    name: 'Cursor',
    icon: MousePointer,
    description: 'Click to select regions',
    category: 'selection'
  },
  {
    id: 'freehand' as const,
    name: 'Lasso',
    icon: Lasso,
    description: 'Draw freehand to select regions',
    category: 'drawing'
  },
  {
    id: 'circle' as const,
    name: 'Circle',
    icon: Circle,
    description: 'Draw circle to select regions',
    category: 'drawing'
  },
  {
    id: 'polygon' as const,
    name: 'Polygon',
    icon: Triangle,
    description: 'Draw polygon by clicking points',
    category: 'drawing'
  },
  {
    id: 'rectangle' as const,
    name: 'Rectangle',
    icon: Square,
    description: 'Draw rectangles',
    category: 'drawing'
  },
  {
    id: 'angled-rectangle' as const,
    name: 'Angled Rectangle',
    icon: Diamond,
    description: 'Draw angled rectangles',
    category: 'drawing'
  },
  {
    id: 'sector' as const,
    name: 'Sector',
    icon: PieChart,
    description: 'Draw circle sectors',
    category: 'drawing'
  }
]

function DrawingToolsImpl({
  currentMode,
  onModeChange,
  onClearAll,
  onToggleVisibility,
  isVisible,
  onSearch,
  granularity,
  onGranularityChange,
  postalCodesData
}: DrawingToolsProps) {
  const { selectedRegions, clearSelectedRegions } = useMapState()

  const handleModeClick = (mode: TerraDrawMode) => {
    if (currentMode === mode) {
      onModeChange(null) // Deselect if clicking the same mode
    } else {
      onModeChange(mode)
    }
  }

  const allModes = drawingModes

  // Helper: get all postal codes as array, prepending D-
  const getPostalCodes = () => {
    if (!postalCodesData || !postalCodesData.features) return []
    // If any selected, only export those
    const codes = postalCodesData.features
      .map((f: any) => f.properties?.PLZ || f.properties?.plz || f.properties?.id)
      .filter(Boolean)
    if (selectedRegions && selectedRegions.length > 0) {
      return codes
        .filter((code: string) => selectedRegions.includes(code))
        .map((code: string) => `D-${code}`)
    }
    return codes.map((code: string) => `D-${code}`)
  }

  // Export as Excel
  const handleExportExcel = async () => {
    const codes = getPostalCodes()
    await exportPostalCodesXLSX(codes)
  }

  // Copy as CSV
  const handleCopyCSV = async () => {
    const codes = getPostalCodes()
    await copyPostalCodesCSV(codes)
  }

  return (
    <Card role="region" aria-label="Map Tools Panel">
      <CardHeader>
        <CardTitle>Map Tools</CardTitle>
        <CardAction>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleVisibility}
            title="Hide map tools panel"
            aria-label="Hide map tools panel"
            style={{ margin: '-8px' }}
            className="focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Granularity select (if provided) */}
        {granularity && onGranularityChange && (
          <div className="mb-2">
            <Select value={granularity} onValueChange={onGranularityChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select granularity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="plz-1stellig">PLZ 1-stellig</SelectItem>
                <SelectItem value="plz-2stellig">PLZ 2-stellig</SelectItem>
                <SelectItem value="plz-3stellig">PLZ 3-stellig</SelectItem>
                <SelectItem value="plz-5stellig">PLZ 5-stellig</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        {/* Tools Grid */}
        <div className="grid grid-cols-2 gap-2">
          {allModes.map((mode) => {
            const Icon = mode.icon
            const isActive = currentMode === mode.id
            return (
              <Button
                key={mode.id}
                variant={isActive ? 'default' : 'outline'}
                size="sm"
                className="h-auto p-3 flex flex-col items-center gap-1 group focus:outline-none focus:ring-2 focus:ring-primary"
                onClick={() => handleModeClick(mode.id)}
                title={mode.description}
                aria-label={mode.name}
              >
                <Icon className="h-4 w-4 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-xs">{mode.name}</span>
              </Button>
            )
          })}
        </div>
        
        <Separator />
        
        {/* Selected Regions */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Selected Regions</span>
            <span className="text-xs text-muted-foreground">
              {selectedRegions.length} selected
            </span>
          </div>
          {selectedRegions.length > 0 && (
            <div className="max-h-24 overflow-y-auto space-y-1">
              {selectedRegions.slice(0, 5).map((region: string) => (
                <div
                  key={region}
                  className="text-xs p-2 bg-muted rounded flex justify-between items-center"
                >
                  <span className="truncate">{region}</span>
                </div>
              ))}
              {selectedRegions.length > 5 && (
                <div className="text-xs text-muted-foreground text-center">
                  +{selectedRegions.length - 5} more
                </div>
              )}
            </div>
          )}
        </div>
        {/* Only show separator if at least one action button is visible */}
        {(currentMode && currentMode !== 'cursor') || selectedRegions.length > 0 ? <Separator /> : null}
        {/* Action Buttons */}
        <div className="flex gap-2">
          {currentMode && currentMode !== 'cursor' && (
            <Button
              variant="destructive"
              size="sm"
              onClick={onClearAll}
              className="flex-1 focus:outline-none focus:ring-2 focus:ring-primary"
              title="Clear all drawings and selections"
              aria-label="Clear all drawings and selections"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          )}
          {selectedRegions.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearSelectedRegions}
              className="flex-1 focus:outline-none focus:ring-2 focus:ring-primary"
              title="Clear selected regions"
              aria-label="Clear selected regions"
            >
              <EyeOff className="h-4 w-4 mr-2" />
              Deselect
            </Button>
          )}
        </div>
        
        {/* Export/Copy Buttons at the bottom */}
        {postalCodesData && (
          <div className="flex gap-2 mt-6 pt-4 border-t">
            <Button variant="outline" size="sm" onClick={handleExportExcel} title="Export as XLS" aria-label="Export as XLS" className="focus:outline-none focus:ring-2 focus:ring-primary">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export XLS
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopyCSV} title="Copy as CSV" aria-label="Copy as CSV" className="focus:outline-none focus:ring-2 focus:ring-primary">
              <Copy className="h-4 w-4 mr-2" />
              Copy CSV
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function DrawingTools(props: DrawingToolsProps) {
  return (
    <Suspense fallback={<Skeleton className="w-full h-full min-h-[200px] rounded-lg" />}>
      <DrawingToolsImpl {...props} />
    </Suspense>
  )
} 