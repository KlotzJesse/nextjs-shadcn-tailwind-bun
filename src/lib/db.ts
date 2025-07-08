import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';

const connectionString = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString });
export const db = drizzle(pool);
