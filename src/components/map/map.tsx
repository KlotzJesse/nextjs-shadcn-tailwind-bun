"use client"

import { useEffect, useRef, useState } from "react"
import maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import { useMapStore } from "@/lib/store/map-store"

interface MapProps {
  data: any
  granularity: string
  onSearch?: (plz: string) => void
}

interface MapInstance {
  on: (type: string, layerId: string | ((e: any) => void), listener?: (e: any) => void) => void;
  off: (type: string, layerId: string | ((e: any) => void), listener?: (e: any) => void) => void;
  addSource: (id: string, source: any) => void;
  removeSource: (id: string) => void;
  addLayer: (layer: any) => void;
  removeLayer: (id: string) => void;
  getSource: (id: string) => any;
  setFilter: (layerId: string, filter: any[]) => void;
  remove: () => void;
  getCanvas: () => HTMLCanvasElement;
}

export function Map({ granularity }: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<MapInstance | null>(null)
  const [isMapLoaded, setIsMapLoaded] = useState(false)
  const { selectionMode, addSelectedRegion, removeSelectedRegion, selectedRegions } = useMapStore()

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    map.current = new (maplibregl as any).Map({
      container: mapContainer.current,
      style: "https://raw.githubusercontent.com/go2garret/maps/main/src/assets/json/openStreetMap.json",
      center: [10.4515, 51.1657], // Center of Germany
      zoom: 5,
      minZoom: 3,
      maxZoom: 18
    })

    map.current!.on('load', () => {
      setIsMapLoaded(true)
    })

   
  }, [])

  useEffect(() => {
    if (!map.current || !isMapLoaded) return
    console.log("selectedRegions", selectedRegions)
    map.current.setFilter('map-selected', ['in', 'id', ...selectedRegions])
  }, [selectedRegions])

  // Add data sources and layers
  useEffect(() => {
    if (!map.current || !isMapLoaded) return

    // Remove existing sources and layers
    if (map.current.getSource('map-data')) {
      map.current.removeLayer('map-layer')
      map.current.removeLayer('map-hover')
      map.current.removeLayer('map-selected')
      map.current.removeSource('map-data')
    }


      map.current.addSource('map-data', {
        type: 'geojson',
        data: `/api/states`
      })

    /*map.current.addSource('map-data', {
      type: 'geojson',
      data: `/api/topojson?granularity=${granularity}`
    })*/

    /*// Add main layer
    map.current.addLayer({
      id: 'map-states',
      type: 'fill',
      source: 'states',
      paint: {
        'fill-color': 'orange',
        'fill-opacity': 0.2,
        'fill-outline-color': '#fff'
      }
    })*/

    // Add main layer
    map.current.addLayer({
      id: 'map-layer',
      type: 'fill',
      source: 'map-data',
      paint: {
        'fill-color': '#088',
        'fill-opacity': 0.4,
        'fill-outline-color': '#000'
      }
    })

    // Add hover effect layer
    map.current.addLayer({
      id: 'map-hover',
      type: 'fill',
      source: 'map-data',
      paint: {
        'fill-color': 'red',
        'fill-opacity':1,
        'fill-outline-color': '#000'
      },
      filter: ['==', 'id', '']
    })

    // Add selected regions layer
    map.current.addLayer({
      id: 'map-selected',
      type: 'fill',
      source: 'map-data',
      paint: {
        'fill-color': '#f00',
        'fill-opacity': 0.6,
        'fill-outline-color': '#000'
      },
      filter: ['in', 'id', ...selectedRegions]
    })

    // Add hover interaction
    map.current.on('mousemove', 'map-layer', (e) => {
      if (!e.features?.length) return;
      
      const featureId = e.features[0].properties?.id || '';
      map.current?.setFilter('map-hover', ['==', 'id', featureId]);
    });

    map.current.on('mouseleave', 'map-layer', () => {
      map.current?.setFilter('map-hover', ['==', 'id', '']);
      if (selectionMode === 'cursor') {
        const canvas = map.current?.getCanvas()
        if (canvas) canvas.style.cursor = 'pointer'
      }
    })

    // Update selected regions filter when selection changes
    }, [isMapLoaded, granularity])

  // Handle cursor mode and click selection
  useEffect(() => {
    const mapInstance = map.current;
    if (!mapInstance || !isMapLoaded) return;

    const handleClick = (e: { features?: any[] }) => {
      if (selectionMode !== 'cursor' || !e.features || e.features.length === 0) return;

     
      const feature = e.features[0];
      const id = feature.properties?.id;
      if (id) {
        console.log("id", id, "selectedRegions", selectedRegions)
        if(selectedRegions.includes(id)) {
          removeSelectedRegion(id);
        }else {
          addSelectedRegion(id);
        }
      }
    };

    // Set cursor style based on mode
    const canvas = mapInstance.getCanvas();
    if (canvas) {
      if (selectionMode === 'cursor') {
        canvas.style.cursor = 'pointer';
      } else if (selectionMode === 'lasso' || selectionMode === 'radius') {
        canvas.style.cursor = 'crosshair';
      } else {
        canvas.style.cursor = 'grab';
      }
    }

    // Add click handler for cursor mode
    mapInstance.on('click', 'map-layer', handleClick)

    return () => {
      if (mapInstance) {
        mapInstance.off('click', 'map-layer', handleClick);
      }
    };
  }, [isMapLoaded, selectedRegions]);

  

  return (
    <div ref={mapContainer} className="w-full h-full" />
  )
} 