import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id_usuario: string;
  nombre: string;
  email: string;
  rol: string;
  empresa: string;
  id_empresa: string | null;
  id_almacen: string | null;
}

interface AuthState {
  user: User | null;
  token: string | null; // ← NUEVO
  setUser: (user: User) => void;
  setToken: (token: string) => void; // ← NUEVO
  clearUser: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }), // ← NUEVO
      clearUser: () => set({ user: null, token: null }),
    }),
    {
      name: 'erp-user-data',
    }
  )
);
