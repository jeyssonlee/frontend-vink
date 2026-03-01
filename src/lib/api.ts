import axios from "axios";
import { useAuthStore } from "@/store/auth-store";

export const API_URL = "http://localhost:3000";

export const api = axios.create({
  baseURL: "http://localhost:3000/api",
  withCredentials: true,
});

// Interceptor: agrega el token desde el store antes de cada request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token; // ← lee directo del store, sin hooks
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Manejador de errores global
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn("Sesión expirada o inválida");
    }
    return Promise.reject(error);
  }
);
