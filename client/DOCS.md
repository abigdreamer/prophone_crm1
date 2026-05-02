# ProPhone CRM — Project Documentation

---

## What Is This Project?

ProPhone CRM is a **Sales CRM (Customer Relationship Management)** web application built for **GeniusAI's ProPhone** product. It is designed for the **towing and trucking industry** to help sales teams track leads, manage customer relationships, log activities, and monitor the sales pipeline from first contact to closed deal.

---

## Who Uses It?

| Role | Name | Access |
|---|---|---|
| Admin | Mike Johnson | Full access |
| Manager | Sarah Lee | Full access |
| Sales Rep | James Davis | Standard access |
| Sales Rep | Amy Wilson | Standard access |

Login credentials: any team email + password `demo`

---

## Core Concepts

### 1. Pools
Contacts are organized into two pools:

- **Prospect Pool** — People who are not yet customers. The sales team is actively working to convert them.
- **Client Accounts** — Existing paying customers (FoxTow, San Pablo Auto, Caliens, CertifiedTow, Roadside Wingman). Each client has its own contact list.

### 2. Lifecycle Stages
Every contact moves through a defined pipeline:

```
New → Contacted → Engaged → Demo Scheduled → Demo Done
   → Proposal Sent → Negotiating → Customer ✓

Failed path:  Not Qualified / Lost / Churned ✗
```

Each stage represents where a lead currently is in the sales process.

### 3. Activities
Every interaction with a contact is logged as an activity. Examples:

- Call Made, Call Answered
- Email Sent, Email Opened, Email Clicked
- Demo Scheduled, Demo Held
- Proposal Sent, Contract Signed
- Stage Changed, Note Added
- SMS Sent, Ad Shown

Activities build a full history (timeline) of every contact.

---

## How the App Works — Screen by Screen

### Login Screen
The user enters their email and password. The app checks the `users` table in Supabase. On success, the main CRM layout loads.

### Main Layout (3 Panels)

```
┌──────────┬───────────────────────────┬──────────────────┐
│          │                           │                  │
│ Sidebar  │     Main Page Area        │  Right Panel     │
│          │  (Dashboard or Table)     │ (Lead Lifecycle) │
│ Contact  │                           │                  │
│ List     │                           │  Shows when a    │
│          │                           │  contact is      │
│ Search   │                           │  selected        │
│ Filters  │                           │                  │
└──────────┴───────────────────────────┴──────────────────┘
```

**Top Navigation Bar** — Switches between views: Dashboard, All Contacts, Leads, Customers, Lost, and pool/client switcher.

---

### Sidebar (Left Panel)
- Shows the list of contacts for the current pool or client
- Has search (type anywhere on keyboard to search)
- Filter by stage (New, Contacted, Engaged, etc.)
- Sort by Recent Activity, Name A–Z, or Lead Score
- "+ Add" button to create a new contact

### Dashboard Page
Shows a summary of the current pool:
- **Active Leads** — breakdown by stage with count and pipeline value
- **Customers** — top customers by contract value

- **Lost/Churned** — count of lost deals
- **Team Activity** — per-user stats (contacts owned, activities logged)

### Contacts Table Page
Full table view of all contacts with:
- Name, Email, Company, City
- Stage badge and Lead Score bar
- Last activity date
- Email and Call activity counts
- Contract value
- Owner avatar
- Edit button per row

---

### Right Panel — Lead Lifecycle (opens when contact is selected)

This is the most important panel. It shows everything about one contact:

1. **Contact Header** — Name, title, company, city, stage, truck count
2. **Key Details** — Email, phone, lead score, contract value
3. **Action Buttons:**
   - `+ Log Activity` — Record a new interaction (call, email, note, etc.)
   - `⇢ Stage` — Move the contact to a new pipeline stage
   - `✎ Edit` — Update contact information
4. **Lead Journey Stepper** — Visual progress bar showing which stages are complete
5. **Activity Stats** — Count of emails, calls, ads, meetings
6. **Activity Timeline** — Full chronological history of all interactions, filterable by category

---

## How Data Flows

### Loading Contacts
```
User logs in or switches pool/client
        ↓
App calls db.getContacts(pool, clientId)
        ↓
Supabase returns contacts + their activities (joined)
        ↓
Sidebar list and page content update
```

