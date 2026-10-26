# OceanShield AI

AI-Powered Ocean Hazard Monitoring and Reporting Platform.

OceanShield AI is a full-stack web application that lets citizens, fishermen, researchers, and administrators report, visualize, and monitor ocean and coastal environmental hazards such as oil spills, plastic pollution, marine debris, coastal pollution, algal blooms, and dead marine animals.

The platform combines community observations, AI-assisted analysis, geospatial visualization (Leaflet/OpenStreetMap), and satellite imagery exploration (Copernicus/Sentinel) to support environmental awareness and data-driven decision-making. It supports investigation, not official inspection or emergency response.

## Project Structure

```
OCEAN_SHIELD/
├── backend/        # Node.js + Express + MongoDB Atlas (Mongoose) REST API
├── frontend/       # React.js + Vite SPA (Leaflet, Recharts, React Router)
├── ai-service/     # Python + FastAPI microservice (image, NLP, duplicates)
├── docs/           # Project documentation
└── README.md
```

## Tech Stack

| Layer        | Technology                                                          |
| ------------ | ------------------------------------------------------------------- |
| Frontend     | React.js, Vite, React Router, Axios, Leaflet, React-Leaflet, Recharts, Lucide React, React Context API |
| Backend      | Node.js, Express.js, Mongoose, MongoDB Atlas, bcryptjs, JWT, Multer, Zod, Helmet, Express Rate Limit |
| AI Service   | Python 3.11+, FastAPI, PyTorch, OpenCV, scikit-learn, Transformers |
| Database     | MongoDB Atlas (database: `oceanshield`)                            |
| Storage      | Cloudinary (image uploads) or local disk fallback                  |

## User Roles

| Role          | Responsibilities                                                         |
| ------------- | ------------------------------------------------------------------------ |
| Citizen       | Submit reports, view public incidents, manage personal reports          |
| Researcher    | Explore reports, geographical patterns, satellite data                  |
| Administrator  | Review reports, manage verification, access administrative analytics   |

## Modules

1. User Authentication & Authorization
2. Ocean Hazard Reporting
3. My Reports & Report Management
4. AI-Based Hazard Image Classification
5. NLP & Duplicate Report Detection
6. Interactive Ocean Hazard Map
7. Satellite Monitoring & Imagery Exploration
8. Administrative Dashboard & Verification
9. Notification & Alert Management
10. Environmental Analytics & Hotspot Analysis
11. Report Priority Management
12. Research Data Export & Reporting (optional first release)

## Quick Start

See each component's README for setup details. High-level:

1. Configure MongoDB Atlas connection in `backend/.env` (copy from `.env.example`).
2. Start the backend: `cd backend && npm install && npm run dev`.
3. Start the AI service: `cd ai-service && pip install -r requirements.txt && uvicorn app.main:app --reload`.
4. Start the frontend: `cd frontend && npm install && npm run dev`.

## Notes

- AI predictions are automated assessments, not confirmed environmental findings.
- Hotspots represent concentrations of submitted reports, not confirmed contamination.
- Satellite imagery is described as live only when actually retrieved.
- Reporting trends are not direct measurements of pollution levels.
