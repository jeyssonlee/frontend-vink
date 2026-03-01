import { useAuthStore } from "@/store/auth-store";

export const getSessionUser = () => {
  if (typeof window === "undefined") return null;
  // Leemos directamente del store de Zustand
  return useAuthStore.getState().user; 
};

export const getEmpresaId = () => {
  if (typeof window === "undefined") return null;
  // Extraemos el id_empresa del usuario en Zustand
  const user = useAuthStore.getState().user as any;
  return user?.id_empresa ?? null;
};

export const getAlmacenId = () => {
  if (typeof window === "undefined") return null;
  const user = useAuthStore.getState().user as any;
  return user?.id_almacen ?? null;
};