import type {
  LayerSpecification,
  Map as MapLibreMap,
  StyleSpecification,
} from "maplibre-gl";

/**
 * Utility functions for customizing map styles to enhance city name visibility
 * and set language preferences for map labels
 */

/**
 * Supported languages for map labels
 */
export const SUPPORTED_LANGUAGES = {
  de: "Deutsch",
  en: "English",
  fr: "Français",
  es: "Español",
  it: "Italiano",
  pl: "Polski",
  nl: "Nederlands",
  cs: "Čeština",
} as const;

export type SupportedLanguage = keyof typeof SUPPORTED_LANGUAGES;

/**
 * Modifies a MapLibre style to always show city names at all zoom levels
 * @param originalStyle The original style specification
 * @returns Modified style with enhanced city name visibility
 */
export function enhanceCityNamesInStyle(
  originalStyle: StyleSpecification
): StyleSpecification {
  // Clone the style to avoid mutations
  const enhancedStyle: StyleSpecification = JSON.parse(
    JSON.stringify(originalStyle)
  );

  // Find and modify all city/place label layers
  enhancedStyle.layers = enhancedStyle.layers.map(
    (layer: LayerSpecification) => {
      // Look for major city/place label layers - be very specific to avoid duplicates
      const isCityLayer =
        layer.type === "symbol" &&
        layer.id &&
        layer.layout &&
        typeof layer.layout === "object" &&
        "text-field" in layer.layout &&
        // Only target major city/place layers - be very specific
        (layer.id.match(/^place.*city/) ||
          layer.id.match(/^place.*town/) ||
          layer.id.match(/^city/) ||
          layer.id.match(/^town/) ||
          // CartoDB specific major city patterns
          layer.id === "place_city" ||
          layer.id === "place_town" ||
          layer.id === "place_capital" ||
          layer.id === "city_label" ||
          layer.id === "town_label" ||
          // Only catch major place layers, not all labels
          (layer.id.includes("place") && 
           (layer.id.includes("city") || layer.id.includes("town")) &&
           !layer.id.includes("minor"))) &&
        // Strict exclusions to prevent duplicates and wrong layers
        !layer.id.includes("postal") &&
        !layer.id.includes("plz") &&
        !layer.id.includes("zip") &&
        !layer.id.includes("boundary") &&
        !layer.id.includes("admin") &&
        !layer.id.includes("state") &&
        !layer.id.includes("region") &&
        !layer.id.includes("country") &&
        !layer.id.includes("continent") &&
        !layer.id.includes("road") &&
        !layer.id.includes("water") &&
        !layer.id.includes("poi") &&
        !layer.id.includes("village") &&
        !layer.id.includes("hamlet") &&
        !layer.id.includes("suburb") &&
        // Exclude our own custom layers
        !layer.id.includes("selected") &&
        !layer.id.includes("hover");

      if (isCityLayer) {
        if (process.env.NODE_ENV === "development") {
          console.log(`Enhancing city layer: ${layer.id}`);
        }

        const modifiedLayer = { ...layer };

        // Ensure layout exists
        if (!modifiedLayer.layout) {
          modifiedLayer.layout = {};
        }

        // Ensure paint exists
        if (!modifiedLayer.paint) {
          modifiedLayer.paint = {};
        }

        // Remove all zoom constraints to show labels at all zoom levels
        if ("minzoom" in modifiedLayer) {
          delete modifiedLayer.minzoom;
        }
        if ("maxzoom" in modifiedLayer) {
          delete modifiedLayer.maxzoom;
        }

        // Set very early visibility for cities
        modifiedLayer.minzoom = 0;
        modifiedLayer.maxzoom = 22;

        // Enhance text visibility settings
        const layout = modifiedLayer.layout as Record<string, unknown>;
        const paint = modifiedLayer.paint as Record<string, unknown>;

        // Set German as the primary language for labels
        // Create the German-prioritized text field expression
        const germanTextFieldExpression = [
          "coalesce",
          ["get", "name:de"], // Standard German name (most common)
          ["get", "name_de"], // Alternative German name format
          ["get", "name:deutsch"], // Another possible format
          ["get", "name_DE"], // Uppercase variant
          ["get", "name:ger"], // ISO 639-2 language code
          ["get", "name:deu"], // ISO 639-3 language code
          ["get", "name"], // Fallback to generic name
          "", // Empty string as last resort
        ];

        // Always use the German expression - don't try to include original complex expressions
        layout["text-field"] = germanTextFieldExpression;

        // Make text more visible and prioritized - cities should never be hidden
        layout["text-allow-overlap"] = false; // Keep false to prevent cluttering
        layout["text-ignore-placement"] = false; // Keep placement logic  
        layout["text-optional"] = false; // Make text required - cities must show
        layout["symbol-avoid-edges"] = false; // Allow labels near edges
        layout["text-keep-upright"] = true; // Keep text readable
        layout["text-max-angle"] = 45; // Allow some rotation for placement
        // Force cities to always be considered for placement
        layout["icon-optional"] = true; // Prioritize text over icons

        // Set high-priority text sizing for major cities - very prominent at low zoom
        layout["text-size"] = [
          "interpolate",
          ["linear"],
          ["zoom"],
          0,
          16, // Very large text from zoom 0 for major cities like Munich
          1,
          17, // Even larger at zoom 1
          2,
          18, // Large at zoom 2
          4,
          19, // Even larger
          6,
          20, // Good size at low-medium zoom
          8,
          21, // Large at medium zoom
          12,
          23, // Very large at high zoom
          16,
          25, // Very large
          20,
          26, // Maximum size at highest zoom
        ];

        // Add variable anchor offsets for better label placement
        layout["text-variable-anchor-offset"] = [
          "top",
          [0, 1],
          "bottom",
          [0, -1],
          "left",
          [1, 0],
          "right",
          [-1, 0],
        ];

        // Set very high priority for major cities and better spacing
        layout["symbol-sort-key"] = 100; // Much higher priority
        layout["text-justify"] = "auto";
        layout["symbol-spacing"] = 500; // More space between symbols to prevent overlap
        layout["text-padding"] = 10; // More padding around text

        // Enhance text contrast and readability for high priority city names
        paint["text-halo-width"] = 3;
        paint["text-halo-color"] = "#ffffff";
        paint["text-color"] = "#000000";

        // Ensure maximum visibility
        paint["text-opacity"] = 1.0;

        return modifiedLayer;
      }

      return layer;
    }
  );

  if (process.env.NODE_ENV === "development") {
    // Log all symbol layers for debugging
    const allSymbolLayers = enhancedStyle.layers.filter(
      (layer: LayerSpecification) => layer.type === "symbol"
    );
    console.log(
      "All symbol layers found:",
      allSymbolLayers.map((l) => l.id)
    );

    const enhancedLayers = enhancedStyle.layers.filter(
      (layer: LayerSpecification) =>
        (layer.type === "symbol" && layer.id?.includes("city")) ||
        layer.id?.includes("place") ||
        layer.id?.includes("label")
    );
    console.log(
      `Enhanced ${enhancedLayers.length} city/place label layers for better visibility`
    );
    console.log(
      "Enhanced layer IDs:",
      enhancedLayers.map((l) => l.id)
    );
  }

  return enhancedStyle;
}

