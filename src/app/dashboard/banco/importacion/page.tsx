import type { Metadata } from "next"
import { ImportacionWizard } from "./ImportacionWizard"

export const metadata: Metadata = {
  title: "Importar Extracto | Banco — ERP VINK",
}

export default function ImportacionPage() {
  return <ImportacionWizard />
}