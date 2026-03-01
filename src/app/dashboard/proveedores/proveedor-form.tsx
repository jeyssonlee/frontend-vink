"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { getEmpresaId } from "@/lib/auth-utils"

// 1. Esquema
const formSchema = z.object({
  nombre_empresa: z.string().min(1, "La Razón Social es obligatoria"),
  rif: z.string().min(1, "El RIF es obligatorio"),
  nombre_vendedor: z.string().optional(),
  telefono_contacto: z.string().optional(),
  email_pedidos: z.string().optional(), 
  direccion: z.string().min(1, "La dirección es obligatoria"),
  dias_credito: z.coerce.number().min(0).default(0),
})

// Tipo inferido para uso interno
type FormValues = z.infer<typeof formSchema>

interface ProveedorFormProps {
  initialData?: any;
  onSuccess?: () => void;
}

export const ProveedorForm = ({ initialData, onSuccess }: ProveedorFormProps) => {
  const [loading, setLoading] = useState(false)
  const idEmpresa = getEmpresaId();

  // 🔥 SOLUCIÓN 1: Quitamos el genérico <FormValues> del useForm y casteamos el resolver
  const form = useForm({
    resolver: zodResolver(formSchema) as any, // <--- Aquí estaba el error rojo del resolver
    defaultValues: {
      nombre_empresa: initialData?.nombre_empresa || "",
      rif: initialData?.rif || "",
      nombre_vendedor: initialData?.nombre_vendedor || "",
      telefono_contacto: initialData?.telefono_contacto || "",
      email_pedidos: initialData?.email_pedidos || "",
      direccion: initialData?.direccion || "",
      dias_credito: initialData?.dias_credito || 0,
    },
  })

  // Esta función recibe los datos ya validados y transformados
  const onSubmit = async (values: any) => { // 🔥 Usamos 'any' aquí para evitar conflictos con handleSubmit
    
    if (!idEmpresa) {
      toast.error("Error de Sesión", { description: "No se detectó el ID de la empresa." });
      return;
    }

    try {
      setLoading(true)
      const payload = { ...values, id_empresa: idEmpresa };

      if (initialData) {
        await api.patch(`/proveedores/${initialData.id_proveedor}`, payload)
        toast.success("Proveedor actualizado")
      } else {
        await api.post(`/proveedores`, payload)
        toast.success("Proveedor registrado exitosamente")
      }
      
      if (onSuccess) onSuccess();
      if (!initialData) form.reset();

    } catch (error: any) {
      console.error("Error al enviar:", error);
      const msg = error.response?.data?.message || "Error al procesar la solicitud";
      toast.error("Error", { description: Array.isArray(msg) ? msg[0] : msg });
    } finally {
      setLoading(false)
    }
  }

  return (
    <Form {...form}>
      {/* 🔥 SOLUCIÓN 2: Casteamos el onSubmit en el handleSubmit */}
      <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4">
        
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="rif"
            render={({ field }) => (
              <FormItem>
                <FormLabel>RIF / C.I.</FormLabel>
                <FormControl>
                  <Input placeholder="J-12345678-9" {...field} disabled={loading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="nombre_empresa"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Razón Social</FormLabel>
                <FormControl>
                  <Input placeholder="Nombre de la empresa" {...field} disabled={loading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="direccion"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dirección Fiscal</FormLabel>
              <FormControl>
                <Input placeholder="Ubicación completa" {...field} disabled={loading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="telefono_contacto"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Teléfono</FormLabel>
                <FormControl>
                  <Input placeholder="0414-0000000" {...field} disabled={loading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dias_credito"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Días de Crédito</FormLabel>
                <FormControl>
                  <Input type="number" {...field} disabled={loading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="nombre_vendedor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre Vendedor</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={loading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email_pedidos"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Pedidos</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} disabled={loading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>

        <Button disabled={loading} type="submit" className="w-full bg-slate-900 hover:bg-slate-800">
          {initialData ? "Guardar Cambios" : "Registrar Proveedor"}
        </Button>
      </form>
    </Form>
  )
}