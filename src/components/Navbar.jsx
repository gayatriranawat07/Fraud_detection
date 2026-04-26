import React from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"

export default function Navbar() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const username  = localStorage.getItem("username") || "User"

  const logout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("username")
    navigate("/login")
  }

  const active = (path) => location.pathname === path

  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      height: "64px",
      background: "rgba(10,15,30,0.95)",
      backdropFilter: "blur(12px)",
      borderBottom: "1px solid #1e293b",
      display: "flex", alignItems: "center",
      padding: "0 2rem",
      justifyContent: "space-between",
    }}>
      {/* Brand */}
      <Link to="/" style={{
        color: "#818cf8", fontWeight: 800, fontSize: "1.1rem",
        display: "flex", alignItems: "center", gap: "0.5rem"
      }}>
        🛡️ FraudGuard
      </Link>

      {/* Nav links */}
      <div style={{ display: "flex", gap: "0.25rem" }}>
        {[
          { to: "/",      label: "Dashboard" },
          { to: "/check", label: "Check Transaction" },
        ].map(({ to, label }) => (
          <Link key={to} to={to} style={{
            padding: "0.45rem 1rem",
            borderRadius: "8px",
            fontSize: "0.88rem",
            fontWeight: 500,
            color: active(to) ? "#e2e8f0" : "#64748b",
            background: active(to) ? "rgba(99,102,241,0.15)" : "transparent",
            border: active(to) ? "1px solid rgba(99,102,241,0.3)" : "1px solid transparent",
          }}>
            {label}
          </Link>
        ))}
      </div>

      {/* Right side */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <span style={{
          color: "#94a3b8", fontSize: "0.82rem",
          background: "rgba(99,102,241,0.08)",
          padding: "0.35rem 0.75rem",
          borderRadius: "99px",
          border: "1px solid rgba(99,102,241,0.2)"
        }}>
          👤 {username}
        </span>
        <button onClick={logout} style={{
          padding: "0.45rem 1rem",
          borderRadius: "8px",
          border: "1px solid rgba(239,68,68,0.3)",
          background: "rgba(239,68,68,0.08)",
          color: "#f87171",
          fontSize: "0.85rem",
          fontWeight: 500,
          cursor: "pointer",
        }}>
          Logout
        </button>
      </div>
    </nav>
  )
}