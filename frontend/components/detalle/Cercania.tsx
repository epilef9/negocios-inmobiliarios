'use client';

import { useAjustes } from '@/components/sitio/useAjustes';
import { lugaresCercanos } from './cercania';

// A cuántas cuadras y minutos a pie quedan los lugares importantes (los carga el administrador en Ajustes)
export default function Cercania({ latitud, longitud, ciudad }: { latitud?: string; longitud?: string; ciudad?: string }) {
  const { lugares } = useAjustes();
  const lat = Number(latitud);
  const lng = Number(longitud);
  if (!latitud || !longitud || !Number.isFinite(lat) || !Number.isFinite(lng) || !lugares.length) return null;
  const cerca = lugaresCercanos(lat, lng, ciudad ?? '', lugares).slice(0, 6);
  if (!cerca.length) return null;

  return (
    <div className="flex flex-col gap-3">
      <h3 className="calma-micro m-0 text-[#efe9df]/60">Qué tenés cerca</h3>
      <ul className="m-0 grid list-none gap-x-6 gap-y-2.5 p-0 sm:grid-cols-2">
        {cerca.map((l) => (
          <li key={l.nombre} className="flex items-baseline justify-between gap-4 border-b border-[#efe9df]/10 pb-2.5 text-[15px]">
            <span>{l.nombre}</span>
            <span className="tabular shrink-0 text-[#efe9df]/70">
              {l.cuadras > 30 ? `${(l.metros / 1000).toFixed(1).replace('.', ',')} km` : `${l.cuadras} ${l.cuadras === 1 ? 'cuadra' : 'cuadras'} · ${l.minutos} min a pie`}
            </span>
          </li>
        ))}
      </ul>
      <p className="m-0 text-[12.5px] text-[#efe9df]/50">Distancias aproximadas, calculadas desde el punto del mapa.</p>
    </div>
  );
}
