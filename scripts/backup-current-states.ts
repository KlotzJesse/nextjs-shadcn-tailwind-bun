#!/usr/bin/env bun

/**
 * Script to backup current state boundaries before updating
 * Usage: bun run scripts/backup-current-states.ts
 */

import postgres from 'postgres';
import { join } from 'path';

// Database configuration
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/krauss';
const sql = postgres(connectionString);

async function backupCurrentStates() {
  console.log('💾 Creating backup of current state boundaries...');
  
  try {
    // Export current states as GeoJSON
    const result = await sql`
      SELECT jsonb_build_object(
        'type', 'FeatureCollection',
        'features', jsonb_agg(
          jsonb_build_object(
            'type', 'Feature',
            'id', s.id,
            'properties', jsonb_build_object(
              'id', s.id,
              'name', s.name,
              'code', s.code,
              'createdAt', s.created_at,
              'updatedAt', s.updated_at
            ) || COALESCE(s.properties, '{}'::jsonb),
            'geometry', ST_AsGeoJSON(s.geometry)::jsonb
          )
        )
      ) as geojson
      FROM states s
    `;
    
    const geojson = result[0].geojson;
    
    // Create backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = join(process.cwd(), 'backups');
    const backupFile = join(backupDir, `states-backup-${timestamp}.geojson`);
    
    // Ensure backup directory exists
    await Bun.write(backupFile, JSON.stringify(geojson, null, 2));
    
    console.log(`✅ Backup created: ${backupFile}`);
    
    console.log('📝 For complete restoration, use: pg_dump and pg_restore with the states table');
    console.log(`💡 GeoJSON backup contains all geometry data at: ${backupFile}`);
    
    // Show backup statistics
    const stats = await sql`
      SELECT 
        COUNT(*) as state_count,
        SUM(ST_NPoints(geometry)) as total_points,
        AVG(ST_NPoints(geometry))::integer as avg_points_per_state,
        SUM(ST_Area(geometry::geography)) / 1000000 as total_area_km2
      FROM states
    `;
    
    console.log('\n📊 Backup statistics:');
    console.table({
      'States backed up': stats[0].state_count,
      'Total geometry points': stats[0].total_points,
      'Avg points per state': stats[0].avg_points_per_state,
      'Total area (km²)': Math.round(stats[0].total_area_km2 as number).toLocaleString(),
    });
    
  } catch (error) {
    console.error('❌ Error creating backup:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// Create backups directory
async function ensureBackupDir() {
  const backupDir = join(process.cwd(), 'backups');
  try {
    await Bun.write(join(backupDir, '.gitkeep'), '');
  } catch {
    // Directory creation handled by Bun.write
  }
}

async function main() {
  await ensureBackupDir();
  await backupCurrentStates();
  console.log('\n✅ Backup completed successfully!');
  console.log('💡 You can now run the high-resolution update script');
}

// Run the script
main();
