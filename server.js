// server.js — Sangathan 360 Campaign Command Center — Backend API
require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve the frontend HTML at root (optional)
app.use(express.static(path.join(__dirname, 'public')));

// ─── Request Logger (dev) ──────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
  });
}

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/workers',    require('./routes/workers'));
app.use('/api/tasks',      require('./routes/tasks'));
app.use('/api/zones',      require('./routes/zones'));
app.use('/api/broadcasts', require('./routes/broadcasts'));
app.use('/api/dashboard',  require('./routes/dashboard'));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'Sangathan 360 API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║   🗳️  Sangathan 360 — Campaign API Server    ║
║   Running on http://localhost:${PORT}           ║
╚══════════════════════════════════════════════╝

  API Endpoints:
    POST   /api/auth/login
    GET    /api/auth/me
    GET    /api/dashboard/stats
    GET    /api/dashboard/activity
    GET    /api/workers
    POST   /api/workers
    PATCH  /api/workers/:id
    DELETE /api/workers/:id
    GET    /api/tasks
    POST   /api/tasks
    PATCH  /api/tasks/:id
    POST   /api/tasks/:id/advance
    DELETE /api/tasks/:id
    GET    /api/zones
    PATCH  /api/zones/:id
    GET    /api/broadcasts
    POST   /api/broadcasts

  Default login: admin / admin123
  `);
});

module.exports = app;
