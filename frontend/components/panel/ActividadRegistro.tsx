'use client';

import { useState } from 'react';
import { getActividadDe, textoActividad, type EntidadActividad, type RegistroActividad } from '@/services/actividad';

// Historial de lo que hizo el personal sobre una visita, reserva, solicitud, propiedad, etc.
// («Confirmada por Araceli el 27/10 a las 10:15»). Se carga recién al tocar «Ver actividad»,
// para no hacer un pedido por cada fila de una lista larga.
export default function ActividadRegistro({ entidad, id, className = '' }: { entidad: EntidadActividad; id: string; className?: string }) {
  const [registros, setRegistros] = useState<RegistroActividad[] | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(false);

  const cargar = async () => {
    if (registros) return setRegistros(null); // segundo toque: la oculta
    setCargando(true);
    setError(false);
    try {
      setRegistros(await getActividadDe(entidad, id));
    } catch {
      setError(true);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className={`text-[12.5px] text-panel-suave ${className}`}>
      <button type="button" onClick={cargar} className="cursor-pointer bg-transparent p-0 text-[12.5px] underline underline-offset-2 hover:text-panel-texto" aria-expanded={Boolean(registros)}>
        {cargando ? 'Cargando…' : registros ? 'Ocultar actividad' : 'Ver actividad'}
      </button>
      {error && <p role="alert" className="m-0 mt-1">No se pudo cargar la actividad.</p>}
      {registros && (
        registros.length === 0 ? (
          <p className="m-0 mt-1">Todavía no hay actividad registrada.</p>
        ) : (
          <ul className="m-0 mt-1 flex list-none flex-col gap-0.5 p-0">
            {registros.map((r) => (
              <li key={r.id}>
                {textoActividad(r)}
                {r.detalle ? ` · ${r.detalle}` : ''}
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}
