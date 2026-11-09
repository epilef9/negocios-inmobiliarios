'use client';

import Link from 'next/link';
import { paraComparar, useLista } from './listaLocal';

// Aviso fijo abajo cuando hay propiedades elegidas para comparar
export default function BarraComparar() {
  const lista = useLista(paraComparar);
  if (!lista.length) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-40 flex justify-center px-4">
      <div className="pointer-events-auto flex items-center gap-4 rounded-full border border-[#efe9df]/20 bg-[#0b2048]/95 py-2 pl-5 pr-2 text-[14px] text-[#efe9df] shadow-2xl backdrop-blur">
        <span>{lista.length === 1 ? 'Elegiste 1 propiedad: sumá otra para comparar' : `${lista.length} propiedades para comparar`}</span>
        {lista.length >= 2 && (
          <Link href="/comparar" className="calma-micro rounded-full bg-[#efe9df] px-4 py-2.5 text-[11px] text-[#071733] hover:bg-white">
            Comparar
          </Link>
        )}
        <button type="button" onClick={() => paraComparar.guardar([])} className="calma-micro rounded-full px-3 py-2.5 text-[11px] text-[#efe9df]/70 hover:text-[#efe9df]">
          Borrar
        </button>
      </div>
    </div>
  );
}
