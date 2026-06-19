import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";

const email = process.argv[2];
if (!email) {
  console.error("Usage: tsx scripts/set-admin.mts <email>");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL!);
const rows = await sql`
  UPDATE users SET role = 'admin' WHERE email = ${email}
  RETURNING email, role
`;

if (rows.length === 0) {
  console.error(`No user found with email: ${email}`);
  process.exit(1);
}
console.log("Updated:", rows);
