import type { Metadata } from "next"
import { MovimientosView } from "./MovimientosView"

export const metadata: Metadata = {
  title: "Movimientos | Banco — ERP VINK",
}

export default function MovimientosPage() {
  return <MovimientosView />
}