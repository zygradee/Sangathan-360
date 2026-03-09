// routes/workers.js — CRUD for campaign workers
const express = require('express');
const router  = express.Router();
const { getDb } = require('../db');
const { authenticate } = require('../middleware/auth');

// GET /api/workers — list all workers (with optional search & filter)
router.get('/', authenticate, (req, res) => {
  const db = getDb();
  const { q, zone, status } = req.query;

  let sql    = 'SELECT * FROM workers WHERE 1=1';
  const params = [];

  if (q) {
    sql += ' AND (name LIKE ? OR role LIKE ? OR zone LIKE ?)';
    const like = `%${q}%`;
    params.push(like, like, like);
  }
  if (zone)   { sql += ' AND zone = ?';   params.push(zone); }
  if (status) { sql += ' AND status = ?'; params.push(status); }

  sql += ' ORDER BY created_at DESC';

  const workers = db.prepare(sql).all(...params);
  res.json({ workers, total: workers.length });
});

// GET /api/workers/:id — single worker
router.get('/:id', authenticate, (req, res) => {
  const db = getDb();
  const worker = db.prepare('SELECT * FROM workers WHERE id = ?').get(req.params.id);
  if (!worker) return res.status(404).json({ error: 'Worker not found' });
  res.json(worker);
});

// POST /api/workers — create a worker
router.post('/', authenticate, (req, res) => {
  const db = getDb();
  const { firstName, lastName, zone, role, phone } = req.body;

  if (!firstName || !lastName)
    return res.status(400).json({ error: 'firstName and lastName are required' });

  const colors   = ['#0080ff','#f0b429','#22d3a0','#cc44ff','#ff6644','#ff4488'];
  const count    = db.prepare('SELECT COUNT(*) as n FROM workers').get().n;
  const newId    = `W-${String(count + 1).padStart(3, '0')}`;
  const name     = `${firstName} ${lastName}`;
  const initials = (firstName[0] + lastName[0]).toUpperCase();
  const color    = colors[Math.floor(Math.random() * colors.length)];
  const cleanZone = (zone || 'North').replace(' Zone', '');

  db.prepare(`
    INSERT INTO workers (id, name, initials, color, role, zone, tasks_total, tasks_done, status, phone)
    VALUES (?, ?, ?, ?, ?, ?, 0, 0, 'Active', ?)
  `).run(newId, name, initials, color, role || 'Canvasser', cleanZone, phone || null);

  // Log activity
  logActivity(db, '👥', 'New Worker', `${name} was added as ${role || 'Canvasser'} in ${cleanZone} Zone`);

  const worker = db.prepare('SELECT * FROM workers WHERE id = ?').get(newId);
  res.status(201).json(worker);
});

// PATCH /api/workers/:id — update worker fields
router.patch('/:id', authenticate, (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM workers WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Worker not found' });

  const { name, role, zone, status, phone, tasks_total, tasks_done } = req.body;
  const updated = {
    name:        name        ?? existing.name,
    role:        role        ?? existing.role,
    zone:        zone        ?? existing.zone,
    status:      status      ?? existing.status,
    phone:       phone       ?? existing.phone,
    tasks_total: tasks_total ?? existing.tasks_total,
    tasks_done:  tasks_done  ?? existing.tasks_done,
  };

  db.prepare(`
    UPDATE workers SET name=?, role=?, zone=?, status=?, phone=?, tasks_total=?, tasks_done=?, updated_at=datetime('now')
    WHERE id=?
  `).run(updated.name, updated.role, updated.zone, updated.status, updated.phone, updated.tasks_total, updated.tasks_done, req.params.id);

  res.json(db.prepare('SELECT * FROM workers WHERE id = ?').get(req.params.id));
});

// DELETE /api/workers/:id
router.delete('/:id', authenticate, (req, res) => {
  const db = getDb();
  const worker = db.prepare('SELECT * FROM workers WHERE id = ?').get(req.params.id);
  if (!worker) return res.status(404).json({ error: 'Worker not found' });

  db.prepare('DELETE FROM workers WHERE id = ?').run(req.params.id);
  logActivity(db, '🗑️', 'Worker Removed', `${worker.name} was removed from the system`);
  res.json({ success: true });
});

function logActivity(db, icon, title, body) {
  db.prepare('INSERT INTO activity_log (icon, title, body) VALUES (?, ?, ?)').run(icon, title, body);
}

module.exports = router;
