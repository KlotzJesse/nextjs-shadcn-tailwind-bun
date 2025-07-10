/**
 * Utility functions for map feature type checking and processing
 */

/**
 * Type guard to check if a feature has a code property
 */
export function isFeatureWithCode(
  obj: unknown
): obj is { properties?: { code?: string } } {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "properties" in obj &&
    typeof (obj as { properties?: unknown }).properties === "object" &&
    (obj as { properties?: unknown }).properties !== null &&
    "code" in (obj as { properties: { code?: unknown } }).properties
  );
}

/**
 * Safely extracts the code from a feature object
 */
export function getFeatureCode(feature: unknown): string | undefined {
  if (isFeatureWithCode(feature)) {
    return feature.properties?.code;
  }
  return undefined;
}
