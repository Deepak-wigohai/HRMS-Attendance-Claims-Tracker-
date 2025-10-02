import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:4000", // backend API
});

// Add token automatically if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
