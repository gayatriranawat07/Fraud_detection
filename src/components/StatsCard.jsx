import React from "react"

export default function StatsCard({ label, value, color = "#6366f1", icon }) {
  return (
    <div style={{
      background: "#111827",
      border: `1px solid ${color}22`,
      borderRadius: "14px",
      padding: "1.4rem 1.5rem",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Top accent bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: "3px",
        background: `linear-gradient(90deg, ${color}, ${color}66)`,
      }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{
            color: "#64748b", fontSize: "0.72rem", fontWeight: 700,
            letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.6rem"
          }}>
            {label}
          </div>
          <div style={{ color, fontSize: "2rem", fontWeight: 800, lineHeight: 1 }}>
            {value}
          </div>
        </div>
        {icon && (
          <div style={{
            fontSize: "1.4rem",
            background: `${color}18`,
            borderRadius: "10px",
            width: "42px", height: "42px",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}