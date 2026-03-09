// routes/zones.js
const express = require('express');
const router  = express.Router();
const { getDb } = require('../db');
const { authenticate } = require('../middleware/auth');

// GET /api/zones
router.get('/', authenticate, (req, res) => {
  const db    = getDb();
  const zones = db.prepare('SELECT * FROM zones ORDER BY name').all();
  res.json({ zones });
});

// PATCH /api/zones/:id — update zone stats
router.patch('/:id', authenticate, (req, res) => {
  const db       = getDb();
  const existing = db.prepare('SELECT * FROM zones WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Zone not found' });

  const { workers, tasks_total, coverage, color } = req.body;
  const updated = {
    workers:     workers     ?? existing.workers,
    tasks_total: tasks_total ?? existing.tasks_total,
    coverage:    coverage    ?? existing.coverage,
    color:       color       ?? existing.color,
  };

  db.prepare(`
    UPDATE zones SET workers=?, tasks_total=?, coverage=?, color=?, updated_at=datetime('now')
    WHERE id=?
  `).run(updated.workers, updated.tasks_total, updated.coverage, updated.color, req.params.id);

  res.json(db.prepare('SELECT * FROM zones WHERE id = ?').get(req.params.id));
});

module.exports = router;
