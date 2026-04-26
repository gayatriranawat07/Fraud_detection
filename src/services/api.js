// services/api.js — centralised Axios instance with JWT auto-attach

import axios from "axios"

const BASE_URL = "http://localhost:5000/api"

const api = axios.create({ baseURL: BASE_URL })

// Attach JWT to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token")
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Auto-logout on 401 (expired / invalid token)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token")
      localStorage.removeItem("username")
      window.location.href = "/login"
    }
    return Promise.reject(err)
  }
)

export const authAPI = {
  register: (data) => api.post("/register", data),
  login:    (data) => api.post("/login",    data),
}

export const predictAPI = {
  single: (data)     => api.post("/predict",       data),
  batch:  (formData) => api.post("/batch_predict", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  }),
}

export const dashboardAPI = {
  stats:        ()       => api.get("/stats"),
  transactions: (filter) => api.get("/transactions", {
    params: filter ? { risk: filter } : {},
  }),
}

export default api