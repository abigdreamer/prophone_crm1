# How ProPhone Works — Developer Guide

This document explains the full end-to-end flow of ProPhone CRM, from importing a contact all the way to sending them an email. It is written for developers who want to understand how the system is built.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Step 1 — Contact Import](#step-1--contact-import)
3. [Step 2 — Contact Data & Lead Scoring](#step-2--contact-data--lead-scoring)
4. [Step 3 — Lifecycle Stages](#step-3--lifecycle-stages)
5. [Step 4 — Campaign Builder](#step-4--campaign-builder)
6. [Step 5 — Queue & Scheduling](#step-5--queue--scheduling)
7. [Step 6 — Sending the Email](#step-6--sending-the-email)
8. [Step 7 — Tracking & Activity Log](#step-7--tracking--activity-log)
9. [Full System Flow Diagram](#full-system-flow-diagram)
10. [Key Files Reference](#key-files-reference)

---

## System Overview

```text
Contact Imported
      ↓
  Lead Scored
      ↓
  Moved Through Pipeline Stages
      ↓
  Added to a Campaign
      ↓
  Queue Scheduled (daily drip)
      ↓
  Email Sent via Resend SDK
      ↓
  Opens / Clicks Tracked via Webhooks
      ↓
  Activity Logged on Contact
```

ProPhone is a full-stack app:
- **Frontend** — React 18 + Vite, communicates with the backend via a single `api.js` service file
- **Backend** — Express.js REST API, JWT auth, Prisma ORM
- **Database** — PostgreSQL
- **Email Delivery** — Resend SDK with DKIM/SPF via verified domains

---

## Step 1 — Contact Import

**Relevant file:** `server/src/controllers/contacts.controller.js` (lines 517–744)

Contacts enter the system in two ways:

### A. Bulk CSV Import — `POST /api/contacts/import`

The browser parses the CSV/Excel file and sends a JSON array of rows to the server. The server processes each row through these steps:

**1. Column Name Normalization**

Handles many variations of the same field:
```text
firstName / first_name / First Name / fullName (split on space)
email / Email / emailAddress
phone / Phone / phoneNumber
```

**2. Duplicate Detection**

Before processing, the server loads all existing contact emails for the client into memory (one query — avoids N+1). For each incoming row it checks:

| `duplicateAction` | What Happens |
|---|---|
| `"ignore"` | Row is skipped if the email already exists |
| `"update"` | Existing contact is updated with the new data (merge) |
| _(not set)_ | New contact is always created |

**3. Data Normalization**

- Phone numbers are cleaned and formatted
- Websites are normalized to `https://`
- Social media links are detected from URL patterns (Facebook, LinkedIn, Twitter, YouTube, etc.) and stored in a `socialLinks` JSON field

**4. Lifecycle Stage Mapping**

Aliases are mapped to canonical stage names before saving:
```text
"prospect" → "new"
"fresh"    → "new"
(any unknown value defaults to "new")
```

**5. Lead Score Calculation**

`calculateLeadScore()` runs for every contact before it is saved to the database. See Step 2.

**6. Activity Logging**

A `contact_imported` activity record is created for every successfully imported contact.

---

### B. Manual Creation — `POST /api/contacts`

A single contact created from the UI form. The same lead scoring and activity logging applies.

---

## Step 2 — Contact Data & Lead Scoring

**Relevant files:** `server/src/lib/leadScore.js`, `server/prisma/schema.prisma` (lines 98–156)

### Contact Fields

| Category | Fields |
|---|---|
| Identity | `firstName`, `lastName`, `email`, `phone`, `company`, `title` |
| Location | `address`, `city`, `state`, `zip` |
| Business | `trucks`, `servicesOffered`, `motorClubAffiliations`, `dispatcherSoftware`, `estAnnualRevenue`, `yearsInBusiness` |
| Pipeline | `lifecycleStage`, `leadScore`, `status`, `contractValue` |
| Engagement | `emailsSent`, `emailsOpened`, `emailsClicked`, `callsMade`, `callsAnswered` |
| Attribution | `source`, `campaign`, `ownedBy`, `addedBy`, `tags` |
| Custom | `udfValues` (JSON — user-defined fields), `socialLinks` (JSON) |

### Lead Score Formula

```
leadScore = stageBase + completenessBonus

stageBase         = 0–90 depending on lifecycle stage (see Step 3)
completenessBonus = 1–10 bonus points based on how complete the profile is

Profile field weights:
  firstName  → 20%
  email      → 20%
  phone      → 18%
  company    → 17%
  source     → 13%
  lastName   →  7%
  title      →  3%
  website    →  1%
  address    →  1%

Final score is always between 1 and 100.
```

**Example:**
A contact at the `"new"` stage (stageBase = 0) with only `firstName` and `email` filled in:
- Completeness = (20 + 20)% × 9 + 1 = ~4 points
- `leadScore` = 0 + 4 = **4**

The score is recalculated automatically whenever a contact's stage or profile data changes.

---

## Step 3 — Lifecycle Stages

**Relevant files:** `server/src/constants/index.js` (lines 6–18), `server/src/controllers/contacts.controller.js` (line 399)

### Stage Progression

```text
new → contacted → engaged → demo_scheduled → demo_done
    → proposal_sent → negotiating → customer

Terminal stages (closed):
  not_qualified  |  lost  |  churned
```

### Stage Base Scores

| Stage | Lead Score Base |
|---|---|
| new | 0 |
| contacted | 10 |
| engaged | 20 |
| demo_scheduled | 30 |
| demo_done | 40 |
| proposal_sent | 50 |
| negotiating | 60 |
| customer | 90 |
| not_qualified / lost / churned | 0 |

### Rules

- Stage changes are made **manually** by the sales rep in the UI — there is no automatic progression.
- Only users with the `"admin"` or `"manager"` role can promote a lead to `"customer"`. The server enforces this and returns a `403` error for other roles.
- Every stage change is logged as a `stage_changed` activity with a timestamp and the name of the user who made the change.

---

## Step 4 — Campaign Builder

**Relevant files:** `server/src/controllers/campaigns.controller.js`, `server/prisma/schema.prisma` (lines 319–354)

A campaign is an email outreach sent to a set of contacts.

### Creating a Campaign — `POST /api/campaigns`

```json
{
  "name": "May Outreach",
  "clientId": "uuid",
  "templateId": "uuid",
  "subject": "Boost your dispatch efficiency",
  "fromName": "Mike",
  "fromEmail": "mike@yourdomain.com"
}
```

The campaign is created with `status: "draft"`.

### Adding Recipients — `POST /api/campaigns/:id/recipients`

Two methods:

1. **Direct selection** — pass a `contactIds` array with the IDs of contacts to include.
2. **Filter-based** — pass a `filter` object (e.g., all contacts with `lifecycleStage = "new"` and `trucks >= 5`). The server resolves the filter and adds all matching contacts automatically.

Each contact added to a campaign is stored as a `CampaignRecipient` row with `status: "pending"`.

### A/B Test Campaigns

- Set `type: "ab_test"`, provide `templateId` (variant A) and `templateIdB` (variant B), and two subjects.
- When recipients are added, they are automatically split **50/50** between the two variants.

### Email Templates

- Built in the drag-and-drop block editor in the UI.
- Stored as structured **JSON blocks** in the database — not as static HTML.
- Rendered to HTML at send time, so changes to a template apply to the next send.

---

## Step 5 — Queue & Scheduling

**Relevant files:** `server/src/services/queueService.js`, `server/src/jobs/queueScheduler.js`, `server/prisma/schema.prisma` (lines 407–451)

Instead of sending all emails at once (which risks spam filters and provider rate limits), ProPhone uses a queue system to spread sends over multiple days at a controlled rate.

### Creating a Queue — `POST /api/campaigns/:id/queue`

```json
{
  "dailyLimit": 50,
  "sendTime": "09:00",
  "timezone": "America/New_York",
  "sendGapSeconds": 5
}
```

When a queue is created, the system:

1. Counts the total pending recipients.
2. Calculates days needed: `ceil(totalRecipients / dailyLimit)`.
3. Converts `sendTime` to UTC. If today's send time has already passed, the first run is scheduled for tomorrow.
4. Creates a `CampaignQueueRun` row with `status: "pending"` and the calculated `scheduledAt` timestamp.

### How the Scheduler Works

`server/src/jobs/queueScheduler.js` polls the database **every 60 seconds**. It looks for `CampaignQueueRun` rows where:
- `status = "pending"`
- `scheduledAt <= now()`
- Parent queue `status = "active"`

For each run it finds:

```text
1. Mark the run as "running"
2. Call executeCampaignBatch() — up to 3 retry attempts (5s → 20s → 60s backoff)
3. On success:
   - Mark the run as "completed"
   - If no more pending recipients → mark the queue as "completed"
   - Otherwise → create a new CampaignQueueRun for the same time tomorrow
4. On failure → mark the run as "failed" with the error message stored
```

### Queue Lifecycle Operations

| Operation | What It Does |
|---|---|
| `pauseQueue()` | Stops future runs without canceling the campaign |
| `resumeQueue()` | Reschedules the next run from the current time |
| `cancelQueue()` | Permanently stops the queue |
| `updateQueue()` | Changes `dailyLimit`, `sendTime`, or `sendGapSeconds` mid-campaign |

---

## Step 6 — Sending the Email

**Relevant files:** `server/src/services/queueService.js` (lines 60–198), `server/src/services/resendService.js`, `server/src/services/email.js`

When `executeCampaignBatch()` runs, it processes recipients **one at a time** (sequential, not parallel) with a `sendGapSeconds` pause between each send. Here is what happens for each contact:

### 1. Suppression Check

The contact is **skipped** (not counted against the daily limit) if:
- They previously bounced — `bouncedAt` is set on their `CampaignRecipient` row
- They unsubscribed — `status = "unsubscribed"`

Skipped contacts are marked as `"skipped"` in the database.

### 2. Resolve the Sender Address

The `from` email is resolved in this priority order:
1. Campaign's own `fromEmail` field
2. Client's verified domain `defaultFromEmail`
3. Environment variable `RESEND_FROM_EMAIL` (global fallback)

### 3. Build the Personalized Email

The template's JSON blocks are rendered to HTML, then contact data is substituted in:

```text
{{firstName}} → "John"
{{lastName}}  → "Smith"
{{fullName}}  → "John Smith"
{{company}}   → "ABC Towing"
{{email}}     → "john@abctowing.com"
```

### 4. Inject Tracking

- **Open tracking:** A 1×1 invisible pixel is added to the email body:
  ```html
  <img src="{APP_BASE_URL}/track/open/{campaignId}/{recipientId}" />
  ```
- **Click tracking:** Every link in the email is wrapped through a tracking redirect endpoint.
- **Unsubscribe:** A personalized unsubscribe URL is injected into the email footer. RFC 8058 `List-Unsubscribe` headers are also added.

### 5. Inline CSS

Gmail and many email clients strip `<style>` blocks. The `juice` library converts all CSS rules to inline `style=""` attributes before the email is sent.

### 6. Send via Resend

The final HTML email is submitted to the **Resend SDK**. The system retries on failure:

```text
Attempt 1  →  wait 2s  →  Attempt 2  →  wait 2s  →  Attempt 3  →  mark failed
```

If all 3 attempts fail, the `CampaignRecipient` is marked `"failed"`. Successful sends receive the `sendId` (Resend message ID) for later webhook matching.

### 7. Update All Records

On a successful send:

| Record | What Changes |
|---|---|
| `CampaignRecipient` | `status → "sent"`, `sentAt` set, `sendId` stored |
| `Campaign` | `sentCount` incremented |
| `Contact` | `emailsSent` incremented, `lastActivityAt` updated |
| `Activity` | New row: type `email_sent`, note `"Campaign email sent: 'May Outreach'"`, by `"queue"` |

---

## Step 7 — Tracking & Activity Log

**Relevant files:** `server/src/repositories/campaignRepository.js` (lines 276–361), `server/src/lib/activityLogger.js`

### Email Event Webhooks

Resend sends webhook events to `POST /webhooks/resend`. The server verifies the webhook signature and calls `applyEmailEvent()` to process it.

| Resend Event | What Happens in ProPhone |
|---|---|
| `email.delivered` | `CampaignRecipient.deliveredAt` set, campaign `deliveredCount` incremented |
| `email.opened` | `openedAt` set, campaign `openedCount` incremented, contact `emailsOpened` incremented, activity `email_opened` logged |
| `email.clicked` | `clickedAt` set, campaign `clickedCount` incremented, contact `emailsClicked` incremented, activity `email_clicked` logged |
| `email.bounced` | `bouncedAt` set, campaign `bouncedCount` incremented, contact suppressed from all future sends |
| `email.unsubscribed` | Recipient `status → "unsubscribed"`, campaign `unsubscribedCount` incremented |

### Activity Log

Every meaningful action in the system is saved as an `Activity` row. This gives each contact a complete, auditable history.

| Activity Type | When It Is Created |
|---|---|
| `contact_created` | A contact is manually added via the UI |
| `contact_imported` | A contact comes in from a CSV import |
| `lead_updated` | A tracked field changes (name, email, phone, score, status, etc.) |
| `stage_changed` | Lifecycle stage is updated by a user |
| `email_sent` | An email is successfully delivered to the contact |
| `email_opened` | The open tracking pixel fires |
| `email_clicked` | A tracked link in the email is clicked |
| `note_added` | A note is saved on the contact record |
| `call_made` | A call is logged manually by the rep |
| `demo_scheduled` | A demo appointment is booked |
| `proposal_sent` | A proposal is logged on the contact |

Each activity stores:
- `entityType` + `entityId` — what it belongs to (contact, campaign, client, etc.)
- `type` — the action that occurred
- `note` — a human-readable description
- `by` — the user who triggered it, or `"queue"` for automated sends
- `createdAt` — exact timestamp

All activities for a contact are fetched via `GET /api/contacts/:id/client-activities` and displayed in the contact detail view, sorted chronologically (oldest first).

---

## Full System Flow Diagram

```text
══════════════════════════════════════════════════════════════════
 STEP 1 — IMPORT
══════════════════════════════════════════════════════════════════
 User uploads a CSV file
   ↓
 Browser parses the file → sends JSON rows to POST /api/contacts/import
   ↓
 Server normalizes columns, detects duplicates, maps stages
   ↓
 calculateLeadScore() runs for each contact
   ↓
 Contacts saved to database
   ↓
 Activity logged → contact_imported

══════════════════════════════════════════════════════════════════
 STEP 2 — PIPELINE MANAGEMENT
══════════════════════════════════════════════════════════════════
 Sales rep views contacts filtered by pool (prospects or a client)
   ↓
 Rep updates the lifecycle stage (new → contacted → engaged → ...)
   ↓
 Server validates the user's role, saves the new stage
   ↓
 Lead score recalculated with the new stageBase
   ↓
 Activity logged → stage_changed

══════════════════════════════════════════════════════════════════
 STEP 3 — CAMPAIGN SETUP
══════════════════════════════════════════════════════════════════
 Rep creates a campaign → selects email template → writes subject line
   ↓
 Adds recipients (select contacts manually OR apply a filter)
   ↓
 Each contact stored as CampaignRecipient with status: "pending"
   ↓
 Rep creates a queue: dailyLimit=50, sendTime="09:00", gap=5s

══════════════════════════════════════════════════════════════════
 STEP 4 — SCHEDULING
══════════════════════════════════════════════════════════════════
 System calculates total days needed = ceil(recipients / dailyLimit)
   ↓
 First CampaignQueueRun created → scheduledAt = tomorrow 09:00 UTC
   ↓
 [ ... time passes ... ]
   ↓
 queueScheduler polls every 60s
   ↓
 Finds a run where scheduledAt <= now()
   ↓
 Marks run as "running" → calls executeCampaignBatch()

══════════════════════════════════════════════════════════════════
 STEP 5 — SENDING (one contact at a time)
══════════════════════════════════════════════════════════════════
 For each pending recipient (up to dailyLimit):
   ↓
   Check suppression → skip bounced or unsubscribed contacts
   ↓
   Render template JSON → substitute {{firstName}}, {{company}}, etc.
   ↓
   Inline all CSS with juice library
   ↓
   Inject open pixel + click tracking links + unsubscribe footer
   ↓
   Send via Resend SDK → retry up to 3 times (2s delay each)
   ↓
   Wait sendGapSeconds before the next contact
   ↓
   Mark recipient as "sent" → log activity → update contact counts
   ↓
 After batch → schedule next day's run (same time, tomorrow)

══════════════════════════════════════════════════════════════════
 STEP 6 — TRACKING
══════════════════════════════════════════════════════════════════
 Contact opens email → pixel fires → POST /webhooks/resend
   ↓
 applyEmailEvent() sets openedAt, increments counters
   ↓
 Activity logged → email_opened

 Contact clicks a link → redirect fires → POST /webhooks/resend
   ↓
 Activity logged → email_clicked

 Contact bounces → bouncedAt set → suppressed from all future sends
══════════════════════════════════════════════════════════════════
```

---

## Key Files Reference

| Purpose | File |
|---|---|
| Contact CRUD & CSV Import | `server/src/controllers/contacts.controller.js` |
| Lead Score Formula | `server/src/lib/leadScore.js` |
| Campaign CRUD & Send | `server/src/controllers/campaigns.controller.js` |
| Queue Service (create queue, execute batch) | `server/src/services/queueService.js` |
| Background Scheduler (60s poll) | `server/src/jobs/queueScheduler.js` |
| Email Sending via Resend | `server/src/services/resendService.js` |
| Email Utilities (CSS inlining, tracking, unsubscribe) | `server/src/services/email.js` |
| Campaign Recipient DB Queries | `server/src/repositories/campaignRepository.js` |
| Activity Logger | `server/src/lib/activityLogger.js` |
| Stage & Activity Type Constants | `server/src/constants/index.js` |
| Database Schema (all models) | `server/prisma/schema.prisma` |
| API HTTP Layer (frontend) | `client/src/services/api.js` |
| Pool / Client State (frontend) | `client/src/context/PoolContext.jsx` |
| Auth Management (frontend) | `client/src/hooks/useAuth.js` |
