import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL environment variable is not set");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  try {
    console.log("🔍 Checking current database state...\n");

    // Check existing tables
    const result = await db.execute(sql`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);

    const existingTables = result.rows.map((r: any) => r.tablename);
    console.log("📋 Existing tables:");
    existingTables.forEach(t => console.log(`  ✓ ${t}`));

    // Check for versioning tables
    const versioningTables = ['area_changes', 'area_undo_stacks'];
    const missingTables = versioningTables.filter(t => !existingTables.includes(t));

    console.log("\n🎯 Versioning tables status:");
    versioningTables.forEach(t => {
      const exists = existingTables.includes(t);
      console.log(`  ${exists ? '✅' : '❌'} ${t}`);
    });

    if (missingTables.length > 0) {
      console.log(`\n⚠️  Missing ${missingTables.length} table(s). Creating them...`);
      
      // Create area_changes table
      if (missingTables.includes('area_changes')) {
        await db.execute(sql`
          CREATE TABLE "area_changes" (
            "id" serial PRIMARY KEY NOT NULL,
            "area_id" integer NOT NULL,
            "change_type" varchar(50) NOT NULL,
            "entity_type" varchar(50) NOT NULL,
            "entity_id" integer,
            "change_data" jsonb NOT NULL,
            "previous_data" jsonb,
            "version_id" integer,
            "sequence_number" integer NOT NULL,
            "is_undone" varchar(5) DEFAULT 'false' NOT NULL,
            "created_by" varchar(255),
            "created_at" timestamp DEFAULT now() NOT NULL
          )
        `);
        console.log("  ✅ Created area_changes table");

        await db.execute(sql`CREATE INDEX "idx_area_changes_area_id" ON "area_changes" ("area_id")`);
        await db.execute(sql`CREATE INDEX "idx_area_changes_version_id" ON "area_changes" ("version_id")`);
        await db.execute(sql`CREATE INDEX "idx_area_changes_sequence" ON "area_changes" ("area_id", "sequence_number")`);
        await db.execute(sql`CREATE INDEX "idx_area_changes_created_at" ON "area_changes" ("created_at")`);
        await db.execute(sql`CREATE INDEX "idx_area_changes_entity" ON "area_changes" ("entity_type", "entity_id")`);
        console.log("  ✅ Created indexes for area_changes");
      }

      // Create area_undo_stacks table
      if (missingTables.includes('area_undo_stacks')) {
        await db.execute(sql`
          CREATE TABLE "area_undo_stacks" (
            "id" serial PRIMARY KEY NOT NULL,
            "area_id" integer NOT NULL,
            "undo_stack" jsonb DEFAULT '[]'::jsonb NOT NULL,
            "redo_stack" jsonb DEFAULT '[]'::jsonb NOT NULL,
            "updated_at" timestamp DEFAULT now() NOT NULL,
            CONSTRAINT "area_undo_stacks_area_id_unique" UNIQUE("area_id")
          )
        `);
        console.log("  ✅ Created area_undo_stacks table");

        await db.execute(sql`CREATE INDEX "idx_area_undo_stacks_area_id" ON "area_undo_stacks" ("area_id")`);
        console.log("  ✅ Created indexes for area_undo_stacks");
      }
    }

    // Check and add columns to existing tables
    console.log("\n🔧 Checking for missing columns...");

    // Check area_versions columns
    const versionCols = await db.execute(sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'area_versions' AND table_schema = 'public'
    `);
    const versionColNames = versionCols.rows.map((r: any) => r.column_name);

    const requiredVersionCols = ['parent_version_id', 'branch_name', 'is_active', 'change_count'];
    for (const col of requiredVersionCols) {
      if (!versionColNames.includes(col)) {
        switch (col) {
          case 'parent_version_id':
            await db.execute(sql`ALTER TABLE "area_versions" ADD COLUMN "parent_version_id" integer`);
            await db.execute(sql`CREATE INDEX "idx_area_versions_parent" ON "area_versions" ("parent_version_id")`);
            break;
          case 'branch_name':
            await db.execute(sql`ALTER TABLE "area_versions" ADD COLUMN "branch_name" varchar(255)`);
            break;
          case 'is_active':
            await db.execute(sql`ALTER TABLE "area_versions" ADD COLUMN "is_active" varchar(5) DEFAULT 'false' NOT NULL`);
            await db.execute(sql`CREATE INDEX "idx_area_versions_is_active" ON "area_versions" ("area_id", "is_active")`);
            break;
          case 'change_count':
            await db.execute(sql`ALTER TABLE "area_versions" ADD COLUMN "change_count" integer DEFAULT 0 NOT NULL`);
            break;
        }
        console.log(`  ✅ Added ${col} to area_versions`);
      }
    }

    // Check areas columns
    const areaCols = await db.execute(sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'areas' AND table_schema = 'public'
    `);
    const areaColNames = areaCols.rows.map((r: any) => r.column_name);

    if (!areaColNames.includes('current_version_id')) {
      await db.execute(sql`ALTER TABLE "areas" ADD COLUMN "current_version_id" integer`);
      await db.execute(sql`CREATE INDEX "idx_areas_current_version" ON "areas" ("current_version_id")`);
      console.log("  ✅ Added current_version_id to areas");
    }

    console.log("\n✅ Migration completed successfully!");
    console.log("\n📝 Versioning system is ready:");
    console.log("  ✓ area_changes: Track all changes for undo/redo");
    console.log("  ✓ area_undo_stacks: Manage undo/redo stacks per area");
    console.log("  ✓ area_versions: Enhanced with branching support");
    console.log("  ✓ areas: Added current_version_id tracking");

  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();