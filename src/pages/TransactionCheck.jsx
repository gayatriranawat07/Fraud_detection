import React, { useState, useRef } from "react"
import { predictAPI } from "../services/api"

const FEATURES = [
  "Time","V1","V2","V3","V4","V5","V6","V7","V8","V9","V10",
  "V11","V12","V13","V14","V15","V16","V17","V18","V19","V20",
  "V21","V22","V23","V24","V25","V26","V27","V28","Amount",
]

const DEMO = {
  Time:406, V1:-2.3, V2:1.9, V3:-2.5, V4:0.7, V5:-1.3, V6:0.2,
  V7:-2.2, V8:0.3, V9:-0.8, V10:-2.7, V11:1.1, V12:-2.9, V13:0.1,
  V14:-2.3, V15:0.0, V16:-2.2, V17:-1.5, V18:0.5, V19:0.1,
  V20:-0.1, V21:-0.3, V22:-0.5, V23:0.1, V24:0.0, V25:0.2,
  V26:0.1, V27:0.1, V28:0.05, Amount:149.62,
}

const RISK_STYLE = {
  High:   { color:"#ef4444", bg:"rgba(239,68,68,0.1)",  border:"rgba(239,68,68,0.35)",  glow:"rgba(239,68,68,0.2)"  },
  Medium: { color:"#f59e0b", bg:"rgba(245,158,11,0.1)", border:"rgba(245,158,11,0.35)", glow:"rgba(245,158,11,0.2)" },
  Low:    { color:"#22c55e", bg:"rgba(34,197,94,0.1)",  border:"rgba(34,197,94,0.35)",  glow:"rgba(34,197,94,0.2)"  },
}

const BLANK = Object.fromEntries(FEATURES.map(f => [f, ""]))

// ── Sub-components ─────────────────────────────────────────────────────────────

function RiskMeter({ pct, level }) {
  const c = RISK_STYLE[level].color
  return (
    <div style={{ marginBottom:"1.5rem" }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"0.5rem" }}>
        <span style={{ color:"#475569", fontSize:"0.78rem", fontWeight:600 }}>FRAUD PROBABILITY</span>
        <span style={{ color:c, fontWeight:800, fontSize:"0.85rem" }}>{pct.toFixed(1)}%</span>
      </div>
      <div style={{ height:"12px", background:"#0f172a", borderRadius:"99px", overflow:"hidden", border:"1px solid #1e293b" }}>
        <div style={{
          height:"100%", width:`${Math.min(pct,100)}%`,
          background:`linear-gradient(90deg,${c}88,${c})`,
          borderRadius:"99px", transition:"width 0.6s ease",
        }}/>
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", marginTop:"0.3rem" }}>
        {["Low","Medium","High"].map(l => (
          <span key={l} style={{ color: RISK_STYLE[l].color, fontSize:"0.68rem" }}>{l}</span>
        ))}
      </div>
    </div>
  )
}

