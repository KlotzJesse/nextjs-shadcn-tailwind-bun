"use server";

import { db } from "../../lib/db";
import { sql } from "drizzle-orm";

/**
 * Fix PostgreSQL sequences that may be out of sync
 * This can happen when data is inserted with explicit IDs
 *
 * Run this if you encounter primary key constraint violations
 */
export async function fixPostalCodeSequences() {
  try {
    // Fix area_layer_postal_codes sequence
    await db.execute(sql`
      SELECT setval(
        pg_get_serial_sequence('area_layer_postal_codes', 'id'),
        COALESCE((SELECT MAX(id) FROM area_layer_postal_codes), 1),
        true
      );
    `);

    // Fix area_layers sequence
    await db.execute(sql`
      SELECT setval(
        pg_get_serial_sequence('area_layers', 'id'),
        COALESCE((SELECT MAX(id) FROM area_layers), 1),
        true
      );
    `);

    // Fix areas sequence
    await db.execute(sql`
      SELECT setval(
        pg_get_serial_sequence('areas', 'id'),
        COALESCE((SELECT MAX(id) FROM areas), 1),
        true
      );
    `);

    return { success: true, message: "Sequences fixed successfully" };
  } catch (error) {
    console.error("Error fixing sequences:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
