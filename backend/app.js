// backend/app.js - Express app for API (no app.listen)
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Use pooled connection (Supabase compatible)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS expenses (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      amount NUMERIC NOT NULL,
      category TEXT NOT NULL,
      date DATE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS budgets (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      monthly_budget NUMERIC NOT NULL,
      month TEXT NOT NULL,
      year INTEGER NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, month, year)
    )`);
  } finally {
    client.release();
  }
}

initDB().catch(err => {
  console.error('DB init error:', err);
});

function hashPassword(pw) {
  let hash = 0;
  for (let i = 0; i < pw.length; i++) {
    const char = pw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString();
}

// Routes
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
  const hashed = hashPassword(password);
  try {
    const result = await pool.query('INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username', [username.trim(), hashed]);
    return res.json(result.rows[0]);
  } catch (err) {
    if (String(err.message).includes('duplicate key')) return res.status(409).json({ error: 'Username already exists' });
    console.error(err);
    return res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
  const hashed = hashPassword(password);
  try {
    const result = await pool.query('SELECT id, username, password FROM users WHERE username = $1', [username.trim()]);
    const row = result.rows[0];
    if (!row) return res.status(404).json({ error: 'User not found' });
    if (row.password !== hashed) return res.status(401).json({ error: 'Invalid password' });
    res.json({ id: row.id, username: row.username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/expenses', async (req, res) => {
  const userId = parseInt(req.query.user_id, 10);
  const category = req.query.category;
  const month = req.query.month; // YYYY-MM
  if (!userId) return res.status(400).json({ error: 'Missing user_id' });

  const params = [userId];
  let q = 'SELECT * FROM expenses WHERE user_id = $1';
  let idx = 2;
  if (category) { q += ` AND category = $${idx++}`; params.push(category); }
  if (month) { q += ` AND to_char(date, 'YYYY-MM') = $${idx++}`; params.push(month); }
  q += ' ORDER BY date DESC, created_at DESC';

  try {
    const { rows } = await pool.query(q, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load expenses' });
  }
});

app.post('/api/expenses', async (req, res) => {
  const { user_id, description, amount, category, date } = req.body;
  if (!user_id || !description || !amount || !category || !date) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO expenses (user_id, description, amount, category, date) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [user_id, description.trim(), amount, category, date]
    );
    res.json({ id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add expense' });
  }
});

app.delete('/api/expenses/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const userId = parseInt(req.query.user_id, 10);
  if (!userId) return res.status(400).json({ error: 'Missing user_id' });
  try {
    const result = await pool.query('DELETE FROM expenses WHERE id = $1 AND user_id = $2', [id, userId]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

app.get('/api/budgets/current', async (req, res) => {
  const userId = parseInt(req.query.user_id, 10);
  const monthName = req.query.month; // full month name
  const year = parseInt(req.query.year, 10);
  if (!userId || !monthName || !year) return res.status(400).json({ error: 'Missing params' });
  try {
    const { rows } = await pool.query('SELECT monthly_budget FROM budgets WHERE user_id = $1 AND month = $2 AND year = $3', [userId, monthName, year]);
    res.json(rows[0] || { monthly_budget: 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get budget' });
  }
});

app.post('/api/budgets', async (req, res) => {
  const { user_id, monthly_budget, month, year } = req.body;
  if (!user_id || !monthly_budget || !month || !year) return res.status(400).json({ error: 'Missing fields' });
  try {
    await pool.query(`INSERT INTO budgets (user_id, monthly_budget, month, year) VALUES ($1, $2, $3, $4)
      ON CONFLICT(user_id, month, year) DO UPDATE SET monthly_budget = EXCLUDED.monthly_budget`,
      [user_id, monthly_budget, month, year]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update budget' });
  }
});

app.get('/api/stats/summary', async (req, res) => {
  const userId = parseInt(req.query.user_id, 10);
  const monthStr = req.query.monthStr; // YYYY-MM
  if (!userId || !monthStr) return res.status(400).json({ error: 'Missing params' });
  try {
    const monthly = await pool.query("SELECT COALESCE(SUM(amount),0) AS total FROM expenses WHERE user_id = $1 AND to_char(date,'YYYY-MM') = $2", [userId, monthStr]);
    const allTime = await pool.query('SELECT COALESCE(SUM(amount),0) AS total FROM expenses WHERE user_id = $1', [userId]);
    res.json({ monthlyTotal: Number(monthly.rows[0].total) || 0, allTimeTotal: Number(allTime.rows[0].total) || 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed summary' });
  }
});

app.get('/api/stats/recent', async (req, res) => {
  const userId = parseInt(req.query.user_id, 10);
  if (!userId) return res.status(400).json({ error: 'Missing user_id' });
  try {
    const { rows } = await pool.query('SELECT * FROM expenses WHERE user_id = $1 ORDER BY date DESC, created_at DESC LIMIT 5', [userId]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load recent' });
  }
});

app.get('/api/stats/category', async (req, res) => {
  const userId = parseInt(req.query.user_id, 10);
  const monthStr = req.query.monthStr; // YYYY-MM
  if (!userId || !monthStr) return res.status(400).json({ error: 'Missing params' });
  try {
    const { rows } = await pool.query(
      `SELECT category, COALESCE(SUM(amount),0) AS total
       FROM expenses
       WHERE user_id = $1 AND to_char(date,'YYYY-MM') = $2
       GROUP BY category
       ORDER BY total DESC`,
       [userId, monthStr]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load category breakdown' });
  }
});

module.exports = { app, pool };

