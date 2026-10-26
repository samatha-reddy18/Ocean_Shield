# OceanShield AI — Backend

Node.js + Express REST API backed by MongoDB Atlas. Provides authentication, hazard report management, geospatial map data, admin verification, AI service orchestration, satellite integration, and notifications.

## Stack
- Node.js + Express
- MongoDB Atlas + Mongoose
- bcryptjs (password hashing), JWT (auth)
- Multer (image uploads), Cloudinary (cloud storage, optional)
- Zod (validation), Helmet, express-rate-limit
- Axios (calls to the Python AI service)

## Setup

```bash
cd backend
cp .env.example .env       # fill in MONGO_URI, JWT_SECRET, etc.
npm install
npm run dev                # starts on http://localhost:5000
```

### Seed an admin
```bash
node src/utils/seedAdmin.js
```
Creates an admin (`admin@oceanshield.io` / `AdminPass123!`) unless one exists. Override with `SEED_ADMIN_*` env vars.

## API Reference

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | /api/auth/register | Register a citizen/researcher |
| POST | /api/auth/login | Authenticate |
| GET | /api/auth/me | Current user |
| PATCH | /api/auth/me | Update profile |
| POST | /api/reports | Submit a hazard report (multipart: images) |
| GET | /api/reports | List reports (filters + pagination) |
| GET | /api/reports/my | Current user's reports |
| GET | /api/reports/:id | Report details |
| PATCH | /api/reports/:id | Update own report |
| DELETE | /api/reports/:id | Delete own report |
| GET | /api/map/reports | Map markers |
| GET | /api/map/hotspots | Report-density hotspots |
| POST | /api/ai/analyze-image | Trigger image classification |
| POST | /api/ai/analyze-text | NLP extraction |
| POST | /api/ai/check-duplicates | Duplicate detection |
| GET | /api/ai/health | AI service availability |
| GET | /api/satellite/layers | GIBS layer catalog + default date |
| GET | /api/satellite/tiles | Tile URL template (layer + date) |
| GET | /api/satellite/snapshot | Download snapshot image (bbox + date) |
| GET | /api/admin/dashboard | Dashboard statistics (admin) |
| GET | /api/admin/reports | Reports for review (admin) |
| PATCH | /api/admin/reports/:id/status | Verify/reject/request info (admin) |
| GET | /api/admin/review-logs | Audit trail (admin) |
| GET | /api/notifications | User notifications |
| PATCH | /api/notifications/:id/read | Mark read |
| POST | /api/notifications/mark-all-read | Mark all read |

## Tests
```bash
npm test     # uses Jest + Supertest (requires a MongoDB connection)
```
