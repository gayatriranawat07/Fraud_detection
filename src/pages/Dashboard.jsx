import React, { useEffect, useState, useCallback } from "react"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts"
import StatsCard from "../components/StatsCard"
import TransactionTable from "../components/TransactionTable"
import { dashboardAPI } from "../services/api"

const FILTERS   = ["All", "High", "Medium", "Low"]
const PIE_COLORS = ["#22c55e", "#ef4444"]
const BAR_COLOR  = { High: "#ef4444", Medium: "#f59e0b", Low: "#22c55e" }

const TT_STYLE = {
  contentStyle: { background: "#0f172a", border: "1px solid #1e293b", borderRadius: "10px", fontSize: "0.82rem" },
  labelStyle:   { color: "#94a3b8" },
  itemStyle:    { color: "#e2e8f0" },
}

function getRisk(p) {
  if (p >= 0.7) return "High"
  if (p >= 0.3) return "Medium"
  return "Low"
}

export default function Dashboard() {
  const [stats,  setStats]  = useState(null)
  const [txns,   setTxns]   = useState([])
  const [filter, setFilter] = useState("All")
  const [loading, setLoad]  = useState(true)
  const username = localStorage.getItem("username") || "User"

  const fetchData = useCallback(async (f) => {
    setLoad(true)
    try {
      const [sRes, tRes] = await Promise.all([
        dashboardAPI.stats(),
        dashboardAPI.transactions(f === "All" ? null : f),
      ])
      setStats(sRes.data)
      setTxns(tRes.data)
    } catch (err) {
      console.error("Dashboard error:", err)
    }
    setLoad(false)
  }, [])

  useEffect(() => { fetchData(filter) }, [filter, fetchData])

  const barData = txns.slice(0, 10).map((t, i) => ({
    name: `T${i + 1}`,
    risk: Math.round(t.fraud_probability * 100),
    fill: BAR_COLOR[getRisk(t.fraud_probability)],
  }))

  const pieData = stats
    ? [{ name: "Legitimate", value: stats.legitimate }, { name: "Fraudulent", value: stats.fraudulent }]
    : []

  const s = {
    page:  { padding: "2rem", maxWidth: "1200px", margin: "0 auto" },
    title: { fontSize: "1.6rem", fontWeight: 800, color: "#f1f5f9", letterSpacing: "-0.01em" },
    sub:   { color: "#475569", marginTop: "0.25rem", marginBottom: "2rem", fontSize: "0.9rem" },
    grid:  { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "1rem", marginBottom: "2rem" },
    charts:{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "2rem" },
    card:  { background: "#111827", border: "1px solid #1e293b", borderRadius: "14px", padding: "1.5rem" },
    hdr:   { color: "#475569", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "1.25rem" },
    alert: { background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.25)", borderRadius:"10px", padding:"0.75rem 1rem", marginBottom:"1.5rem", color:"#f87171", fontSize:"0.85rem" },
    fRow:  { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" },
    fBtns: { display: "flex", gap: "0.4rem" },
  }

  const filterBtn = (f) => ({
    padding: "0.35rem 1rem", borderRadius: "8px", fontSize: "0.8rem",
    fontWeight: 600, cursor: "pointer", border: "1px solid",
    background: filter === f ? "rgba(99,102,241,0.15)" : "transparent",
    color:      filter === f ? "#818cf8" : "#475569",
    borderColor:filter === f ? "rgba(99,102,241,0.4)" : "#1e293b",
  })

  return (
    <div style={s.page}>
      <div style={s.title}>Dashboard</div>
      <div style={s.sub}>
        Welcome back, {username} — {new Date().toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric" })}
      </div>

      {stats?.high_risk_alerts_24h > 0 && (
        <div style={s.alert}>
          🚨 <strong>{stats.high_risk_alerts_24h} high-risk transaction{stats.high_risk_alerts_24h > 1 ? "s" : ""}</strong> in the last 24 hours
        </div>
      )}

      {stats && (
        <div style={s.grid}>
          <StatsCard label="Total Checked"  value={stats.total_checked}       color="#6366f1" icon="📊" />
          <StatsCard label="Fraudulent"     value={stats.fraudulent}           color="#ef4444" icon="🚨" />
          <StatsCard label="Legitimate"     value={stats.legitimate}           color="#22c55e" icon="✅" />
          <StatsCard label="Avg Risk Score" value={`${stats.avg_risk_score}%`} color="#f59e0b" icon="⚠️" />
        </div>
      )}

      <div style={s.charts}>
        {/* Bar chart */}
        <div style={s.card}>
          <div style={s.hdr}>Risk Score — Last 10 Transactions</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} barSize={20}>
              <XAxis dataKey="name" stroke="#334155" tick={{ fill:"#475569", fontSize:11 }} />
              <YAxis stroke="#334155" tick={{ fill:"#475569", fontSize:11 }} domain={[0,100]} />
              <Tooltip {...TT_STYLE} formatter={(v) => [`${v}%`, "Risk"]} />
              <Bar dataKey="risk" radius={[4,4,0,0]}>
                {barData.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div style={s.card}>
          <div style={s.hdr}>Fraud vs Legitimate</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} dataKey="value" cx="50%" cy="50%"
                outerRadius={75} innerRadius={40} paddingAngle={3}>
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
              </Pie>
              <Tooltip {...TT_STYLE} />
              <Legend wrapperStyle={{ fontSize:"0.8rem", color:"#64748b" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Transactions table */}
      <div style={s.card}>
        <div style={s.fRow}>
          <div style={s.hdr}>Recent Transactions</div>
          <div style={s.fBtns}>
            {FILTERS.map(f => (
              <button key={f} style={filterBtn(f)} onClick={() => setFilter(f)}>{f}</button>
            ))}
          </div>
        </div>
        {loading
          ? <div style={{ color:"#334155", textAlign:"center", padding:"2rem" }}>Loading…</div>
          : <TransactionTable transactions={txns} />
        }
      </div>
    </div>
  )
}