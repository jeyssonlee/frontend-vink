"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner"; 
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { usePermisosStore } from "@/store/permisos.store"; // ← NUEVO
import { createSecureSession } from "@/app/actions/auth";

const formSchema = z.object({
  usuario: z.string().min(1, "Requerido"),
  contrasena: z.string().min(6, "Mínimo 6 caracteres"),
});

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  
  const setUser = useAuthStore((state) => state.setUser);
  const setToken = useAuthStore((state) => state.setToken); // ← NUEVO
  const { fetchPermisos } = usePermisosStore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { usuario: "", contrasena: "" },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      const { data } = await api.post("/auth/login", { 
        correo: values.usuario, 
        clave: values.contrasena 
      });
      
      const token = data.access_token;
      
      // Decodificar token para extraer datos
      let id_empresa = null;
      let id_almacen = null;
      let rol: string | null = null;

      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          window.atob(base64).split('').map((c) =>
            '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
          ).join('')
        );
        const decoded = JSON.parse(jsonPayload);
        id_empresa = decoded.id_empresa;
        id_almacen = decoded.sucursalId;
        rol = decoded.rol;
      } catch (e) {
        console.error("Error decodificando token", e);
      }

      // Guardar token en cookie HttpOnly
      await createSecureSession(token);

      // Guardar perfil y token en Zustand
      setToken(token); // ← NUEVO
      setUser({ ...data.usuario, id_empresa, id_almacen });

      // ✅ Cargar permisos DESPUÉS de que la cookie ya está seteada
      await fetchPermisos();

      toast.success("Bienvenido");

      if (rol === 'ROOT') {
        router.push("/dashboard/root");
      } else {
        router.push("/dashboard");
      }

    } catch (error: any) {
      console.error(error);
      toast.error("Error al ingresar");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <Card className="w-full max-w-md shadow-xl border-t-4 border-indigo-600">
        <CardHeader>
          <CardTitle className="text-center text-2xl">VINK</CardTitle>
          <CardDescription className="text-center">Inicie sesión para continuar</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="usuario" render={({ field }) => (
                <FormItem><FormLabel>Correo</FormLabel><FormControl><div className="relative"><Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"/><Input placeholder="ejemplo@correo.com" className="pl-9" {...field} /></div></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="contrasena" render={({ field }) => (
                <FormItem><FormLabel>Contraseña</FormLabel><FormControl><div className="relative"><Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"/><Input type={showPassword?"text":"password"} className="pl-9 pr-10" {...field} /><Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-9 w-9 px-0" onClick={()=>setShowPassword(!showPassword)}>{showPassword?<EyeOff className="h-4 w-4"/>:<Eye className="h-4 w-4"/>}</Button></div></FormControl><FormMessage /></FormItem>
              )} />
              <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={isLoading}>{isLoading ? <Loader2 className="animate-spin" /> : "Ingresar"}</Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
