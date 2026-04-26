import React from "react"

const RISK = {
  High:   { text: "#f87171", bg: "rgba(239,68,68,0.12)",  border: "rgba(239,68,68,0.3)"  },
  Medium: { text: "#fbbf24", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)" },
  Low:    { text: "#4ade80", bg: "rgba(34,197,94,0.12)",  border: "rgba(34,197,94,0.3)"  },
}

function getRisk(prob) {
  if (prob >= 0.7) return "High"
  if (prob >= 0.3) return "Medium"
  return "Low"
}

function exportCSV(rows) {
  const headers = ["ID", "Amount", "Fraud %", "Risk", "Fraud?", "Date"]
  const data = rows.map(t => [
    t.id,
    Number(t.amount).toFixed(2),
    (t.fraud_probability * 100).toFixed(1),
    getRisk(t.fraud_probability),
    t.is_fraud ? "Yes" : "No",
    new Date(t.created_at).toLocaleString(),
  ])
  const csv  = [headers, ...data].map(r => r.join(",")).join("\n")
  const blob = new Blob([csv], { type: "text/csv" })
  const url  = URL.createObjectURL(blob)
  const a    = Object.assign(document.createElement("a"), { href: url, download: "transactions.csv" })
  a.click()
  URL.revokeObjectURL(url)
}

export default function TransactionTable({ transactions = [] }) {
  if (!transactions.length) {
    return (
      <div style={{ color: "#475569", textAlign: "center", padding: "2.5rem 0", fontSize: "0.9rem" }}>
        No transactions yet — run your first prediction!
      </div>
    )
  }

  return (
    <div>
      {/* Export button */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0.75rem" }}>
        <button onClick={() => exportCSV(transactions)} style={{
          padding: "0.4rem 1rem", borderRadius: "8px", fontSize: "0.8rem",
          background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)",
          color: "#818cf8", cursor: "pointer", fontWeight: 500,
        }}>
          ↓ Export CSV
        </button>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
          <thead>
            <tr>
              {["#", "Amount", "Risk %", "Level", "Fraud?", "Date"].map(h => (
                <th key={h} style={{
                  textAlign: "left", padding: "0.5rem 0.75rem",
                  color: "#475569", fontWeight: 700, fontSize: "0.7rem",
                  letterSpacing: "0.06em", textTransform: "uppercase",
                  borderBottom: "1px solid #1e293b",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {transactions.map((t, i) => {
              const level = getRisk(t.fraud_probability)
              const rc    = RISK[level]
              const pct   = (t.fraud_probability * 100).toFixed(1)
              return (
                <tr key={t.id} style={{
                  background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                  borderBottom: "1px solid #0f172a",
                }}>
                  <td style={{ padding: "0.6rem 0.75rem", color: "#475569" }}>{t.id}</td>
                  <td style={{ padding: "0.6rem 0.75rem", color: "#e2e8f0", fontWeight: 500 }}>
                    ${Number(t.amount).toFixed(2)}
                  </td>
                  <td style={{ padding: "0.6rem 0.75rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <div style={{
                        height: "6px", width: "60px", borderRadius: "99px",
                        background: "#1e293b", overflow: "hidden",
                      }}>
                        <div style={{
                          height: "100%", width: `${pct}%`,
                          background: rc.text, borderRadius: "99px",
                        }} />
                      </div>
                      <span style={{ color: rc.text, fontWeight: 600 }}>{pct}%</span>
                    </div>
                  </td>
                  <td style={{ padding: "0.6rem 0.75rem" }}>
                    <span style={{
                      background: rc.bg, color: rc.text, border: `1px solid ${rc.border}`,
                      padding: "0.2rem 0.6rem", borderRadius: "99px",
                      fontSize: "0.72rem", fontWeight: 700,
                    }}>
                      {level}
                    </span>
                  </td>
                  <td style={{ padding: "0.6rem 0.75rem" }}>
                    <span style={{ color: t.is_fraud ? "#f87171" : "#4ade80", fontWeight: 600 }}>
                      {t.is_fraud ? "🚨 Yes" : "✅ No"}
                    </span>
                  </td>
                  <td style={{ padding: "0.6rem 0.75rem", color: "#475569", fontSize: "0.78rem" }}>
                    {new Date(t.created_at).toLocaleString()}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}