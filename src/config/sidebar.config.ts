// frontend/src/config/sidebar.config.ts
// Mapa completo de navegación → permisos requeridos

import {
  LayoutDashboard,
  Users,
  FileText,
  ShoppingCart,
  Package,
  Warehouse,
  TrendingUp,
  CreditCard,
  ShoppingBag,
  BarChart2,
  Settings,
  Building2,
  Shield,
  Boxes,
  DollarSign,
} from 'lucide-react';

export interface SidebarItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Si está vacío, el item es visible para todos los usuarios autenticados */
  permisosRequeridos: string[];
  /** Si true, solo visible para ROOT */
  soloRoot?: boolean;
  children?: SidebarItem[];
}

export interface SidebarGrupo {
  titulo: string;
  items: SidebarItem[];
}

export const SIDEBAR_CONFIG: SidebarGrupo[] = [
  {
    titulo: 'Principal',
    items: [
      {
        label: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
        permisosRequeridos: [],
      },
    ],
  },
  {
    titulo: 'Comercial',
    items: [
      {
        label: 'Ventas',
        href: '/dashboard/ventas',
        icon: TrendingUp,
        permisosRequeridos: ['ver_ventas'],
      },
      {
        label: 'Pedidos',
        href: '/dashboard/pedidos',
        icon: ShoppingCart,
        permisosRequeridos: ['ver_pedidos'],
      },
      {
        label: 'Clientes',
        href: '/dashboard/clientes',
        icon: Users,
        permisosRequeridos: ['ver_clientes'],
      },
      {
        label: 'Facturas',
        href: '/dashboard/facturas',
        icon: FileText,
        permisosRequeridos: ['ver_facturas'],
      },
      {
        label: 'Cobranzas',
        href: '/dashboard/cobranzas',
        icon: CreditCard,
        permisosRequeridos: ['ver_cobranzas'],
      },
    ],
  },
  {
    titulo: 'Inventario',
    items: [
      {
        label: 'Productos',
        href: '/dashboard/productos',
        icon: Package,
        permisosRequeridos: ['ver_productos'],
      },
      {
        label: 'Almacenes',
        href: '/dashboard/almacenes',
        icon: Warehouse,
        permisosRequeridos: ['ver_almacenes'],
      },
      {
        label: 'Kardex',
        href: '/dashboard/kardex',
        icon: Boxes,
        permisosRequeridos: ['ver_kardex'],
      },
      {
        label: 'Lista de Precios',
        href: '/dashboard/precios',
        icon: DollarSign,
        permisosRequeridos: ['ver_productos'],
      },
    ],
  },
  {
    titulo: 'Compras',
    items: [
      {
        label: 'Compras',
        href: '/dashboard/compras',
        icon: ShoppingBag,
        permisosRequeridos: ['ver_compras'],
      },
      {
        label: 'Proveedores',
        href: '/dashboard/proveedores',
        icon: Building2,
        permisosRequeridos: ['ver_proveedores'],
      },
    ],
  },
  {
    titulo: 'Reportes',
    items: [
      {
        label: 'Estadísticas',
        href: '/dashboard/estadisticas',
        icon: BarChart2,
        permisosRequeridos: ['ver_estadisticas'],
      },
    ],
  },
  {
    titulo: 'Administración',
    items: [
      {
        label: 'Usuarios',
        href: '/dashboard/gestion-id/usuarios',
        icon: Users,
        permisosRequeridos: ['ver_usuarios'],
      },
      {
        label: 'Roles y Permisos',
        href: '/dashboard/gestion-id/roles',
        icon: Shield,
        permisosRequeridos: ['editar_roles'],
      },
      {
        label: 'Vendedores',
        href: '/dashboard/vendedores',
        icon: TrendingUp,
        permisosRequeridos: ['ver_vendedores'],
      },
    ],
  },
  {
    titulo: 'Sistema',
    items: [
      {
        label: 'Panel ROOT',
        href: '/dashboard/root',
        icon: Settings,
        permisosRequeridos: [],
        soloRoot: true,
      },
      {
        label: 'Onboarding',
        href: '/dashboard/onboarding',
        icon: Building2,
        permisosRequeridos: [],
        soloRoot: true,
      },
    ],
  },
];
