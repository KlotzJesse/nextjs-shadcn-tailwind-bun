import { useState, useCallback } from "react"
import type { MapData } from "@/lib/types/map-data"
import { useMapState } from "@/lib/url-state/map-state"

interface PostalCodeSearchProps {
  data: MapData
}

export function usePostalCodeSearch({ data }: PostalCodeSearchProps) {
  const [searchResults, setSearchResults] = useState<string[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const { addSelectedRegion } = useMapState()

  const searchPostalCodes = useCallback((query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)

    try {
      // Simple search implementation - in a real app, you'd want more sophisticated search
      const results = data.features
        .filter(feature => {
          const searchTerm = query.toLowerCase()
          const id = feature.properties?.id?.toLowerCase() || ''
          const plz = feature.properties?.PLZ?.toLowerCase() || ''
          const plzAlt = feature.properties?.plz?.toLowerCase() || ''
          const name = feature.properties?.name?.toLowerCase() || ''
          
          return id.includes(searchTerm) || 
                 plz.includes(searchTerm) || 
                 plzAlt.includes(searchTerm) ||
                 name.includes(searchTerm)
        })
        .map(feature => feature.properties?.id || feature.properties?.PLZ || feature.properties?.plz || '')
        .filter(Boolean)
        .slice(0, 10) // Limit to 10 results

      setSearchResults(results)
    } catch (error) {
      console.error('Error searching postal codes:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [data])

  const selectPostalCode = useCallback((postalCode: string) => {
    addSelectedRegion(postalCode)
    setSearchResults([]) // Clear search results after selection
  }, [addSelectedRegion])

  const clearSearch = useCallback(() => {
    setSearchResults([])
    setIsSearching(false)
  }, [])

  return {
    searchResults,
    isSearching,
    searchPostalCodes,
    selectPostalCode,
    clearSearch
  }
} 