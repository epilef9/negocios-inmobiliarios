'use client';

import type { EstadisticaPropia, Totales } from '@/services/estadisticas';

// Los números de una propiedad para su dueño: cuánta gente la vio y qué hizo después, y las vistas día por día.

const NUMEROS: { campo: keyof Totales; uno: string; varios: string }[] = [
  { campo: 'vistas', uno: 'vista', varios: 'vistas' },
  { campo: 'whatsapp', uno: 'consulta por WhatsApp', varios: 'consultas por WhatsApp' },
  { campo: 'visitas', uno: 'visita pedida', varios: 'visitas pedidas' },
  { campo: 'favoritos', uno: 'la guardó', varios: 'la guardaron' },
  { campo: 'solicitudes', uno: 'solicitud', varios: 'solicitudes' },
];

const fechaCorta = (dia: string) => new Date(`${dia}T12:00:00Z`).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', timeZone: 'UTC' });

export function NumerosPropiedad({ totales, className = '' }: { totales: Totales; className?: string }) {
  return (
    <dl className={`m-0 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-5 ${className}`}>
      {NUMEROS.map((n) => (
        <div key={n.campo} className="flex min-w-0 flex-col gap-1">
          <dt className="order-2 text-[13px] leading-snug text-[#efe9df]/60">{totales[n.campo] === 1 ? n.uno : n.varios}</dt>
          <dd className="font-display tabular order-1 m-0 text-[30px] leading-none text-[#efe9df]">{totales[n.campo].toLocaleString('es-AR')}</dd>
        </div>
      ))}
    </dl>
  );
}

// Barras de vistas por día. Para lectores de pantalla alcanza con el resumen: el día con más vistas.
function VistasPorDia({ serie }: { serie: EstadisticaPropia['serie'] }) {
  const maximo = Math.max(1, ...serie.map((d) => d.vistas));
  const mejor = serie.reduce((a, b) => (b.vistas > a.vistas ? b : a), serie[0]);
  if (!serie.length) return null;
  return (
    <figure className="m-0 flex flex-col gap-2">
      <div aria-hidden="true" className="flex h-14 items-end gap-[2px]">
        {serie.map((d) => (
          <span
            key={d.dia}
            title={`${fechaCorta(d.dia)}: ${d.vistas} ${d.vistas === 1 ? 'vista' : 'vistas'}`}
            className={`min-w-0 flex-1 rounded-t-[2px] ${d.vistas ? 'bg-[#efe9df]/70' : 'bg-[#efe9df]/12'}`}
            style={{ height: `${d.vistas ? Math.max(8, (d.vistas / maximo) * 100) : 4}%` }}
          />
        ))}
      </div>
      <figcaption className="flex justify-between gap-4 text-[12px] text-[#efe9df]/50">
        <span>{fechaCorta(serie[0].dia)}</span>
        <span className="text-center">{mejor?.vistas ? `El día con más vistas fue el ${fechaCorta(mejor.dia)} (${mejor.vistas})` : 'Sin vistas en este período'}</span>
        <span>{fechaCorta(serie[serie.length - 1].dia)}</span>
      </figcaption>
    </figure>
  );
}

export default function EstadisticasPropiedad({ datos, dias }: { datos: EstadisticaPropia; dias: number }) {
  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-[#efe9df]/15 p-5">
      <p className="calma-micro m-0 text-[#efe9df]/60">Últimos {dias} días</p>
      <NumerosPropiedad totales={datos} />
      <VistasPorDia serie={datos.serie} />
    </div>
  );
}
