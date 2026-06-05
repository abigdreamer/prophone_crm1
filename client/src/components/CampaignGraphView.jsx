import { useTheme } from "../context/ThemeContext";

function pct(num, den) {
  if (!den || den === 0) return 0;
  return Math.round((num / den) * 100);
}

// ── Pipeline Node ─────────────────────────────────────────────────────────────

function PipelineNode({ label, value, color, rate, isFirst, icon, T }) {
  const rateColor = isFirst ? T.accent
    : rate >= 50 ? T.green
    : rate >= 20 ? T.amber
    : T.red;

  return (
    <div style={{
      flex: "1 1 0",
      minWidth: 96,
      background: T.card,
      border: "1px solid " + color + "28",
      borderRadius: 12,
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      position: "relative",
    }}>
      {/* Top accent stripe */}
      <div style={{ height: 3, background: color }} />

      <div style={{ padding: "14px 10px 12px", display: "flex", flexDirection: "column", alignItems: "center", gap: 7 }}>
        {/* Icon circle */}
        <div style={{
          width: 34, height: 34, borderRadius: "50%",
          background: color + "15",
          border: "1.5px solid " + color + "35",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 15,
        }}>
          {icon}
        </div>

        {/* Count */}
        <div style={{ fontSize: 20, fontWeight: 800, color: T.text, lineHeight: 1, letterSpacing: "-0.5px" }}>
          {value.toLocaleString()}
        </div>

        {/* Label */}
        <div style={{ fontSize: 9, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center" }}>
          {label}
        </div>

        {/* Rate badge */}
        <div style={{
          fontSize: 10, fontWeight: 700,
          padding: "2px 8px", borderRadius: 20,
          background: rateColor + "15",
          color: rateColor,
          border: "1px solid " + rateColor + "28",
        }}>
          {isFirst ? "100%" : rate + "%"}
        </div>
      </div>
    </div>
  );
}

// ── Flow Arrow ────────────────────────────────────────────────────────────────

function FlowArrow({ T }) {
  return (
    <div style={{ flex: "0 0 18px", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "relative", width: 14, height: 2, background: T.border }}>
        <div style={{
          position: "absolute", right: -4, top: "50%",
          transform: "translateY(-50%)",
          width: 0, height: 0,
          borderTop: "4px solid transparent",
          borderBottom: "4px solid transparent",
          borderLeft: "5px solid " + T.border,
        }} />
      </div>
    </div>
  );
}

// ── Pipeline Funnel ───────────────────────────────────────────────────────────

function PipelineFunnel({ campaign, analytics, T }) {
  const totals = analytics?.totals ?? {};

  const steps = [
    { label: "Recipients", icon: "👥", value: campaign.recipientsCount ?? 0,                              color: T.accent },
    { label: "Sent",       icon: "✉️",  value: totals.sent      ?? campaign.sentCount      ?? 0,          color: T.blue },
    { label: "Delivered",  icon: "✓",   value: totals.delivered ?? campaign.deliveredCount ?? 0,          color: T.teal || "#14b8a6" },
    { label: "Opened",     icon: "👁",  value: totals.opened    ?? campaign.openedCount    ?? 0,          color: T.green },
    { label: "Clicked",    icon: "🖱",  value: totals.clicked   ?? campaign.clickedCount   ?? 0,          color: "#a78bfa" },
  ];

  const elements = [];
  steps.forEach((step, i) => {
    elements.push(
      <PipelineNode
        key={step.label}
        label={step.label}
        icon={step.icon}
        value={step.value}
        color={step.color}
        rate={i === 0 ? 100 : pct(step.value, steps[i - 1].value)}
        isFirst={i === 0}
        T={T}
      />
    );
    if (i < steps.length - 1) {
      elements.push(<FlowArrow key={"arrow-" + i} T={T} />);
    }
  });

  const bounceRate  = pct(totals.bounced        ?? campaign.bouncedCount        ?? 0, steps[0].value);
  const unsubRate   = pct(totals.unsubscribed   ?? campaign.unsubscribedCount   ?? 0, steps[0].value);
  const openRate    = pct(steps[3].value, steps[1].value);
  const clickRate   = pct(steps[4].value, steps[1].value);

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 12 }}>Campaign Pipeline</div>

      {/* Node row */}
      <div style={{ display: "flex", alignItems: "stretch", gap: 0, overflowX: "auto", paddingBottom: 2 }}>
        {elements}
      </div>

      {/* Stat pills */}
      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        {[
          { label: "Bounce",   value: bounceRate + "%", color: T.red },
          { label: "Unsub",    value: unsubRate  + "%", color: T.orange || "#f97316" },
          { label: "Open rate",  value: openRate  + "%", color: T.green },
          { label: "Click rate", value: clickRate + "%", color: "#a78bfa" },
        ].map(s => (
          <div key={s.label} style={{
            fontSize: 10, color: T.muted, fontWeight: 600,
            padding: "4px 10px", borderRadius: 6,
            background: T.surface, border: "1px solid " + T.border,
            display: "flex", alignItems: "center", gap: 5,
          }}>
            {s.label}:
            <strong style={{ color: s.color, fontSize: 11 }}>{s.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Day Progress Chart ────────────────────────────────────────────────────────

function DayProgressChart({ queueRuns, selectedDayRunId, T }) {
  const completedRuns = queueRuns.filter(r => r.status === "completed" || r.sentCount > 0);
  if (!completedRuns.length) return null;

  const maxSent = Math.max(...completedRuns.map(r => r.sentCount || 0), 1);

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 12 }}>Daily Send Progress</div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 110 }}>
        {completedRuns.map(run => {
          const h = Math.max(12, Math.round((run.sentCount / maxSent) * 90));
          const isSelected = selectedDayRunId === run.id;
          const color = isSelected ? T.accent : (run.status === "completed" ? T.blue : T.amber);
          return (
            <div key={run.id} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, minWidth: 28 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: isSelected ? T.accent : T.text }}>{run.sentCount?.toLocaleString()}</span>
              <div style={{
                width: "100%", height: h, borderRadius: "4px 4px 0 0",
                background: color + (isSelected ? "40" : "22"),
                border: "1.5px solid " + color + (isSelected ? "90" : "45"),
                transition: "height 0.3s ease",
              }} />
              <span style={{ fontSize: 9, color: isSelected ? T.accent : T.muted, fontWeight: isSelected ? 700 : 400 }}>D{run.dayNumber}</span>
            </div>
          );
        })}
      </div>
      <div style={{ height: 1, background: T.border }} />
    </div>
  );
}

