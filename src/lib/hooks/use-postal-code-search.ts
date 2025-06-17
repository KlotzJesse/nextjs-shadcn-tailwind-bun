import { Map as MapLibreMap } from "maplibre-gl"
import { MapData } from "@/app/map/[granularity]/map-data"
import * as turf from "@turf/turf"

interface PostalCodeSearchProps {
  map: MapLibreMap | null
  isMapLoaded: boolean
  data: MapData
  granularity: string
}

export function usePostalCodeSearch({
  map,
  isMapLoaded,
  data,
  granularity,
}: PostalCodeSearchProps) {
  const searchPostalCode = (plz: string) => {
    if (!map || !isMapLoaded || !data) return

    // Find the feature with the matching postal code
    const feature = data.features.find((f) => {
      const props = f.properties
      return (
        props.plz === plz ||
        props.PLZ99 === plz ||
        props.PLZ === plz ||
        props.plz99 === plz ||
        props.code === plz ||
        props.id === plz
      )
    })

    if (feature) {
      // Calculate the center of the feature
      const center = turf.center(feature as any)
      const bbox = turf.bbox(feature as any)
      const bboxPolygon = turf.bboxPolygon(bbox)

      // Fly to the feature
      map.fitBounds(
        [
          [bbox[0], bbox[1]], // Southwest coordinates
          [bbox[2], bbox[3]], // Northeast coordinates
        ],
        {
          padding: 50,
          duration: 1000,
        }
      )

      // Highlight the feature
      map.setFilter(`${granularity}-hover`, ["==", "id", feature.properties.id])
    }
  }

  return { searchPostalCode }
} 