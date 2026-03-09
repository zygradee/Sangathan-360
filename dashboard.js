// routes/dashboard.js — aggregated stats for the dashboard
const express = require('express');
const router  = express.Router();
const { getDb } = require('../db');
const { authenticate } = require('../middleware/auth');

// GET /api/dashboard/stats
router.get('/stats', authenticate, (req, res) => {
  const db = getDb();

  const totalWorkers  = db.prepare('SELECT COUNT(*) as n FROM workers').get().n;
  const activeWorkers = db.prepare("SELECT COUNT(*) as n FROM workers WHERE status='Active'").get().n;
  const totalTasks    = db.prepare('SELECT COUNT(*) as n FROM tasks').get().n;
  const doneTasks     = db.prepare("SELECT COUNT(*) as n FROM tasks WHERE status='done'").get().n;
  const pendingTasks  = db.prepare("SELECT COUNT(*) as n FROM tasks WHERE status IN ('todo','inprog')").get().n;

  const zoneCoverage  = db.prepare('SELECT AVG(coverage) as avg FROM zones WHERE workers > 0').get().avg;

  // Per-zone active workers for the bar chart
  const byZone = db.prepare(`
    SELECT zone, COUNT(*) as count FROM workers WHERE status='Active' GROUP BY zone
  `).all();

  res.json({
    workers: {
      total:  totalWorkers,
      active: activeWorkers,
      offline: totalWorkers - activeWorkers,
    },
    tasks: {
      total:   totalTasks,
      done:    doneTasks,
      pending: pendingTasks,
      completion_pct: totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0,
    },
    coverage: {
      average: Math.round(zoneCoverage || 0),
    },
    byZone,
  });
});

// GET /api/dashboard/activity — recent activity feed
router.get('/activity', authenticate, (req, res) => {
  const db       = getDb();
  const limit    = parseInt(req.query.limit) || 20;
  const activity = db.prepare('SELECT * FROM activity_log ORDER BY created_at DESC LIMIT ?').all(limit);
  res.json({ activity });
});

module.exports = router;
