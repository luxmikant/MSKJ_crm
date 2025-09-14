# MSKJ CRM

A mini CRM platform with customer segments, campaigns, and insights. Frontend (Vite + React + Tailwind) and backend (Express + Mongoose).

## Environment Variables

Backend (Web Service):
- `MONGO_URI`: MongoDB connection string (e.g., MongoDB Atlas)
- `JWT_SECRET`: Any strong secret (auto-generated in render.yaml if not set)
- `CORS_ORIGIN`: Allowed frontend origins (comma-separated). Example: `https://mskj-crm-client.onrender.com`
- `AUTH_DISABLED` (optional): `true` to bypass auth during dev
- `NO_DB_OK` (optional): `true` to allow limited endpoints without DB during dev

Frontend (Static Site):
- `VITE_API_BASE_URL`: Backend base URL (auto-wired from Render’s service URL via render.yaml)
- `VITE_GOOGLE_CLIENT_ID`: Google OAuth Client ID

## Deploy on Render

1. Push this repo to GitHub.
2. One-click deploy using `render.yaml`:
   - In Render, click New → Blueprint, connect the repo.
   - Render will create two services:
     - Web Service: `mskj-crm-server` (Node 20)
     - Static Site: `mskj-crm-client`
3. Configure env vars:
   - Server: set `MONGO_URI`, ensure `CORS_ORIGIN` includes the frontend URL; `JWT_SECRET` is auto-set.
   - Client: set `VITE_GOOGLE_CLIENT_ID`.
4. First deploy will:
   - Server: `npm install`, `npm start`.
   - Client: `npm install && npm run build`, publish `dist/`, SPA rewrite applied.

### Google OAuth Setup
- In Google Cloud Console → Credentials → OAuth 2.0 Client IDs:
  - Authorized JavaScript origins: your frontend URL (e.g., `https://mskj-crm-client.onrender.com`).
  - No redirect URIs needed for Google Identity Services One Tap/button.
- Put the Client ID into `VITE_GOOGLE_CLIENT_ID`.

### Local Development
```cmd
:: terminal 1 (server)
cd ma-sharvari-ki-jai\server
set CORS_ORIGIN=http://localhost:5173
npm run dev

:: terminal 2 (client)
cd ma-sharvari-ki-jai\client
set VITE_API_BASE_URL=http://localhost:5000
npm run dev
```

## Notes
- CORS is configured to accept the origins in `CORS_ORIGIN` (comma-separated) and supports credentials.
- The client auto-prefixes all API requests with `VITE_API_BASE_URL` if provided.
- Keep `.env` files out of Git; sensitive values are set in Render.
