# ProPhone CRM — What's Available Right Now

ProPhone is a sales CRM with built-in email marketing, built for towing and trucking businesses.

---

## Contacts & Prospects

- Add, edit, and delete prospects
- Organize prospects into groups (e.g. "Hot Leads", "Past Customers")
- Track lifecycle stage: **Lead → Proposal → Customer** (or mark as Lost)
- Log activities per contact: calls, emails, meetings
- Track contract value per contact
- Search and filter by stage, group, or keyword

**How to add a contact**
1. Go to **Prospects** in the top navigation
2. Click **Add Contact** (top right)
3. Fill in name, email, phone, company, and stage
4. Click **Save**

**How to manage contact groups**
1. Go to **Prospects → Contact Groups** in the sidebar
2. Click **New Group** and give it a name (e.g. "Hot Leads")
3. To assign a contact to a group: open the contact, edit it, and select the group from the dropdown
4. Groups can be used when adding recipients to an email campaign — add an entire group at once instead of one by one
5. To rename or delete a group, click the three-dot menu next to it

---

## Dashboard

- Summary cards: total prospects, active leads, customers, pipeline value
- Pipeline chart broken down by stage
- Revenue by sales rep
- 14-day activity trend
- Customer list with key metrics
- Team activity overview

---

## Email Marketing

**Templates**
- Visual drag-and-drop email builder (text, headings, buttons, images, dividers)
- Save as draft or publish when ready
- Duplicate, preview, and test-send any template
- Merge tags for personalization: `{{firstName}}`, `{{lastName}}`, `{{company}}`

**Campaigns**
- Create a campaign from any published template
- Set sender name, sender email, and subject line
- Add recipients individually, by group, or in bulk
- A/B testing — run two subject lines or two templates against each other
- Send immediately or schedule for later
- Pause and resume a running campaign

**Tracking (per campaign)**
- Total recipients, sent, delivered, opened, clicked, bounced — all with rates
- Per-recipient timeline: exactly when each email was sent, opened, clicked, or bounced
- Search and filter recipients by name, email, status, or variant

---

## Sending Domains

- Add a custom sending domain (e.g. `mail.yourcompany.com`)
- Step-by-step DNS verification (DKIM, SPF, DMARC)
- Use your verified domain as the sender address on all campaigns

---

## Team & User Management

| Role | Access |
|---|---|
| Super Admin | All companies, all users, switch between accounts |
| Admin | Own company profile + all users within their company |
| Manager | Full access to contacts, campaigns, templates |
| Rep | Own contacts and activities |

- Create, edit, delete user accounts with role and company assignment
- Every user sees only their company's data

---

## Company Profile

- Store company name, address, phone, email, website, timezone
- Editable by Admin and above
- Full data isolation — contacts, campaigns, and templates are private per company

---

## Access & Security

- Email + password login with JWT session tokens
- Role-based access control on every page and API route
- All data scoped to the logged-in user's company

---

*Questions? Contact your Prophone administrator.*

---

## Developer Setup

**Requirements:** Node.js 18+, PostgreSQL

```bash
# Backend
cd server
cp .env.example .env    # fill in DATABASE_URL, JWT_SECRET, RESEND_API_KEY
npm install
npx prisma migrate deploy
npm run dev             # http://localhost:8080

# Frontend
cd client
cp .env.example .env    # VITE_API_URL=http://localhost:8080/api
npm install
npm run dev             # http://localhost:5173
```

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing tokens |
| `RESEND_API_KEY` | Resend API key for sending email |
| `RESEND_FROM_EMAIL` | Default sender email |
| `PORT` | Backend port (default `8080`) |

**Stack:** React + Vite, Express + Prisma, PostgreSQL, Resend API, JWT auth