// ── Queue Timeline ────────────────────────────────────────────────────────────

function QueueTimeline({ queue, queueRuns, selectedDayRunId, T }) {
  if (!queue || !queueRuns.length) return null;

  const statusColors = {
    completed: T.green,
    running:   T.amber,
    failed:    T.red,
    pending:   T.muted,
  };

  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 12 }}>Queue Schedule</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 300, overflowY: "auto" }}>
        {queueRuns.map(run => {
          const color = statusColors[run.status] || T.muted;
          const isSelected = selectedDayRunId === run.id;
          const date = new Date(run.scheduledAt);
          const label = date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
          return (
            <div key={run.id} style={{
              display: "flex", alignItems: "flex-start", gap: 10,
              padding: "8px 10px", borderRadius: 8,
              background: isSelected ? color + "12" : (run.status === "completed" ? T.green + "06" : T.surface),
              border: "1px solid " + (isSelected ? color + "55" : color + "22"),
              transition: "all 0.15s",
            }}>
              {/* Day bubble */}
              <div style={{
                width: 24, height: 24, borderRadius: "50%", flexShrink: 0, marginTop: 1,
                background: color + "20", border: "1.5px solid " + color + "45",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 9, fontWeight: 800, color,
              }}>
                {run.dayNumber}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: T.text }}>Day {run.dayNumber}</span>
                  <span style={{
                    fontSize: 8, fontWeight: 700, padding: "1px 5px", borderRadius: 3,
                    textTransform: "uppercase", letterSpacing: "0.04em",
                    color, background: color + "18", border: "1px solid " + color + "28",
                  }}>{run.status}</span>
                  {run.status === "failed" && (
                    <span style={{ fontSize: 9, color: T.red, fontWeight: 600 }}>↺ will retry</span>
                  )}
                </div>
                <div style={{ fontSize: 10, color: T.muted, lineHeight: 1.4 }}>
                  {run.status === "completed"
                    ? `Sent ${run.sentCount?.toLocaleString()} · ${new Date(run.completedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`
                    : run.status === "running"
                    ? "Sending now…"
                    : `Scheduled: ${label} · ${queue.sendTime} UTC`
                  }
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function CampaignGraphView({ campaign, analytics, queue, queueRuns = [], selectedDayRunId }) {
  const T = useTheme();

  const selectedRun = selectedDayRunId ? queueRuns.find(r => r.id === selectedDayRunId) : null;
  const hasProgress = queueRuns.filter(r => r.status === "completed" || r.sentCount > 0).length > 0;

  return (
    <div>
      {/* Selected day context banner */}
      {selectedRun && (
        <div style={{
          padding: "8px 14px", borderRadius: 8, marginBottom: 16,
          background: T.blue + "0e", border: "1px solid " + T.blue + "25",
          display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: T.blue }}>Day {selectedRun.dayNumber} selected</span>
          {selectedRun.status === "completed" && (
            <span style={{ fontSize: 11, color: T.muted }}>
              Sent <strong style={{ color: T.text }}>{selectedRun.sentCount?.toLocaleString()}</strong> contacts
              on {new Date(selectedRun.completedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </span>
          )}
          {selectedRun.status !== "completed" && (
            <span style={{ fontSize: 11, color: T.muted, textTransform: "capitalize" }}>{selectedRun.status}</span>
          )}
          <span style={{ marginLeft: "auto", fontSize: 10, color: T.muted + "aa" }}>
            Pipeline metrics are campaign-wide
          </span>
        </div>
      )}

      {/* Pipeline funnel nodes */}
      <PipelineFunnel campaign={campaign} analytics={analytics} T={T} />

      {/* Bottom section */}
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginTop: 4 }}>
        {hasProgress && (
          <div style={{
            flex: "1 1 240px", minWidth: 200,
            background: T.card, border: "1px solid " + T.border,
            borderRadius: 10, padding: "14px 16px",
          }}>
            <DayProgressChart queueRuns={queueRuns} selectedDayRunId={selectedDayRunId} T={T} />
          </div>
        )}

        {queue && queueRuns.length > 0 && (
          <div style={{
            flex: "1 1 220px", minWidth: 180,
            background: T.card, border: "1px solid " + T.border,
            borderRadius: 10, padding: "14px 16px",
          }}>
            <QueueTimeline queue={queue} queueRuns={queueRuns} selectedDayRunId={selectedDayRunId} T={T} />
          </div>
        )}

        {!queue && (
          <div style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
            minHeight: 80, background: T.surface, borderRadius: 10,
            border: "1px dashed " + T.border,
          }}>
            <div style={{ textAlign: "center", color: T.muted, fontSize: 11 }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>📅</div>
              Set up a queue to see the day-by-day schedule.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
