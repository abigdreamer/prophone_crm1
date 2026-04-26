# ProPhone CRM

CRM built for towing & trucking teams — React + Vite frontend, Express + Prisma backend.

---

## Requirements

- Node.js 18+
- PostgreSQL database

---

## Install & Run

**1. Clone and install**
```bash
git clone <repo-url>
cd prophone-vite
```

**2. Backend**
```bash
cd server
cp .env.example .env        # fill in DATABASE_URL, JWT_SECRET, RESEND_API_KEY
npm install
npx prisma migrate deploy
npm run dev                 # runs on http://localhost:8080
```

**3. Frontend**
```bash
cd client
cp .env.example .env        # set VITE_API_URL=http://localhost:8080/api
npm install
npm run dev                 # runs on http://localhost:5173
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret key for signing tokens |
| `RESEND_API_KEY` | Resend API key for email sending |
| `RESEND_FROM_EMAIL` | Default sender email |
| `PORT` | Backend port (default `8080`) |

---

## Default Login

| Role | Email | Password |
|---|---|---|
| Super Admin | mike@geniusai.biz | 123456 |

---

## Stack

- **Frontend** — React, Vite, React Router, Recharts, Lucide
- **Backend** — Express, Prisma ORM, PostgreSQL
- **Auth** — JWT (30-day tokens)
- **Email** — Resend API
