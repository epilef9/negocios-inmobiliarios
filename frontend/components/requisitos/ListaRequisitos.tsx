'use client';

import type { SeccionRequisitos } from './datos';

function Check() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

// Las casillas de una guía de requisitos. La usan la página de requisitos y el formulario de publicar
// (ahí se marcan sin salir de la página, así no se pierde lo cargado).
export default function ListaRequisitos({
  secciones,
  marcas,
  alternar,
  compacta = false,
}: {
  secciones: SeccionRequisitos[];
  marcas: Record<string, boolean>;
  alternar: (id: string) => void;
  compacta?: boolean;
}) {
  return (
    <div className={`flex flex-col ${compacta ? 'gap-6' : 'gap-12'}`}>
      {secciones.map((seccion) => (
        <fieldset key={seccion.titulo} className="m-0 min-w-0 border-0 p-0">
          <legend className="calma-micro mb-4 p-0 text-[#efe9df]/70">{seccion.titulo}</legend>
          <ul className="m-0 list-none border-t border-[#efe9df]/20 p-0">
            {seccion.items.map((item) => {
              const marcado = Boolean(marcas[item.id]);
              return (
                <li key={item.id} className="border-b border-[#efe9df]/20">
                  <label className={`group flex cursor-pointer items-start gap-4 ${compacta ? 'py-3' : 'py-5'}`}>
                    <input type="checkbox" checked={marcado} onChange={() => alternar(item.id)} className="peer sr-only" />
                    <span
                      aria-hidden="true"
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors duration-300 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#efe9df] ${
                        marcado
                          ? 'border-[#efe9df] bg-[#efe9df] text-[#071733]'
                          : 'border-[#efe9df]/40 text-transparent group-hover:border-[#efe9df]'
                      }`}
                    >
                      <Check />
                    </span>
                    <span
                      className={`${compacta ? 'text-[15px]' : 'text-[17px]'} leading-snug transition-colors duration-300 ${
                        marcado ? 'text-[#efe9df]' : 'text-[#efe9df]/75 group-hover:text-[#efe9df]'
                      }`}
                    >
                      {item.texto}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
      ))}
    </div>
  );
}
