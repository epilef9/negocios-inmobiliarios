'use client';

import { Suspense } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { puedeVer } from '@/lib/permisos';
import Icono from '@/components/panel/Icono';
import ReservasPorDias from '@/components/panel/reservas/ReservasPorDias';
import ReservasConSena from '@/components/panel/reservas/ReservasConSena';

// Panel → Reservas: una sola pantalla para lo que es una reserva, con dos pestañas.
//  - Por días: estadías en propiedades de alquiler temporario que los clientes piden desde el sitio (HU-20, HU-36).
//  - Con seña: propiedades en venta o alquiler apartadas con una seña (HU-13).
// Una solicitud (Panel → Solicitudes) es otra cosa: el pedido para alquilar o comprar con la documentación.
// Los permisos siguen separados: un empleado ve solo las pestañas que tiene habilitadas.

type Tipo = 'dias' | 'sena';

const TIPOS: { id: Tipo; texto: string; ayuda: string }[] = [
  { id: 'dias', texto: 'Por días', ayuda: 'Estadías que los clientes piden desde el sitio en propiedades de alquiler temporario.' },
  { id: 'sena', texto: 'Con seña', ayuda: 'Propiedades en venta o alquiler apartadas con una seña hasta una fecha límite.' },
];

function Selector({ tipo, disponibles, alCambiar }: { tipo: Tipo; disponibles: Tipo[]; alCambiar: (t: Tipo) => void }) {
  const actual = TIPOS.find((t) => t.id === tipo)!;
  return (
    <div data-guia="tipos" className="-mt-2 mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
      {disponibles.length > 1 && (
        <div role="tablist" aria-label="Tipo de reserva" className="flex shrink-0 gap-1 self-start rounded-lg bg-panel-hundido p-1">
          {TIPOS.filter((t) => disponibles.includes(t.id)).map((t) => {
            const activa = t.id === tipo;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={activa}
                onClick={() => alCambiar(t.id)}
                className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${activa ? 'bg-panel-superficie text-panel-texto shadow-sm' : 'text-panel-suave hover:text-panel-texto'}`}
              >
                <Icono nombre={t.id === 'dias' ? 'maleta' : 'candado'} className="h-4 w-4" />
                {t.texto}
              </button>
            );
          })}
        </div>
      )}
      <p className="m-0 text-[13px] text-panel-suave">{actual.ayuda}</p>
    </div>
  );
}

function Reservas() {
  const { user } = useAuth();
  const router = useRouter();
  const ruta = usePathname();
  const pedido: Tipo = useSearchParams().get('tipo') === 'sena' ? 'sena' : 'dias';
  const disponibles = TIPOS.map((t) => t.id).filter((t) => puedeVer(user, t === 'dias' ? 'reservas' : 'senas'));
  // Si la persona no tiene permiso para la pestaña pedida, se muestra la que sí tiene
  const tipo: Tipo = disponibles.includes(pedido) ? pedido : disponibles[0] ?? 'dias';
  const cambiar = (t: Tipo) => router.replace(t === 'sena' ? `${ruta}?tipo=sena` : ruta, { scroll: false });
  const selector = <Selector tipo={tipo} disponibles={disponibles} alCambiar={cambiar} />;
  return tipo === 'sena' ? <ReservasConSena key="sena" selector={selector} /> : <ReservasPorDias key="dias" selector={selector} />;
}

export default function ReservasPage() {
  return (
    <Suspense>
      <Reservas />
    </Suspense>
  );
}
