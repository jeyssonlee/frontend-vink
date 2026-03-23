import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// ─── Add to your existing @/lib/utils.ts ──────────────────────────────────────
//
// If you don't have formatCurrency yet, add this function:

export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("es-VE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatBs(amount: number): string {
  return `Bs. ${new Intl.NumberFormat("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`
}

// The cn() function should already exist if you set up shadcn/ui:
// export function cn(...inputs: ClassValue[]) {
//   return twMerge(clsx(inputs))
// }
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
