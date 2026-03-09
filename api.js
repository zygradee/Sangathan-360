// api.js — Frontend API client for Sangathan 360
// Drop this <script src="/api.js"></script> before the closing </body> tag in index.html

const API_BASE = 'http://localhost:3001/api';
let AUTH_TOKEN = localStorage.getItem('sg360_token') || null;

// ─── Core fetch wrapper ───────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (AUTH_TOKEN) headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    if (res.status === 401) {
      AUTH_TOKEN = null;
      localStorage.removeItem('sg360_token');
      showLoginModal();
    }
    throw new Error(data.error || 'API error');
  }
  return data;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
async function apiLogin(username, password) {
  const data = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  AUTH_TOKEN = data.token;
  localStorage.setItem('sg360_token', AUTH_TOKEN);
  // Update user display
  if (data.user) {
    document.querySelector('.user-name').textContent = data.user.name;
    document.querySelector('.user-role').textContent = data.user.role;
    document.querySelector('.avatar').textContent = data.user.name.split(' ').map(n=>n[0]).join('').slice(0,2);
  }
  return data;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
async function loadDashboardStats() {
  try {
    const data = await apiFetch('/dashboard/stats');
    document.getElementById('stat-workers').textContent  = data.workers.total.toLocaleString();
    document.getElementById('stat-pending').textContent  = data.tasks.pending;
    // Update activity feed
    loadActivityFeed();
  } catch (e) { console.warn('Could not load dashboard stats:', e.message); }
}

async function loadActivityFeed() {
  try {
    const data = await apiFetch('/dashboard/activity?limit=10');
    const feed = document.getElementById('activityFeed');
    if (!feed || !data.activity?.length) return;
    feed.innerHTML = data.activity.map(a => `
      <div class="activity-item">
        <div class="activity-dot" style="background:var(--accent)"></div>
        <div>
          <div class="activity-text"><span class="activity-strong">${a.title}</span> — ${a.body}</div>
          <div class="activity-time">${timeAgo(a.created_at)}</div>
        </div>
      </div>
    `).join('');
  } catch (e) { console.warn('Could not load activity:', e.message); }
}

// ─── Workers ──────────────────────────────────────────────────────────────────
async function loadWorkers(q = '') {
  try {
    const params = q ? `?q=${encodeURIComponent(q)}` : '';
    const data   = await apiFetch(`/workers${params}`);
    renderWorkers(data.workers);     // calls original render function
  } catch (e) { console.warn('Could not load workers:', e.message); }
}

async function apiAddWorker(firstName, lastName, zone, role, phone) {
  return apiFetch('/workers', {
    method: 'POST',
    body: JSON.stringify({ firstName, lastName, zone, role, phone }),
  });
}

async function apiUpdateWorkerStatus(id, status) {
  return apiFetch(`/workers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

// ─── Tasks ────────────────────────────────────────────────────────────────────
async function loadTasks() {
  try {
    const data = await apiFetch('/tasks');
    // Replace in-memory tasks array with live data
    window.tasks = data.tasks;
    renderTasks();
  } catch (e) { console.warn('Could not load tasks:', e.message); }
}

async function apiAddTask(title, assignee, priority, zone, due) {
  const task = await apiFetch('/tasks', {
    method: 'POST',
    body: JSON.stringify({ title, assignee, priority, zone, due }),
  });
  await loadTasks();
  return task;
}

async function apiAdvanceTask(id) {
  const task = await apiFetch(`/tasks/${id}/advance`, { method: 'POST' });
  await loadTasks();
  return task;
}

// ─── Zones ────────────────────────────────────────────────────────────────────
async function loadZones() {
  try {
    const data = await apiFetch('/zones');
    window.zones = data.zones.map(z => ({
      name: z.name, workers: z.workers,
      tasks: z.tasks_total, coverage: z.coverage, color: z.color,
    }));
    renderZones();
  } catch (e) { console.warn('Could not load zones:', e.message); }
}

// ─── Broadcasts ───────────────────────────────────────────────────────────────
async function apiSendBroadcast(message, target_zone, target_role) {
  return apiFetch('/broadcasts', {
    method: 'POST',
    body: JSON.stringify({ message, target_zone, target_role }),
  });
}

// ─── Login Modal ──────────────────────────────────────────────────────────────
function showLoginModal() {
  // Create a simple login overlay if not authenticated
  if (document.getElementById('loginModal')) return;
  const overlay = document.createElement('div');
  overlay.id = 'loginModal';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(5,10,18,0.95);z-index:9999;display:flex;align-items:center;justify-content:center;';
  overlay.innerHTML = `
    <div style="background:#0b1422;border:1px solid rgba(0,170,255,0.2);border-radius:16px;padding:36px;width:380px;box-shadow:0 0 60px rgba(0,100,255,0.2)">
      <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#fff;margin-bottom:6px">🗳️ Sangathan 360</div>
      <div style="font-size:12px;color:#5a7a99;margin-bottom:28px;font-family:'IBM Plex Mono',monospace">CAMPAIGN COMMAND CENTER</div>
      <div style="margin-bottom:14px">
        <label style="font-size:11px;color:#5a7a99;font-family:'IBM Plex Mono',monospace;letter-spacing:1px;text-transform:uppercase;display:block;margin-bottom:6px">Username</label>
        <input id="loginUser" type="text" value="admin" style="width:100%;background:#0f1e30;border:1px solid rgba(0,170,255,0.12);border-radius:8px;padding:10px 14px;color:#d6e8f7;font-family:'Outfit',sans-serif;font-size:14px;outline:none;box-sizing:border-box">
      </div>
      <div style="margin-bottom:20px">
        <label style="font-size:11px;color:#5a7a99;font-family:'IBM Plex Mono',monospace;letter-spacing:1px;text-transform:uppercase;display:block;margin-bottom:6px">Password</label>
        <input id="loginPass" type="password" value="admin123" style="width:100%;background:#0f1e30;border:1px solid rgba(0,170,255,0.12);border-radius:8px;padding:10px 14px;color:#d6e8f7;font-family:'Outfit',sans-serif;font-size:14px;outline:none;box-sizing:border-box">
      </div>
      <div id="loginErr" style="color:#ff4d4d;font-size:12px;margin-bottom:12px;display:none"></div>
      <button onclick="handleLogin()" style="width:100%;background:#00aaff;color:#fff;border:none;border-radius:8px;padding:12px;font-size:14px;font-weight:600;cursor:pointer;font-family:'Outfit',sans-serif">Sign In</button>
      <div style="font-size:11px;color:#5a7a99;margin-top:14px;text-align:center">Default: admin / admin123</div>
    </div>`;
  document.body.appendChild(overlay);
}

async function handleLogin() {
  const user = document.getElementById('loginUser').value;
  const pass = document.getElementById('loginPass').value;
  try {
    await apiLogin(user, pass);
    document.getElementById('loginModal')?.remove();
    // Reload page data after login
    loadDashboardStats();
  } catch (e) {
    const err = document.getElementById('loginErr');
    err.textContent = 'Invalid username or password';
    err.style.display = 'block';
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)   return 'Just now';
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400)return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}

// ─── Override original functions to use API ───────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  // Check authentication
  if (!AUTH_TOKEN) {
    showLoginModal();
  } else {
    loadDashboardStats();
  }

  // Intercept the original addWorker to also call backend
  const _origAddWorker = window.addWorker;
  window.addWorker = async function() {
    const fn   = document.getElementById('firstName').value;
    const ln   = document.getElementById('lastName').value;
    const zone = document.getElementById('zone').value;
    const role = document.getElementById('role').value;
    const phone= document.getElementById('phone')?.value || '';
    if (!fn || !ln) { notify('⚠️','Missing Info','Please enter first and last name'); return; }
    try {
      await apiAddWorker(fn, ln, zone, role, phone);
      closeModal('workerModal');
      notify('✅','Worker Added',`${fn} ${ln} joined ${zone}`);
      document.getElementById('firstName').value = '';
      document.getElementById('lastName').value  = '';
      if (document.getElementById('phone')) document.getElementById('phone').value = '';
      await loadWorkers();
    } catch(e) { notify('❌','Error', e.message); }
  };

  // Intercept addTask
  window.addTask = async function() {
    const title    = document.getElementById('taskTitle').value;
    const assignee = document.getElementById('taskAssignee').value;
    const priority = document.getElementById('taskPriority').value;
    const zone     = document.getElementById('taskZone').value;
    const due      = document.getElementById('taskDue').value || '2026-03-15';
    if (!title) { notify('⚠️','Missing Info','Please enter a task title'); return; }
    try {
      await apiAddTask(title, assignee, priority, zone, due);
      closeModal('taskModal');
      notify('📋','Task Assigned',`"${title}" assigned to ${assignee}`);
      document.getElementById('taskTitle').value = '';
    } catch(e) { notify('❌','Error', e.message); }
  };

  // Intercept advanceTask
  window.advanceTask = async function(id) {
    try {
      await apiAdvanceTask(id);
      notify('✅','Task Updated','Task status advanced');
    } catch(e) { notify('❌','Error', e.message); }
  };

  // Intercept sendBroadcast
  window.sendBroadcast = async function() {
    const msg  = document.querySelector('textarea')?.value || 'Campaign update';
    const zone = document.querySelector('#broadcastZone')?.value || 'All';
    const role = document.querySelector('#broadcastRole')?.value || 'All';
    try {
      const res = await apiSendBroadcast(msg, zone, role);
      notify('📢','Broadcast Sent',`Message delivered to ${res.recipients} workers`);
    } catch(e) { notify('❌','Error', e.message); }
  };

  // Intercept navigation to load live data
  const _origNavigate = window.navigate;
  window.navigate = function(page, el) {
    _origNavigate(page, el);
    if (page === 'workers')   loadWorkers();
    if (page === 'tasks')     loadTasks();
    if (page === 'zones')     loadZones();
    if (page === 'dashboard') loadDashboardStats();
  };

  // Intercept worker search
  const _origFilter = window.filterWorkers;
  window.filterWorkers = function(q) {
    if (AUTH_TOKEN) loadWorkers(q);
    else _origFilter(q);
  };
});
