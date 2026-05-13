import T from "../themes/theme";

export const ACT_DEF = {
  email_sent:       { label: "Email Sent",       icon: "✉", color: T.blue,    cat: "email"    },
  email_opened:     { label: "Email Opened",     icon: "◉", color: T.blue,    cat: "email"    },
  email_clicked:    { label: "Email Clicked",    icon: "↗", color: T.blue,    cat: "email"    },
  email_replied:    { label: "Email Replied",    icon: "↩", color: T.teal,    cat: "email"    },

  call_made:        { label: "Call Made",        icon: "☎", color: T.green,   cat: "call"     },
  call_answered:    { label: "Call Answered",    icon: "☑", color: T.green,   cat: "call"     },

  sms_sent:         { label: "SMS Sent",         icon: "✉", color: T.teal,    cat: "sms"      },

  ad_shown:         { label: "Ad Shown",         icon: "▦", color: T.purple,  cat: "ad"       },
  ad_clicked:       { label: "Ad Clicked",       icon: "▣", color: T.purple,  cat: "ad"       },

  demo_scheduled:   { label: "Demo Scheduled",   icon: "◷", color: T.amber,   cat: "meeting"  },
  demo_held:        { label: "Demo Held",        icon: "⬡", color: T.amber,   cat: "meeting"  },
  demo_no_show:     { label: "Demo No-show",     icon: "⊗", color: T.red,     cat: "meeting"  },

  proposal_sent:    { label: "Proposal Sent",    icon: "◈", color: T.amber,   cat: "proposal" },
  contract_signed:  { label: "Contract Signed",  icon: "✍", color: T.green,   cat: "proposal" },

  note_added:       { label: "Note Added",       icon: "◆", color: T.dim,     cat: "note"     },
  lead_updated:  { label: "Lead Updated",  icon: "✎", color: T.orange,  cat: "system"   },
  stage_changed:    { label: "Stage Changed",    icon: "⇢", color: "#6366f1", cat: "system"   },

  form_submitted:   { label: "Form Submitted",   icon: "✓", color: T.green,   cat: "inbound"  },
  page_visited:     { label: "Page Visited",     icon: "○", color: T.muted,   cat: "inbound"  },

  fb_ad_launched:   { label: "FB Ad Launched",   icon: "f", color: "#1877f2", cat: "ad"       },
  fb_ad_clicked:    { label: "FB Ad Clicked",    icon: "f", color: "#1877f2", cat: "ad"       },
};

export const ACT_CATS = [
  "all",
  "email",
  "call",
  "sms",
  "ad",
  "meeting",
  "proposal",
  "note",
  "system",
  "inbound",
];