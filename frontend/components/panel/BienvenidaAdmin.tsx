'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { RUTA_BIENVENIDA, bienvenidaYaVista, olvidarBienvenida, rutaBienvenida } from './bienvenida';

// Lleva al administrador a la bienvenida cada vez que inicia sesión o abre el sitio en una pestaña nueva.
// Al cerrar sesión se olvida que ya la vio, así la próxima vez que entre aparece de nuevo.
export default function BienvenidaAdmin() {
  const { user, isLoading } = useAuth();
  const ruta = usePathname() ?? '/';
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      olvidarBienvenida();
      return;
    }
    if (user.role !== 'admin') return;
    if (ruta.startsWith(RUTA_BIENVENIDA) || ruta === '/login' || ruta === '/register') return;
    if (bienvenidaYaVista()) return;
    router.replace(rutaBienvenida(ruta + window.location.search));
  }, [user, isLoading, ruta, router]);

  return null;
}
