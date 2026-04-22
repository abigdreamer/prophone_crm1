import USERS_DB from "./users";
import { STAGE_DEF } from "./stages";
import { ACT_DEF } from "./activities";

// ─── Seeded RNG ───────────────────────────────────────────────────────────────
function mkRng(seed) {
  let x = seed;
  return () => { x = (x * 16807) % 2147483647; return (x - 1) / 2147483646; };
}

// ─── Activity generator ───────────────────────────────────────────────────────
function genActivities(cid, stage, seed, addedBy) {
  const r = mkRng(seed);
  const now = Date.now();
  const ago = n => new Date(now - n * 86400000).toISOString();
  const acts = [];
  const add = (n, type, note, daysAgo, by) =>
    acts.push({ id: cid + "-a" + n, type, note, ts: ago(daysAgo), by: by || addedBy });

  add(0,  "form_submitted", "Submitted demo request via widget", 30 + Math.floor(r() * 60), addedBy);
  add(1,  "email_sent",     "Sequence: Welcome email",           29, addedBy);
  add(2,  "ad_shown",       "Google Display Ad retargeting",     27, addedBy);

  if (["contacted","engaged","demo_scheduled","demo_done","proposal_sent","negotiating","customer"].includes(stage)) {
    add(3, "email_opened",  "Opened welcome email — 45s read time",       26, addedBy);
    add(4, "call_made",     "Cold call attempt",                           24, USERS_DB[Math.floor(r() * USERS_DB.length)].name);
    add(5, "call_answered", "Spoke 8 min. Interested in demo.",            24, addedBy);
    add(6, "stage_changed", "New → Contacted",                             24, addedBy);
    add(7, "note_added",    "Pain: billing delays. Budget ~$150/mo. Decision maker.", 24, addedBy);
  }
  if (["engaged","demo_scheduled","demo_done","proposal_sent","negotiating","customer"].includes(stage)) {
    add(8,  "email_sent",    "Follow-up: ROI calculator + pricing",        22, addedBy);
    add(9,  "email_opened",  "Opened follow-up, spent 2min on /pricing",   21, addedBy);
    add(10, "fb_ad_clicked", "Clicked Facebook retargeting ad",            20, USERS_DB[1].name);
    add(11, "stage_changed", "Contacted → Engaged",                        20, addedBy);
  }
  if (["demo_scheduled","demo_done","proposal_sent","negotiating","customer"].includes(stage)) {
    add(12, "demo_scheduled","Demo booked via Calendly",                   18, addedBy);
    add(13, "sms_sent",      "SMS reminder sent",                          15, addedBy);
    add(14, "stage_changed", "Engaged → Demo Scheduled",                   18, addedBy);
  }
  if (["demo_done","proposal_sent","negotiating","customer"].includes(stage)) {
    add(15, "demo_held",     "Zoom demo — 47min. Very interested.",         14, addedBy);
    add(16, "stage_changed", "Demo Scheduled → Demo Done",                 14, addedBy);
  }
  if (["proposal_sent","negotiating","customer"].includes(stage)) {
    add(17, "proposal_sent", "Proposal: Enterprise plan sent",             11, addedBy);
    add(18, "stage_changed", "Demo Done → Proposal Sent",                  11, addedBy);
  }
  if (["negotiating","customer"].includes(stage)) {
    add(19, "email_replied", "Reply: Looks good, can we negotiate?",        9, addedBy);
    add(20, "call_answered", "Agreed terms. Moving to contract.",            8, addedBy);
  }
  if (stage === "customer") {
    add(21, "contract_signed","DocuSign complete — Enterprise plan.",        5, addedBy);
    add(22, "stage_changed",  "Negotiating → Customer ✓",                   5, addedBy);
  }

  return acts.sort((a, b) => new Date(a.ts) - new Date(b.ts));
}

// ─── Name / company pools ─────────────────────────────────────────────────────
const CO_P = ["TowPro LLC","FastHook Inc","RoadKing Towing","Canyon Tow","Desert Recovery","Bay Tow","Summit Roadside","Pacific Tow","Iron Hook","Velocity Tow","ClearPath Recovery","Apex Tow","Eagle Tow","Delta Roadside","Swift Hook","Metro Tow","NorCal Recovery","Valley Towing","Sunset Tow","Golden State Tow","Sierra Recovery","Urban Tow","Harbor Towing","Peak Recovery","Ridge Tow"];

const CO_C = {
  foxtow:          ["TowPro LLC","FastHook Inc","RoadKing Towing","Canyon Tow","Bay Tow","Pacific Tow"],
  sanpabloauto:    ["Bay Area Auto","East Side Motors","Precision Auto","Grease & Go","Reliable Repairs"],
  caliens:         ["Metro Fleet","Pacific Logistics","Bay Fleet Services","Allied Fleet"],
  certifiedtow:    ["Mountain Recovery","Valley Tow","NorCal Hook","Sierra Towing"],
  roadsidewingman: ["Manila Dispatch","Cebu Virtual Ops","PH Call Center","Island VA Hub"],
};

const SRCS_P = ["Google Ads","Facebook Ad","LinkedIn","Cold Email","Referral","Organic","Trade Show","TRAA Directory","YouTube Ad","Webinar","Direct Mail"];
const SRCS_C = {
  foxtow:          ["foxtow.com widget","Demo request","Referral","Free trial"],
  sanpabloauto:    ["sanpabloauto.com","Yelp","Google Maps","Referral"],
  caliens:         ["caliens.com","LinkedIn","Trade show"],
  certifiedtow:    ["certifiedtow.com","Google Ads","Nextdoor"],
  roadsidewingman: ["roadsidewingman.com","Facebook Group","Referral"],
};

