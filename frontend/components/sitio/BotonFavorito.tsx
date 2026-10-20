'use client';

import { useState } from 'react';
import { useFavoritos } from './favoritos';

type Props = {
  propiedadId: string;
  titulo: string;
  variante?: 'flotante' | 'texto';
  className?: string;
};

function Corazon({ lleno }: { lleno: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill={lleno ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <path d="M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.6 3.9 4.5 7.2 4.5c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8 3.3 0 5.6 3.1 4.4 6.6-1.7 4.8-9.2 9.4-9.2 9.4Z" />
    </svg>
  );
}

// Guarda o quita la propiedad de los favoritos de la cuenta
export default function BotonFavorito({ propiedadId, titulo, variante = 'flotante', className = '' }: Props) {
  const { esFavorito, alternar, conSesion } = useFavoritos();
  const [error, setError] = useState<string | null>(null);
  const guardada = esFavorito(propiedadId);
  const accion = guardada ? `Quitar ${titulo} de favoritos` : `Guardar ${titulo} en favoritos`;

  const alHacerClick = async (evento: React.MouseEvent) => {
    evento.preventDefault();
    evento.stopPropagation();
    setError(null);
    try {
      await alternar(propiedadId);
    } catch (e) {
      const motivo = e instanceof Error ? e.message : 'Error desconocido';
      console.error(`[favoritos] No se pudo actualizar ${propiedadId}: ${motivo}`);
      setError(motivo);
    }
  };

  if (variante === 'texto') {
    return (
      <div className={className}>
        <button
          type="button"
          onClick={alHacerClick}
          aria-pressed={guardada}
          className={`calma-micro flex w-full items-center justify-center gap-2.5 rounded-full border px-6 py-4 text-[12px] transition-colors duration-500 ${
            guardada ? 'border-[#efe9df] bg-[#efe9df]/10' : 'border-[#efe9df]/40 hover:border-[#efe9df]'
          }`}
        >
          <span className={guardada ? 'text-[#ff6b5e]' : ''}>
            <Corazon lleno={guardada} />
          </span>
          {guardada ? 'Guardada en favoritos' : conSesion ? 'Guardar en favoritos' : 'Ingresá para guardarla'}
        </button>
        {error && (
          <p role="alert" className="mt-2 text-[13px] text-[#ffb4ad]">
            No pudimos guardarla ({error}). Probá de nuevo.
          </p>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={alHacerClick}
      aria-pressed={guardada}
      aria-label={accion}
      title={error ? `No pudimos guardarla (${error}). Probá de nuevo.` : accion}
      className={`flex h-11 w-11 items-center justify-center rounded-full backdrop-blur-sm transition-[background-color,transform] duration-500 active:scale-90 ${
        guardada ? 'bg-[#efe9df] text-[#d9382b]' : 'bg-[#071733]/55 text-[#efe9df] hover:bg-[#071733]/80'
      } ${error ? 'ring-2 ring-[#ff6b5e]' : ''} ${className}`}
    >
      <Corazon lleno={guardada} />
    </button>
  );
}
