# ProPhone CRM

## Overview

ProPhone is a CRM built for genusai sales teams. It helps teams manage leads, track contacts through the sales pipeline, and run outreach campaigns — all from one place.

## Features

- Contact management with lifecycle stage tracking
- Campaign builder with scheduled drip messaging
- Email template builder with drag-and-drop blocks
- Activity log for calls, emails, and notes
- Multi-client support with pool-based contact scoping
- Domain verification for email sending
- Role-based access with JWT authentication

## Live Website

[https://prophone.biz/](https://prophone.biz/)

## Tech Stack

- **Frontend:** React 18, React Router v7, Vite
- **Backend:** Node.js, Express.js
- **Database:** PostgreSQL with Prisma ORM
- **Auth:** JWT (JSON Web Tokens)
- **Email:** Resend SDK

## Installation

```bash
# Install client dependencies
cd client
npm install
npm run dev

# Install server dependencies
cd server
npm install
npm run dev
```

## Project Structure

```text
prophone-vite/
├── client/                 # React frontend
│   └── src/
│       ├── components/     # Reusable UI components
│       ├── pages/          # App pages (Dashboard, Contacts, etc.)
│       ├── services/       # API calls
│       ├── hooks/          # Custom React hooks
│       └── context/        # Global state
└── server/                 # Express backend
    └── src/
        ├── controllers/    # Business logic
        ├── routes/         # API endpoints
        └── middleware/     # Auth and request handling
```

## How It Works

```text
User logs in
  ↓
JWT token is issued and stored in the browser
  ↓
React frontend loads — user selects a client or pool (e.g., "prospects")
  ↓
Frontend fetches contacts scoped to that pool from the Express API
  ↓
All API requests include the JWT token for authentication
  ↓
Express validates the token, then queries PostgreSQL via Prisma
  ↓
Data is returned and displayed: contacts, stages, activity logs, campaigns
  ↓
User takes action (e.g., moves a contact to a new stage, logs a call, sends a campaign)
  ↓
Frontend sends the update to the API
  ↓
API writes the change to the database and logs an Activity record
  ↓
UI updates to reflect the latest state
```

### Key Concepts

**Pool Scoping**
Every contact is tied to either a general prospects pool or a specific client. When a user switches between clients, the app re-fetches all data for that context — keeping each client's data completely separate.

**Lifecycle Stages**
Contacts move through defined sales stages (e.g., New Lead → Contacted → Proposal Sent → Closed). Every stage change is recorded in the activity log with a timestamp.

**Campaign Drip Scheduling**
Users can build outreach campaigns with multiple steps. The system schedules each message with a configurable gap between sends, retries failed attempts up to 3 times, and processes sends one at a time to avoid rate limits.

**Email Templates**
Templates are built using a drag-and-drop block editor. Each template is stored as structured JSON and rendered at send time, making them easy to reuse and customize across campaigns.

**Activity Log**
Every meaningful action — a call, an email, a note, a stage change — is recorded as an Activity. This gives sales reps a full history of every interaction with a contact.