'use server'

import { cookies } from 'next/headers';

export async function createSecureSession(token: string) {
  // Guardamos el token en una cookie HttpOnly inalcanzable para JavaScript
  (await cookies()).set('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Solo HTTPS en producción
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24, // 1 día
  });
}

export async function destroySecureSession() {
  (await cookies()).delete('token');
}