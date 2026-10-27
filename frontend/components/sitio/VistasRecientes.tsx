'use client';

import { useEffect } from 'react';
import type { ApiProperty } from '@/services/api';
import TarjetaPropiedad from './TarjetaPropiedad';
import { useLista, vistasRecientes } from './listaLocal';

// «Vistas recientemente»: las últimas propiedades que se abrieron en este navegador (sin cuenta).
// Se quitan las que ya no existen o se vendieron/alquilaron.
export default function VistasRecientes({ propiedades, blue, excluir }: { propiedades: ApiProperty[]; blue: number | null; excluir?: string }) {
  const ids = useLista(vistasRecientes);
  const porId = new Map(propiedades.map((p) => [p._id, p]));
  const vigentes = ids.filter((id) => {
    const p = porId.get(id);
    return p && p.estado !== 'vendido' && p.estado !== 'alquilado';
  });

  // Limpia la lista guardada de las que ya no están publicadas (solo cuando ya llegaron las propiedades)
  useEffect(() => {
    if (propiedades.length && vigentes.length !== ids.length) vistasRecientes.guardar(vigentes);
  }, [propiedades.length, vigentes, ids.length]);

  const mostrar = vigentes.filter((id) => id !== excluir).map((id) => porId.get(id) as ApiProperty);
  if (!mostrar.length) return null;

  return (
    <section aria-labelledby="titulo-vistas" className="flex flex-col gap-6 border-t border-[#efe9df]/15 px-5 pb-16 pt-12 sm:px-10">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h2 id="titulo-vistas" className="font-display m-0 text-[clamp(28px,3vw,40px)] font-normal leading-none">
          Vistas recientemente
        </h2>
        <button type="button" onClick={() => vistasRecientes.guardar([])} className="calma-micro calma-link calma-link-sutil cursor-pointer text-[11px] text-[#efe9df]/70">
          Borrar historial
        </button>
      </div>
      <ul className="m-0 -mx-5 flex list-none snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-2 sm:-mx-10 sm:px-10">
        {mostrar.map((p) => (
          <li key={p._id} className="w-[min(78vw,300px)] shrink-0 snap-start">
            <TarjetaPropiedad propiedad={p} blue={blue} tamano="compacta" revelar={false} />
          </li>
        ))}
      </ul>
    </section>
  );
}
