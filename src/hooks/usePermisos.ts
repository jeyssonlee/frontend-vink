import { usePermisosStore } from '@/store/permisos.store';

/**
 * Hook conveniente para verificar permisos en cualquier componente.
 *
 * Uso:
 *   const { tienePermiso, esRoot } = usePermisos();
 *   if (!tienePermiso('ver_ventas')) return null;
 */
export function usePermisos() {
  const { permisos, rol, tienePermiso, esRoot, cargando } = usePermisosStore();

  return {
    permisos,
    rol,
    cargando,
    tienePermiso,
    esRoot: esRoot(),
    // Helper para verificar múltiples permisos (necesita al menos uno)
    tieneAlguno: (lista: string[]) => lista.some((p) => tienePermiso(p)),
    // Helper para verificar múltiples permisos (necesita todos)
    tieneTodos: (lista: string[]) => lista.every((p) => tienePermiso(p)),
  };
}
