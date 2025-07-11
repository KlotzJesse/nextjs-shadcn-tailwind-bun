import { FeatureCollection, GeoJsonProperties, MultiPolygon, Polygon } from "geojson";

export interface ParsedPostalCode {
  original: string;
  normalized: string;
  countryCode?: string;
  isValid: boolean;
  error?: string;
}

export interface PostalCodeMatch {
  code: string;
  matched: string[];
  granularity: string;
}

/**
 * Normalizes a postal code by removing country prefixes and formatting
 */
export function normalizePostalCode(input: string): string {
  return input
    .trim()
    .replace(/^D-?/i, '') // Remove German country prefix
    .replace(/\s+/g, '') // Remove spaces
    .toUpperCase();
}

/**
 * Validates if a string could be a German postal code
 */
export function isValidGermanPostalCode(code: string): boolean {
  const normalized = normalizePostalCode(code);
  // German postal codes are 1-5 digits (for different granularities)
  return /^\d{1,5}$/.test(normalized);
}

/**
 * Parses various input formats for postal codes
 */
export function parsePostalCodeInput(input: string): ParsedPostalCode[] {
  if (!input.trim()) return [];

  const results: ParsedPostalCode[] = [];

  // Split by common delimiters: newlines, commas, semicolons, spaces
  const codes = input
    .split(/[,;\n\r\s]+/)
    .map(code => code.trim())
    .filter(code => code.length > 0);

  for (const original of codes) {
    const normalized = normalizePostalCode(original);
    const countryMatch = original.match(/^([A-Z]{1,2})-?/i);

    results.push({
      original,
      normalized,
      countryCode: countryMatch?.[1]?.toUpperCase(),
      isValid: isValidGermanPostalCode(original),
      error: !isValidGermanPostalCode(original) ?
        `"${original}" ist keine gültige deutsche PLZ` : undefined
    });
  }

  return results;
}

/**
 * Finds matching postal codes based on granularity and input patterns
 */
export function findPostalCodeMatches(
  parsedCodes: ParsedPostalCode[],
  availableData: FeatureCollection<Polygon | MultiPolygon, GeoJsonProperties>,
  targetGranularity: string
): PostalCodeMatch[] {
  const matches: PostalCodeMatch[] = [];

  // Get all available postal codes from the data
  const allCodes = availableData.features
    .map(f => f.properties?.code || f.properties?.PLZ || f.properties?.plz)
    .filter((code): code is string => Boolean(code))
    .map(code => normalizePostalCode(code));

  for (const parsed of parsedCodes) {
    if (!parsed.isValid) continue;

    const inputCode = parsed.normalized;
    const matchedCodes: string[] = [];

    // Exact match first
    if (allCodes.includes(inputCode)) {
      matchedCodes.push(inputCode);
    } else {
      // Pattern matching based on granularity and input length
      const inputLength = inputCode.length;

      if (inputLength < 5) {
        // Partial code - find all codes that start with this pattern
        const pattern = inputCode;
        const prefixMatches = allCodes.filter(code =>
          code.startsWith(pattern)
        );
        matchedCodes.push(...prefixMatches);
      }
    }

    if (matchedCodes.length > 0) {
      matches.push({
        code: inputCode,
        matched: [...new Set(matchedCodes)], // Remove duplicates
        granularity: targetGranularity
      });
    }
  }

  return matches;
}

/**
 * Parses CSV content and extracts postal codes
 */
export function parseCSVPostalCodes(csvContent: string): string[] {
  const lines = csvContent.split(/\r?\n/).filter(line => line.trim());
  const codes: string[] = [];

  for (const line of lines) {
    // Try to parse as CSV (split by comma, semicolon, or tab)
    const fields = line.split(/[,;\t]/).map(field => field.trim().replace(/"/g, ''));

    for (const field of fields) {
      if (isValidGermanPostalCode(field)) {
        codes.push(field);
      }
    }
  }

  return codes;
}

/**
 * Estimates the granularity level from a postal code
 */
export function estimateGranularity(code: string): string {
  const normalized = normalizePostalCode(code);
  const length = normalized.length;

  switch (length) {
    case 1: return "1digit";
    case 2: return "2digit";
    case 3: return "3digit";
    case 5: return "5digit";
    default: return "5digit";
  }
}

/**
 * Groups postal code matches by their input pattern
 */
export function groupMatchesByPattern(matches: PostalCodeMatch[]): Record<string, PostalCodeMatch> {
  return matches.reduce((acc, match) => {
    acc[match.code] = match;
    return acc;
  }, {} as Record<string, PostalCodeMatch>);
}