/**
 * Fetches and modifies the CartoDB Positron style for enhanced city visibility
 * @returns Promise resolving to the enhanced style specification
 */
export async function getEnhancedPositronStyle(): Promise<StyleSpecification> {
  try {
    const response = await fetch(
      "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch style: ${response.status}`);
    }

    const originalStyle: StyleSpecification = await response.json();
    return enhanceCityNamesInStyle(originalStyle);
  } catch (error) {
    console.error("Error fetching or modifying map style:", error);
    // Fallback to original style URL if modification fails
    throw error;
  }
}

/**
 * Sets the language for all text layers on a loaded map
 * @param map The MapLibre map instance
 * @param language The language code (e.g., 'de', 'en', 'fr')
 */
export function setMapLanguage(
  map: MapLibreMap,
  language: SupportedLanguage = "de"
): void {
  if (!map || typeof map.getStyle !== "function") {
    console.warn("Invalid map instance provided to setMapLanguage");
    return;
  }

  try {
    const style = map.getStyle();
    if (!style || !style.layers) return;

    // Find city/place symbol layers with text fields (exclude postal codes, boundaries, etc.)
    style.layers.forEach((layer: LayerSpecification) => {
      if (
        layer.type === "symbol" &&
        layer.layout &&
        typeof layer.layout === "object" &&
        "text-field" in layer.layout &&
        layer.id &&
        // Only target major city/place layers - match the style enhancement logic
        (layer.id.match(/^place.*city/) ||
          layer.id.match(/^place.*town/) ||
          layer.id.match(/^city/) ||
          layer.id.match(/^town/) ||
          layer.id === "place_city" ||
          layer.id === "place_town" ||
          layer.id === "place_capital" ||
          layer.id === "city_label" ||
          layer.id === "town_label" ||
          (layer.id.includes("place") && 
           (layer.id.includes("city") || layer.id.includes("town")) &&
           !layer.id.includes("minor"))) &&
        // Strict exclusions to prevent duplicates and wrong layers
        !layer.id.includes("postal") &&
        !layer.id.includes("plz") &&
        !layer.id.includes("zip") &&
        !layer.id.includes("boundary") &&
        !layer.id.includes("admin") &&
        !layer.id.includes("state") &&
        !layer.id.includes("region") &&
        !layer.id.includes("country") &&
        !layer.id.includes("continent") &&
        !layer.id.includes("road") &&
        !layer.id.includes("water") &&
        !layer.id.includes("poi") &&
        !layer.id.includes("village") &&
        !layer.id.includes("hamlet") &&
        !layer.id.includes("suburb") &&
        // Exclude our own custom layers
        !layer.id.includes("selected") &&
        !layer.id.includes("hover")
      ) {
        try {
          // Set the text field to use the specified language
          const textField =
            language === "de"
              ? [
                  "coalesce",
                  ["get", "name:de"],
                  ["get", "name_de"],
                  ["get", "name:deutsch"],
                  ["get", "name_DE"],
                  ["get", "name:ger"],
                  ["get", "name:deu"],
                  ["get", "name"],
                  "",
                ]
              : [
                  "coalesce",
                  ["get", `name:${language}`],
                  ["get", `name_${language}`],
                  ["get", "name"],
                  "",
                ];

          map.setLayoutProperty(layer.id, "text-field", textField);

          if (process.env.NODE_ENV === "development") {
            console.log(
              `Updated layer ${layer.id} to use ${language} language`
            );
          }
        } catch (error) {
          if (process.env.NODE_ENV === "development") {
            console.warn(
              `Failed to update language for layer ${layer.id}:`,
              error
            );
          }
        }
      }
    });

    if (process.env.NODE_ENV === "development") {
      console.log(`Map language updated to: ${language}`);
    }
  } catch (error) {
    console.error("Error setting map language:", error);
  }
}

