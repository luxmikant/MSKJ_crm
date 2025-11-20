# MSKJ CRM — Interview Prep (Concise)

This is a high‑leverage summary to speak to architecture, design decisions, trade‑offs, and stack rationale.

## 1) What It Is
- A lightweight CRM: customer segments → campaigns → communication logs → dashboards.
- SPA client (React + Vite) calls a stateless REST API (Node + Express) backed by MongoDB (Mongoose).
- Optional AI endpoints suggest copy/segments; graceful fallback when no provider key.

## 2) Architecture (Mental Model)
- Client SPA: Auth, UI, builds segment rule trees, composes campaign payloads.
- Server API: AuthZ, business logic, AI orchestration, aggregation for dashboards.
- DB: Documents for Customer/Order/Segment/Campaign/CommunicationLog + indexes.
- Public endpoints: `/api/public/metrics`. Protected: most `/api/*` via JWT.

Flow (auth → send → dashboards)
1. Login (Google GSI) → `/api/auth/google` → server issues JWT.
2. Client stores JWT → attaches `Authorization: Bearer <jwt>` to protected requests.
3. Segment preview/save → Campaign creates logs (SENT/DELIVERED/OPENED/CLICKED/FAILED).
4. Dashboards aggregate last‑30‑days from Orders + CommunicationLog.

## 3) Core Entities (Essentials)
- Customer: email, tags, totalSpend, lastOrderDate, createdBy.
- Order: customerId, totalAmount, status, createdBy, createdAt.
- Segment: name, rules (logical tree), audienceSize, createdBy.
- Campaign: name, channel (EMAIL/SMS), segmentId, status, createdBy.
- CommunicationLog: campaignId, customerId, channel, status lifecycle + timestamps, createdBy.

## 4) Auth & Security (How it works)
- Client gets Google credential → POST `/api/auth/google` → server validates → upsert User → signs JWT (`JWT_SECRET`).
- `requireAuth` middleware enforces JWT on protected routes; attaches `req.user`.
- Multi‑tenant isolation by `createdBy`: every query filters `{ createdBy: req.user.id }`; every insert sets `createdBy`.
- Hardening: Helmet, CORS (`CORS_ORIGIN`), request‑id, body size limits. Dev toggle `AUTH_DISABLED=true` (dev only).

## 5) Segmentation Engine (Rule → Mongo)
- UI builds nested AND/OR trees; leaf ops: eq/gte/lte/between/in/regex.
- Controller converts tree → Mongo filter (`$and`/`$or` + operators). Preview counts audience before save.

## 6) Campaign Workflow (Simulated)
- Select segment + channel + content → create campaign.
- Simulated vendor: writes CommunicationLog entries with realistic status transitions.
- Dashboard queries aggregate statuses per day to show trends/KPIs.

## 7) AI Features (Pragmatic)
- `/api/ai/suggest-message` & `/api/segments/ai/generate`.
- Provider abstraction (Gemini/OpenAI if keys); otherwise deterministic fallback with `usedAI=false`.
- UI can label AI vs fallback for transparency.

## 8) Key Files (You can reference quickly)
- Client: `src/api.ts` (base URL, fetch), `state/AuthContext.tsx` (token), `pages/*` (Dashboard/Segments/Campaigns/Landing).k

## 9) Deployment & Envs (Render)
- Web Service (server): `npm install` → `npm start`, health `/api/health`.
- Static Site (client): `npm install && npm run build`, publish `build` (or `dist`).
- Critical envs: client `VITE_API_BASE_URL`, `VITE_GOOGLE_CLIENT_ID`; server `MONGO_URI`, `JWT_SECRET`, `CORS_ORIGIN`, provider keys (optional).

## 10) Trade‑offs (Intentional)
- JWT without refresh/rotation; no RBAC (kept scope tight).
- Mocked delivery vendor; realistic status simulation over real ESP/SMS.
- AI falls back (ensures non‑blocking UX at cost of fidelity).
- Minimal validation/rate limits; focus on core flows and deployability.

