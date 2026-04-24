import { useState } from "react";
import { Megaphone, Layers, Clock } from "lucide-react";
import T from "../theme";

const SECTIONS = [
  {
    id:    "campaigns",
    label: "Campaigns",
    icon:  Megaphone,
    desc:  "Create and manage multi-channel outreach campaigns targeting your leads and prospects.",
  },
  {
    id:    "sequences",
    label: "Sequences",
    icon:  Layers,
    desc:  "Automate follow-up sequences with timed emails, calls, and tasks assigned to reps.",
  },
];

export default function PageMarketing() {
  const [active, setActive] = useState("campaigns");
  const section = SECTIONS.find(s => s.id === active);

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>

      {/* Sub-sidebar */}
      <div
        style={{
          width: 220, flexShrink: 0,
          background: T.surface, borderRight: "1px solid " + T.border,
          display: "flex", flexDirection: "column",
          paddingTop: 16,
        }}
      >
        <div
          style={{
            padding: "0 14px 10px",
            fontSize: 10, fontWeight: 700, color: T.muted,
            textTransform: "uppercase", letterSpacing: "0.07em",
          }}
        >
          Marketing
        </div>

        {SECTIONS.map(s => {
          const Icon = s.icon;
          const sel  = active === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              style={{
                display: "flex", alignItems: "center", gap: 9,
                width: "100%", padding: "10px 14px",
                background: sel ? T.accentLow : "transparent",
                borderLeft: sel ? "3px solid " + T.accent : "3px solid transparent",
                border: "none",
                cursor: "pointer", fontFamily: "inherit",
                color: sel ? T.accent : T.sub,
                fontSize: 13, fontWeight: sel ? 600 : 400,
                textAlign: "left", transition: "all 0.1s",
              }}
              onMouseEnter={e => { if (!sel) { e.currentTarget.style.background = T.panel; e.currentTarget.style.color = T.text; } }}
              onMouseLeave={e => { if (!sel) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.sub; } }}
            >
              <Icon size={15} />
              {s.label}
              <span
                style={{
                  marginLeft: "auto", fontSize: 9, fontWeight: 700,
                  background: T.amber + "18", color: T.amber,
                  border: "1px solid " + T.amber + "40",
                  borderRadius: 4, padding: "2px 6px",
                  letterSpacing: "0.04em",
                }}
              >
                SOON
              </span>
            </button>
          );
        })}
      </div>

      {/* Main content */}
      <div
        style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          background: T.bg, overflow: "auto",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 420, padding: "0 24px" }}>
          <div
            style={{
              width: 72, height: 72, borderRadius: 20,
              background: T.accentLow,
              border: "1px solid " + T.accent + "30",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px",
            }}
          >
            <Clock size={32} color={T.accent} strokeWidth={1.5} />
          </div>

          <div style={{ fontSize: 22, fontWeight: 700, color: T.text, marginBottom: 10 }}>
            {section?.label} — Coming Soon
          </div>
          <div style={{ fontSize: 14, color: T.muted, lineHeight: 1.7, marginBottom: 28 }}>
            {section?.desc}
          </div>

          <div
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: T.amber + "12",
              border: "1px solid " + T.amber + "35",
              borderRadius: 8, padding: "10px 18px",
              fontSize: 13, color: T.amber, fontWeight: 600,
            }}
          >
            <Clock size={14} />
            This feature is under development
          </div>
        </div>
      </div>
    </div>
  );
}