function ShapChart({ reasons }) {
  const maxAbs = Math.max(...reasons.map(r => Math.abs(r.impact)), 0.0001)
  return (
    <div>
      <div style={{ color:"#475569", fontSize:"0.72rem", fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"1rem" }}>
        Top Contributing Factors (SHAP)
      </div>
      {reasons.map((r, i) => {
        const pos = r.impact > 0
        const w   = (Math.abs(r.impact) / maxAbs) * 100
        return (
          <div key={i} style={{ marginBottom:"0.85rem" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"0.3rem" }}>
              <span style={{ color:"#cbd5e1", fontSize:"0.82rem", fontWeight:500 }}>{r.feature}</span>
              <span style={{ color: pos ? "#f87171" : "#4ade80", fontSize:"0.82rem", fontWeight:700 }}>
                {pos ? "+" : ""}{r.impact}
              </span>
            </div>
            <div style={{ height:"8px", background:"#0f172a", borderRadius:"99px", overflow:"hidden" }}>
              <div style={{
                height:"100%", width:`${w}%`,
                background: pos ? "linear-gradient(90deg,#ef444488,#ef4444)" : "linear-gradient(90deg,#22c55e88,#22c55e)",
                borderRadius:"99px", transition:"width 0.5s ease",
              }}/>
            </div>
            <div style={{ color:"#334155", fontSize:"0.68rem", marginTop:"0.2rem" }}>
              {pos ? "↑ Increases fraud risk" : "↓ Reduces fraud risk"}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function BatchResults({ data }) {
  const RC = { High:"#ef4444", Medium:"#f59e0b", Low:"#22c55e" }
  return (
    <div style={{ background:"#111827", border:"1px solid rgba(99,102,241,0.2)", borderRadius:"14px", padding:"1.75rem", marginTop:"1.5rem" }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"1rem" }}>
        <span style={{ color:"#475569", fontSize:"0.72rem", fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase" }}>
          Batch Results
        </span>
        <span style={{ color:"#64748b", fontSize:"0.8rem" }}>
          {data.total_rows} rows · <span style={{ color:"#f87171" }}>{data.high_risk_count} high risk</span>
        </span>
      </div>
      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.82rem" }}>
          <thead>
            <tr>
              {["Row","Amount","Risk %","Level"].map(h => (
                <th key={h} style={{ textAlign:"left", padding:"0.4rem 0.6rem", color:"#334155", fontWeight:700, borderBottom:"1px solid #1e293b", fontSize:"0.7rem", textTransform:"uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.results.map(r => (
              <tr key={r.row} style={{ borderBottom:"1px solid #0f172a" }}>
                <td style={{ padding:"0.5rem 0.6rem", color:"#475569" }}>{r.row}</td>
                <td style={{ padding:"0.5rem 0.6rem", color:"#e2e8f0" }}>${r.amount.toFixed(2)}</td>
                <td style={{ padding:"0.5rem 0.6rem", color:RC[r.risk_level], fontWeight:600 }}>{r.fraud_probability}%</td>
                <td style={{ padding:"0.5rem 0.6rem", color:RC[r.risk_level], fontSize:"0.72rem", fontWeight:700 }}>{r.risk_level}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function TransactionCheck() {
  const [tab,     setTab]     = useState("single")
  const [form,    setForm]    = useState(BLANK)
  const [result,  setResult]  = useState(null)
  const [batch,   setBatch]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState("")
  const fileRef = useRef()

  const reset = () => { setResult(null); setBatch(null); setError("") }

  const switchTab = (t) => { setTab(t); reset() }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true); setError(""); setResult(null)
    try {
      const res = await predictAPI.single(form)
      setResult(res.data)
    } catch (err) {
      setError(err.response?.data?.error || "Prediction failed. Please try again.")
    }
    setLoading(false)
  }

  const handleBatch = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true); setError(""); setBatch(null)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await predictAPI.batch(fd)
      setBatch(res.data)
    } catch (err) {
      setError(err.response?.data?.error || "Batch prediction failed.")
    }
    setLoading(false)
    e.target.value = ""
  }

  const s = {
    page:  { padding:"2rem", maxWidth:"820px", margin:"0 auto" },
    title: { fontSize:"1.6rem", fontWeight:800, color:"#f1f5f9", letterSpacing:"-0.01em" },
    sub:   { color:"#475569", marginTop:"0.25rem", marginBottom:"2rem", fontSize:"0.9rem" },
    card:  { background:"#111827", border:"1px solid #1e293b", borderRadius:"14px", padding:"1.75rem", marginBottom:"1.5rem" },
    hdr:   { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.25rem" },
    label: { display:"block", color:"#475569", fontSize:"0.75rem", marginBottom:"0.35rem", fontWeight:600 },
    input: { width:"100%", padding:"0.55rem 0.85rem", borderRadius:"8px", border:"1px solid #1e293b", background:"#0a0f1e", color:"#e2e8f0", fontSize:"0.9rem", outline:"none", boxSizing:"border-box" },
    grid:  { display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.85rem" },
    btnPrimary: { padding:"0.8rem 2rem", borderRadius:"10px", border:"none", background:"linear-gradient(135deg,#6366f1,#818cf8)", color:"#fff", fontWeight:700, fontSize:"1rem", cursor:"pointer", width:"100%", marginTop:"1.5rem" },
    btnGhost:   { padding:"0.5rem 1rem", borderRadius:"8px", border:"1px solid #1e293b", background:"transparent", color:"#64748b", fontWeight:500, fontSize:"0.82rem", cursor:"pointer" },
    tab: (a) => ({
      padding:"0.5rem 1.25rem", borderRadius:"8px", border:"1px solid",
      fontWeight:600, fontSize:"0.85rem", cursor:"pointer",
      background: a ? "rgba(99,102,241,0.15)" : "transparent",
      color:      a ? "#818cf8" : "#475569",
      borderColor:a ? "rgba(99,102,241,0.35)" : "#1e293b",
    }),
    tip:  { color:"#334155", fontSize:"0.78rem", marginBottom:"1rem", padding:"0.5rem 0.75rem", background:"rgba(99,102,241,0.06)", borderRadius:"8px", border:"1px solid rgba(99,102,241,0.12)" },
    err:  { color:"#f87171", background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:"8px", padding:"0.65rem 1rem", marginTop:"1rem", fontSize:"0.85rem" },
  }

  const rc = result ? RISK_STYLE[result.risk_level] : null

  return (
    <div style={s.page}>
      <div style={s.title}>Check Transaction</div>
      <div style={s.sub}>Analyse individual transactions or upload a CSV for batch scoring</div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:"0.4rem", marginBottom:"1.5rem" }}>
        <button style={s.tab(tab === "single")} onClick={() => switchTab("single")}>Single Transaction</button>
        <button style={s.tab(tab === "batch")}  onClick={() => switchTab("batch")}>Batch CSV Upload</button>
      </div>

      {/* ── Single ── */}
      {tab === "single" && (
        <div style={s.card}>
          <div style={s.hdr}>
            <span style={{ color:"#475569", fontSize:"0.72rem", fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase" }}>
              Transaction Features
            </span>
            <div style={{ display:"flex", gap:"0.5rem" }}>
              <button style={s.btnGhost} onClick={() => setForm(Object.fromEntries(FEATURES.map(f => [f, String(DEMO[f] ?? "")])))}>
                Load Fraud Demo
              </button>
              <button style={s.btnGhost} onClick={() => { setForm(BLANK); reset() }}>
                Clear
              </button>
            </div>
          </div>

          <div style={s.tip}>
            💡 <strong style={{ color:"#6366f1" }}>Tip:</strong> Only <strong>Amount</strong> and <strong>Time</strong> are required.
            Leave V1–V28 blank — they will be auto-simulated with realistic values.
          </div>

          <form onSubmit={handleSubmit}>
            <div style={s.grid}>
              {FEATURES.map(f => (
                <div key={f}>
                  <label style={s.label}>{f}</label>
                  <input
                    style={s.input}
                    type="number" step="any"
                    value={form[f]}
                    onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))}
                    placeholder={f === "Amount" || f === "Time" ? "required" : "optional"}
                  />
                </div>
              ))}
            </div>
            {error && <div style={s.err}>{error}</div>}
            <button style={s.btnPrimary} type="submit" disabled={loading}>
              {loading ? "Analysing…" : "Analyse Transaction"}
            </button>
          </form>
        </div>
      )}

      {/* ── Batch ── */}
      {tab === "batch" && (
        <div style={s.card}>
          <div style={{ color:"#475569", fontSize:"0.72rem", fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"1rem" }}>
            Upload CSV
          </div>
          <p style={{ color:"#334155", fontSize:"0.82rem", marginBottom:"1.5rem", lineHeight:1.6 }}>
            CSV must include <code style={{ color:"#818cf8" }}>Amount</code> and <code style={{ color:"#818cf8" }}>Time</code>.
            V1–V28 are optional — missing columns are auto-simulated.
          </p>
          <input ref={fileRef} type="file" accept=".csv" style={{ display:"none" }} onChange={handleBatch} />
          <button style={{ ...s.btnPrimary, marginTop:0 }} onClick={() => fileRef.current.click()} disabled={loading}>
            {loading ? "Processing…" : "Choose CSV File"}
          </button>
          {error && <div style={s.err}>{error}</div>}
        </div>
      )}

      {/* Batch result */}
      {batch && <BatchResults data={batch} />}

      {/* Single result */}
      {result && rc && (
        <div style={{
          background: rc.bg,
          border: `1px solid ${rc.border}`,
          borderRadius:"14px", padding:"2rem",
          boxShadow:`0 0 40px ${rc.glow}`,
        }}>
          {/* Header */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"1.5rem" }}>
            <div>
              <span style={{
                background:`${rc.color}22`, color:rc.color,
                border:`1px solid ${rc.color}44`,
                padding:"0.25rem 0.85rem", borderRadius:"99px",
                fontSize:"0.75rem", fontWeight:700, display:"inline-block", marginBottom:"0.75rem",
              }}>
                {result.risk_level.toUpperCase()} RISK
              </span>
              <div style={{ color:rc.color, fontSize:"3.5rem", fontWeight:900, lineHeight:1 }}>
                {result.fraud_probability}%
              </div>
              <div style={{ color:"#475569", fontSize:"0.78rem", marginTop:"0.4rem" }}>
                {result.simulated_features && "⚙️ V1–V28 auto-simulated · "}
                Threshold: {(result.threshold_used * 100).toFixed(0)}%
              </div>
            </div>
            <div style={{ fontSize:"4rem" }}>{result.is_fraud ? "🚨" : "✅"}</div>
          </div>

          <RiskMeter pct={result.fraud_probability} level={result.risk_level} />

          <div style={{ borderTop:"1px solid rgba(255,255,255,0.05)", paddingTop:"1.25rem" }}>
            <ShapChart reasons={result.top_reasons} />
          </div>
        </div>
      )}
    </div>
  )
}