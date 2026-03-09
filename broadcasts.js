// routes/broadcasts.js
const express = require('express');
const router  = express.Router();
const { getDb } = require('../db');
const { authenticate } = require('../middleware/auth');

// GET /api/broadcasts — list broadcast history
router.get('/', authenticate, (req, res) => {
  const db         = getDb();
  const broadcasts = db.prepare('SELECT * FROM broadcasts ORDER BY created_at DESC LIMIT 50').all();
  res.json({ broadcasts });
});

// POST /api/broadcasts — send a broadcast
router.post('/', authenticate, (req, res) => {
  const db = getDb();
  const { message, target_zone, target_role } = req.body;

  if (!message)
    return res.status(400).json({ error: 'message is required' });

  // Count recipients
  let countSql = 'SELECT COUNT(*) as n FROM workers WHERE status = "Active"';
  const countParams = [];
  const zone = target_zone && target_zone !== 'All' ? target_zone.replace(' Zone', '') : null;
  const role = target_role && target_role !== 'All' ? target_role : null;
  if (zone) { countSql += ' AND zone = ?'; countParams.push(zone); }
  if (role) { countSql += ' AND role = ?'; countParams.push(role); }
  const { n: recipients } = db.prepare(countSql).get(...countParams);

  const result = db.prepare(`
    INSERT INTO broadcasts (message, target_zone, target_role, sent_by, recipients)
    VALUES (?, ?, ?, ?, ?)
  `).run(message, target_zone || 'All', target_role || 'All', req.user.name, recipients);

  // Log activity
  db.prepare('INSERT INTO activity_log (icon, title, body) VALUES (?, ?, ?)').run(
    '📢', 'Broadcast Sent',
    `Message sent to ${recipients} workers in ${target_zone || 'All'} zones`
  );

  const broadcast = db.prepare('SELECT * FROM broadcasts WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ broadcast, recipients });
});

module.exports = router;
