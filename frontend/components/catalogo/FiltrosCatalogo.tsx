'use client';

import { useId, useState } from 'react';

export type FiltrosPropiedades = {
  operation: string;
  location: string;
  propertyType: string;
  minPrice: string;
  maxPrice: string;
  rooms: string;
  amenities: string;
  status: string;
};

export const FILTROS_VACIOS: FiltrosPropiedades = {
  operation: '',
  location: '',
  propertyType: '',
  minPrice: '',
  maxPrice: '',
  rooms: '',
  amenities: '',
  status: '',
};

export const OPERACIONES = [
  { value: 'venta', label: 'Comprar' },
  { value: 'alquiler', label: 'Alquilar' },
  { value: 'temporario', label: 'Por días' },
];

export const TIPOS = [
  { value: 'casa', label: 'Casa' },
  { value: 'departamento', label: 'Departamento' },
  { value: 'local', label: 'Local' },
  { value: 'terreno', label: 'Terreno' },
];

export const COMODIDADES = [
  { value: 'aire', label: 'Aire acondicionado' },
  { value: 'ascensor', label: 'Ascensor' },
  { value: 'cocina', label: 'Cocina equipada' },
  { value: 'balcon', label: 'Balcón' },
  { value: 'wifi', label: 'Wifi' },
  { value: 'tv', label: 'TV' },
  { value: 'seguridad', label: 'Seguridad 24 h' },
  { value: 'cochera_cubierta', label: 'Cochera cubierta' },
  { value: 'calefaccion', label: 'Calefacción' },
  { value: 'pileta', label: 'Pileta' },
  { value: 'parrilla', label: 'Parrilla' },
  { value: 'laundry', label: 'Laundry' },
];

const ESTADOS = [
  { value: 'disponible', label: 'Disponible' },
  { value: 'reservado', label: 'Reservada' },
  { value: 'alquilado', label: 'Alquilada' },
  { value: 'vendido', label: 'Vendida' },
];

const campo = 'flex flex-col gap-2.5 border-[#efe9df]/20 py-5';
const etiqueta = 'calma-micro text-[#efe9df]/70';
const control =
  'font-display w-full min-w-0 appearance-none border-0 bg-transparent p-0 text-[22px] text-[#efe9df] placeholder:text-[#efe9df]/40 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#efe9df] [&>option]:text-[#071733]';

// Celda de filtro: al pasar el mouse se ilumina, para que se note que se puede tocar
const celdaInteractiva = 'group cursor-pointer transition-colors duration-500 hover:bg-[#efe9df]/[0.04]';

