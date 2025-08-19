// backend/db.js - shared Postgres pool for serverless and local dev
const { Pool } = require('pg');
require('dotenv').config();

// Check if we have a database URL
const hasDatabase = !!process.env.DATABASE_URL;

if (!hasDatabase) {
  console.warn('[db] DATABASE_URL is not set. The app will run in memory-only mode.');
}

let pool;

if (hasDatabase) {
  // Create pool only if DATABASE_URL is available
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  pool.on('connect', () => {
    console.log('Connected to PostgreSQL database');
  });

  pool.on('error', (err) => {
    console.error('Database connection error:', err);
  });
} else {
  // Create a mock pool for in-memory operation
  pool = {
    connect: async () => {
      return {
        query: () => ({ rows: [] }),
        release: () => {}
      };
    },
    query: () => Promise.resolve({ rows: [] }),
    end: () => {}
  };
  console.log('Running in memory-only mode (no database)');
}

module.exports = { pool, hasDatabase };
