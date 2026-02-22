import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  // 1. Buscamos el token de sesión en las cookies del navegador
  // Nota: Si le pusiste otro nombre a tu cookie, cámbialo aquí
  const token = request.cookies.get('token')?.value; 

  // 2. ¿Está intentando entrar al dashboard SIN token?
  if (request.nextUrl.pathname.startsWith('/dashboard') && !token) {
    // ¡Rebotado! Lo enviamos de vuelta al login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 3. Si tiene token o está en otra ruta (como el login), lo dejamos pasar
  return NextResponse.next();
}

// 4. ¿Dónde queremos que trabaje el vigilante?
export const config = {
  // El asterisco protege el dashboard y TODAS las subcarpetas que tienes adentro
  matcher: ['/dashboard/:path*'], 
};