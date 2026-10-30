'use client';

// Proteccion del panel de administracion (RF-09 / RNF-05)
// Solo usuarios autenticados con rol admin pueden acceder.

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import PanelMarco from '@/components/panel/PanelMarco';

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

    if (user.role !== 'admin') {
      router.replace('/');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="panel flex min-h-dvh items-center justify-center text-sm text-panel-suave">Verificando acceso…</div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="panel flex min-h-dvh items-center justify-center text-sm text-panel-suave">Redirigiendo…</div>
    );
  }

  // La bienvenida ocupa toda la pantalla, sin el menú del panel
  // El recibo de alquiler es una hoja para imprimir, también sin el menú
  if (ruta === '/admin/bienvenida' || ruta.startsWith('/admin/cobros/recibo/')) return <>{children}</>;

  return <PanelMarco>{children}</PanelMarco>;
}
