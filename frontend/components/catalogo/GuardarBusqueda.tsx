'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { guardarBusqueda } from '@/services/avisos';
import { direccionDeFiltros, type FiltrosPropiedades } from './FiltrosCatalogo';

// 221: «Avisame cuando entre algo así»: guarda los filtros del catálogo y manda un mail cuando se publica
// una propiedad que coincide. Sin sesión lleva a ingresar y vuelve con los mismos filtros.
export default function GuardarBusqueda({ filtros }: { filtros: FiltrosPropiedades }) {
  const { user } = useAuth();
  const router = useRouter();
  const [estado, setEstado] = useState<'listo' | 'guardando' | 'guardada'>('listo');
  const [error, setError] = useState('');
  const conFiltros = Object.entries(filtros).some(([clave, valor]) => clave !== 'status' && valor);
  if (!conFiltros || user?.role === 'admin') return null;

  const guardar = async () => {
    if (!user) {
      // Al volver de ingresar, el catálogo se abre con los mismos filtros
      router.push(`/login?volver=${encodeURIComponent(direccionDeFiltros(filtros))}`);
      return;
    }
    setEstado('guardando');
    setError('');
    try {
      await guardarBusqueda(filtros);
      setEstado('guardada');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos guardar la búsqueda.');
      setEstado('listo');
    }
  };

  return estado === 'guardada' ? (
    <p role="status" className="m-0 flex flex-wrap items-center gap-x-3 text-[14px] text-[#efe9df]/80">
      ✓ Te avisamos por mail cuando entre algo así.
      <Link href="/avisos" className="calma-micro calma-link text-[11px]">
        Ver mis avisos
      </Link>
    </p>
  ) : (
    <div className="flex flex-col gap-1">
      <button type="button" onClick={guardar} disabled={estado === 'guardando'} className="calma-micro calma-link inline-flex cursor-pointer items-center gap-2 self-start text-[12px] disabled:opacity-60">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {estado === 'guardando' ? 'Guardando…' : 'Avisame cuando entre algo así'}
      </button>
      {error && (
        <p role="alert" className="m-0 text-[13px] text-[#ffb4ad]">
          {error}
        </p>
      )}
    </div>
  );
}
