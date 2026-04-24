# GeniusAI · ProPhone CRM

A full-featured CRM built in React JS with dummy data for towing/roadside industry leads.

---

## Project Structure

```
src/
├── index.js                    # React entry point
├── App.jsx                     # Root component — layout, routing, global state
├── theme.js                    # Design token constants (colors, etc.)
│
├── data/
│   ├── users.js                # USERS_DB — 4 team members + auth
│   ├── clients.js              # CLIENTS — 5 client accounts
│   ├── stages.js               # STAGE_DEF, LEAD_STAGES, CUSTOMER_STAGES, LOST_STAGES
│   ├── activities.js           # ACT_DEF, ACT_CATS — activity type definitions
│   └── contacts.js             # Seeded contact + activity generator, getPool()
│
├── utils/
│   └── format.js               # fmt.date / fmt.ago / fmt.num / fmt.mrr
│
├── components/
│   ├── LoginScreen.jsx         # Auth screen with quick-select avatars
│   ├── TopNav.jsx              # Top navigation tabs + dropdowns
│   ├── PoolSwitcher.jsx        # Prospect / client pool switcher
│   ├── Sidebar.jsx             # Left contact list with search & filters
│   ├── LifecycleChart.jsx      # Right panel: journey stepper + activity timeline
│   │
│   ├── ui/                     # Reusable primitives
│   │   ├── Pill.jsx            # Pill + StagePill
│   │   ├── ScoreBar.jsx        # Lead score progress bar
│   │   ├── Card.jsx            # Surface card wrapper
│   │   ├── Btn.jsx             # Button (primary / ghost / secondary)
│   │   ├── Input.jsx           # Labelled text input
│   │   ├── Sel.jsx             # Labelled select dropdown
│   │   ├── Hi.jsx              # Search-term highlighter
│   │   ├── Avatar.jsx          # User avatar circle
│   │   └── Modal.jsx           # Overlay modal with ESC close
│   │
│   └── modals/
│       ├── ContactModal.jsx    # Add / edit contact form
│       ├── LogActivityModal.jsx# Log a new activity
│       └── StageModal.jsx      # Change lifecycle stage
│
└── pages/
    ├── PageDashboard.jsx       # Dashboard with stage breakdown + team activity
    └── PageTable.jsx           # Full sortable/filterable contacts table
```

---

## Getting Started

```bash
npm install
npm start
```

App runs at **http://localhost:3000**

---

## Demo Credentials

| Name          | Email                  | Role    | Password |
|---------------|------------------------|---------|----------|
| Super Admin  | mike@geniusai.biz      | Admin   | 123456     |
| Sarah Lee     | sarah@geniusai.biz     | Manager | demo     |
| James Davis   | james@geniusai.biz     | Rep     | demo     |
| Amy Wilson    | amy@geniusai.biz       | Rep     | demo     |

---

## Features

- **Login** with role-based user profiles
- **Prospect Pool** — 280 seeded leads across the towing industry
- **Client Accounts** — 5 clients (FoxTow, San Pablo Auto, Caliens, CertifiedTow, Roadside Wingman)
- **Dashboard** — pipeline stats, stage breakdown, team activity
- **Contacts Table** — sortable, filterable, with inline edit
- **Sidebar** — searchable list with stage/sort filters
- **Lifecycle Panel** — journey stepper + full activity timeline
- **Modals** — Add/Edit contact, Log activity, Change stage
- **Global keyboard search** — type anywhere to filter contacts
