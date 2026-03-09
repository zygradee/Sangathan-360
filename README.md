# 🗳️ Sangathan 360 — Backend API

A RESTful Node.js/Express backend with SQLite for the **Sangathan 360 Campaign Command Center**.

---

## 📁 Project Structure

```
campaign-backend/
├── server.js              ← Express app entry point
├── db.js                  ← SQLite schema + seed data
├── .env.example           ← Environment variable template
├── middleware/
│   └── auth.js            ← JWT authentication middleware
├── routes/
│   ├── auth.js            ← POST /api/auth/login, GET /api/auth/me
│   ├── workers.js         ← CRUD for workers
│   ├── tasks.js           ← CRUD + status advancement for tasks
│   ├── zones.js           ← Zone data
│   ├── broadcasts.js      ← Send & list broadcasts
│   └── dashboard.js       ← Aggregated stats + activity feed
└── public/
    ├── index.html         ← Your frontend (copy of campaign-command.html)
    └── api.js             ← Frontend API client (inject into index.html)
```

---

## 🚀 Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env and set a strong JWT_SECRET
```

### 3. Connect frontend to API client
Add this line just before `</body>` in `public/index.html`:
```html
<script src="/api.js"></script>
```

### 4. Start the server
```bash
# Development (auto-reload)
npm run dev

# Production
npm start
```

The server starts at **http://localhost:3001**  
The frontend is served at **http://localhost:3001/**

---

## 🔑 Authentication

All `/api/*` routes (except `/api/auth/login` and `/api/health`) require a JWT Bearer token.

**Default credentials:** `admin` / `admin123`

```http
POST /api/auth/login
Content-Type: application/json

{ "username": "admin", "password": "admin123" }
```

Response:
```json
{ "token": "eyJ...", "user": { "id": 1, "name": "Campaign HQ", "role": "admin" } }
```

Use the token in all subsequent requests:
```http
Authorization: Bearer eyJ...
```

---

## 📡 API Reference

### Health
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Server status |

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Login, receive JWT token |
| GET | `/api/auth/me` | Get current user from token |

### Dashboard
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/dashboard/stats` | Worker/task/coverage counts |
| GET | `/api/dashboard/activity?limit=20` | Recent activity log |

### Workers
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/workers` | List all workers |
| GET | `/api/workers?q=ravi` | Search by name/zone/role |
| GET | `/api/workers?zone=North&status=Active` | Filter workers |
| GET | `/api/workers/:id` | Get single worker |
| POST | `/api/workers` | Add new worker |
| PATCH | `/api/workers/:id` | Update worker fields |
| DELETE | `/api/workers/:id` | Remove worker |

**POST /api/workers body:**
```json
{
  "firstName": "Ravi",
  "lastName": "Kumar",
  "zone": "North Zone",
  "role": "Team Leader",
  "phone": "+91-9000000001"
}
```

### Tasks
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tasks` | List all tasks (grouped by status) |
| GET | `/api/tasks?status=todo&zone=North` | Filter tasks |
| GET | `/api/tasks/:id` | Get single task |
| POST | `/api/tasks` | Create task |
| PATCH | `/api/tasks/:id` | Update any task field |
| POST | `/api/tasks/:id/advance` | Move todo→inprog→done |
| DELETE | `/api/tasks/:id` | Delete task |

**POST /api/tasks body:**
```json
{
  "title": "Voter list verification – Sector 4",
  "assignee": "Ravi Kumar",
  "priority": "High",
  "zone": "North",
  "due": "2026-03-12"
}
```

### Zones
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/zones` | List all zones with stats |
| PATCH | `/api/zones/:id` | Update zone stats |

### Broadcasts
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/broadcasts` | List past broadcasts |
| POST | `/api/broadcasts` | Send a broadcast message |

**POST /api/broadcasts body:**
```json
{
  "message": "Rally tomorrow at 9am at Town Hall",
  "target_zone": "North Zone",
  "target_role": "All"
}
```

---

## 🗄️ Database Schema

**SQLite** (`campaign.db`) with these tables:
- `users` — admin/manager accounts
- `workers` — field workers with zone, role, task counts
- `tasks` — campaign operations with kanban status
- `zones` — constituency coverage areas
- `broadcasts` — message history with recipient count
- `activity_log` — live activity feed entries

The database is **auto-created and seeded** on first run.

---

## 🔒 Security Notes

- Change `JWT_SECRET` in `.env` before deploying to production
- Hash passwords with bcrypt (already done for the seeded admin user)
- Add rate limiting (`express-rate-limit`) for production use
- Enable HTTPS in production via a reverse proxy (nginx/caddy)
- Set `FRONTEND_URL` in `.env` to your specific domain instead of `*`

---

## 🛠️ Frontend Integration

The `public/api.js` file:
1. Handles JWT login with a modal UI
2. Overrides `addWorker`, `addTask`, `advanceTask`, `sendBroadcast` to call the API
3. Loads live data on page navigation
4. Stores the token in `localStorage`

To activate it, add to `public/index.html` before `</body>`:
```html
<script src="/api.js"></script>
```
