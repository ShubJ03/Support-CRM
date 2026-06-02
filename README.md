# SupportDesk CRM

A full-stack customer support ticketing system built with Node.js + Express + SQLite.

## Tech Stack
- **Backend**: Node.js + Express
- **Database**: SQLite (via better-sqlite3)
- **Frontend**: Vanilla JS + Custom CSS (no build step)
- **Deploy**: Railway / Render

## Local Setup

```bash
# 1. Install dependencies
npm install

# 2. Start the server
npm start

# 3. Open in browser
# http://localhost:3000
```

For development with auto-reload:
```bash
npm run dev
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/tickets | Create a new ticket |
| GET | /api/tickets | List all tickets (supports ?status= and ?search=) |
| GET | /api/tickets/:id | Get ticket details with notes |
| PUT | /api/tickets/:id | Update status and/or add a note |
| GET | /api/stats | Get dashboard stats |

## Deploy to Railway

1. Push code to GitHub
2. Go to railway.app → New Project → Deploy from GitHub
3. Select your repo → Railway auto-detects Node.js
4. Done — your app is live

## Deploy to Render

1. Push code to GitHub
2. Go to render.com → New Web Service
3. Connect your repo
4. Build command: `npm install`
5. Start command: `node server.js`
6. Done