/**
 * Ensures major German cities are always visible and prioritized above state labels
 * @param map The MapLibre map instance
 */
export function ensureMajorCitiesVisible(map: MapLibreMap): void {
  if (!map || typeof map.getStyle !== "function") return;

  try {
    const style = map.getStyle();
    if (!style || !style.layers) return;

    // Target only the most likely layers to contain major cities
    const cityLayerPatterns = [
      /^place.*city/,
      /^place.*town/,
      /^city/,
      /^town/,
      "place_city",
      "place_town", 
      "place_capital",
      "city_label",
      "town_label"
    ];

    style.layers.forEach((layer: LayerSpecification) => {
      if (
        layer.type === "symbol" &&
        layer.layout &&
        typeof layer.layout === "object" &&
        "text-field" in layer.layout &&
        layer.id &&
        cityLayerPatterns.some(pattern => 
          typeof pattern === 'string' 
            ? layer.id === pattern 
            : pattern.test(layer.id)
        )
      ) {
        try {
          // Ensure major city layers are visible with highest priority
          map.setLayoutProperty(layer.id, "visibility", "visible");
          map.setLayoutProperty(layer.id, "text-optional", false);
          map.setLayoutProperty(layer.id, "symbol-sort-key", 100);
          // Ensure cities don't get blocked by state labels
          map.setLayoutProperty(layer.id, "text-ignore-placement", false);
          map.setLayoutProperty(layer.id, "text-allow-overlap", false);
          // Give cities more space and priority
          map.setLayoutProperty(layer.id, "symbol-spacing", 500);
          map.setLayoutProperty(layer.id, "text-padding", 10);

          if (process.env.NODE_ENV === "development") {
            console.log(`Ensured major city visibility for layer: ${layer.id}`);
          }
        } catch (error) {
          if (process.env.NODE_ENV === "development") {
            console.warn(
              `Failed to ensure visibility for major city layer ${layer.id}:`,
              error
            );
          }
        }
      }
    });
  } catch (error) {
    console.error("Error ensuring major cities visibility:", error);
  }
}

/**
 * Creates a data URI for the enhanced style to use with MapLibre
 * @param style The style specification object
 * @returns Data URI string for the style
 */
export function createStyleDataUri(style: StyleSpecification): string {
  const styleJson = JSON.stringify(style);
  return `data:application/json;charset=utf-8,${encodeURIComponent(styleJson)}`;
}