// Desplegable con flecha: el navegador no la muestra (appearance-none), así que se dibuja aparte
function Desplegable({ value, onChange, children }: { value: string; onChange: (valor: string) => void; children: React.ReactNode }) {
  return (
    <span className="relative flex items-center">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${control} cursor-pointer pr-9 transition-colors duration-500 group-hover:text-white`}
      >
        {children}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        className="pointer-events-none absolute right-1 h-4 w-4 text-[#efe9df]/55 transition duration-500 group-hover:text-[#efe9df] motion-safe:group-hover:translate-y-0.5"
      >
        <path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

// Campo de número: muestra una línea al pasar el mouse, como un renglón para escribir
const numeroInteractivo = 'cursor-text border-b border-transparent pb-1 transition-colors duration-500 group-hover:border-[#efe9df]/35 focus:border-[#efe9df]';

const etiquetaDe = (lista: { value: string; label: string }[], valor: string) => lista.find((item) => item.value === valor)?.label ?? valor;
const dolares = (valor: string) => `USD ${Number(valor).toLocaleString('es-AR')}`;

// Un chip por cada filtro puesto, en el mismo orden que la barra, para poder sacarlos de a uno
function filtrosActivos(f: FiltrosPropiedades): { clave: keyof FiltrosPropiedades; texto: string }[] {
  const lista: { clave: keyof FiltrosPropiedades; texto: string }[] = [];
  if (f.operation) lista.push({ clave: 'operation', texto: etiquetaDe(OPERACIONES, f.operation) });
  if (f.location) lista.push({ clave: 'location', texto: f.location });
  if (f.propertyType) lista.push({ clave: 'propertyType', texto: etiquetaDe(TIPOS, f.propertyType) });
  if (f.minPrice) lista.push({ clave: 'minPrice', texto: `Desde ${dolares(f.minPrice)}` });
  if (f.maxPrice) lista.push({ clave: 'maxPrice', texto: `Hasta ${dolares(f.maxPrice)}` });
  if (f.rooms) lista.push({ clave: 'rooms', texto: `${f.rooms}+ ambientes` });
  if (f.amenities) lista.push({ clave: 'amenities', texto: etiquetaDe(COMODIDADES, f.amenities) });
  if (f.status) lista.push({ clave: 'status', texto: etiquetaDe(ESTADOS, f.status) });
  return lista;
}

function IconoCruz({ className = 'h-3 w-3' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className={className}>
      <path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

type Props = {
  filtros: FiltrosPropiedades;
  localidades: string[];
  onCambiar: (filtros: FiltrosPropiedades) => void;
  onLimpiar: () => void;
};

export default function FiltrosCatalogo({ filtros, localidades, onCambiar, onLimpiar }: Props) {
  const id = useId();
  const extrasActivos = [filtros.minPrice, filtros.rooms, filtros.amenities, filtros.status].filter(Boolean).length;
  const [abierto, setAbierto] = useState(extrasActivos > 0);
  const activos = filtrosActivos(filtros);
  const hayFiltros = activos.length > 0;
  const cambiar = (clave: keyof FiltrosPropiedades, valor: string) => onCambiar({ ...filtros, [clave]: valor });

  return (
    <form role="search" aria-label="Filtrar propiedades" onSubmit={(e) => e.preventDefault()} className="border-y border-[#efe9df]/20">
      <div className="grid grid-cols-2 lg:grid-cols-[minmax(0,1.35fr)_repeat(3,minmax(0,1fr))_auto]">
        <div className={`${campo} col-span-2 lg:col-span-1 lg:pr-6`}>
          <span className={etiqueta} id={`${id}-op`}>
            Quiero
          </span>
          <div role="group" aria-labelledby={`${id}-op`} className="font-display flex flex-wrap gap-x-5 gap-y-1 text-[22px]">
            {[{ value: '', label: 'Todo' }, ...OPERACIONES].map((op) => {
              const activa = filtros.operation === op.value;
              return (
                <button
                  key={op.value || 'todo'}
                  type="button"
                  aria-pressed={activa}
                  onClick={() => cambiar('operation', op.value)}
                  className={`relative cursor-pointer border-b pb-0.5 transition-colors duration-500 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#efe9df] ${
                    activa
                      ? 'border-[#d9382b] text-[#efe9df]'
                      : 'border-transparent text-[#efe9df]/55 after:absolute after:inset-x-0 after:-bottom-px after:h-px after:origin-left after:scale-x-0 after:bg-[#efe9df]/70 after:transition-transform after:duration-500 hover:text-[#efe9df] hover:after:scale-x-100'
                  }`}
                >
                  {op.label}
                </button>
              );
            })}
          </div>
        </div>
        <label className={`${campo} ${celdaInteractiva} border-t pr-4 lg:border-l lg:border-t-0 lg:px-6`}>
          <span className={etiqueta}>En</span>
          <Desplegable value={filtros.location} onChange={(valor) => cambiar('location', valor)}>
            <option value="">Toda la zona</option>
            {localidades.map((nombre) => (
              <option key={nombre} value={nombre}>
                {nombre}
              </option>
            ))}
          </Desplegable>
        </label>
        <label className={`${campo} ${celdaInteractiva} border-l border-t pl-4 lg:border-t-0 lg:px-6`}>
          <span className={etiqueta}>Tipo</span>
          <Desplegable value={filtros.propertyType} onChange={(valor) => cambiar('propertyType', valor)}>
            <option value="">Cualquiera</option>
            {TIPOS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Desplegable>
        </label>
        <label className={`${campo} group cursor-text border-t pr-4 lg:border-l lg:border-t-0 lg:px-6`}>
          <span className={etiqueta}>Hasta USD</span>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            step="1000"
            placeholder="Sin tope"
            value={filtros.maxPrice}
            onChange={(e) => cambiar('maxPrice', e.target.value)}
            className={`${control} ${numeroInteractivo}`}
          />
        </label>
        <div className="flex items-center gap-5 border-l border-t border-[#efe9df]/20 py-5 pl-4 lg:border-t-0 lg:pl-6">
          <button
            type="button"
            aria-expanded={abierto}
            aria-controls={`${id}-mas`}
            onClick={() => setAbierto((v) => !v)}
            className="calma-micro group/mas flex cursor-pointer items-center gap-2.5 whitespace-nowrap rounded-full border border-[#efe9df]/30 px-4 py-2.5 transition-colors duration-500 hover:border-[#efe9df] hover:bg-[#efe9df]/[0.06]"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              className={`h-3.5 w-3.5 transition-transform duration-500 ${abierto ? 'rotate-45' : 'motion-safe:group-hover/mas:rotate-90'}`}
            >
              <path d="M8 2v12M2 8h12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            {abierto ? 'Menos filtros' : 'Más filtros'}
            {extrasActivos > 0 && ` (${extrasActivos})`}
          </button>
          {hayFiltros && (
            <button
              type="button"
              onClick={onLimpiar}
              className="calma-micro filtro-limpiar hidden cursor-pointer items-center gap-2 whitespace-nowrap text-[#efe9df]/70 transition-colors duration-300 hover:text-[#efe9df] sm:inline-flex"
            >
              <IconoCruz />
              Limpiar ({activos.length})
            </button>
          )}
        </div>
      </div>

      {abierto && (
        <div id={`${id}-mas`} className="grid grid-cols-2 border-t border-[#efe9df]/20 lg:grid-cols-4">
          <label className={`${campo} group cursor-text pr-4 lg:pr-6`}>
            <span className={etiqueta}>Desde USD</span>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              step="1000"
              placeholder="Sin mínimo"
              value={filtros.minPrice}
              onChange={(e) => cambiar('minPrice', e.target.value)}
              className={`${control} ${numeroInteractivo}`}
            />
          </label>
          <label className={`${campo} ${celdaInteractiva} border-l pl-4 lg:px-6`}>
            <span className={etiqueta}>Ambientes</span>
            <Desplegable value={filtros.rooms} onChange={(valor) => cambiar('rooms', valor)}>
              <option value="">Cualquiera</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n === 1 ? '1 o más' : `${n} o más`}
                </option>
              ))}
            </Desplegable>
          </label>
          <label className={`${campo} ${celdaInteractiva} border-t pr-4 lg:border-l lg:border-t-0 lg:px-6`}>
            <span className={etiqueta}>Con</span>
            <Desplegable value={filtros.amenities} onChange={(valor) => cambiar('amenities', valor)}>
              <option value="">Cualquier comodidad</option>
              {COMODIDADES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Desplegable>
          </label>
          <label className={`${campo} ${celdaInteractiva} border-l border-t pl-4 lg:border-t-0 lg:px-6`}>
            <span className={etiqueta}>Estado</span>
            <Desplegable value={filtros.status} onChange={(valor) => cambiar('status', valor)}>
              <option value="">Todas</option>
              {ESTADOS.map((e) => (
                <option key={e.value} value={e.value}>
                  {e.label}
                </option>
              ))}
            </Desplegable>
          </label>
        </div>
      )}

      {hayFiltros && (
        <div className="flex items-center gap-3 border-t border-[#efe9df]/20 py-4">
          <ul aria-label="Filtros aplicados" className="m-0 flex min-w-0 flex-1 list-none gap-2 overflow-x-auto p-0 [mask-image:linear-gradient(to_right,#000_82%,transparent)] [scrollbar-width:none] sm:flex-wrap sm:overflow-visible sm:[mask-image:none]">
            {activos.map(({ clave, texto }) => (
              <li key={clave} className="filtro-chip shrink-0">
                <button
                  type="button"
                  onClick={() => cambiar(clave, '')}
                  aria-label={`Quitar filtro: ${texto}`}
                  className="group/chip flex min-h-9 cursor-pointer items-center gap-2 rounded-full border border-[#efe9df]/25 py-1.5 pl-3.5 pr-3 text-[13px] text-[#efe9df]/85 transition-colors duration-300 hover:border-[#d9382b] hover:text-[#efe9df] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#efe9df]"
                >
                  {texto}
                  <IconoCruz className="h-3 w-3 text-[#efe9df]/50 transition-colors duration-300 group-hover/chip:text-[#d9382b]" />
                </button>
              </li>
            ))}
          </ul>
          {/* En la compu el "Limpiar" ya está en la fila principal; en el celular va acá */}
          <div className="shrink-0 sm:hidden">
            <button type="button" onClick={onLimpiar} className="calma-micro calma-link calma-link-sutil cursor-pointer whitespace-nowrap">
              Limpiar todo
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
