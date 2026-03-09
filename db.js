// db.js — SQLite database setup & seed data
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'campaign.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
  }
  return db;
}

function initSchema() {
  db.exec(`
    -- Users (campaign managers / admins)
    CREATE TABLE IF NOT EXISTS users (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      username    TEXT UNIQUE NOT NULL,
      password    TEXT NOT NULL,
      name        TEXT NOT NULL,
      role        TEXT NOT NULL DEFAULT 'manager',
      created_at  TEXT DEFAULT (datetime('now'))
    );

    -- Workers (campaign field workers)
    CREATE TABLE IF NOT EXISTS workers (
      id          TEXT PRIMARY KEY,           -- e.g. W-001
      name        TEXT NOT NULL,
      initials    TEXT NOT NULL,
      color       TEXT NOT NULL DEFAULT '#0080ff',
      role        TEXT NOT NULL,
      zone        TEXT NOT NULL,
      tasks_total INTEGER NOT NULL DEFAULT 0,
      tasks_done  INTEGER NOT NULL DEFAULT 0,
      status      TEXT NOT NULL DEFAULT 'Active',  -- Active | Offline
      phone       TEXT,
      created_at  TEXT DEFAULT (datetime('now')),
      updated_at  TEXT DEFAULT (datetime('now'))
    );

    -- Tasks (campaign operations)
    CREATE TABLE IF NOT EXISTS tasks (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      title       TEXT NOT NULL,
      assignee    TEXT NOT NULL,
      priority    TEXT NOT NULL DEFAULT 'Medium',  -- High | Medium | Low
      zone        TEXT NOT NULL,
      status      TEXT NOT NULL DEFAULT 'todo',    -- todo | inprog | done
      due         TEXT NOT NULL,
      created_at  TEXT DEFAULT (datetime('now')),
      updated_at  TEXT DEFAULT (datetime('now'))
    );

    -- Zones (constituency coverage areas)
    CREATE TABLE IF NOT EXISTS zones (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT UNIQUE NOT NULL,
      workers     INTEGER NOT NULL DEFAULT 0,
      tasks_total INTEGER NOT NULL DEFAULT 0,
      coverage    INTEGER NOT NULL DEFAULT 0,       -- percentage 0-100
      color       TEXT NOT NULL DEFAULT '#00aaff',
      updated_at  TEXT DEFAULT (datetime('now'))
    );

    -- Broadcasts (messages to workers)
    CREATE TABLE IF NOT EXISTS broadcasts (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      message     TEXT NOT NULL,
      target_zone TEXT DEFAULT 'All',
      target_role TEXT DEFAULT 'All',
      sent_by     TEXT NOT NULL,
      recipients  INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT DEFAULT (datetime('now'))
    );

    -- Activity log
    CREATE TABLE IF NOT EXISTS activity_log (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      icon        TEXT NOT NULL DEFAULT '📍',
      title       TEXT NOT NULL,
      body        TEXT NOT NULL,
      created_at  TEXT DEFAULT (datetime('now'))
    );
  `);

  seedIfEmpty();
}

