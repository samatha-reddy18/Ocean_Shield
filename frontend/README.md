# OceanShield AI — Frontend

React.js single-page app built with Vite.

## Stack
- React.js + Vite
- React Router (navigation), Axios (API client)
- Leaflet + React-Leaflet (maps), Recharts (charts)
- Lucide React (icons), React Context API (auth state)

## Setup
```bash
cd frontend
npm install
cp .env.example .env
npm run dev          # http://localhost:5173 (proxies /api to backend:5000)
```

Build: `npm run build` → `dist/`.

## Pages
Home, Login, Register, Dashboard, Report Hazard, My Reports, Report Details, Ocean Map, Satellite Monitoring, AI Analysis, Notifications, Admin Dashboard, NotFound.

## Notes
- The Vite dev server proxies `/api` to `http://localhost:5000` and `/ai` to `http://localhost:8000`, so CORS is handled during development.
- Auth token is stored in `localStorage` and attached to requests via an Axios interceptor. Expired tokens trigger a redirect to `/login`.
- All dashboard statistics come from real backend data; empty states are shown when no records exist.
