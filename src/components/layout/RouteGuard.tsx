// frontend/src/components/layout/RouteGuard.tsx
// Componente opcional: protege rutas desde el cliente además del sidebar

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePermisos } from '@/hooks/usePermisos';

interface RouteGuardProps {
  permisosRequeridos?: string[];
  soloRoot?: boolean;
  children: React.ReactNode;
  fallbackHref?: string;
}

/**
 * Envuelve una página para verificar permisos del lado cliente.
 * El servidor ya rechaza con 403, pero esto mejora la UX
 * redirigiendo antes de que el backend responda.
 *
 * Uso:
 *   <RouteGuard permisosRequeridos={['ver_ventas']}>
 *     <VentasPage />
 *   </RouteGuard>
 */
export function RouteGuard({
  permisosRequeridos = [],
  soloRoot = false,
  children,
  fallbackHref = '/dashboard',
}: RouteGuardProps) {
  const router = useRouter();
  const { tienePermiso, esRoot, cargando } = usePermisos();

  useEffect(() => {
    if (cargando) return;

    if (soloRoot && !esRoot) {
      router.replace(fallbackHref);
      return;
    }

    if (permisosRequeridos.length > 0) {
      const autorizado =
        esRoot || permisosRequeridos.some((p) => tienePermiso(p));
      if (!autorizado) {
        router.replace(fallbackHref);
      }
    }
  }, [cargando, esRoot, tienePermiso, permisosRequeridos, soloRoot]);

  if (cargando) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
