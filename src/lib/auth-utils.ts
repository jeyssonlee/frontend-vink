export const getSessionUser = () => {
  if (typeof window === "undefined") return null;
  const userStr = localStorage.getItem("user");
  return userStr ? JSON.parse(userStr) : null;
};

export const getEmpresaId = () => {
  if (typeof window === "undefined") return null;
  // Leemos la variable simple que sacamos del token
  return localStorage.getItem("ID_EMPRESA_GLOBAL");
};

export const getAlmacenId = () => {
  if (typeof window === "undefined") return null;
  // Leemos la variable simple que sacamos del token
  return localStorage.getItem("ID_ALMACEN_GLOBAL");
};