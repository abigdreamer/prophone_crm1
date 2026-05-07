import React, { useState } from "react";
import { useTheme } from "../context/ThemeContext";

/* create: StatCard */
function StatCard({ label, count, percentage, color }) {
    const T = useTheme();

    return (
        <div style={{
            background: T.card,
            border: "1px solid " + T.border,
            borderRadius: 12,
            padding: "18px 16px",
            flex: 1,
            minWidth: "130px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between"
        }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: T.muted }}>
                    {label}
                </span>
                <span style={{ fontSize: 10, color: T.muted }}>{percentage}%</span>
            </div>

            <div style={{
                fontSize: 32,
                fontWeight: 700,
                color: T.text,
                marginTop: 12,
                marginBottom: 16
            }}>
                {count.toLocaleString()}
            </div>

            <div style={{ height: 2, width: "100%", background: T.border }}>
                <div style={{
                    width: `${percentage}%`,
                    height: "100%",
                    background: color
                }} />
            </div>
        </div>
    );
}

/* update: DashboardStatusCount */
export default function DashboardStatusCount({ data = {} }) {
    const T = useTheme();
    const [range, setRange] = useState("30 days");

    const totalCount = Object.values(data).reduce((a, b) => a + (b || 0), 0);

    const STATUS_MAP = [
        { id: "prospects", label: "PROSPECTS", color: T.amber },
        { id: "leads", label: "LEADS", color: T.blue },
        { id: "warm", label: "WARM", color: T.orange },
        { id: "hot", label: "HOT", color: T.purple },
        { id: "customer", label: "CUSTOMER", color: T.green },
        { id: "backburner", label: "BACKBURNER", color: T.teal },
        { id: "lost", label: "LOST", color: T.red },
    ];

    const ranges = ["7 days", "15 days", "30 days"];

    return (
        <div style={{
            background: T.surface,
            padding: 20,
            borderRadius: 16,
            border: "1px solid " + T.border
        }}>
            <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 24
            }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: T.text, margin: 0 }}>
                    Status Counts
                    <span style={{ marginLeft: 10, fontSize: 12, color: T.muted }}>
                        {totalCount.toLocaleString()} TOTAL · {range.toUpperCase()}
                    </span>
                </h2>

                <div style={{
                    display: "flex",
                    background: T.card,
                    padding: 4,
                    borderRadius: 10,
                    border: "1px solid " + T.border
                }}>
                    {ranges.map((r) => (
                        <button
                            key={r}
                            onClick={() => setRange(r)}
                            style={{
                                padding: "6px 14px",
                                fontSize: 11,
                                borderRadius: 8,
                                border: "none",
                                cursor: "pointer",
                                background: range === r ? T.borderHi : "transparent",
                                color: range === r ? T.text : T.muted
                            }}
                        >
                            {r}
                        </button>
                    ))}
                </div>
            </div>

            <div style={{
                display: "flex",
                gap: 10,
                overflowX: "auto"
            }}>
                {STATUS_MAP.map((s) => {
                    const count = data[s.id] || 0;
                    const percentage = totalCount ? Math.round((count / totalCount) * 100) : 0;

                    return (
                        <StatCard
                            key={s.id}
                            label={s.label}
                            count={count}
                            percentage={percentage}
                            color={s.color}
                        />
                    );
                })}
            </div>
        </div>
    );
}