import { config } from "dotenv";
config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);
const rows = await sql`SELECT email, role, created_at FROM users ORDER BY created_at`;
console.log(rows);
