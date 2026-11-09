'use client';

// Proteccion del panel de administracion (RF-09 / RNF-05)
// Solo entra el personal: el administrador a todo y cada empleado a las secciones que tiene permitidas.
// El control real lo hace el backend en cada ruta; esto evita mostrar pantallas que no se pueden usar.

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import PanelMarco from '@/components/panel/PanelMarco';

import { esPersonal, puedeEntrarARuta } from '@/lib/permisos';
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const ruta = usePathname();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.replace('/login?volver=/admin');
      return;
    }

    if (!esPersonal(user)) {
      router.replace('/');
      return;
    }

    // Un empleado que escribe a mano la dirección de una sección que no tiene vuelve al Inicio del panel
    if (!puedeEntrarARuta(user, ruta)) {
      router.replace('/admin');
    }
  }, [user, isLoading, router, ruta]);

  if (isLoading) {
    return (
      <div className="panel flex min-h-dvh items-center justify-center text-sm text-panel-suave">Verificando acceso…</div>
    );
  }

  if (!user || !esPersonal(user) || !puedeEntrarARuta(user, ruta)) {
    return (
      <div className="panel flex min-h-dvh items-center justify-center text-sm text-panel-suave">Redirigiendo…</div>
    );
  }

  // La bienvenida ocupa toda la pantalla, sin el menú del panel
  // El recibo de alquiler es una hoja para imprimir, también sin el menú
  if (ruta === '/admin/bienvenida' || ruta.startsWith('/admin/cobros/recibo/')) return <>{children}</>;

  return <PanelMarco>{children}</PanelMarco>;
}
