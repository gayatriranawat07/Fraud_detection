import React from "react"
import { Routes, Route, Navigate } from "react-router-dom"
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import TransactionCheck from "./pages/TransactionCheck"
import Navbar from "./components/Navbar"

function Protected({ children }) {
  const token = localStorage.getItem("token")
  return token ? children : <Navigate to="/login" replace />
}

function Layout({ children }) {
  return (
    <div style={{ minHeight: "100vh", background: "#0a0f1e" }}>
      <Navbar />
      <div style={{ paddingTop: "64px" }}>{children}</div>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={
        <Protected><Layout><Dashboard /></Layout></Protected>
      } />
      <Route path="/check" element={
        <Protected><Layout><TransactionCheck /></Layout></Protected>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}