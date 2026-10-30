'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { deleteProperty, getProperties, updateProperty, type ApiProperty } from '@/services/api';
import { etiquetaTipo, precioDePropiedad } from '@/components/sitio/precio';
import { etiquetaOperacion } from '@/components/sitio/datos';
import Icono from '@/components/panel/Icono';
import { Alerta, Boton, BotonLink, Encabezado, Esqueleto, EstadoVacio, control, useAviso, useConfirmar } from '@/components/panel/ui';
import { ESTADO_PROPIEDAD, estadoDe } from '@/components/panel/estados';

type Filtros = { texto: string; tipo: string; operacion: string; estado: string };
const SIN_FILTROS: Filtros = { texto: '', tipo: '', operacion: '', estado: '' };

const ESTADOS = Object.entries(ESTADO_PROPIEDAD).map(([valor, { texto, tono }]) => ({ valor, texto, tono }));

const TONO_SELECT: Record<string, string> = {
  exito: 'text-emerald-700 dark:text-emerald-300',
  aviso: 'text-amber-700 dark:text-amber-300',
  info: 'text-sky-700 dark:text-sky-300',
  neutro: 'text-panel-suave',
};

function Miniatura({ src, alt }: { src?: string; alt: string }) {
  const [rota, setRota] = useState(false);
  if (!src || rota) {
    return (
      <span className="flex h-12 w-16 shrink-0 items-center justify-center rounded-md bg-panel-hundido text-panel-tenue" title="Sin fotos">
        <Icono nombre="imagen" className="h-5 w-5" />
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element -- las fotos vienen del backend o de Cloudinary
  return <img src={src} alt={alt} loading="lazy" onError={() => setRota(true)} className="h-12 w-16 shrink-0 rounded-md object-cover" />;
}

// Selector de estado en la misma fila: cambia el estado sin entrar al formulario
function SelectorEstado({ propiedad, alCambiar }: { propiedad: ApiProperty; alCambiar: (estado: string) => void }) {
  const actual = estadoDe(ESTADO_PROPIEDAD, propiedad.estado || 'disponible');
  return (
    <select
      value={propiedad.estado || 'disponible'}
      onChange={(e) => alCambiar(e.target.value)}
      aria-label={`Estado de ${propiedad.title}`}
      className={`h-8 cursor-pointer rounded-md border border-panel-borde bg-panel-superficie pl-2 pr-7 text-[13px] font-medium hover:border-panel-borde-fuerte focus:border-panel-acento focus:outline-none ${TONO_SELECT[actual.tono] ?? ''}`}
    >
      {ESTADOS.map((e) => (
        // Cada opción con su color, también en la lista que se despliega (si no, todas toman el del estado actual)
        <option key={e.valor} value={e.valor} className={`bg-panel-superficie font-medium ${TONO_SELECT[e.tono] ?? ''}`}>
          {e.texto}
        </option>
      ))}
    </select>
  );
}

export default function PropiedadesAdminPage() {
  const [propiedades, setPropiedades] = useState<ApiProperty[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<Filtros>(SIN_FILTROS);
  const { mostrar, aviso } = useAviso();
  const { confirmar, dialogoConfirmar } = useConfirmar();

  const cargar = useCallback(() => {
    getProperties()
      .then((lista) => {
        setPropiedades(lista);
        setError(null);
      })
      .catch((e: Error) => setError(e.message || 'No se pudieron cargar las propiedades'));
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const reintentar = () => {
    setError(null);
    setPropiedades(null);
    cargar();
  };

  const cambiarEstado = async (propiedad: ApiProperty, estado: string) => {
    const anterior = propiedad.estado;
    setPropiedades((lista) => lista?.map((p) => (p._id === propiedad._id ? { ...p, estado: estado as ApiProperty['estado'] } : p)) ?? null);
    try {
      await updateProperty(propiedad._id, { estado: estado as ApiProperty['estado'] });
      mostrar(`"${propiedad.title}" ahora figura como ${estadoDe(ESTADO_PROPIEDAD, estado).texto.toLowerCase()}.`);
    } catch (e) {
      setPropiedades((lista) => lista?.map((p) => (p._id === propiedad._id ? { ...p, estado: anterior } : p)) ?? null);
      mostrar(e instanceof Error ? e.message : 'No se pudo cambiar el estado', 'peligro');
    }
  };

  const borrar = async (propiedad: ApiProperty) => {
    const ok = await confirmar(`¿Borrar "${propiedad.title}"?`, {
      texto: 'Deja de verse en el sitio y no se puede recuperar. Si solo dejó de estar disponible, cambiale el estado.',
      accion: 'Borrar propiedad',
    });
    if (!ok) return;
    try {
      await deleteProperty(propiedad._id);
      setPropiedades((lista) => lista?.filter((p) => p._id !== propiedad._id) ?? null);
      mostrar(`Se borró "${propiedad.title}".`);
    } catch (e) {
      mostrar(e instanceof Error ? e.message : 'No se pudo borrar la propiedad', 'peligro');
    }
  };

  const cambiarFiltro = (campo: keyof Filtros, valor: string) => setFiltros((f) => ({ ...f, [campo]: valor }));
  const hayFiltros = Object.values(filtros).some(Boolean);
  const texto = filtros.texto.trim().toLowerCase();

  const lista = propiedades ?? [];
  const visibles = lista.filter(
    (p) =>
      (!texto || [p.title, p.location, p.ciudad, p.codigoInterno].some((v) => v?.toLowerCase().includes(texto))) &&
      (!filtros.tipo || p.tipo_inmueble === filtros.tipo) &&
      (!filtros.operacion || (p.categoria_operacion || 'venta') === filtros.operacion) &&
      (!filtros.estado || (p.estado || 'disponible') === filtros.estado)
  );
  const disponibles = lista.filter((p) => !p.estado || p.estado === 'disponible').length;

  return (
    <>
      <Encabezado
        titulo="Propiedades"
        descripcion={propiedades ? `${lista.length} en total · ${disponibles} disponibles` : 'Todas las propiedades cargadas en el sitio.'}
        acciones={
          <>
            <BotonLink href="/admin/catalogo" icono="catalogo">
              Ordenar catálogo
            </BotonLink>
            <BotonLink href="/admin/propiedades/nueva" variante="principal" icono="mas">
              Nueva propiedad
            </BotonLink>
          </>
        }
      />

      <div className="flex flex-col gap-4">
        <div role="search" className="grid gap-3 rounded-xl border border-panel-borde bg-panel-superficie p-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_160px_160px_160px_auto]">
          <label className="relative sm:col-span-2 lg:col-span-1">
            <span className="sr-only">Buscar</span>
            <Icono nombre="buscar" className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-panel-tenue" />
            <input
              type="search"
              value={filtros.texto}
              onChange={(e) => cambiarFiltro('texto', e.target.value)}
              placeholder="Buscar por título, ubicación o código"
              className={`${control} pl-10`}
            />
          </label>
          <select value={filtros.tipo} onChange={(e) => cambiarFiltro('tipo', e.target.value)} aria-label="Tipo" className={control}>
            <option value="">Todos los tipos</option>
            {Object.entries(etiquetaTipo).map(([valor, nombre]) => (
              <option key={valor} value={valor}>
                {nombre}
              </option>
            ))}
          </select>
          <select value={filtros.operacion} onChange={(e) => cambiarFiltro('operacion', e.target.value)} aria-label="Operación" className={control}>
            <option value="">Toda operación</option>
            <option value="venta">Venta</option>
            <option value="alquiler">Alquiler</option>
            <option value="temporario">Por días</option>
          </select>
          <select value={filtros.estado} onChange={(e) => cambiarFiltro('estado', e.target.value)} aria-label="Estado" className={control}>
            <option value="">Todo estado</option>
            {ESTADOS.map((e) => (
              <option key={e.valor} value={e.valor}>
                {e.texto}
              </option>
            ))}
          </select>
          <Boton variante="fantasma" onClick={() => setFiltros(SIN_FILTROS)} disabled={!hayFiltros}>
            Limpiar
          </Boton>
        </div>

        {error && (
          <Alerta tono="peligro" titulo="No se pudieron cargar las propiedades" accion={<Boton tamano="sm" onClick={reintentar}>Reintentar</Boton>}>
            {error}
          </Alerta>
        )}

        <div className="overflow-hidden rounded-xl border border-panel-borde bg-panel-superficie">
          {!propiedades && !error ? (
            <div className="flex flex-col divide-y divide-panel-borde">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3">
                  <Esqueleto className="h-12 w-16" />
                  <div className="flex flex-1 flex-col gap-2">
                    <Esqueleto className="h-4 w-1/3" />
                    <Esqueleto className="h-3 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : propiedades && lista.length === 0 ? (
            <EstadoVacio
              icono="propiedades"
              titulo="Todavía no hay propiedades"
              texto="Cargá la primera y va a aparecer en el catálogo del sitio."
              accion={
                <BotonLink href="/admin/propiedades/nueva" variante="principal" icono="mas">
                  Nueva propiedad
                </BotonLink>
              }
            />
          ) : propiedades && visibles.length === 0 ? (
            <EstadoVacio icono="buscar" titulo="Ninguna propiedad coincide" texto="Probá con otra búsqueda o sacá algún filtro." accion={<Boton onClick={() => setFiltros(SIN_FILTROS)}>Limpiar filtros</Boton>} />
          ) : propiedades ? (
            <>
              {/* Tabla en pantallas medianas y grandes */}
              <table className="hidden w-full border-collapse text-left md:table">
                <thead>
                  <tr className="border-b border-panel-borde bg-panel-hundido text-[12.5px] text-panel-suave">
                    <th scope="col" className="px-4 py-2.5 font-medium">Propiedad</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">Operación</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-medium">Precio</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">Estado</th>
                    <th scope="col" className="px-4 py-2.5"><span className="sr-only">Acciones</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-panel-borde">
                  {visibles.map((p) => (
                    <tr key={p._id} className="transition-colors hover:bg-panel-hundido/60">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Miniatura src={p.images?.[0]} alt={p.title} />
                          <div className="min-w-0">
                            <Link href={`/admin/propiedades/nueva?editar=${p._id}`} className="block truncate text-[14px] font-medium hover:underline">
                              {p.title}
                            </Link>
                            <span className="block truncate text-[13px] text-panel-suave">
                              {[etiquetaTipo[p.tipo_inmueble || ''], p.ciudad || p.location].filter(Boolean).join(' · ')}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[13.5px] text-panel-suave">{etiquetaOperacion[p.categoria_operacion || 'venta'] ?? 'Venta'}</td>
                      <td className="tabular whitespace-nowrap px-4 py-3 text-right text-[13.5px] font-medium">{precioDePropiedad(p, null).principal}</td>
                      <td className="px-4 py-3">
                        <SelectorEstado propiedad={p} alCambiar={(estado) => cambiarEstado(p, estado)} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Link href={`/propiedades/${p._id}`} target="_blank" title="Ver en el sitio" aria-label={`Ver ${p.title} en el sitio`} className="rounded-md p-[13px] text-panel-tenue sm:p-2 hover:bg-panel-hundido hover:text-panel-texto">
                            <Icono nombre="ojo" className="h-[18px] w-[18px]" />
                          </Link>
                          <Link href={`/propiedades/${p._id}/imprimir`} target="_blank" title="Imprimir ficha" aria-label={`Imprimir la ficha de ${p.title}`} className="rounded-md p-[13px] text-panel-tenue sm:p-2 hover:bg-panel-hundido hover:text-panel-texto">
                            <Icono nombre="imprimir" className="h-[18px] w-[18px]" />
                          </Link>
                          <Link href={`/admin/propiedades/nueva?editar=${p._id}`} title="Editar" aria-label={`Editar ${p.title}`} className="rounded-md p-[13px] text-panel-tenue sm:p-2 hover:bg-panel-hundido hover:text-panel-texto">
                            <Icono nombre="editar" className="h-[18px] w-[18px]" />
                          </Link>
                          <button type="button" onClick={() => borrar(p)} title="Borrar" aria-label={`Borrar ${p.title}`} className="rounded-md p-[13px] text-panel-tenue sm:p-2 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400">
                            <Icono nombre="borrar" className="h-[18px] w-[18px]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Lista en celulares */}
              <ul className="m-0 list-none divide-y divide-panel-borde p-0 md:hidden">
                {visibles.map((p) => (
                  <li key={p._id} className="flex flex-col gap-3 p-4">
                    <div className="flex items-start gap-3">
                      <Miniatura src={p.images?.[0]} alt={p.title} />
                      <div className="min-w-0 flex-1">
                        <Link href={`/admin/propiedades/nueva?editar=${p._id}`} className="block text-[14px] font-medium">
                          {p.title}
                        </Link>
                        <span className="block text-[13px] text-panel-suave">
                          {[etiquetaOperacion[p.categoria_operacion || 'venta'], p.ciudad || p.location].filter(Boolean).join(' · ')}
                        </span>
                        <span className="tabular block text-[13.5px] font-medium">{precioDePropiedad(p, null).principal}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <SelectorEstado propiedad={p} alCambiar={(estado) => cambiarEstado(p, estado)} />
                      <div className="flex gap-1">
                        <BotonLink href={`/propiedades/${p._id}/imprimir`} target="_blank" tamano="sm" variante="fantasma" icono="imprimir" aria-label={`Imprimir la ficha de ${p.title}`}>{null}</BotonLink>
                        <BotonLink href={`/admin/propiedades/nueva?editar=${p._id}`} tamano="sm" icono="editar">
                          Editar
                        </BotonLink>
                        <Boton tamano="sm" variante="fantasma" icono="borrar" onClick={() => borrar(p)} aria-label={`Borrar ${p.title}`} />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              <p className="m-0 border-t border-panel-borde px-4 py-2.5 text-[13px] text-panel-suave">
                {hayFiltros ? `Mostrando ${visibles.length} de ${lista.length}` : `${lista.length} ${lista.length === 1 ? 'propiedad' : 'propiedades'}`}
              </p>
            </>
          ) : null}
        </div>
      </div>
      {aviso}
      {dialogoConfirmar}
    </>
  );
}