### Adding a New Contact
```
User clicks "+ Add" → fills the form → clicks "Add Contact"
        ↓
ContactModal calls onSave(contactData)
        ↓
db.createContact() → inserts row into contacts table
        ↓
Inserts initial activity ("Contact created") into activities table
        ↓
New contact appears at top of sidebar list
```

### Logging an Activity
```
User clicks "+ Log Activity" → selects type → writes note → saves
        ↓
db.addActivity(contactId, activity) → inserts into activities table
        ↓
db.getContact(id) → refreshes contact with new activity
        ↓
Timeline updates instantly, lastActivityAt updates
```

### Changing a Stage
```
User clicks "⇢ Stage" → selects new stage → optional note → saves
        ↓
db.updateContact(id, { lifecycleStage, lastActivityAt })
        ↓
db.addActivity(contactId, stage_changed activity)
        ↓
Lead Journey stepper updates, activity appears in timeline
```

### Editing a Contact
```
User clicks "✎ Edit" → updates fields → saves
        ↓
db.updateContact(id, updatedData) → updates contacts table row
        ↓
Contact header and table row refresh with new data
```

---

## Database Tables

### users
Stores CRM team members. Used for login and for assigning contacts.

| Column | Description |
|---|---|
| id | Unique ID (e.g. u1, u2) |
| name | Full name |
| email | Login email |
| role | Admin / Manager / Rep |
| avatar | Initials (e.g. MJ) |
| color | UI color for avatar |
| password | Plain text password (demo environment) |

### clients
Stores the paying client accounts shown in the pool switcher.

| Column | Description |
|---|---|
| id | Slug ID (e.g. foxtow) |
| name | Display name |
| color | Accent color in UI |
| plan | Starter / Pro / Enterprise |
| mrr | Monthly recurring revenue |

### contacts
The main table. Every lead or customer is one row.

| Column | Description |
|---|---|
| id | UUID (auto-generated) |
| pool | "prospect" or "client" |
| client_id | Which client account (null for prospects) |
| first_name, last_name | Contact name |
| email, phone | Contact info |
| company, title, city | Company details |
| trucks | Number of trucks (industry-specific) |
| lifecycle_stage | Current pipeline stage |
| lead_score | 0–100 quality score |
| contract_value | Estimated deal value in dollars |
| owned_by | Which team member owns this contact |
| added_by | Who created the contact |
| last_activity_at | Timestamp of most recent activity |

### activities
Every interaction log. Each row is one event for one contact.

| Column | Description |
|---|---|
| id | UUID (auto-generated) |
| contact_id | Which contact this belongs to |
| type | Event type (call_made, email_sent, stage_changed, etc.) |
| note | Description / details |
| by | Which team member performed the action |
| ts | When it happened |

---

## Lead Score Meaning

| Score | Meaning |
|---|---|
| 70–100 | Hot lead (shown in green) |
| 40–69 | Warm lead (shown in amber) |
| 0–39 | Cold lead (shown in red) |

---

## Setup Instructions

### Step 1 — Supabase Setup
1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** → run `schema.sql` (creates all tables)
3. Go to **SQL Editor** → run `seed.sql` (adds initial users, clients, and sample contacts)

### Step 2 — Environment Variables
Open `.env` file in the project root and fill in your Supabase credentials:
```
REACT_APP_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
REACT_APP_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```
Find these in: Supabase Dashboard → Project Settings → API

### Step 3 — Run the App
```bash
npm install
npm start
```

### Step 4 — Login
Open `http://localhost:3000` and sign in with:
- Email: `mike@geniusai.biz`
- Password: `demo`

---

## Activity Types Reference

| Category | Types |
|---|---|
| Email | email_sent, email_opened, email_clicked, email_replied |
| Call | call_made, call_answered, call_voicemail |
| SMS | sms_sent |
| Ad | ad_shown, ad_clicked, fb_ad_launched, fb_ad_clicked |
| Meeting | demo_scheduled, demo_held, demo_no_show |
| Proposal | proposal_sent, contract_signed |
| Note | note_added |
| System | stage_changed |
| Inbound | form_submitted, page_visited |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 (JSX, inline styles) |
| Database | Supabase (PostgreSQL) |
| API | Supabase JS Client v2 |
| Auth | Custom (users table query) |
| Hosting | Any static host (Netlify, Vercel, etc.) |
| Styling | Inline CSS with dark theme tokens |

---

*ProPhone CRM — Built for GeniusAI · Prophone Suite*
