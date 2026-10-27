'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { describirFiltros, getMisAvisos, quitarAviso, type Aviso } from '@/services/avisos';
import { direccionDeFiltros } from '@/components/catalogo/FiltrosCatalogo';

// Mi cuenta: los avisos activos (propiedades que espera y búsquedas guardadas), con opción de quitarlos
export default function MisAvisos() {
  const [avisos, setAvisos] = useState<Aviso[] | null>(null);
  const [error, setError] = useState('');
  const [quitando, setQuitando] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    getMisAvisos()
      .then((l) => activo && setAvisos(l))
      .catch((e: Error) => activo && setError(e.message || 'No pudimos cargar tus avisos.'));
    return () => {
      activo = false;
    };
  }, []);

  const quitar = async (id: string) => {
    setQuitando(id);
    try {
      await quitarAviso(id);
      setAvisos((l) => l?.filter((a) => a._id !== id) ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos quitar el aviso.');
    } finally {
      setQuitando(null);
    }
  };

  if (error) {
    return (
      <p role="alert" className="m-0 text-[15px] text-[#ff8b80]">
        {error}
      </p>
    );
  }
  if (!avisos) {
    return (
      <div aria-busy="true" className="flex flex-col gap-4">
        <span className="calma-brillo h-20 w-full" />
        <span className="calma-brillo h-20 w-full" />
      </div>
    );
  }
  if (avisos.length === 0) {
    return (
      <div className="flex flex-col items-start gap-5">
        <p className="m-0 max-w-xl text-[15px] leading-relaxed text-[#efe9df]/65">
          No tenés avisos activos. En el catálogo, con los filtros puestos, tocá «Avisame cuando entre algo así»; en una propiedad alquilada o reservada, la campanita te avisa cuando se libere.
        </p>
        <Link href="/propiedades" className="calma-micro calma-link text-[#efe9df]">
          Ir al catálogo
        </Link>
      </div>
    );
  }

  const grupos: { titulo: string; lista: Aviso[] }[] = [
    { titulo: 'Propiedades que esperás', lista: avisos.filter((a) => a.tipo === 'disponibilidad') },
    { titulo: 'Búsquedas guardadas', lista: avisos.filter((a) => a.tipo === 'busqueda') },
  ].filter((g) => g.lista.length);

  return (
    <div className="flex flex-col gap-12">
      {grupos.map((g) => (
        <section key={g.titulo} aria-label={g.titulo} className="flex flex-col gap-4">
          <h2 className="calma-micro m-0 text-[#efe9df]/55">{g.titulo}</h2>
          <ul className="m-0 flex list-none flex-col p-0">
            {g.lista.map((a) => (
              <li key={a._id} className="flex flex-wrap items-center justify-between gap-4 border-b border-[#efe9df]/12 py-5 first:pt-0">
                <div className="flex min-w-0 flex-col gap-1 [overflow-wrap:anywhere]">
                  {a.tipo === 'disponibilidad' ? (
                    a.propiedad ? (
                      <Link href={`/propiedades/${a.propiedad._id}`} className="calma-link calma-link-sutil self-start text-[18px]">
                        {a.propiedad.title}
                      </Link>
                    ) : (
                      <span className="text-[18px]">Propiedad que ya no está publicada</span>
                    )
                  ) : (
                    <Link
                      href={direccionDeFiltros({
                        operation: a.filtros?.operacion,
                        propertyType: a.filtros?.tipo,
                        location: a.filtros?.localidad,
                        minPrice: a.filtros?.precioMin != null ? String(a.filtros.precioMin) : '',
                        maxPrice: a.filtros?.precioMax != null ? String(a.filtros.precioMax) : '',
                        rooms: a.filtros?.ambientes != null ? String(a.filtros.ambientes) : '',
                        amenities: a.filtros?.comodidad,
                      })}
                      className="calma-link calma-link-sutil self-start text-[18px]"
                    >
                      {describirFiltros(a.filtros)}
                    </Link>
                  )}
                  <span className="text-[14px] text-[#efe9df]/60">
                    {a.tipo === 'disponibilidad' ? 'Te escribimos cuando vuelva a estar disponible.' : a.avisadoEn ? `Último aviso: ${new Date(a.avisadoEn).toLocaleDateString('es-AR')}` : 'Te escribimos cuando entre algo así.'}
                  </span>
                </div>
                <button type="button" onClick={() => quitar(a._id)} disabled={quitando === a._id} className="calma-micro calma-link calma-link-sutil cursor-pointer text-[11px] text-[#efe9df]/70 disabled:opacity-60">
                  {quitando === a._id ? 'Quitando…' : 'Quitar aviso'}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
