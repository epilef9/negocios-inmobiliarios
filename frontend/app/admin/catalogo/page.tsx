'use client';

import { useCallback, useEffect, useState } from 'react';
import { getProperties, reorderProperties, type ApiProperty } from '@/services/api';
import { precioDePropiedad } from '@/components/sitio/precio';
import { etiquetaOperacion } from '@/components/sitio/datos';
import Icono from '@/components/panel/Icono';
import { Alerta, Boton, BotonLink, Encabezado, Esqueleto, EstadoVacio, control, useAviso } from '@/components/panel/ui';

// Mismo orden que usa el sitio en "Destacadas": el campo orden del backend
const ordenar = (lista: ApiProperty[]) => [...lista].sort((a, b) => (a.orden ?? 9999) - (b.orden ?? 9999));

function Miniatura({ src }: { src?: string }) {
  const [rota, setRota] = useState(false);
  if (!src || rota) {
    return (
      <span className="flex h-11 w-14 shrink-0 items-center justify-center rounded-md bg-panel-hundido text-panel-tenue">
        <Icono nombre="imagen" className="h-[18px] w-[18px]" />
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element -- fotos del backend o de Cloudinary
  return <img src={src} alt="" loading="lazy" onError={() => setRota(true)} className="h-11 w-14 shrink-0 rounded-md object-cover" />;
}

function BotonMover({ icono, texto, onClick, disabled }: { icono: 'arriba' | 'abajo' | 'atras' | 'flecha'; texto: string; onClick: () => void; disabled: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={texto} aria-label={texto} className="rounded-md p-2 text-panel-suave hover:bg-panel-hundido hover:text-panel-texto disabled:pointer-events-none disabled:opacity-30">
      <Icono nombre={icono} className={`h-[18px] w-[18px] ${icono === 'atras' ? 'rotate-90' : icono === 'flecha' ? 'rotate-90' : ''}`} />
    </button>
  );
}

export default function OrdenCatalogoPage() {
  const [propiedades, setPropiedades] = useState<ApiProperty[] | null>(null);
  const [original, setOriginal] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [arrastrada, setArrastrada] = useState<number | null>(null);
  const [destino, setDestino] = useState<number | null>(null);
  const { mostrar, aviso } = useAviso();

  const cargar = useCallback(() => {
    getProperties()
      .then((lista) => {
        const ordenadas = ordenar(lista ?? []);
        setPropiedades(ordenadas);
        setOriginal(ordenadas.map((p) => p._id));
        setError(null);
      })
      .catch((e: Error) => setError(e.message || 'No se pudieron cargar las propiedades'));
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const lista = propiedades ?? [];
  const hayCambios = lista.some((p, i) => p._id !== original[i]);

  // Avisa antes de salir si quedó un orden sin guardar
  useEffect(() => {
    if (!hayCambios) return;
    const alSalir = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', alSalir);
    return () => window.removeEventListener('beforeunload', alSalir);
  }, [hayCambios]);

  const mover = (desde: number, hasta: number) => {
    if (hasta < 0 || hasta >= lista.length || desde === hasta) return;
    const nueva = [...lista];
    const [elegida] = nueva.splice(desde, 1);
    nueva.splice(hasta, 0, elegida);
    setPropiedades(nueva);
  };

  const guardar = async () => {
    setGuardando(true);
    try {
      await reorderProperties(lista.map((p, i) => ({ id: p._id, orden: i + 1 })));
      setOriginal(lista.map((p) => p._id));
      mostrar('Listo: el catálogo del sitio ya muestra este orden.');
    } catch (e) {
      mostrar(e instanceof Error ? `No se pudo guardar el orden: ${e.message}` : 'No se pudo guardar el orden', 'peligro');
    } finally {
      setGuardando(false);
    }
  };

  const descartar = () => {
    const porId = new Map(lista.map((p) => [p._id, p]));
    setPropiedades(original.map((id) => porId.get(id)).filter((p): p is ApiProperty => Boolean(p)));
  };

  const texto = busqueda.trim().toLowerCase();
  const filtrando = Boolean(texto);
  const visibles = lista
    .map((p, indice) => ({ p, indice }))
    .filter(({ p }) => !texto || [p.title, p.ciudad, p.location, p.codigoInterno].some((v) => v?.toLowerCase().includes(texto)));

  return (
    <>
      <Encabezado
        titulo="Orden del catálogo"
        descripcion="Así se ordenan las propiedades en el sitio. Arrastralas o usá las flechas y después guardá."
        acciones={
          <BotonLink href="/propiedades" target="_blank" icono="sitio">
            Ver el catálogo
          </BotonLink>
        }
      />

      <div className="flex flex-col gap-4 pb-20">
        <label className="relative max-w-md">
          <span className="sr-only">Buscar una propiedad</span>
          <Icono nombre="buscar" className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-panel-tenue" />
          <input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar para ubicarla en la lista" className={`${control} pl-10`} />
        </label>
        {filtrando && <p className="m-0 text-[13px] text-panel-suave">Con la búsqueda activa no se puede arrastrar; las flechas mueven dentro de la lista completa.</p>}

        {error && (
          <Alerta tono="peligro" titulo="No se pudieron cargar las propiedades" accion={<Boton tamano="sm" onClick={() => { setError(null); setPropiedades(null); cargar(); }}>Reintentar</Boton>}>
            {error}
          </Alerta>
        )}

        <div className="overflow-hidden rounded-xl border border-panel-borde bg-panel-superficie">
          {!propiedades && !error ? (
            <div className="flex flex-col divide-y divide-panel-borde">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3">
                  <Esqueleto className="h-8 w-8" />
                  <Esqueleto className="h-11 w-14" />
                  <Esqueleto className="h-4 w-1/3" />
                </div>
              ))}
            </div>
          ) : propiedades && lista.length === 0 ? (
            <EstadoVacio icono="propiedades" titulo="Todavía no hay propiedades para ordenar" accion={<BotonLink href="/admin/propiedades/nueva" variante="principal" icono="mas">Nueva propiedad</BotonLink>} />
          ) : propiedades && visibles.length === 0 ? (
            <EstadoVacio icono="buscar" titulo="Ninguna propiedad coincide" accion={<Boton onClick={() => setBusqueda('')}>Limpiar búsqueda</Boton>} />
          ) : (
            <ol className="m-0 list-none divide-y divide-panel-borde p-0">
              {visibles.map(({ p, indice }) => (
                <li
                  key={p._id}
                  draggable={!filtrando}
                  onDragStart={(e) => {
                    setArrastrada(indice);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragOver={(e) => {
                    if (arrastrada === null) return;
                    e.preventDefault();
                    if (destino !== indice) setDestino(indice);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (arrastrada !== null) mover(arrastrada, indice);
                    setArrastrada(null);
                    setDestino(null);
                  }}
                  onDragEnd={() => {
                    setArrastrada(null);
                    setDestino(null);
                  }}
                  className={`flex items-center gap-3 px-3 py-2.5 transition-colors sm:px-4 ${arrastrada === indice ? 'opacity-40' : ''} ${destino === indice && arrastrada !== indice ? 'bg-panel-acento-suave' : ''}`}
                >
                  {!filtrando && (
                    <span className="hidden cursor-grab text-panel-tenue active:cursor-grabbing sm:block" title="Arrastrá para mover">
                      <Icono nombre="arrastrar" className="h-5 w-5" />
                    </span>
                  )}
                  <label className="shrink-0">
                    <span className="sr-only">Posición de {p.title}</span>
                    <input
                      key={`${p._id}-${indice}`}
                      type="number"
                      min={1}
                      max={lista.length}
                      defaultValue={indice + 1}
                      onBlur={(e) => mover(indice, Number(e.target.value) - 1)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                      }}
                      className="tabular h-9 w-14 rounded-md border border-panel-borde bg-panel-superficie text-center text-sm font-semibold focus:border-panel-acento focus:outline-none"
                    />
                  </label>
                  <Miniatura src={p.images?.[0]} />
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium">{p.title}</span>
                    <span className="block truncate text-[13px] text-panel-suave">
                      {[etiquetaOperacion[p.categoria_operacion || 'venta'], p.ciudad || p.location, precioDePropiedad(p, null).principal].filter(Boolean).join(' · ')}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center">
                    <BotonMover icono="atras" texto={`Llevar ${p.title} al principio`} onClick={() => mover(indice, 0)} disabled={indice === 0} />
                    <BotonMover icono="arriba" texto={`Subir ${p.title}`} onClick={() => mover(indice, indice - 1)} disabled={indice === 0} />
                    <BotonMover icono="abajo" texto={`Bajar ${p.title}`} onClick={() => mover(indice, indice + 1)} disabled={indice === lista.length - 1} />
                    <BotonMover icono="flecha" texto={`Llevar ${p.title} al final`} onClick={() => mover(indice, lista.length - 1)} disabled={indice === lista.length - 1} />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      {hayCambios && (
        <div role="region" aria-label="Cambios sin guardar" className="fixed inset-x-0 bottom-0 z-30 border-t border-panel-borde bg-panel-superficie/95 px-4 py-3 backdrop-blur lg:left-[248px]">
          <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 sm:px-4">
            <p className="m-0 text-sm">
              <span className="font-medium">Cambiaste el orden.</span> <span className="text-panel-suave">Todavía no se ve en el sitio.</span>
            </p>
            <div className="flex gap-2">
              <Boton onClick={descartar} disabled={guardando}>
                Descartar
              </Boton>
              <Boton variante="principal" icono="check" onClick={guardar} cargando={guardando}>
                Guardar orden
              </Boton>
            </div>
          </div>
        </div>
      )}
      {aviso}
    </>
  );
}
