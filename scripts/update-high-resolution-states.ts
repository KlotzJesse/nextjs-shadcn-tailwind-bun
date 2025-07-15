#!/usr/bin/env bun

/**
 * Script to update state boundaries with high-resolution data from GitHub
 * Usage: bun run scripts/update-high-resolution-states.ts [--dry-run]
 */

import postgres from 'postgres';

// Database configuration
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/krauss';
const sql = postgres(connectionString);

// High-resolution GeoJSON URL
const HIGH_RES_URL = 'https://raw.githubusercontent.com/isellsoap/deutschlandGeoJSON/refs/heads/main/2_bundeslaender/1_sehr_hoch.geo.json';

interface HighResFeature {
  type: 'Feature';
  id: number;
  properties: {
    id: string;    // e.g., "DE-BW"
    name: string;  // e.g., "Baden-Württemberg"
    type: string;  // "State"
  };
  geometry: {
    type: 'MultiPolygon' | 'Polygon';
    coordinates: number[][][];
  };
}

interface HighResGeoJSON {
  type: 'FeatureCollection';
  features: HighResFeature[];
}

async function fetchHighResolutionData(): Promise<HighResGeoJSON> {
  console.log('📥 Fetching high-resolution GeoJSON data...');
  
  const response = await fetch(HIGH_RES_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
  }
  
  const geojson = await response.json() as HighResGeoJSON;
  console.log(`✅ Fetched ${geojson.features.length} state features`);
  
  return geojson;
}

async function getCurrentStates() {
  console.log('📊 Fetching current state data from database...');
  
  const currentStates = await sql`
    SELECT id, name, code FROM states ORDER BY code
  `;
  
  console.log(`📋 Found ${currentStates.length} states in database`);
  return currentStates;
}

function mapStateCode(highResId: string): string {
  // Map from high-resolution ID format (DE-XX) to our format
  const mapping: { [key: string]: string } = {
    'DE-BW': 'BW',  // Baden-Württemberg
    'DE-BY': 'BY',  // Bayern
    'DE-BE': 'BE',  // Berlin
    'DE-BB': 'BB',  // Brandenburg
    'DE-HB': 'HB',  // Bremen
    'DE-HH': 'HH',  // Hamburg
    'DE-HE': 'HE',  // Hessen
    'DE-MV': 'MV',  // Mecklenburg-Vorpommern
    'DE-NI': 'NI',  // Niedersachsen
    'DE-NW': 'NW',  // Nordrhein-Westfalen
    'DE-RP': 'RP',  // Rheinland-Pfalz
    'DE-SL': 'SL',  // Saarland
    'DE-SN': 'SN',  // Sachsen
    'DE-ST': 'ST',  // Sachsen-Anhalt
    'DE-SH': 'SH',  // Schleswig-Holstein
    'DE-TH': 'TH',  // Thüringen
  };
  
  return mapping[highResId] || highResId;
}

async function updateStateGeometry(feature: HighResFeature, dryRun: boolean) {
  const ourCode = mapStateCode(feature.properties.id);
  
  if (dryRun) {
    console.log(`🔍 [DRY RUN] Would update ${feature.properties.name} (${ourCode})`);
    return;
  }
  
  try {
    // Convert geometry to PostGIS format using direct SQL
    const geometryGeoJSON = JSON.stringify(feature.geometry);
    const properties = JSON.stringify({
      ...feature.properties,
      originalId: feature.properties.id,
    });
    
    const result = await sql`
      UPDATE states 
      SET 
        geometry = ST_SetSRID(ST_GeomFromGeoJSON(${geometryGeoJSON}), 4326),
        properties = ${properties}::jsonb,
        updated_at = NOW()
      WHERE code = ${ourCode}
      RETURNING id, name
    `;
    
    if (result.length === 0) {
      console.log(`⚠️  No state found with code ${ourCode} for ${feature.properties.name}`);
    } else {
      console.log(`✅ Updated ${result[0].name} (${ourCode})`);
    }
  } catch (error) {
    console.error(`❌ Failed to update ${feature.properties.name} (${ourCode}):`, error);
  }
}

async function verifyGeometryUpdate() {
  console.log('🔍 Verifying geometry updates...');
  
  // Get geometry statistics
  const stats = await sql`
    SELECT 
      s.name,
      s.code,
      ST_Area(s.geometry::geography) / 1000000 as area_km2,
      ST_NumGeometries(s.geometry) as num_parts,
      ST_NPoints(s.geometry) as num_points
    FROM states s
    ORDER BY s.name
  `;
  
  console.log('\n📊 Updated state geometry statistics:');
  console.table(stats.map((row) => ({
    State: row.name as string,
    Code: row.code as string,
    'Area (km²)': Math.round(row.area_km2 as number).toLocaleString(),
    'Parts': row.num_parts as number,
    'Points': (row.num_points as number).toLocaleString(),
  })));
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  
  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made');
  }
  
  try {
    // Fetch high-resolution data
    const highResData = await fetchHighResolutionData();
    
    // Log current state count for reference
    console.log('📊 Current states in database:', (await getCurrentStates()).length);
    
    // Update each state
    console.log('\n🔄 Updating state geometries...');
    for (const feature of highResData.features) {
      await updateStateGeometry(feature, dryRun);
    }
    
    if (!dryRun) {
      await verifyGeometryUpdate();
      console.log('\n✅ High-resolution state boundaries updated successfully!');
      console.log('💡 Run the boundary search test to verify improvements');
    } else {
      console.log('\n✅ Dry run completed - use without --dry-run to apply changes');
    }
    
  } catch (error) {
    console.error('❌ Error updating state boundaries:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// Run the script
main();
