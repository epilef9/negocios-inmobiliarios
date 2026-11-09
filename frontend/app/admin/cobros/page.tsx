'use client';

import { Suspense } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Icono from '@/components/panel/Icono';
import CobrosAlquileres from '@/components/panel/cobros/CobrosAlquileres';
import PagosEstadias from '@/components/panel/cobros/PagosEstadias';

// Panel → Cobros: lo que entra de plata, en dos pestañas.
//  - Alquileres: el alquiler de cada mes según los contratos vigentes, con su recibo.
//  - Pagos de estadías: señas y pagos de alquileres temporarios hechos desde el sitio, con el comprobante del cliente (HU-41).

type Tipo = 'alquileres' | 'estadias';

const TIPOS: { id: Tipo; texto: string; ayuda: string }[] = [
  { id: 'alquileres', texto: 'Alquileres', ayuda: 'El alquiler de cada mes según los contratos vigentes.' },
  { id: 'estadias', texto: 'Pagos de estadías', ayuda: 'Señas y pagos de alquileres temporarios que los clientes hacen desde el sitio.' },
];

function Selector({ tipo, alCambiar }: { tipo: Tipo; alCambiar: (t: Tipo) => void }) {
  const actual = TIPOS.find((t) => t.id === tipo)!;
  return (
    <div data-guia="tipos" className="-mt-2 mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
      <div role="tablist" aria-label="Tipo de cobro" className="flex shrink-0 gap-1 self-start rounded-lg bg-panel-hundido p-1">
        {TIPOS.map((t) => {
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
              <Icono nombre={t.id === 'alquileres' ? 'documento' : 'maleta'} className="h-4 w-4" />
              {t.texto}
            </button>
          );
        })}
      </div>
      <p className="m-0 text-[13px] text-panel-suave">{actual.ayuda}</p>
    </div>
  );
}

function Cobros() {
  const router = useRouter();
  const ruta = usePathname();
  const tipo: Tipo = useSearchParams().get('tipo') === 'estadias' ? 'estadias' : 'alquileres';
  const cambiar = (t: Tipo) => router.replace(t === 'estadias' ? `${ruta}?tipo=estadias` : ruta, { scroll: false });
  const selector = <Selector tipo={tipo} alCambiar={cambiar} />;
  return tipo === 'estadias' ? <PagosEstadias key="estadias" selector={selector} /> : <CobrosAlquileres key="alquileres" selector={selector} />;
}

export default function CobrosPage() {
  return (
    <Suspense>
      <Cobros />
    </Suspense>
  );
}
