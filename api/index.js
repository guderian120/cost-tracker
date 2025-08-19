// api/index.js - Vercel serverless entry
const { app } = require('../backend/app');
module.exports = (req, res) => app(req, res);

