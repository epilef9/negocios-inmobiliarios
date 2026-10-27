'use client';

import Link from 'next/link';
import { useState } from 'react';
import { MAXIMO_COMPARAR, alternarComparar, paraComparar, useLista } from './listaLocal';

// Agrega o quita la propiedad de la comparación (hasta 3). Con 2 o más, ofrece ir a compararlas.
export default function BotonComparar({ propiedadId }: { propiedadId: string }) {
  const lista = useLista(paraComparar);
  const [aviso, setAviso] = useState('');
  const elegida = lista.includes(propiedadId);

  const alternar = () => {
    const resultado = alternarComparar(propiedadId);
    setAviso(resultado === 'llena' ? `Podés comparar hasta ${MAXIMO_COMPARAR}. Quitá una para sumar esta.` : '');
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button type="button" onClick={alternar} aria-pressed={elegida} className="calma-micro calma-link cursor-pointer text-[12px]">
        {elegida ? '✓ En la comparación' : 'Comparar con otras'}
      </button>
      {elegida && lista.length >= 2 && (
        <Link href="/comparar" className="calma-micro calma-link calma-link-sutil text-[11px] text-[#efe9df]/70">
          Ver comparación ({lista.length})
        </Link>
      )}
      {aviso && (
        <p role="status" className="m-0 text-center text-[13px] text-[#ffb4ad]">
          {aviso}{' '}
          <Link href="/comparar" className="calma-link">
            Ir a comparar
          </Link>
        </p>
      )}
    </div>
  );
}
