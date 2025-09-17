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
      // Look for city/place label layers - expanded detection for major cities
      const isCityLayer =
        layer.type === "symbol" &&
        layer.id &&
        layer.layout &&
        typeof layer.layout === "object" &&
        "text-field" in layer.layout &&
        // Primary city/place identifiers (expanded)
        (layer.id.includes("city") ||
          layer.id.includes("place") ||
          layer.id.includes("town") ||
          layer.id.includes("village") ||
          layer.id.includes("locality") ||
          layer.id.includes("settlement") ||
          // CartoDB and other map provider patterns
          layer.id.match(/poi.*label/) ||
          layer.id.match(/place.*label/) ||
          layer.id.match(/.*label.*place/) ||
          layer.id.match(/.*label.*city/) ||
          layer.id.match(/.*label.*town/) ||
          // Common label layer patterns that might contain cities
          (layer.id.includes("label") &&
            !layer.id.includes("road") &&
            !layer.id.includes("water") &&
            !layer.id.includes("poi_") &&
            layer.layout["text-field"])) &&
        // Exclude postal codes, boundaries, and administrative layers
        !layer.id.includes("postal") &&
        !layer.id.includes("plz") &&
        !layer.id.includes("zip") &&
        !layer.id.includes("boundary") &&
        !layer.id.includes("admin") &&
        !layer.id.includes("state") &&
        !layer.id.includes("region") &&
        !layer.id.includes("country") &&
        !layer.id.includes("continent") &&
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

        // Make text more visible and prioritized
        layout["text-allow-overlap"] = false; // Keep false to prevent cluttering
        layout["text-ignore-placement"] = false; // Keep placement logic
        layout["text-optional"] = false; // Make text required
        layout["symbol-avoid-edges"] = false; // Allow labels near edges
        layout["text-keep-upright"] = true; // Keep text readable
        layout["text-max-angle"] = 45; // Allow some rotation for placement

        // Set high-priority text sizing for city names - start larger and earlier
        layout["text-size"] = [
          "interpolate",
          ["linear"],
          ["zoom"],
          0,
          14, // Large text from zoom 0 for major cities
          2,
          15, // Larger at very low zoom
          4,
          16, // Even larger
          6,
          17, // Good size at low-medium zoom
          8,
          18, // Large at medium zoom
          12,
          20, // Very large at high zoom
          16,
          22, // Very large
          20,
          24, // Maximum size at highest zoom
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

        // Set high priority for city names
        layout["symbol-sort-key"] = 5;
        layout["text-justify"] = "auto";

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
        // Only target actual city/place layers (expanded detection)
        (layer.id.includes("city") ||
          layer.id.includes("place") ||
          layer.id.includes("town") ||
          layer.id.includes("village") ||
          layer.id.includes("locality") ||
          layer.id.includes("settlement") ||
          layer.id.match(/poi.*label/) ||
          layer.id.match(/place.*label/) ||
          layer.id.match(/.*label.*place/) ||
          layer.id.match(/.*label.*city/) ||
          layer.id.match(/.*label.*town/) ||
          (layer.id.includes("label") &&
            !layer.id.includes("road") &&
            !layer.id.includes("water") &&
            !layer.id.includes("poi_"))) &&
        // Exclude postal codes, boundaries, and administrative layers
        !layer.id.includes("postal") &&
        !layer.id.includes("plz") &&
        !layer.id.includes("zip") &&
        !layer.id.includes("boundary") &&
        !layer.id.includes("admin") &&
        !layer.id.includes("state") &&
        !layer.id.includes("region") &&
        !layer.id.includes("country") &&
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
 * Forces visibility of all text layers after map load as a fallback
 * @param map The MapLibre map instance
 */
export function forceAllTextLayersVisible(map: MapLibreMap): void {
  if (!map || typeof map.getStyle !== "function") return;

  try {
    const style = map.getStyle();
    if (!style || !style.layers) return;

    style.layers.forEach((layer: LayerSpecification) => {
      if (
        layer.type === "symbol" &&
        layer.layout &&
        typeof layer.layout === "object" &&
        "text-field" in layer.layout &&
        layer.id &&
        // Target any text layer that might contain place names
        (layer.id.includes("place") ||
          layer.id.includes("city") ||
          layer.id.includes("town") ||
          layer.id.includes("label")) &&
        // Exclude our custom layers and unwanted types
        !layer.id.includes("road") &&
        !layer.id.includes("poi_") &&
        !layer.id.includes("selected") &&
        !layer.id.includes("hover")
      ) {
        try {
          // Force visibility
          map.setLayoutProperty(layer.id, "visibility", "visible");
          // Remove any minzoom constraints
          map.setLayoutProperty(layer.id, "text-optional", false);

          if (process.env.NODE_ENV === "development") {
            console.log(`Forced visibility for layer: ${layer.id}`);
          }
        } catch (error) {
          if (process.env.NODE_ENV === "development") {
            console.warn(
              `Failed to force visibility for layer ${layer.id}:`,
              error
            );
          }
        }
      }
    });
  } catch (error) {
    console.error("Error forcing text layer visibility:", error);
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
