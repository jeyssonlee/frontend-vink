// frontend/src/store/permisos.store.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/lib/api'; // ← misma instancia que usa el login

interface PermisosState {
  permisos: string[];
  rol: string | null;
  cargando: boolean;
  fetchPermisos: () => Promise<void>;
  limpiarPermisos: () => void;
  tienePermiso: (permiso: string) => boolean;
  esRoot: () => boolean;
}

export const usePermisosStore = create<PermisosState>()(
  persist(
    (set, get) => ({
      permisos: [],
      rol: null,
      cargando: false,

      fetchPermisos: async () => {
        set({ cargando: true });
        try {
          const { data } = await api.get('/auth/me/permisos');
          set({ permisos: data.permisos, rol: data.rol, cargando: false });
        } catch (e) {
          console.error('fetchPermisos error:', e);
          set({ permisos: [], rol: null, cargando: false });
        }
      },

      limpiarPermisos: () => set({ permisos: [], rol: null }),

      tienePermiso: (permiso: string) => {
        const { permisos } = get();
        if (permisos.includes('ROOT')) return true;
        return permisos.includes(permiso);
      },

      esRoot: () => get().rol === 'ROOT',
    }),
    {
      name: 'erp-permisos',
      partialize: (state) => ({ permisos: state.permisos, rol: state.rol }),
    },
  ),
);
