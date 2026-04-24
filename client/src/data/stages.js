import T from "../theme";

// ─── Lifecycle Stage Definitions ─────────────────────────────────────────────
export const STAGE_DEF = {
  new:           { label: "New",           group: "lead",     color: T.muted,    order: 1  },
  contacted:     { label: "Contacted",     group: "lead",     color: "#60a5fa",  order: 2  },
  engaged:       { label: "Engaged",       group: "lead",     color: T.blue,     order: 3  },
  demo_scheduled:{ label: "Demo Sched.",   group: "lead",     color: T.purple,   order: 4  },
  demo_done:     { label: "Demo Done",     group: "lead",     color: "#a78bfa",  order: 5  },
  proposal_sent: { label: "Proposal Sent", group: "lead",     color: T.amber,    order: 6  },
  negotiating:   { label: "Negotiating",   group: "lead",     color: "#fbbf24",  order: 7  },
  customer:      { label: "Customer",      group: "customer", color: T.green,    order: 8  },
  not_qualified: { label: "Not Qualified", group: "lost",     color: T.muted,    order: 9  },
  lost:          { label: "Lost",          group: "lost",     color: T.red,      order: 10 },
  churned:       { label: "Churned",       group: "lost",     color: "#dc2626",  order: 11 },
};

export const LEAD_STAGES     = ["new","contacted","engaged","demo_scheduled","demo_done","proposal_sent","negotiating"];
export const CUSTOMER_STAGES = ["customer"];
export const LOST_STAGES     = ["not_qualified","lost","churned"];
export const ALL_STAGES      = Object.keys(STAGE_DEF);
