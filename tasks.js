// routes/tasks.js — CRUD + status advancement for campaign tasks
const express = require('express');
const router  = express.Router();
const { getDb } = require('../db');
const { authenticate } = require('../middleware/auth');

// GET /api/tasks — list with optional filters
router.get('/', authenticate, (req, res) => {
  const db = getDb();
  const { status, zone, priority } = req.query;

  let sql    = 'SELECT * FROM tasks WHERE 1=1';
  const params = [];

  if (status)   { sql += ' AND status = ?';   params.push(status); }
  if (zone)     { sql += ' AND zone = ?';     params.push(zone); }
  if (priority) { sql += ' AND priority = ?'; params.push(priority); }

  sql += ' ORDER BY created_at DESC';

  const tasks = db.prepare(sql).all(...params);

  // Group for kanban view
  const grouped = {
    todo:   tasks.filter(t => t.status === 'todo'),
    inprog: tasks.filter(t => t.status === 'inprog'),
    done:   tasks.filter(t => t.status === 'done'),
  };

  res.json({ tasks, grouped, total: tasks.length });
});

// GET /api/tasks/:id
router.get('/:id', authenticate, (req, res) => {
  const db   = getDb();
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

// POST /api/tasks — create task
router.post('/', authenticate, (req, res) => {
  const db = getDb();
  const { title, assignee, priority, zone, due } = req.body;

  if (!title)
    return res.status(400).json({ error: 'title is required' });

  const result = db.prepare(`
    INSERT INTO tasks (title, assignee, priority, zone, status, due)
    VALUES (?, ?, ?, ?, 'todo', ?)
  `).run(
    title,
    assignee  || 'Unassigned',
    priority  || 'Medium',
    zone      || 'North',
    due       || new Date().toISOString().split('T')[0]
  );

  logActivity(db, '📋', 'Task Assigned', `"${title}" assigned to ${assignee || 'Unassigned'}`);

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(task);
});

// PATCH /api/tasks/:id — update any fields
router.patch('/:id', authenticate, (req, res) => {
  const db       = getDb();
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Task not found' });

  const { title, assignee, priority, zone, status, due } = req.body;
  const updated = {
    title:    title    ?? existing.title,
    assignee: assignee ?? existing.assignee,
    priority: priority ?? existing.priority,
    zone:     zone     ?? existing.zone,
    status:   status   ?? existing.status,
    due:      due      ?? existing.due,
  };

  db.prepare(`
    UPDATE tasks SET title=?, assignee=?, priority=?, zone=?, status=?, due=?, updated_at=datetime('now')
    WHERE id=?
  `).run(updated.title, updated.assignee, updated.priority, updated.zone, updated.status, updated.due, req.params.id);

  if (status && status !== existing.status) {
    const statusLabel = status === 'inprog' ? 'In Progress' : status === 'done' ? 'Done' : 'To Do';
    logActivity(db, '✅', 'Task Updated', `"${updated.title}" moved to ${statusLabel}`);
  }

  res.json(db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id));
});

// POST /api/tasks/:id/advance — move todo→inprog→done
router.post('/:id/advance', authenticate, (req, res) => {
  const db   = getDb();
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (task.status === 'done') return res.status(400).json({ error: 'Task is already done' });

  const next = task.status === 'todo' ? 'inprog' : 'done';
  db.prepare(`UPDATE tasks SET status=?, updated_at=datetime('now') WHERE id=?`).run(next, task.id);

  const label = next === 'inprog' ? 'In Progress' : 'Done';
  logActivity(db, '✅', 'Task Updated', `"${task.title}" moved to ${label}`);

  res.json(db.prepare('SELECT * FROM tasks WHERE id = ?').get(task.id));
});

// DELETE /api/tasks/:id
router.delete('/:id', authenticate, (req, res) => {
  const db   = getDb();
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

function logActivity(db, icon, title, body) {
  db.prepare('INSERT INTO activity_log (icon, title, body) VALUES (?, ?, ?)').run(icon, title, body);
}

module.exports = router;