function seedIfEmpty() {
  const workerCount = db.prepare('SELECT COUNT(*) as n FROM workers').get().n;
  if (workerCount > 0) return; // Already seeded

  console.log('🌱 Seeding database with initial data...');

  // Seed admin user (password: admin123)
  // In production, use bcrypt: bcrypt.hashSync('admin123', 10)
  db.prepare(`
    INSERT OR IGNORE INTO users (username, password, name, role)
    VALUES ('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LgKNe2dEG4y', 'Campaign HQ', 'admin')
  `).run();

  // Seed workers
  const workers = [
    { id:'W-001', name:'Ravi Kumar',   initials:'RK', color:'#0080ff', role:'Team Leader',  zone:'North',   tasks_total:22, tasks_done:19, status:'Active',  phone:'+91-9000000001' },
    { id:'W-002', name:'Priya Sharma', initials:'PS', color:'#f0b429', role:'Booth Agent',   zone:'South',   tasks_total:18, tasks_done:17, status:'Active',  phone:'+91-9000000002' },
    { id:'W-003', name:'Amit Singh',   initials:'AS', color:'#22d3a0', role:'Canvasser',     zone:'East',    tasks_total:15, tasks_done:10, status:'Offline', phone:'+91-9000000003' },
    { id:'W-004', name:'Deepa Nair',   initials:'DN', color:'#cc44ff', role:'Media Team',    zone:'West',    tasks_total:20, tasks_done:16, status:'Active',  phone:'+91-9000000004' },
    { id:'W-005', name:'Suresh Patel', initials:'SP', color:'#ff6644', role:'Booth Agent',   zone:'North',   tasks_total:12, tasks_done:11, status:'Active',  phone:'+91-9000000005' },
    { id:'W-006', name:'Meena Joshi',  initials:'MJ', color:'#44aaff', role:'Data Entry',    zone:'Central', tasks_total:30, tasks_done:28, status:'Active',  phone:'+91-9000000006' },
    { id:'W-007', name:'Kiran Rao',    initials:'KR', color:'#ff4488', role:'Logistics',     zone:'South',   tasks_total:8,  tasks_done:5,  status:'Offline', phone:'+91-9000000007' },
    { id:'W-008', name:'Arjun Das',    initials:'AD', color:'#22cc88', role:'Canvasser',     zone:'East',    tasks_total:16, tasks_done:12, status:'Active',  phone:'+91-9000000008' },
  ];

  const insertWorker = db.prepare(`
    INSERT INTO workers (id, name, initials, color, role, zone, tasks_total, tasks_done, status, phone)
    VALUES (@id, @name, @initials, @color, @role, @zone, @tasks_total, @tasks_done, @status, @phone)
  `);
  workers.forEach(w => insertWorker.run(w));

  // Seed tasks
  const tasks = [
    { title:'Voter list verification – Sector 4',   assignee:'Ravi Kumar',   priority:'High',   zone:'North',   status:'todo',  due:'2026-03-12' },
    { title:'Banner installation on NH-8',          assignee:'Suresh Patel', priority:'High',   zone:'West',    status:'todo',  due:'2026-03-10' },
    { title:'Phone banking – 200 voters',           assignee:'Meena Joshi',  priority:'Medium', zone:'Central', status:'todo',  due:'2026-03-14' },
    { title:'Prepare rally logistics plan',         assignee:'Deepa Nair',   priority:'High',   zone:'North',   status:'inprog',due:'2026-03-09' },
    { title:'Social media post schedule',           assignee:'Kiran Rao',    priority:'Medium', zone:'South',   status:'inprog',due:'2026-03-11' },
    { title:'Flyer distribution in Market Area',   assignee:'Priya Sharma', priority:'Low',    zone:'South',   status:'done',  due:'2026-03-07' },
    { title:'Volunteer onboarding training',        assignee:'Ravi Kumar',   priority:'Medium', zone:'North',   status:'done',  due:'2026-03-06' },
    { title:'Door-to-door – Block C',              assignee:'Amit Singh',   priority:'High',   zone:'East',    status:'done',  due:'2026-03-05' },
  ];

  const insertTask = db.prepare(`
    INSERT INTO tasks (title, assignee, priority, zone, status, due)
    VALUES (@title, @assignee, @priority, @zone, @status, @due)
  `);
  tasks.forEach(t => insertTask.run(t));

  // Seed zones
  const zones = [
    { name:'North Zone',     workers:312, tasks_total:84, coverage:82, color:'#00aaff' },
    { name:'South Zone',     workers:248, tasks_total:71, coverage:75, color:'#f0b429' },
    { name:'East Zone',      workers:198, tasks_total:55, coverage:64, color:'#22d3a0' },
    { name:'West Zone',      workers:276, tasks_total:48, coverage:58, color:'#ff4d4d' },
    { name:'Central Zone',   workers:213, tasks_total:84, coverage:70, color:'#cc44ff' },
    { name:'Northeast Zone', workers:0,   tasks_total:0,  coverage:0,  color:'#5a7a99' },
  ];

  const insertZone = db.prepare(`
    INSERT INTO zones (name, workers, tasks_total, coverage, color)
    VALUES (@name, @workers, @tasks_total, @coverage, @color)
  `);
  zones.forEach(z => insertZone.run(z));

  // Seed activity log
  const activities = [
    { icon:'👥', title:'New Worker', body:'Ravi Kumar was added as Team Leader in North Zone', created_at: datetime(-5) },
    { icon:'✅', title:'Task Done',  body:'Volunteer onboarding training was completed',        created_at: datetime(-10) },
    { icon:'📢', title:'Broadcast', body:'Rally schedule sent to all North Zone workers',       created_at: datetime(-22) },
    { icon:'📍', title:'Check-in',  body:'Priya Sharma checked in at South Zone Booth 4',      created_at: datetime(-45) },
    { icon:'✅', title:'Task Done',  body:'Flyer distribution in Market Area completed',        created_at: datetime(-90) },
  ];

  const insertActivity = db.prepare(`
    INSERT INTO activity_log (icon, title, body, created_at)
    VALUES (@icon, @title, @body, @created_at)
  `);
  activities.forEach(a => insertActivity.run(a));

  console.log('✅ Database seeded successfully.');
}

function datetime(offsetMinutes = 0) {
  const d = new Date(Date.now() + offsetMinutes * 60 * 1000);
  return d.toISOString().replace('T', ' ').substring(0, 19);
}

module.exports = { getDb };
