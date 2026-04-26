import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import { authAPI } from "../services/api"

export default function Login() {
  const [mode, setMode]       = useState("login")
  const [form, setForm]       = useState({ username: "", password: "" })
  const [error, setError]     = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const update = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError(""); setSuccess(""); setLoading(true)
    try {
      if (mode === "register") {
        await authAPI.register(form)
        setSuccess("Account created! Please sign in.")
        setMode("login")
        setForm(f => ({ ...f, password: "" }))
      } else {
        const res = await authAPI.login(form)
        localStorage.setItem("token",    res.data.token)
        localStorage.setItem("username", res.data.username)
        navigate("/")
      }
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong. Try again.")
    }
    setLoading(false)
  }

  const toggleMode = () => {
    setMode(m => m === "login" ? "register" : "login")
    setError(""); setSuccess("")
  }

  const s = {
    page:  { minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#0a0f1e" },
    card:  { background:"#111827", padding:"2.5rem", borderRadius:"16px", width:"360px", boxShadow:"0 25px 60px rgba(0,0,0,0.5)", border:"1px solid #1e293b" },
    logo:  { fontSize:"1.8rem", fontWeight:900, color:"#818cf8", marginBottom:"0.15rem" },
    title: { fontSize:"1rem", fontWeight:600, color:"#e2e8f0", marginBottom:"0.1rem" },
    sub:   { color:"#475569", fontSize:"0.85rem", marginBottom:"2rem" },
    label: { display:"block", color:"#64748b", fontSize:"0.75rem", marginBottom:"0.35rem", fontWeight:600, letterSpacing:"0.05em", textTransform:"uppercase" },
    input: { width:"100%", padding:"0.65rem 1rem", borderRadius:"8px", border:"1px solid #1e293b", background:"#0a0f1e", color:"#f1f5f9", fontSize:"0.95rem", marginBottom:"1.25rem", outline:"none", boxSizing:"border-box" },
    btn:   { width:"100%", padding:"0.75rem", borderRadius:"10px", border:"none", background:"linear-gradient(135deg,#6366f1,#818cf8)", color:"#fff", fontSize:"1rem", fontWeight:700, cursor:"pointer" },
    err:   { color:"#f87171", fontSize:"0.82rem", marginBottom:"1rem", background:"rgba(239,68,68,0.08)", padding:"0.6rem 1rem", borderRadius:"8px", border:"1px solid rgba(239,68,68,0.2)" },
    ok:    { color:"#4ade80", fontSize:"0.82rem", marginBottom:"1rem", background:"rgba(34,197,94,0.08)", padding:"0.6rem 1rem", borderRadius:"8px", border:"1px solid rgba(34,197,94,0.2)" },
    link:  { textAlign:"center", marginTop:"1.25rem", color:"#475569", fontSize:"0.82rem", cursor:"pointer" },
    hi:    { color:"#818cf8", fontWeight:600 },
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>🛡️ FraudGuard</div>
        <div style={s.title}>{mode === "login" ? "Welcome back" : "Create account"}</div>
        <div style={s.sub}>{mode === "login" ? "Sign in to your dashboard" : "Get started for free"}</div>

        {error   && <div style={s.err}>{error}</div>}
        {success && <div style={s.ok}>{success}</div>}

        <form onSubmit={submit}>
          <label style={s.label}>Username</label>
          <input style={s.input} value={form.username} onChange={update("username")}
            autoComplete="username" required />

          <label style={s.label}>Password</label>
          <input style={s.input} type="password" value={form.password} onChange={update("password")}
            autoComplete={mode === "login" ? "current-password" : "new-password"} required />

          <button style={s.btn} type="submit" disabled={loading}>
            {loading ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <div style={s.link} onClick={toggleMode}>
          {mode === "login"
            ? <>Don't have an account? <span style={s.hi}>Register</span></>
            : <>Already have an account? <span style={s.hi}>Sign in</span></>}
        </div>
      </div>
    </div>
  )
}