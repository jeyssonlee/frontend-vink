import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id_usuario: string;
  nombre: string;
  email: string;
  rol: string;
  empresa: string;
}

interface AuthState {
  user: User | null; // 🚀 Ya no hay 'token' aquí
  setUser: (user: User) => void;
  clearUser: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      clearUser: () => set({ user: null }),
    }),
    {
      name: 'erp-user-data', // Cambiamos el nombre para limpiar el caché viejo
    }
  )
);