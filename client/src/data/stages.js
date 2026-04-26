import T from "../theme";

// ─── Lifecycle Stage Definitions ─────────────────────────────────────────────
export const STAGE_DEF = {
  new:           { label: "New",           group: "lead",     color: T.muted,   order: 1 },
  contacted:     { label: "Contacted",     group: "lead",     color: "#60a5fa", order: 2 },
  engaged:       { label: "Engaged",       group: "lead",     color: T.blue,    order: 3 },
  proposal_sent: { label: "Proposal Sent", group: "lead",     color: T.amber,   order: 4 },
  negotiating:   { label: "Negotiating",   group: "lead",     color: "#fbbf24", order: 5 },
  customer:      { label: "Customer",      group: "customer", color: T.green,   order: 6 },
  not_qualified: { label: "Not Qualified", group: "lost",     color: T.muted,   order: 7 },
  lost:          { label: "Lost",          group: "lost",     color: T.red,     order: 8 },
};

export const CONTACT_STAGES  = ["new","contacted"];
export const LEAD_STAGES     = ["engaged","proposal_sent","negotiating"];
export const CUSTOMER_STAGES = ["customer"];
export const LOST_STAGES     = ["not_qualified","lost"];
export const ALL_STAGES      = Object.keys(STAGE_DEF);