## 11) Improvement Ideas
- RBAC + per‑resource policy checks; input validation (zod/Joi) + rate limiting.
- Real providers (SendGrid/Twilio) behind feature flags; queues (BullMQ) for send.
- Token refresh/rotation; move to HttpOnly cookies + CSRF for browser threat model.
- Caching aggregates (Redis), tracing (OpenTelemetry), test coverage (integration/e2e).

---

## Implementation Decisions & Rationale (Why these choices)

Frontend — React + Vite (+ Tailwind)
- Vite: instant dev server + fast builds; simple SPA deployment to Render Static Sites.
- React: familiar ecosystem, flexible state and routing; no SSR required here.
- Tailwind: consistent, composable styles without CSS sprawl; accelerates UI work.

Backend — Node.js + Express (+ Mongoose)
- Express: minimal, composable middleware; easy JWT/CORS/Helmet wiring; quick JSON APIs.
- Node: same language front/back, fast iteration, huge ecosystem.
- Mongoose + MongoDB: flexible schema suits evolving segment rules and denormalized logs; easy `$and/$or` queries for rule trees.

Database — Why MongoDB over MySQL here
- Segments are arbitrary logical trees → natural mapping to document queries.
- Communication logs are high‑write, schematically flexible (status transitions, timestamps) → document model excels.
- If strict transactions/reporting were primary: MySQL + normalized schema would be stronger.

AI — Provider abstraction with fallback
- Keeps demo unblocked without secrets; converts provider JSON to structured fields; exposes `usedAI` for transparency.

Deployment — Render (Static + Web)
- Simple two‑service setup; health checks; env wiring; easy preview URLs.

Security posture
- Baseline hardening (Helmet/CORS/JWT middleware/ownership scoping).
- Clear prod/dev separation (`AUTH_DISABLED=false` in prod).

---

## Preferred Tech Stack — Options & When (Explain why)

Frontend: React.js vs Next.js
- Choose React (SPA) when: pure client rendering is fine, SEO not critical, fastest path to ship, simple static hosting.
- Choose Next.js when: you need SSR/SSG for SEO/perf, server components, edge rendering, API routes co‑located.

Backend: Node.js vs Java (Spring Boot)
- Choose Node.js when: lightweight JSON APIs, rapid iteration, shared JS skillset, lower infra overhead.
- Choose Spring Boot when: strong typing + enterprise standards, complex domain with heavy validations, JVM ecosystem needs, robust observability baked in.

Database: MongoDB vs MySQL
- Choose MongoDB when: flexible/variable schemas (segments/logs), hierarchical data, horizontal scaling/sharding, fast iteration.
- Choose MySQL when: strict relational constraints, complex joins, multi‑row ACID transactions, BI/reporting via SQL.

Pub‑Sub: Kafka / RabbitMQ / Redis Streams (Optional)
- Introduce when: you need async workflows (send queues, webhooks), backpressure handling, or event sourcing.
  - Kafka: high throughput, partitioning, long retention streams.
  - RabbitMQ: robust routing (topics/direct), traditional message broker semantics.
  - Redis Streams: lightweight, great for simple pipelines with low ops friction.
- In this project: not strictly needed; could be added for real send pipelines and webhook processing.

AI Tools / LLM APIs (Optional)
- Add when: you want personalized content, scoring, or segment suggestions that benefit from LLMs.
- Rationale here: abstraction layer lets you swap providers; fallback ensures UX continuity if keys are missing.

---

## Interview Anchor Points (Sound bites)
- “It’s a classic SPA + REST + document DB. Segments are rule trees compiled to Mongo filters; campaigns write lifecycle logs; dashboards aggregate last‑30‑days.”
- “Ownership scoping via `createdBy` prevents IDOR; every list/get/update/delete includes `createdBy: req.user.id`.”
- “AI endpoints are provider‑optional; we never block UX—fallback returns safe suggestions with `usedAI=false`.”
- “Render deploy is two services; `VITE_API_BASE_URL` lines up the client to the server; CORS is restricted to the client origin.”
- “Trade‑offs: JWT without refresh, mocked sends, minimal validation—chosen for speed; easy to harden later.”

