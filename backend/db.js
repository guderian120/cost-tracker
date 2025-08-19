// backend/db.js - shared Postgres pool for serverless and local dev
const { Pool } = require('pg');
require('dotenv').config();

if (!process.env.DATABASE_URL) {
  console.warn('[db] DATABASE_URL is not set. Make sure to configure it in .env (local) and Vercel env (prod/preview).');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

module.exports = { pool };

