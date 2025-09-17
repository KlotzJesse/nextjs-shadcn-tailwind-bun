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
      // Look for city/place label layers - be more specific to avoid postal codes and states
      const isCityLayer =
        layer.type === "symbol" &&
        layer.id &&
        layer.layout &&
        typeof layer.layout === "object" &&
        "text-field" in layer.layout &&
        // Primary city/place identifiers
        (layer.id.includes("city") ||
          layer.id.includes("place") ||
          layer.id.includes("town") ||
          layer.id.includes("village") ||
          layer.id.includes("locality") ||
          layer.id.includes("settlement") ||
          // CartoDB specific patterns for places
          layer.id.match(/poi.*label/) ||
          layer.id.match(/place.*label/)) &&
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

        // Remove or reduce minzoom to show labels at all zoom levels
        if ("minzoom" in modifiedLayer) {
          delete modifiedLayer.minzoom;
        }

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

        // Make text more visible
        layout["text-allow-overlap"] = false; // Keep false to prevent cluttering
        layout["text-ignore-placement"] = false; // Keep placement logic
        layout["text-optional"] = false; // Make text required

        // Set high-priority text sizing for city names - larger and more visible
        layout["text-size"] = [
          "interpolate",
          ["linear"],
          ["zoom"],
          0,
          12, // Large text even at very low zoom for major cities
          3,
          14, // Larger at low zoom
          5,
          15, // Even larger
          8,
          16, // Good size at medium zoom
          12,
          18, // Large at high zoom
          16,
          20, // Very large
          20,
          22, // Maximum size at highest zoom
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
    const enhancedLayers = enhancedStyle.layers.filter(
      (layer: LayerSpecification) =>
        (layer.type === "symbol" && layer.id?.includes("city")) ||
        layer.id?.includes("place")
    );
    console.log(
      `Enhanced ${enhancedLayers.length} city/place label layers for better visibility`
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
        // Only target actual city/place layers
        (layer.id.includes("city") ||
          layer.id.includes("place") ||
          layer.id.includes("town") ||
          layer.id.includes("village") ||
          layer.id.includes("locality") ||
          layer.id.includes("settlement") ||
          layer.id.match(/poi.*label/) ||
          layer.id.match(/place.*label/)) &&
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
 * Creates a data URI for the enhanced style to use with MapLibre
 * @param style The style specification object
 * @returns Data URI string for the style
 */
export function createStyleDataUri(style: StyleSpecification): string {
  const styleJson = JSON.stringify(style);
  return `data:application/json;charset=utf-8,${encodeURIComponent(styleJson)}`;
}
