import type { Metadata } from "next"
import { ReportesBanco } from "./ReportesBanco"

export const metadata: Metadata = {
  title: "Reportes Banco | ERP VINK",
}

export default function ReportesBancoPage() {
  return <ReportesBanco />
}