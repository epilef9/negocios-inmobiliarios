'use client';

import { useEffect, useId, useRef, useState } from 'react';

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

// Dirección del catálogo con estos filtros (los mismos nombres que lee la página de propiedades)
export const direccionDeFiltros = (f: Partial<FiltrosPropiedades>) => {
  const params = new URLSearchParams(
    Object.entries({ operacion: f.operation, tipo: f.propertyType, ubicacion: f.location, minimo: f.minPrice, maximo: f.maxPrice, ambientes: f.rooms, comodidad: f.amenities }).filter(
      (par): par is [string, string] => Boolean(par[1])
    )
  );
  return `/propiedades${params.size ? `?${params}` : ''}`;
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

// En operación, ubicación, tipo, comodidades y estado se pueden elegir varias opciones: viajan juntas, separadas
// por coma («casa,departamento»), igual en la dirección del catálogo y en las búsquedas guardadas.
export const separar = (valor = '') =>
  valor
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

// Solo las opciones conocidas, en el orden de la lista
export const elegidasDe = (opciones: { value: string }[], valor = '') => {
  const elegidas = separar(valor);
  return opciones.map((o) => o.value).filter((v) => elegidas.includes(v));
};

export const listaComodidades = (valor = '') => elegidasDe(COMODIDADES, valor);

export const ESTADOS = [
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
// Celda de un desplegable con casillas (el espacio entre título y valor lo pone el propio desplegable)
const celdaMultiple = `flex flex-col border-[#efe9df]/20 py-5 ${celdaInteractiva}`;

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
// (cada opción elegida tiene su chip)
type FiltroActivo = { clave: keyof FiltrosPropiedades; texto: string; valor?: string };
function filtrosActivos(f: FiltrosPropiedades): FiltroActivo[] {
  const lista: FiltroActivo[] = [];
  for (const o of elegidasDe(OPERACIONES, f.operation)) lista.push({ clave: 'operation', texto: etiquetaDe(OPERACIONES, o), valor: o });
  for (const l of separar(f.location)) lista.push({ clave: 'location', texto: l, valor: l });
  for (const t of elegidasDe(TIPOS, f.propertyType)) lista.push({ clave: 'propertyType', texto: etiquetaDe(TIPOS, t), valor: t });
  if (f.minPrice) lista.push({ clave: 'minPrice', texto: `Desde ${dolares(f.minPrice)}` });
  if (f.maxPrice) lista.push({ clave: 'maxPrice', texto: `Hasta ${dolares(f.maxPrice)}` });
  if (f.rooms) lista.push({ clave: 'rooms', texto: `${f.rooms}+ ambientes` });
  for (const c of listaComodidades(f.amenities)) lista.push({ clave: 'amenities', texto: etiquetaDe(COMODIDADES, c), valor: c });
  for (const e of elegidasDe(ESTADOS, f.status)) lista.push({ clave: 'status', texto: etiquetaDe(ESTADOS, e), valor: e });
  return lista;
}

function IconoCruz({ className = 'h-3 w-3' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className={className}>
      <path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IconoTilde() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3 w-3">
      <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Desplegable con casillas para marcar varias opciones (operación no: va con botones). Sin ninguna marcada, no filtra.
type SelectorMultipleProps = {
  etiqueta: string;
  opciones: { value: string; label: string }[];
  valor: string;
  onChange: (valor: string) => void;
  // Texto con nada marcado y con varias marcadas
  vacio: string;
  varias: (cantidad: number) => string;
  ayuda: string;
  // Dos columnas para listas largas; posición de la lista para que no se salga de la pantalla
  columnas?: 1 | 2;
  posicion?: string;
  // Las opciones que no están en la lista (por ejemplo, una localidad que llegó en la dirección) se conservan
  libre?: boolean;
};

function SelectorMultiple({ etiqueta: titulo, opciones, valor, onChange, vacio, varias, ayuda, columnas = 1, posicion = 'left-0', libre = false }: SelectorMultipleProps) {
  const id = useId();
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const elegidas = libre ? separar(valor) : elegidasDe(opciones, valor);

  // Se cierra con Escape o tocando afuera
  useEffect(() => {
    if (!abierto) return;
    const afuera = (e: PointerEvent) => {
      if (!caja.current?.contains(e.target as Node)) setAbierto(false);
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setAbierto(false);
      boton.current?.focus();
    };
    document.addEventListener('pointerdown', afuera);
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('pointerdown', afuera);
      document.removeEventListener('keydown', tecla);
    };
  }, [abierto]);

  // Mantiene el orden de la lista; las libres que no están en ella quedan al final
  const alternar = (opcion: string) => {
    const nuevas = elegidas.includes(opcion) ? elegidas.filter((v) => v !== opcion) : [...elegidas, opcion];
    const conocidas = opciones.map((o) => o.value).filter((v) => nuevas.includes(v));
    onChange([...conocidas, ...(libre ? nuevas.filter((v) => !conocidas.includes(v)) : [])].join(','));
  };
  const resumen = elegidas.length === 0 ? vacio : elegidas.length === 1 ? etiquetaDe(opciones, elegidas[0]) : varias(elegidas.length);

  return (
    <div
      ref={caja}
      // Al salir con Tab hacia otro control, se cierra. Sin destino (un clic en el texto de una opción) no:
      // los clics afuera ya los cierra el pointerdown.
      onBlur={(e) => {
        const destino = e.relatedTarget as Node | null;
        if (destino && !caja.current?.contains(destino)) setAbierto(false);
      }}
      className="relative flex flex-col gap-2.5"
    >
      <span className={etiqueta} id={`${id}-etiqueta`}>
        {titulo}
      </span>
      <button
        ref={boton}
        id={`${id}-boton`}
        type="button"
        aria-expanded={abierto}
        aria-controls={`${id}-lista`}
        aria-labelledby={`${id}-etiqueta ${id}-boton`}
        onClick={() => setAbierto((v) => !v)}
        className={`${control} relative flex cursor-pointer items-center pr-9 text-left transition-colors duration-500 group-hover:text-white`}
      >
        <span className="truncate">{resumen}</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className={`pointer-events-none absolute right-1 h-4 w-4 text-[#efe9df]/55 transition duration-500 group-hover:text-[#efe9df] ${abierto ? 'rotate-180' : 'motion-safe:group-hover:translate-y-0.5'}`}
        >
          <path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {abierto && (
        <div
          id={`${id}-lista`}
          role="group"
          aria-labelledby={`${id}-etiqueta`}
          className={`absolute ${posicion} top-full z-30 mt-4 ${columnas === 2 ? 'w-[min(26rem,calc(100vw-2rem))]' : 'w-[min(17rem,calc(100vw-2rem))]'} cursor-default rounded-2xl border border-[#efe9df]/15 bg-[#0b1f40] p-2 text-[#efe9df] shadow-2xl`}
        >
          <p className="m-0 px-3 pb-1 pt-2 text-[13px] text-[#efe9df]/60">{ayuda}</p>
          {opciones.length === 0 ? (
            <p className="m-0 px-3 py-3 text-[15px] text-[#efe9df]/70">Cargando opciones…</p>
          ) : (
            <ul className={`m-0 grid list-none grid-cols-1 p-0 ${columnas === 2 ? 'sm:grid-cols-2' : ''}`}>
              {opciones.map((o) => {
                const marcada = elegidas.includes(o.value);
                return (
                  <li key={o.value}>
                    <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 text-[15px] transition-colors duration-200 hover:bg-[#efe9df]/[0.07]">
                      <input type="checkbox" checked={marcada} onChange={() => alternar(o.value)} className="peer sr-only" />
                      <span
                        aria-hidden="true"
                        className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[4px] border transition-colors duration-200 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#efe9df] ${
                          marcada ? 'border-[#d9382b] bg-[#d9382b] text-white' : 'border-[#efe9df]/45'
                        }`}
                      >
                        {marcada && <IconoTilde />}
                      </span>
                      {o.label}
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="mt-1 flex items-center justify-between gap-3 border-t border-[#efe9df]/15 px-3 pb-1 pt-3">
            {elegidas.length > 0 ? (
              <button type="button" onClick={() => onChange('')} className="calma-micro calma-link calma-link-sutil cursor-pointer text-[11px]">
                Borrar ({elegidas.length})
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={() => {
                setAbierto(false);
                boton.current?.focus();
              }}
              className="calma-micro cursor-pointer rounded-full border border-[#efe9df]/30 px-4 py-2 transition-colors duration-300 hover:border-[#efe9df] hover:bg-[#efe9df]/[0.06]"
            >
              Listo
            </button>
          </div>
        </div>
      )}
    </div>
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
  const quitar = ({ clave, valor }: FiltroActivo) =>
    valor ? cambiar(clave, separar(filtros[clave]).filter((v) => v !== valor).join(',')) : cambiar(clave, '');
  // «Quiero»: Todo saca el filtro; cada operación se prende y apaga (se pueden marcar varias)
  const operaciones = elegidasDe(OPERACIONES, filtros.operation);
  const alternarOperacion = (op: string) =>
    cambiar('operation', op ? OPERACIONES.map((o) => o.value).filter((v) => (v === op ? !operaciones.includes(v) : operaciones.includes(v))).join(',') : '');

  return (
    <form role="search" aria-label="Filtrar propiedades" onSubmit={(e) => e.preventDefault()} className="border-y border-[#efe9df]/20">
      <div className="grid grid-cols-2 lg:grid-cols-[minmax(0,1.35fr)_repeat(3,minmax(0,1fr))_auto]">
        <div className={`${campo} col-span-2 lg:col-span-1 lg:pr-6`}>
          <span className={etiqueta} id={`${id}-op`}>
            Quiero
          </span>
          <div role="group" aria-labelledby={`${id}-op`} className="font-display flex flex-wrap gap-x-5 gap-y-1 text-[22px]">
            {[{ value: '', label: 'Todo' }, ...OPERACIONES].map((op) => {
              const activa = op.value ? operaciones.includes(op.value) : operaciones.length === 0;
              return (
                <button
                  key={op.value || 'todo'}
                  type="button"
                  aria-pressed={activa}
                  onClick={() => alternarOperacion(op.value)}
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
        <div className={`${celdaMultiple} border-t pr-4 lg:border-l lg:border-t-0 lg:px-6`}>
          <SelectorMultiple
            etiqueta="En"
            opciones={localidades.map((nombre) => ({ value: nombre, label: nombre }))}
            valor={filtros.location}
            onChange={(valor) => cambiar('location', valor)}
            vacio="Toda la zona"
            varias={(n) => `${n} localidades`}
            ayuda="Marcá una o varias localidades."
            libre
          />
        </div>
        <div className={`${celdaMultiple} border-l border-t pl-4 lg:border-t-0 lg:px-6`}>
          <SelectorMultiple
            etiqueta="Tipo"
            opciones={TIPOS}
            valor={filtros.propertyType}
            onChange={(valor) => cambiar('propertyType', valor)}
            vacio="Cualquiera"
            varias={(n) => `${n} tipos`}
            ayuda="Marcá uno o varios tipos."
            posicion="right-0 lg:left-0 lg:right-auto"
          />
        </div>
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
          <div className={`${celdaMultiple} border-t pr-4 lg:border-l lg:border-t-0 lg:px-6`}>
            <SelectorMultiple
              etiqueta="Con"
              opciones={COMODIDADES}
              valor={filtros.amenities}
              onChange={(valor) => cambiar('amenities', valor)}
              vacio="Cualquier comodidad"
              varias={(n) => `${n} comodidades`}
              ayuda="Tiene que tener todas las que marques."
              columnas={2}
            />
          </div>
          <div className={`${celdaMultiple} border-l border-t pl-4 lg:border-t-0 lg:px-6`}>
            <SelectorMultiple
              etiqueta="Estado"
              opciones={ESTADOS}
              valor={filtros.status}
              onChange={(valor) => cambiar('status', valor)}
              vacio="Todas"
              varias={(n) => `${n} estados`}
              ayuda="Marcá uno o varios estados."
              posicion="right-0"
            />
          </div>
        </div>
      )}

      {hayFiltros && (
        <div className="flex items-center gap-3 border-t border-[#efe9df]/20 py-4">
          <ul aria-label="Filtros aplicados" className="m-0 flex min-w-0 flex-1 list-none gap-2 overflow-x-auto p-0 [mask-image:linear-gradient(to_right,#000_82%,transparent)] [scrollbar-width:none] sm:flex-wrap sm:overflow-visible sm:[mask-image:none]">
            {activos.map((filtro) => (
              <li key={`${filtro.clave}-${filtro.valor ?? ''}`} className="filtro-chip shrink-0">
                <button
                  type="button"
                  onClick={() => quitar(filtro)}
                  aria-label={`Quitar filtro: ${filtro.texto}`}
                  className="group/chip flex min-h-9 cursor-pointer items-center gap-2 rounded-full border border-[#efe9df]/25 py-1.5 pl-3.5 pr-3 text-[13px] text-[#efe9df]/85 transition-colors duration-300 hover:border-[#d9382b] hover:text-[#efe9df] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#efe9df]"
                >
                  {filtro.texto}
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
