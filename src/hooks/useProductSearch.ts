import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { getEmpresaId } from "@/lib/auth-utils";

export interface ProductoResultado {
  id_producto: string;
  codigo: string;
  nombre: string;
  stock: number;
  stock_disponible?: number | null;
  precio_venta: number;
}

export function useProductSearch(query: string, limit = 20) {
  const idEmpresa = getEmpresaId();
  const [results, setResults] = useState<ProductoResultado[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const res = await api.get("/productos/buscar", {
          params: { q: query.trim(), id_empresa: idEmpresa, limit },
        });
        setResults(res.data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, idEmpresa, limit]);

  return { results, loading };
}