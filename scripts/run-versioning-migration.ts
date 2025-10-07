import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL environment variable is not set");
    process.exit(1);
  }

  console.log("🚀 Starting versioning system migration...");

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  try {
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log("✅ Migration completed successfully!");
    console.log("\n📝 New tables and columns added:");
    console.log("  - area_changes: Track all changes for undo/redo");
    console.log("  - area_undo_stacks: Manage undo/redo stacks per area");
    console.log("  - area_versions: Enhanced with branching support");
    console.log("  - areas: Added current_version_id tracking");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();