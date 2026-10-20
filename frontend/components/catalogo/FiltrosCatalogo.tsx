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
  { value: 'monoambiente', label: 'Monoambiente' },
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
  const hayFiltros = Object.values(filtros).some(Boolean);
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
                  className={`border-b pb-0.5 transition-colors duration-500 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#efe9df] ${
                    activa ? 'border-[#d9382b] text-[#efe9df]' : 'border-transparent text-[#efe9df]/55 hover:text-[#efe9df]'
                  }`}
                >
                  {op.label}
                </button>
              );
            })}
          </div>
        </div>
        <label className={`${campo} border-t pr-4 lg:border-l lg:border-t-0 lg:px-6`}>
          <span className={etiqueta}>En</span>
          <select value={filtros.location} onChange={(e) => cambiar('location', e.target.value)} className={control}>
            <option value="">Toda la zona</option>
            {localidades.map((nombre) => (
              <option key={nombre} value={nombre}>
                {nombre}
              </option>
            ))}
          </select>
        </label>
        <label className={`${campo} border-l border-t pl-4 lg:border-t-0 lg:px-6`}>
          <span className={etiqueta}>Tipo</span>
          <select value={filtros.propertyType} onChange={(e) => cambiar('propertyType', e.target.value)} className={control}>
            <option value="">Cualquiera</option>
            {TIPOS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className={`${campo} border-t pr-4 lg:border-l lg:border-t-0 lg:px-6`}>
          <span className={etiqueta}>Hasta USD</span>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            step="1000"
            placeholder="Sin tope"
            value={filtros.maxPrice}
            onChange={(e) => cambiar('maxPrice', e.target.value)}
            className={control}
          />
        </label>
        <div className="flex items-center border-l border-t border-[#efe9df]/20 py-5 pl-4 lg:border-t-0 lg:pl-6">
          <button
            type="button"
            aria-expanded={abierto}
            aria-controls={`${id}-mas`}
            onClick={() => setAbierto((v) => !v)}
            className="calma-micro calma-link calma-link-sutil whitespace-nowrap"
          >
            {abierto ? 'Menos filtros' : 'Más filtros'}
            {extrasActivos > 0 && ` (${extrasActivos})`}
          </button>
        </div>
      </div>

      {abierto && (
        <div id={`${id}-mas`} className="grid grid-cols-2 border-t border-[#efe9df]/20 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
          <label className={`${campo} pr-4 lg:pr-6`}>
            <span className={etiqueta}>Desde USD</span>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              step="1000"
              placeholder="Sin mínimo"
              value={filtros.minPrice}
              onChange={(e) => cambiar('minPrice', e.target.value)}
              className={control}
            />
          </label>
          <label className={`${campo} border-l pl-4 lg:px-6`}>
            <span className={etiqueta}>Ambientes</span>
            <select value={filtros.rooms} onChange={(e) => cambiar('rooms', e.target.value)} className={control}>
              <option value="">Cualquiera</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n === 1 ? '1 o más' : `${n} o más`}
                </option>
              ))}
            </select>
          </label>
          <label className={`${campo} border-t pr-4 lg:border-l lg:border-t-0 lg:px-6`}>
            <span className={etiqueta}>Con</span>
            <select value={filtros.amenities} onChange={(e) => cambiar('amenities', e.target.value)} className={control}>
              <option value="">Cualquier comodidad</option>
              {COMODIDADES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className={`${campo} border-l border-t pl-4 lg:border-t-0 lg:px-6`}>
            <span className={etiqueta}>Estado</span>
            <select value={filtros.status} onChange={(e) => cambiar('status', e.target.value)} className={control}>
              <option value="">Todas</option>
              {ESTADOS.map((e) => (
                <option key={e.value} value={e.value}>
                  {e.label}
                </option>
              ))}
            </select>
          </label>
          <div className="col-span-2 flex items-center border-t border-[#efe9df]/20 py-5 lg:col-span-1 lg:border-l lg:border-t-0 lg:pl-6">
            <button
              type="button"
              onClick={onLimpiar}
              disabled={!hayFiltros}
              className="calma-micro calma-link calma-link-sutil whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-40"
            >
              Limpiar filtros
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
