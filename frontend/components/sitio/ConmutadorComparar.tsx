'use client';

import { useState } from 'react';
import { MAXIMO_COMPARAR, alternarComparar, paraComparar, useLista } from './listaLocal';

// Botón redondo de la tarjeta para sumar o quitar la propiedad de la comparación
export default function ConmutadorComparar({ propiedadId, titulo, className = '' }: { propiedadId: string; titulo: string; className?: string }) {
  const lista = useLista(paraComparar);
  const [llena, setLlena] = useState(false);
  const elegida = lista.includes(propiedadId);

  const alternar = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const r = alternarComparar(propiedadId);
    setLlena(r === 'llena');
    if (r === 'llena') setTimeout(() => setLlena(false), 3000);
  };

  return (
    <span className={`flex flex-col items-end gap-1 ${className}`}>
      <button
        type="button"
        onClick={alternar}
        aria-pressed={elegida}
        aria-label={elegida ? `Quitar ${titulo} de la comparación` : `Comparar ${titulo}`}
        title={elegida ? 'Quitar de la comparación' : 'Comparar'}
        className={`flex h-11 w-11 items-center justify-center rounded-full backdrop-blur-sm transition-colors ${
          elegida ? 'bg-[#efe9df] text-[#071733]' : 'bg-[#071733]/55 text-[#efe9df] hover:bg-[#071733]/80'
        }`}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 8h14l-3.5-3.5M20 16H6l3.5 3.5" />
        </svg>
      </button>
      {llena && (
        <span role="status" className="rounded-lg bg-[#071733] px-2.5 py-1.5 text-[12px] text-[#efe9df] shadow-lg">
          Hasta {MAXIMO_COMPARAR} propiedades
        </span>
      )}
    </span>
  );
}
