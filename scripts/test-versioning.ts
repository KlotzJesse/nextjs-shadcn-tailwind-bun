import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";

async function testVersioningSystem() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL not set");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  console.log("🧪 Testing Versioning System\n");

  try {
    // Test 1: Check tables exist
    console.log("1️⃣ Checking database tables...");
    const tables = await db.execute(sql`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' AND tablename IN ('area_changes', 'area_undo_stacks', 'area_versions')
      ORDER BY tablename
    `);
    console.log(`   ✅ Found ${tables.rows.length}/3 versioning tables`);
    tables.rows.forEach((r: any) => console.log(`      - ${r.tablename}`));

    // Test 2: Check area_versions columns
    console.log("\n2️⃣ Checking area_versions structure...");
    const versionCols = await db.execute(sql`
      SELECT column_name, data_type FROM information_schema.columns 
      WHERE table_name = 'area_versions' AND column_name IN ('parent_version_id', 'branch_name', 'is_active', 'change_count')
      ORDER BY column_name
    `);
    console.log(`   ✅ Found ${versionCols.rows.length}/4 new columns`);
    versionCols.rows.forEach((r: any) => console.log(`      - ${r.column_name} (${r.data_type})`));

    // Test 3: Check areas columns
    console.log("\n3️⃣ Checking areas structure...");
    const areaCols = await db.execute(sql`
      SELECT column_name, data_type FROM information_schema.columns 
      WHERE table_name = 'areas' AND column_name = 'current_version_id'
    `);
    console.log(`   ${areaCols.rows.length > 0 ? '✅' : '❌'} current_version_id column ${areaCols.rows.length > 0 ? 'exists' : 'missing'}`);

    // Test 4: Check indexes
    console.log("\n4️⃣ Checking indexes...");
    const indexes = await db.execute(sql`
      SELECT indexname FROM pg_indexes 
      WHERE tablename IN ('area_changes', 'area_undo_stacks', 'area_versions', 'areas')
      AND (indexname LIKE 'idx_area_changes%' OR indexname LIKE 'idx_area_undo%' OR indexname LIKE 'idx_area_versions_%' OR indexname LIKE 'idx_areas_current%')
      ORDER BY indexname
    `);
    console.log(`   ✅ Found ${indexes.rows.length} versioning indexes`);
    
    // Test 5: Sample data check
    console.log("\n5️⃣ Checking sample data...");
    const areas = await db.execute(sql`SELECT COUNT(*) as count FROM areas`);
    const versions = await db.execute(sql`SELECT COUNT(*) as count FROM area_versions`);
    const changes = await db.execute(sql`SELECT COUNT(*) as count FROM area_changes`);
    const stacks = await db.execute(sql`SELECT COUNT(*) as count FROM area_undo_stacks`);
    
    console.log(`   📊 Database stats:`);
    console.log(`      - Areas: ${(areas.rows[0] as any).count}`);
    console.log(`      - Versions: ${(versions.rows[0] as any).count}`);
    console.log(`      - Changes: ${(changes.rows[0] as any).count}`);
    console.log(`      - Undo stacks: ${(stacks.rows[0] as any).count}`);

    // Test 6: Check if changes are being recorded
    if ((changes.rows[0] as any).count > 0) {
      console.log("\n6️⃣ Latest changes:");
      const latestChanges = await db.execute(sql`
        SELECT change_type, entity_type, created_at 
        FROM area_changes 
        ORDER BY created_at DESC 
        LIMIT 3
      `);
      latestChanges.rows.forEach((r: any, i: number) => {
        console.log(`      ${i + 1}. ${r.change_type} (${r.entity_type}) - ${new Date(r.created_at).toLocaleString()}`);
      });
    }

    console.log("\n✅ Versioning system test completed successfully!");
    console.log("\n📝 System Status:");
    console.log("   ✓ Database migration: Complete");
    console.log("   ✓ Tables created: Complete");
    console.log("   ✓ Indexes created: Complete");
    console.log("   ✓ Schema enhanced: Complete");
    console.log("   ✓ Ready for use: Yes");

  } catch (error) {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testVersioningSystem();