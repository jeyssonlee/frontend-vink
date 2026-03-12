import type { Metadata } from "next"
import { DashboardBanco } from "./DashboardBanco"

export const metadata: Metadata = {
  title: "Dashboard Banco | ERP VINK",
}

export default function DashboardBancoPage() {
  return <DashboardBanco />
}