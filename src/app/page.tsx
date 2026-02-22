import { redirect } from "next/navigation";

export default function RootPage() {
  // Redirige automáticamente a todos los visitantes hacia el dashboard.
  // Si no tienen sesión, el proxy.ts los rebotará al /login instantáneamente.
  redirect("/dashboard");
}