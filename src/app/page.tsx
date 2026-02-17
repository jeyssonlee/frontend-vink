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

const formSchema = z.object({
  usuario: z.string().min(1, "Requerido"),
  contrasena: z.string().min(6, "Mínimo 6 caracteres"),
});

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { usuario: "", contrasena: "" },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      // 1. Login al Backend
      const { data } = await api.post("/auth/login", { 
        correo: values.usuario, 
        clave: values.contrasena 
      });
      
      const token = data.access_token;
      
      // 2. 🔓 DECODIFICAR EL TOKEN MANUALMENTE
      // (Aquí es donde recuperamos el ID que el backend nos esconde en el body)
      try {
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
              return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join(''));
          
          const decoded = JSON.parse(jsonPayload);
          
          console.log("Datos del Token:", decoded); // Para que veas en consola que SI está el ID

          // 3. 💾 GUARDADO INFALIBLE
          // Guardamos los IDs en variables simples de texto. Sin objetos raros.
          if (decoded.id_empresa) {
              localStorage.setItem("ID_EMPRESA_GLOBAL", decoded.id_empresa);
          }
          
          // Tu token dice "sucursalId", no "id_sucursal" ni "id_almacen"
          if (decoded.sucursalId) {
              localStorage.setItem("ID_ALMACEN_GLOBAL", decoded.sucursalId);
          }

      } catch (e) {
          console.error("Error decodificando token", e);
      }

      // Guardamos el resto de la sesión normal
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(data.usuario));
      setAuth(token, data.usuario);

      toast.success("Bienvenido");
      router.push("/dashboard"); 
      router.refresh();

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
          <CardTitle className="text-center text-2xl">ERP VINK</CardTitle>
          <CardDescription className="text-center">Inicie sesión para continuar</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="usuario" render={({ field }) => (
                <FormItem><FormLabel>Correo</FormLabel><FormControl><div className="relative"><Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"/><Input placeholder="admin@erp.com" className="pl-9" {...field} /></div></FormControl><FormMessage /></FormItem>
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