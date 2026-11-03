'use client';

import { useRef, useState } from 'react';
import { fotoDeAncho, propsFoto } from '@/components/sitio/foto';

type Props = { imagenes: string[]; titulo: string };

// Galería de la propiedad: foto grande, flechas, contador y miniaturas
export default function Galeria({ imagenes, titulo }: Props) {
  const [actual, setActual] = useState(0);
  const total = imagenes.length;
  const mover = (paso: number) => setActual((i) => (i + paso + total) % total);
  // Deslizar con el dedo en el celular: más de 40 px de costado (y más de costado que de arriba a abajo)
  const toque = useRef<{ x: number; y: number } | null>(null);
  const alEmpezarToque = (e: React.TouchEvent) => {
    toque.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const alTerminarToque = (e: React.TouchEvent) => {
    if (!toque.current || total < 2) return;
    const dx = e.changedTouches[0].clientX - toque.current.x;
    const dy = e.changedTouches[0].clientY - toque.current.y;
    toque.current = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) mover(dx < 0 ? 1 : -1);
  };

  if (total === 0) {
    return (
      <div className="flex aspect-[16/9] max-h-[78vh] w-full items-center justify-center bg-[#0e2652] text-[14px] text-[#efe9df]/70">
        Esta propiedad todavía no tiene fotos.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        className="relative aspect-[4/3] max-h-[78vh] w-full touch-pan-y overflow-hidden bg-[#0e2652] sm:aspect-[16/9]"
        onTouchStart={alEmpezarToque}
        onTouchEnd={alTerminarToque}
        role="group"
        aria-roledescription="galería"
        aria-label={`Fotos de ${titulo}`}
        tabIndex={total > 1 ? 0 : -1}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') mover(1);
          if (e.key === 'ArrowLeft') mover(-1);
        }}
      >
        {imagenes.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element -- las imágenes vienen del backend con dominio variable
          <img
            key={src + i}
            {...propsFoto(src, "(min-width: 1024px) 66vw, 100vw", 1280)}
            alt={`${titulo}, foto ${i + 1} de ${total}`}
            aria-hidden={i !== actual}
            loading={i === 0 ? 'eager' : 'lazy'}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-out motion-reduce:transition-none ${
              i === actual ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ))}
        {total > 1 && (
          <>
            {[
              { paso: -1, texto: 'Foto anterior', trazo: 'm15 6-6 6 6 6', lado: 'left-4' },
              { paso: 1, texto: 'Foto siguiente', trazo: 'm9 6 6 6-6 6', lado: 'right-4' },
            ].map((b) => (
              <button
                key={b.paso}
                type="button"
                onClick={() => mover(b.paso)}
                aria-label={b.texto}
                className={`absolute top-1/2 ${b.lado} flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-[#071733]/55 text-[#efe9df] backdrop-blur-sm transition-colors hover:bg-[#071733]/85`}
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d={b.trazo} />
                </svg>
              </button>
            ))}
            <span aria-live="polite" className="calma-micro absolute bottom-4 right-4 rounded-full bg-[#071733]/70 px-3 py-1.5 tabular-nums backdrop-blur-sm">
              {actual + 1} / {total}
            </span>
          </>
        )}
      </div>
      {total > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {imagenes.map((src, i) => (
            <button
              key={src + i}
              type="button"
              onClick={() => setActual(i)}
              aria-label={`Ver foto ${i + 1}`}
              aria-current={i === actual}
              className={`h-16 w-24 shrink-0 overflow-hidden transition-opacity sm:h-20 sm:w-32 ${i === actual ? 'opacity-100 ring-1 ring-[#efe9df]' : 'opacity-50 hover:opacity-90'}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- miniatura de una imagen del backend */}
              <img src={fotoDeAncho(src, 256)} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
