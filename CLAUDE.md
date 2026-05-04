# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Git Workflow

For every task, follow this branch workflow automatically when GitHub is connected:

1. **Create a feature branch from `main`** — name it based on the task (e.g., `feature/add-contact-filters`, `fix/login-redirect`, `chore/update-deps`)
2. **Do all work on that branch** — commit incrementally with clear messages
3. **Push the branch** to the remote
4. **Open a PR** targeting `main` as the base branch

Branch naming convention:
- `feature/<short-description>` — new functionality
- `fix/<short-description>` — bug fixes
- `chore/<short-description>` — maintenance, refactors, config changes

## Commands

### Client (React + Vite) — run from `client/`
```bash
npm run dev      # Dev server at http://localhost:5173
npm run build    # Production build
npm run preview  # Preview production build
```

### Server (Express + Prisma) — run from `server/`
```bash
npm run dev        # Dev server with nodemon at port 8080
npm start          # Production server
npm run db:push    # Push Prisma schema changes without migrations
npm run db:migrate # Create and apply migrations
npm run db:seed    # Populate initial data (users, clients, contacts)
npm run db:reset   # Drop + re-migrate + re-seed
npm run db:studio  # Open Prisma Studio at localhost:5555
```

No test or lint commands are configured.

## Architecture

Full-stack SaaS CRM for towing/roadside assistance sales teams.

**Stack:** React 18 + React Router v7 + Vite (client) / Express.js + Prisma + PostgreSQL (server). JWT auth, Resend SDK for email domain verification. Dark theme UI with inline styles — no CSS framework.

### Client (`client/src/`)

| Path | Purpose |
|---|---|
| `App.jsx` | Root component, React Router layout, protected route wrapper |
| `services/api.js` | All HTTP calls. Holds `_pool` / `_clientId` singletons; injects Bearer token automatically |
| `context/PoolContext.jsx` | Active pool + client ID state, persisted to localStorage |
| `hooks/useAuth.js` | JWT token management, user state, localStorage |
| `hooks/useContacts.js` | Fetches contacts for the active pool |
| `pages/` | Dashboard, Contacts, Domains, Reports, Settings, Clients |
| `components/ui/` | Reusable primitives (Button, Card, Modal, etc.) |
| `theme.js` | Design tokens (colors, spacing) used inline throughout |

### Server (`server/src/`)

| Path | Purpose |
|---|---|
| `app.js` | Express setup, mounts all routes, error handler |
| `middleware/auth.js` | `requireAuth` — verifies JWT, attaches user to `req.user` |
| `controllers/` | Business logic per resource (auth, contacts, activities, clients, domains) |
| `routes/` | Route definitions; all protected routes use `requireAuth` |
| `lib/prisma.js` | Prisma client singleton |

Database schema lives in `server/prisma/schema.prisma`. Key models: **User**, **Client**, **Contact** (main entity — tracks lifecycle stage, lead score, contract value), **Activity** (event log per contact), **Domain** (email domain verification).

### Key patterns

- **Pool scoping:** All contact queries are scoped to the active pool (`prospects` vs. a specific `clientId`). The `PoolContext` sets `_pool`/`_clientId` on the `api.js` singleton; every data fetch reads from it. Switching pools triggers a full refetch via `useContacts`.
- **Activity log:** Stage changes, calls, emails, notes all write an `Activity` row and update `Contact.lastActivityAt`. Stage changes also update `Contact.lifecycleStage` atomically.
- **Auth flow:** Login returns a JWT (7-day expiry) stored in localStorage. `useAuth` calls `GET /api/auth/me` on mount to rehydrate state. Token is cleared on logout.
- **No caching:** Data is re-fetched from the server on every pool change; no client-side cache layer.

