import axios from "axios";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export const api = axios.create({
  baseURL: API_URL, // Asegúrate que este sea tu puerto correcto
});

// INTERCEPTOR MÁGICO 🧙‍♂️
// Antes de cada petición, busca el token y pégalo en la cabecera
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Manejador de errores global
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Si el error es 401 (No autorizado), limpia la sesión
    if (error.response?.status === 401) {
      console.warn("Sesión expirada o inválida");
      // Opcional: redirigir al login si quieres ser estricto
      // window.location.href = "/"; 
    }
    return Promise.reject(error);
  }
);
