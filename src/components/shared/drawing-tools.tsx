"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  X
} from "lucide-react"
import { TerraDrawMode } from "@/lib/hooks/use-terradraw"
import { useMapState } from "@/lib/url-state/map-state"

interface DrawingToolsProps {
  currentMode: TerraDrawMode | null
  onModeChange: (mode: TerraDrawMode | null) => void
  onClearAll: () => void
  onToggleVisibility: () => void
  isVisible: boolean
  onSearch?: (query: string) => void
}

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
  // Additional modes can be re-enabled later
  /*
  {
    id: 'polygon' as const,
    name: 'Polygon',
    icon: Triangle,
    description: 'Draw polygon by clicking points',
    category: 'drawing'
  },
  {
    id: 'point' as const,
    name: 'Point',
    icon: Plus,
    description: 'Add single points',
    category: 'drawing'
  },
  {
    id: 'linestring' as const,
    name: 'Line',
    icon: Minus,
    description: 'Draw lines/paths',
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
    icon: RotateCcw,
    description: 'Draw angled rectangles',
    category: 'drawing'
  },
  {
    id: 'sector' as const,
    name: 'Sector',
    icon: Circle,
    description: 'Draw circle sectors',
    category: 'drawing'
  },
  {
    id: 'select' as const,
    name: 'Select',
    icon: MousePointer,
    description: 'Select and edit existing features',
    category: 'selection'
  }
  */
]

export function DrawingTools({
  currentMode,
  onModeChange,
  onClearAll,
  onToggleVisibility,
  isVisible,
  onSearch
}: DrawingToolsProps) {
  const [activeCategory, setActiveCategory] = useState<'selection' | 'drawing'>('selection')
  const [searchQuery, setSearchQuery] = useState("")
  const { selectedRegions, clearSelectedRegions } = useMapState()

  const handleModeClick = (mode: TerraDrawMode) => {
    if (currentMode === mode) {
      onModeChange(null) // Deselect if clicking the same mode
    } else {
      onModeChange(mode)
    }
  }

  const handleSearch = () => {
    if (searchQuery.trim() && onSearch) {
      onSearch(searchQuery.trim())
      setSearchQuery("")
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  const filteredModes = drawingModes.filter(mode => mode.category === activeCategory)

  return (
    <Card className="w-80">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Map Tools</CardTitle>
        
        {/* Search Section */}
        {onSearch && (
          <div className="space-y-2">
            <div className="flex space-x-2">
              <Input
                placeholder="Search regions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1"
              />
              <Button size="sm" onClick={handleSearch}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Category Tabs */}
        <div className="flex gap-2">
          <Button
            variant={activeCategory === 'selection' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveCategory('selection')}
          >
            Selection
          </Button>
          <Button
            variant={activeCategory === 'drawing' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveCategory('drawing')}
          >
            Drawing
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Tools Grid */}
        <div className="grid grid-cols-2 gap-2">
          {filteredModes.map((mode) => {
            const Icon = mode.icon
            const isActive = currentMode === mode.id
            
            return (
              <Button
                key={mode.id}
                variant={isActive ? 'default' : 'outline'}
                size="sm"
                className="h-auto p-3 flex flex-col items-center gap-1"
                onClick={() => handleModeClick(mode.id)}
                title={mode.description}
              >
                <Icon className="h-4 w-4" />
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
        
        <Separator />
        
        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onClearAll}
            className="flex-1"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All
          </Button>
          {selectedRegions.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearSelectedRegions}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleVisibility}
          >
            {isVisible ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        {currentMode && (
          <div className="text-xs text-muted-foreground">
            Active: {drawingModes.find(m => m.id === currentMode)?.name}
          </div>
        )}
      </CardContent>
    </Card>
  )
} 