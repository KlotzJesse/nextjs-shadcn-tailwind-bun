import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { postalCodes, states } from './src/lib/schema/schema.js';
import { sql } from 'drizzle-orm';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/krauss_territory',
});
const db = drizzle(pool);

async function checkPostalCodeCounts() {
  try {
    // Total postal codes
    const totalCount = await db.select({ count: sql`count(*)` }).from(postalCodes);
    console.log(`Total postal codes in database: ${totalCount[0].count}`);

    // Postal codes in Bayern state
    const bayernCount = await db.execute(sql`
      SELECT count(*) as count
      FROM postal_codes p 
      JOIN states s ON ST_Intersects(p.geometry, s.geometry)
      WHERE s.name = 'Bayern'
    `);
    console.log(`Postal codes in Bayern: ${bayernCount.rows[0].count}`);

    // Sample of all postal codes to see the structure
    const sampleCodes = await db.select({ 
      postal_code: postalCodes.postal_code 
    }).from(postalCodes).limit(10);
    console.log('Sample postal codes:', sampleCodes.map(p => p.postal_code));

    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
  }
}

checkPostalCodeCounts();
