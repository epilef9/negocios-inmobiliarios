'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ApiProperty } from '@/services/api';
import { etiquetaOperacion, normalizar, obtenerPropiedades } from '@/components/sitio/datos';
import { datosCortos, precioDePropiedad, useDolarBlue } from '@/components/sitio/precio';
import type { Encuadre, Posicion, PuntoMapa } from './MapaSatelital';

// Leaflet usa `window`: el mapa se carga solo en el navegador
const MapaSatelital = dynamic(() => import('./MapaSatelital'), {
  ssr: false,
  loading: () => <div className="calma-brillo absolute inset-0" />,
});

// Encuadre de cada localidad (sur-oeste, nor-este). Si alguna propiedad queda afuera, se agranda para incluirla.
const ZONAS: { id: string; nombre: string; clave: string; encuadre: Encuadre }[] = [
  { id: 'libertador', nombre: 'Libertador San Martín', clave: 'libertador', encuadre: [[-32.0865, -60.4745], [-32.0625, -60.4405]] },
  { id: 'crespo', nombre: 'Crespo', clave: 'crespo', encuadre: [[-32.0435, -60.3255], [-32.0125, -60.2885]] },
  { id: 'diamante', nombre: 'Diamante', clave: 'diamante', encuadre: [[-32.0815, -60.6585], [-32.0495, -60.6195]] },
];

// Vista inicial con las tres localidades, antes de "volar" a la primera
const REGION: Encuadre = [[-32.1, -60.68], [-32.0, -60.27]];

const COLOR_OPERACION: Record<string, string> = {
  venta: 'bg-[#e3141b] text-white',
  alquiler: 'bg-[#1d47c4] text-white',
  temporario: 'bg-[#efe9df] text-[#071733]',
};

const ANCHO_TARJETA = 300;

const coordenada = (valor?: string) => {
  const n = Number(valor);
  return Number.isFinite(n) && n !== 0 ? n : null;
};

// Solo propiedades que se pueden ofrecer y con una ubicación cargada en Entre Ríos
function enElMapa(p: ApiProperty) {
  if (p.estado === 'vendido' || p.estado === 'alquilado') return null;
  const lat = coordenada(p.latitud);
  const lng = coordenada(p.longitud);
  if (lat === null || lng === null || lat < -34.2 || lat > -30 || lng < -61 || lng > -57.7) return null;
  return { lat, lng };
}

const zonaDe = (p: ApiProperty) => ZONAS.find((z) => normalizar(p.ciudad ?? p.location).includes(z.clave));

const resumen = (texto = '', largo = 120) => {
  const limpio = texto.replace(/\s+/g, ' ').trim();
  return limpio.length > largo ? `${limpio.slice(0, largo).replace(/\s+\S*$/, '')}…` : limpio;
};