const FNS    = ["Mike","Sarah","James","Linda","Tom","Amy","Chris","Dana","Greg","Petra","Luis","Fiona","Ray","Keiko","Omar","Brenda","Jose","Kim","Dave","Nicole","Scott","Tina","Will","Ray"];
const LNS    = ["Johnson","Smith","Lee","Brown","Davis","Wilson","Moore","Taylor","Anderson","Martinez","White","Harris","Clark","Lewis","Walker","Hall","Young","Allen","King","Wright"];
const TITLES = ["Owner","Operations Manager","Dispatcher","Fleet Manager","Office Manager","Driver/Owner","Partner","Manager","Director"];
const CITIES = ["Oakland, CA","Fresno, CA","Sacramento, CA","San Jose, CA","Stockton, CA","Modesto, CA","Bakersfield, CA","Riverside, CA","Long Beach, CA","Anaheim, CA","San Diego, CA","Los Angeles, CA","San Francisco, CA","Santa Barbara, CA","Ventura, CA"];
const SW     = ["new","new","new","contacted","contacted","engaged","engaged","demo_scheduled","demo_done","proposal_sent","negotiating","customer","customer","not_qualified","lost"];

// ─── Contact factory ──────────────────────────────────────────────────────────
function makeContact(id, pool, clientId, cos, srcs, seed, i, userList) {
  const r = mkRng(seed + i * 13);
  const stage   = SW[Math.floor(r() * SW.length)];
  const fn      = FNS[i % FNS.length];
  const ln      = LNS[Math.floor(r() * LNS.length)];
  const co      = cos[i % cos.length];
  const dom     = co.toLowerCase().replace(/[\s.,&'/]+/g, "");
  const score   = Math.min(100, Math.floor(r() * 60) + (stage === "customer" ? 35 : stage === "proposal_sent" ? 25 : stage === "negotiating" ? 30 : stage === "engaged" ? 15 : stage === "contacted" ? 10 : 0));
  const sent    = Math.floor(r() * 15);
  const addedBy = userList[Math.floor(r() * userList.length)].name;
  const trucks  = Math.floor(r() * 20) + 1;

  return {
    id, pool, clientId,
    firstName:     fn,
    lastName:      ln,
    company:       co,
    title:         TITLES[Math.floor(r() * TITLES.length)],
    email:         `${fn.toLowerCase()}.${ln.toLowerCase()}@${dom}.com`,
    phone:         `(${Math.floor(r() * 800 + 100)}) ${Math.floor(r() * 900 + 100)}-${Math.floor(r() * 9000 + 1000)}`,
    website:       `https://www.${dom}.com`,
    city:          CITIES[Math.floor(r() * CITIES.length)],
    trucks,
    lifecycleStage: stage,
    leadScore:     score,
    status:        r() > 0.08 ? "active" : "unsubscribed",
    source:        srcs[Math.floor(r() * srcs.length)],
    campaign:      ["Q1 Outreach","Demo Nurture","Trial Drip","Re-engage","Product Launch"][Math.floor(r() * 5)],
    emailsSent:    sent,
    emailsOpened:  Math.floor(r() * sent),
    emailsClicked: Math.floor(r() * Math.max(sent - 2, 1)),
    callsMade:     Math.floor(r() * 5),
    callsAnswered: Math.floor(r() * 3),
    lastActivityAt: new Date(Date.now() - Math.floor(r() * 14) * 86400000).toISOString(),
    contractValue: Math.floor(r() * 10000 + 300),
    accountSize:   ["1-5","6-15","16-50","51-200"][Math.floor(r() * 4)],
    tags:          [["hot-lead","interested","trial","cold","follow-up","no-response"][Math.floor(r() * 6)]],
    notes:         "",
    ownedBy:       addedBy,
    addedBy,
    createdAt:     new Date(Date.now() - (Math.floor(r() * 200) + 10) * 86400000).toISOString(),
    activities:    genActivities(id, stage, seed + i * 7, addedBy),
  };
}

// ─── Seed & generate data ─────────────────────────────────────────────────────
const SEED_P  = 777;
const SEED_C  = { foxtow: 42, sanpabloauto: 99, caliens: 137, certifiedtow: 201, roadsidewingman: 317 };
const CNT_C   = { foxtow: 22, sanpabloauto: 14, caliens: 16,  certifiedtow: 10,  roadsidewingman: 12  };

export let PROSPECTS = Array.from({ length: 280 }, (_, i) =>
  makeContact("p" + i, "prospect", null, CO_P, SRCS_P, SEED_P, i, USERS_DB)
);

export const CLIENT_DATA = {};
const CLIENT_IDS = ["foxtow","sanpabloauto","caliens","certifiedtow","roadsidewingman"];
CLIENT_IDS.forEach(id => {
  CLIENT_DATA[id] = Array.from({ length: CNT_C[id] }, (_, i) =>
    makeContact(id + "-c" + i, "client", id, CO_C[id] || CO_P, SRCS_C[id] || SRCS_P, SEED_C[id], i, USERS_DB)
  );
});

// ─── Pool accessor ────────────────────────────────────────────────────────────
export function getPool(pool, clientId) {
  return pool === "prospect" ? PROSPECTS : (CLIENT_DATA[clientId] || []);
}