## 1‑Page Cheat (If you can only read once)
- Stack: React/Vite/Tailwind • Node/Express/Mongoose • MongoDB • Render • JWT • Helmet/CORS • Optional AI.
- Flows: Login→JWT→Segments→Campaigns→Logs→Dashboards; AI suggest assists copy.
- Security: `requireAuth` + `createdBy` scoping; prod disables dev auth; CORS locked.
- Why choices: flexible schemas + fast dev; SPA suffices; optional AI; simple deploy.
- Next steps: RBAC, validation/rate limiting, real providers, queues, caching, tracing.

---

## Project Introduction Scripts (Use in interviews)

30 seconds (elevator)
- Problem: A lightweight CRM to create customer segments and run campaigns.
- Approach: React SPA + Node/Express API + MongoDB. Segments are rule trees compiled to Mongo filters; campaigns write communication logs; dashboards aggregate last‑30‑days.
- Outcome: Deployable on Render, auth via Google JWT, optional AI suggestions with safe fallbacks.

60–90 seconds (concise overview)
- What it does: Customers → Segments → Campaigns → CommunicationLog → Dashboard KPIs. Public metrics endpoint powers a pre‑login landing.
- Architecture: SPA client (React/Vite/Tailwind) talks to a stateless REST API (Express/Mongoose). Ownership isolation via `createdBy`. Core routes protected by JWT middleware.
- Segmentation: UI builds AND/OR rule trees, controller compiles to Mongo operators (`$and/$or`, comparison, regex, date windows). Preview returns audience count + sample.
- Campaigns & data: Simulated send pipeline records realistic status transitions (SENT→DELIVERED→OPENED→CLICKED/FAILED). Dashboards run aggregation pipelines over the last 30 days.
- AI & deploy: AI endpoints suggest copy/segments via Gemini/OpenAI when keys exist, otherwise deterministic suggestions. Deployed as Render Web + Static services; client uses `VITE_API_BASE_URL`.

3 minutes (deep dive)
- Context & goals: Ship a functional CRM demo quickly, favoring fast iteration and clear architecture over full enterprise hardening.
- Data model: Document‑oriented `Customer`, `Order`, `Segment`, `Campaign`, `CommunicationLog`, `User`. Indexes on `createdBy`, time fields, and common filters. Mongo chosen for flexible schemas and straightforward rule‑to‑query mapping.
- Segmentation engine: Normalizes multiple input shapes into a canonical rule tree; validates nodes; compiles to Mongo filters. Operators include comparisons, set membership, escaped regex, and relative/absolute date windows. Owner scoping is applied on every query to prevent cross‑tenant reads.
- Campaign workflow: Create campaign with a segment, simulate delivery events by writing `CommunicationLog` entries with timestamps and status transitions; dashboard aggregates counts per day and by status.
- Security: Google OAuth → server issues JWT; `requireAuth` protects routes; CORS/Helmet hardening; dev mode toggle for local speed but disabled in prod. Public metrics endpoint shows activity without authentication.
- Deployment & ops: Render blueprint sets up server + static site; Vite builds to `build/` to match Render’s publish dir; health checks; environment variables for API base, Mongo, JWT, and AI providers.
- Trade‑offs & next steps: Chose JWT without refresh, no RBAC, simulated vendors, and minimal validation to optimize delivery; next steps include RBAC, rate limiting, real providers behind queues, caching, and tracing.

Speaking tips
- Lead with outcomes, then architecture. Keep numbers/timeframes handy (e.g., “last‑30‑days dashboard”).
- Anchor on 3 pillars: Segments, Campaigns, Dashboards. Mention AI as an enhancer, not a dependency.
- Emphasize multi‑tenant isolation via `createdBy` in every query to show security awareness.
- Mention deploy story briefly (Render Web + Static, `VITE_API_BASE_URL`, CORS) to demonstrate end‑to‑end ownership.
- Timebox yourself: 30s elevator, 60–90s overview, 3‑min deep dive; offer to drill where they’re curious.
