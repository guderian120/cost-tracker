// server.js - Local development launcher
require('dotenv').config();
const path = require('path');
const express = require('express');
const { app } = require('./backend/app');

// Serve static files in local dev
app.use(express.static(path.join(__dirname)));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Local server running at http://localhost:${PORT}`);
});
