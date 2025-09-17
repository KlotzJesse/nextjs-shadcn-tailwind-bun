#!/usr/bin/env bun
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { sql } from 'drizzle-orm';

// Use the environment variable for the database connection
const connectionString = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString });
const db = drizzle(pool);

async function testDatabase() {
  try {
    console.log('🔍 Testing Neon database connectivity...');
    
    // Test states table using Drizzle
    const stateCount = await db.execute(sql`SELECT COUNT(*) as count FROM states`);
    console.log('States count:', stateCount.rows[0].count);
    
    // Test postal_codes table
    const postalCodeCount = await db.execute(sql`SELECT COUNT(*) as count FROM postal_codes`);
    console.log('Postal codes count:', postalCodeCount.rows[0].count);
    
    // Test a simple state query
    const bayern = await db.execute(sql`
      SELECT name, code, ST_NumPoints(geometry) as points 
      FROM states 
      WHERE code = 'BY'
    `);
    console.log('Bayern state:', bayern.rows[0]);
    
    // Test postal codes in Bayern
    const bayernPostalCodes = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM postal_codes pc
      JOIN states s ON ST_Contains(s.geometry, ST_Centroid(pc.geometry))
      WHERE s.code = 'BY'
    `);
    console.log('Postal codes in Bayern:', bayernPostalCodes.rows[0].count);
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
  }
}

testDatabase();