export default function MapaZonasCalma() {
  const [propiedades, setPropiedades] = useState<ApiProperty[] | null>(null);
  const [error, setError] = useState(false);
  const [zona, setZona] = useState<number | null>(null);
  const [activo, setActivo] = useState<{ id: string; fijo: boolean } | null>(null);
  const [estiloTarjeta, setEstiloTarjeta] = useState<{ left: number; top: number; width: number } | undefined>(undefined);
  const [moviendo, setMoviendo] = useState(false);
  const [angosto, setAngosto] = useState(false);
  const blue = useDolarBlue();
  const seccion = useRef<HTMLElement>(null);
  const marco = useRef<HTMLDivElement>(null);
  const cierre = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    obtenerPropiedades()
      .then(setPropiedades)
      .catch(() => setError(true));
  }, []);

  // En pantallas chicas la tarjeta va fija abajo del mapa en vez de al lado del "+"
  useEffect(() => {
    const consulta = window.matchMedia('(max-width: 639px)');
    const actualizar = () => setAngosto(consulta.matches);
    actualizar();
    consulta.addEventListener('change', actualizar);
    return () => consulta.removeEventListener('change', actualizar);
  }, []);

  // La primera vez que la sección se ve, el mapa vuela desde la región hasta Libertador
  useEffect(() => {
    const el = seccion.current;
    if (!el) return;
    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          setZona((actual) => actual ?? 0);
          observador.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    observador.observe(el);
    return () => observador.disconnect();
  }, []);

  const ubicadas = useMemo(
    () =>
      (propiedades ?? [])
        .map((p) => ({ p, coords: enElMapa(p), zona: zonaDe(p) }))
        .filter((x): x is { p: ApiProperty; coords: { lat: number; lng: number }; zona: (typeof ZONAS)[number] | undefined } => x.coords !== null),
    [propiedades],
  );

  const puntos = useMemo<PuntoMapa[]>(
    () => ubicadas.map(({ p, coords }) => ({ id: p._id, lat: coords.lat, lng: coords.lng, titulo: p.title })),
    [ubicadas],
  );

  // Encuadre de cada zona agrandado para que entren todas sus propiedades
  const encuadres = useMemo(
    () =>
      ZONAS.map((z) => {
        let [[s, o], [n, e]] = z.encuadre;
        for (const { coords, zona: zz } of ubicadas) {
          if (zz?.id !== z.id) continue;
          s = Math.min(s, coords.lat - 0.002);
          n = Math.max(n, coords.lat + 0.002);
          o = Math.min(o, coords.lng - 0.002);
          e = Math.max(e, coords.lng + 0.002);
        }
        return [[s, o], [n, e]] as Encuadre;
      }),
    [ubicadas],
  );

  const encuadre = zona === null ? REGION : encuadres[zona];
  const cantidad = (id: string) => ubicadas.filter((u) => u.zona?.id === id).length;
  const propiedadActiva = activo ? ubicadas.find((u) => u.p._id === activo.id)?.p : undefined;

  // Posición de la tarjeta al lado del "+", sin salirse del mapa
  const ubicar = useCallback((pos: Posicion | null) => {
    const el = marco.current;
    if (!pos || !el) return setEstiloTarjeta(undefined);
    const ancho = el.clientWidth;
    const alto = el.clientHeight;
    const aLaDerecha = pos.x + 28 + ANCHO_TARJETA < ancho - 16;
    const left = aLaDerecha ? pos.x + 28 : Math.max(16, pos.x - 28 - ANCHO_TARJETA);
    const top = Math.max(16, Math.min(pos.y - 150, alto - 360));
    setEstiloTarjeta({ left, top, width: ANCHO_TARJETA });
  }, []);

  const cancelarCierre = () => clearTimeout(cierre.current);
  const programarCierre = useCallback(() => {
    clearTimeout(cierre.current);
    cierre.current = setTimeout(() => setActivo((a) => (a?.fijo ? a : null)), 220);
  }, []);
  useEffect(() => () => clearTimeout(cierre.current), []);

  const elegir = useCallback((id: string, pos: Posicion, via: 'hover' | 'click') => {
    clearTimeout(cierre.current);
    ubicar(pos);
    setActivo((a) => {
      if (via === 'click') return a?.id === id && a.fijo ? null : { id, fijo: true };
      return a?.fijo ? a : { id, fijo: false };
    });
  }, [ubicar]);

  const salir = useCallback(() => programarCierre(), [programarCierre]);
  const cerrar = useCallback(() => setActivo(null), []);

  const irA = (indice: number) => {
    setActivo(null);
    setZona(indice);
  };

  useEffect(() => {
    if (!activo) return;
    const conEscape = (e: KeyboardEvent) => e.key === 'Escape' && setActivo(null);
    window.addEventListener('keydown', conEscape);
    return () => window.removeEventListener('keydown', conEscape);
  }, [activo]);


  const zonaActual = zona === null ? null : ZONAS[zona];
  const sinPropiedades = propiedades !== null && zonaActual && cantidad(zonaActual.id) === 0;

  return (
    <section ref={seccion} aria-labelledby="mapa-titulo" className="border-t border-[#efe9df]/15">
      <div className="grid gap-6 px-5 pb-10 pt-16 sm:px-10 lg:grid-cols-12 lg:items-end lg:pt-24">
        <div className="flex flex-col gap-4 lg:col-span-7">
          <p className="calma-micro m-0 flex items-center gap-2 text-[#efe9df]/70">
            <span className="calma-dot" aria-hidden="true" />
            El mapa
          </p>
          <h2 id="mapa-titulo" className="font-display m-0 text-[clamp(44px,5.6vw,88px)] font-normal leading-[0.95] tracking-[-0.02em]">
            Dónde está cada propiedad
          </h2>
        </div>
        <p className="m-0 max-w-sm text-[15px] leading-relaxed text-[#efe9df]/70 lg:col-span-4 lg:col-start-9">
          Elegí una localidad y pasá el mouse (o tocá) cada «+» para ver la propiedad y su precio.
        </p>
      </div>

      {/* Selector de localidad */}
      <div role="group" aria-label="Elegí una localidad" className="flex flex-wrap gap-x-8 gap-y-3 border-y border-[#efe9df]/15 px-5 py-5 sm:px-10">
        {ZONAS.map((z, i) => {
          const elegida = zona === i;
          const total = propiedades ? cantidad(z.id) : null;
          return (
            <button
              key={z.id}
              type="button"
              aria-pressed={elegida}
              onClick={() => irA(i)}
              className={`flex min-h-11 cursor-pointer items-baseline gap-2.5 border-b pb-0.5 transition-colors duration-500 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#efe9df] ${
                elegida ? 'border-[#d9382b] text-[#efe9df]' : 'border-transparent text-[#efe9df]/55 hover:text-[#efe9df]'
              }`}
            >
              <span className="font-display text-[clamp(24px,2.6vw,34px)] leading-none">{z.nombre}</span>
              {total !== null && <span className="text-[13px] tabular-nums text-[#efe9df]/55">{total}</span>}
            </button>
          );
        })}
      </div>

      <div ref={marco} className="mapa-zonas relative h-[min(78vh,760px)] min-h-[460px] overflow-hidden">
        <MapaSatelital
          encuadre={encuadre}
          puntos={puntos}
          activo={activo?.id ?? null}
          onElegir={elegir}
          onSalir={salir}
          onFondo={cerrar}
          onMoviendo={setMoviendo}
          onPosicion={ubicar}
        />

        {/* Degradés para que el mapa se funda con el fondo azul del sitio */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-[500] h-24 bg-gradient-to-b from-[#071733] to-transparent" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 z-[500] h-28 bg-gradient-to-t from-[#071733] to-transparent" />

        {/* Nombre de la zona mientras se viaja */}
        {zonaActual && (
          <p
            key={zonaActual.id}
            aria-live="polite"
            className="mapa-zona-nombre font-display pointer-events-none absolute bottom-8 left-5 z-[600] m-0 text-[clamp(36px,6vw,84px)] leading-none text-[#efe9df] sm:left-10"
          >
            {zonaActual.nombre}
          </p>
        )}

        {(error || sinPropiedades) && (
          <p className="calma-micro absolute left-1/2 top-1/2 z-[600] m-0 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#071733]/85 px-5 py-3 text-center text-[#efe9df]/80">
            {error ? 'No pudimos cargar las propiedades' : `Todavía no hay propiedades publicadas en ${zonaActual?.nombre}`}
          </p>
        )}

        {/* Tarjeta de la propiedad */}
        {propiedadActiva && !moviendo && (angosto || estiloTarjeta) && (
          <TarjetaMapa
            key={propiedadActiva._id}
            propiedad={propiedadActiva}
            blue={blue}
            estilo={estiloTarjeta}
            angosto={angosto}
            onEntrar={cancelarCierre}
            onSalir={() => !activo?.fijo && programarCierre()}
            onCerrar={cerrar}
          />
        )}
      </div>

      {/* Lo mismo en texto, para lectores de pantalla */}
      <ul className="sr-only">
        {ubicadas.map(({ p, zona: z }) => (
          <li key={p._id}>
            <Link href={`/propiedades/${p._id}`}>
              {p.title}
              {z ? `, en ${z.nombre}` : ''}: {precioDePropiedad(p, blue).principal}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TarjetaMapa({
  propiedad,
  blue,
  estilo,
  angosto,
  onEntrar,
  onSalir,
  onCerrar,
}: {
  propiedad: ApiProperty;
  blue: number | null;
  estilo?: { left: number; top: number; width: number };
  angosto: boolean;
  onEntrar: () => void;
  onSalir: () => void;
  onCerrar: () => void;
}) {
  const imagen = propiedad.images?.[0];
  const [fotoRota, setFotoRota] = useState(false);
  const operacion = propiedad.categoria_operacion || '';
  const precio = precioDePropiedad(propiedad, blue);
  const datos = datosCortos(propiedad);

  return (
    <article
      onMouseEnter={onEntrar}
      onMouseLeave={onSalir}
      style={estilo}
      className={`mapa-tarjeta absolute z-[700] overflow-hidden rounded-2xl border border-[#efe9df]/15 bg-[#0a1d42]/95 text-[#efe9df] shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)] backdrop-blur-md ${
        angosto ? 'inset-x-4 bottom-4' : ''
      }`}
    >
      <div className={`relative bg-[#0e2652] ${angosto ? 'hidden' : 'h-36'}`}>
        {imagen && !fotoRota && (
          // eslint-disable-next-line @next/next/no-img-element -- las fotos vienen del backend con dominio variable
          <img src={imagen} alt="" onError={() => setFotoRota(true)} className="h-full w-full object-cover" />
        )}
        {etiquetaOperacion[operacion] && (
          <span className={`calma-micro absolute left-3 top-3 rounded-full px-2.5 py-1 ${COLOR_OPERACION[operacion] ?? ''}`}>
            {etiquetaOperacion[operacion]}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display m-0 text-[22px] font-normal leading-tight">{propiedad.title}</h3>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="-mr-1 -mt-1 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-[#efe9df]/70 transition-colors hover:bg-[#efe9df]/10 hover:text-[#efe9df]"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        {datos.length > 0 && <p className="m-0 flex flex-wrap gap-x-3 text-[13px] text-[#efe9df]/65">{datos.map((d) => <span key={d}>{d}</span>)}</p>}
        {propiedad.description && !angosto && <p className="m-0 text-[13px] leading-relaxed text-[#efe9df]/70">{resumen(propiedad.description)}</p>}
        <div className="mt-1 flex items-end justify-between gap-3">
          <span className="flex flex-col">
            <span className="text-[16px]">{precio.principal}</span>
            {precio.referencia && <span className="text-[12px] text-[#efe9df]/55">{precio.referencia}</span>}
          </span>
          <Link href={`/propiedades/${propiedad._id}`} className="calma-micro calma-link shrink-0">
            Ver propiedad
          </Link>
        </div>
      </div>
    </article>
  );
}
