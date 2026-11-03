'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getEstadisticas, type ResumenEstadisticas, type Totales } from '@/services/estadisticas';
import { Alerta, Encabezado, Esqueleto, EstadoVacio, Insignia, Pestanas, Tarjeta } from '@/components/panel/ui';
import { ESTADO_PROPIEDAD, estadoDe } from '@/components/panel/estados';

// 222: qué propiedades se miran más y qué generan (WhatsApp, visitas, favoritos, solicitudes).
// Sirve para decidir qué destacar y para mostrarle resultados a cada dueño. No se guardan datos de quien mira.

const PERIODOS = [7, 30, 90, 365];
const METRICAS: { clave: keyof Totales; texto: string }[] = [
  { clave: 'vistas', texto: 'Vistas de la ficha' },
  { clave: 'whatsapp', texto: 'Clics en WhatsApp' },
  { clave: 'visitas', texto: 'Visitas agendadas' },
  { clave: 'favoritos', texto: 'Guardadas en favoritos' },
  { clave: 'solicitudes', texto: 'Solicitudes' },
];

const diaCorto = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });

// Vistas por día: una sola serie (el título la nombra), barras finas con el valor al pasar el mouse
function VistasPorDia({ serie }: { serie: ResumenEstadisticas['serie'] }) {
  const maximo = Math.max(1, ...serie.map((d) => d.vistas));
  const [marcado, setMarcado] = useState<number | null>(null);
  const actual = marcado !== null ? serie[marcado] : null;

  // Sin vistas en todo el período: un aviso en lugar de barras vacías con «Máximo: 1»
  if (!serie.some((d) => d.vistas > 0)) {
    return (
      <figure className="m-0 flex flex-col gap-3">
        <figcaption className="text-sm font-medium">Vistas de fichas por día</figcaption>
        <div className="flex h-40 items-center justify-center rounded-lg bg-panel-hundido text-sm text-panel-suave">Sin vistas en este período</div>
      </figure>
    );
  }

  return (
    <figure className="m-0 flex flex-col gap-3">
      <figcaption className="flex items-baseline justify-between gap-4 text-sm">
        <span className="font-medium">Vistas de fichas por día</span>
        <span className="tabular text-panel-suave" aria-live="polite">
          {actual ? `${diaCorto(actual.dia)}: ${actual.vistas} ${actual.vistas === 1 ? 'vista' : 'vistas'}` : `Máximo: ${maximo}`}
        </span>
      </figcaption>
      <div className="relative h-40 border-b border-panel-borde" onMouseLeave={() => setMarcado(null)}>
        {/* Línea de referencia del máximo, apenas visible */}
        <div className="absolute inset-x-0 top-0 border-t border-dashed border-panel-borde" aria-hidden="true" />
        <ol className="m-0 flex h-full list-none items-end gap-[2px] p-0" aria-label="Vistas por día">
          {serie.map((d, i) => (
            <li
              key={d.dia}
              className="flex h-full flex-1 cursor-default items-end"
              onMouseEnter={() => setMarcado(i)}
              onFocus={() => setMarcado(i)}
              tabIndex={0}
              aria-label={`${diaCorto(d.dia)}: ${d.vistas} ${d.vistas === 1 ? 'vista' : 'vistas'}`}
            >
              <span
                className={`block w-full rounded-t-[4px] transition-colors ${marcado === i ? 'bg-panel-texto' : 'bg-[var(--p-acento)]'}`}
                style={{ height: d.vistas ? `${Math.max(3, (d.vistas / maximo) * 100)}%` : '0%' }}
              />
            </li>
          ))}
        </ol>
      </div>
      <div className="flex justify-between text-[12px] text-panel-tenue">
        <span>{diaCorto(serie[0].dia)}</span>
        <span>{diaCorto(serie[serie.length - 1].dia)}</span>
      </div>
    </figure>
  );
}

export default function EstadisticasPage() {
  const [periodo, setPeriodo] = useState(1);
  const [datos, setDatos] = useState<ResumenEstadisticas | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    getEstadisticas(PERIODOS[periodo])
      .then((r) => {
        if (!activo) return;
        setDatos(r);
        setError(null);
      })
      .catch((e: Error) => activo && setError(e.message || 'No se pudieron cargar las estadísticas'));
    return () => {
      activo = false;
    };
  }, [periodo]);

  const conMovimiento = datos?.propiedades.filter((p) => METRICAS.some((m) => p[m.clave] > 0)) ?? [];
  const sinMovimiento = datos ? datos.propiedades.length - conMovimiento.length : 0;

  return (
    <>
      <Encabezado titulo="Estadísticas" descripcion="Cuánto se mira cada propiedad y qué consultas genera. Se cuenta desde que se activó esta sección; no se guardan datos de quien mira." />

      <div className="mb-5">
        <Pestanas etiqueta="Período" className="flex gap-6 overflow-x-auto" activa={periodo} alCambiar={(i) => { setDatos(null); setPeriodo(i); }} pestanas={PERIODOS.map((d) => ({ id: String(d), contenido: d === 365 ? 'Último año' : `Últimos ${d} días` }))} />
      </div>

      {error ? (
        <Alerta tono="peligro" titulo="No se pudieron cargar">
          {error}
        </Alerta>
      ) : !datos ? (
        <div className="flex flex-col gap-4">
          <Esqueleto className="h-24 w-full" />
          <Esqueleto className="h-56 w-full" />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <dl className="m-0 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {METRICAS.map((m) => (
              <div key={m.clave} className="rounded-xl border border-panel-borde bg-panel-superficie p-4">
                <dt className="text-[12.5px] text-panel-suave">{m.texto}</dt>
                <dd className="tabular m-0 mt-1 text-[26px] font-semibold leading-none">{datos.totales[m.clave].toLocaleString('es-AR')}</dd>
              </div>
            ))}
          </dl>

          <Tarjeta>
            <VistasPorDia serie={datos.serie} />
          </Tarjeta>

          <Tarjeta titulo="Por propiedad" descripcion={`Del ${diaCorto(datos.desde)} al ${diaCorto(datos.hasta)}, la más vista arriba.`} relleno={false}>
            {conMovimiento.length === 0 ? (
              <EstadoVacio icono="info" titulo="Todavía no hay movimiento en este período" texto="Los números aparecen a medida que la gente abre las fichas." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-left text-[13.5px]">
                  <thead className="text-[12px] text-panel-suave">
                    <tr className="border-b border-panel-borde">
                      <th scope="col" className="px-4 py-2.5 font-medium">Propiedad</th>
                      {METRICAS.map((m) => (
                        <th key={m.clave} scope="col" className="px-3 py-2.5 text-right font-medium">
                          {m.texto}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-panel-borde">
                    {conMovimiento.map((p) => {
                      const estado = estadoDe(ESTADO_PROPIEDAD, p.estado);
                      return (
                        <tr key={p.id}>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-3">
                              <span className="h-9 w-12 shrink-0 overflow-hidden rounded bg-panel-hundido">
                                {p.foto && (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={p.foto} alt="" className="h-full w-full object-cover" loading="lazy" />
                                )}
                              </span>
                              <span className="flex min-w-0 flex-col">
                                <Link href={`/propiedades/${p.id}`} target="_blank" className="truncate font-medium hover:underline">
                                  {p.titulo}
                                </Link>
                                <span className="flex items-center gap-2 text-[12px] text-panel-suave">
                                  {p.ciudad}
                                  {p.estado !== 'disponible' && <Insignia tono={estado.tono}>{estado.texto}</Insignia>}
                                </span>
                              </span>
                            </div>
                          </td>
                          {METRICAS.map((m) => (
                            <td key={m.clave} className={`tabular px-3 py-2.5 text-right ${p[m.clave] ? '' : 'text-panel-tenue'}`}>
                              {p[m.clave].toLocaleString('es-AR')}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {sinMovimiento > 0 && conMovimiento.length > 0 && (
              <p className="m-0 border-t border-panel-borde px-4 py-3 text-[12.5px] text-panel-suave">
                {sinMovimiento} {sinMovimiento === 1 ? 'propiedad no tuvo' : 'propiedades no tuvieron'} movimiento en este período.
              </p>
            )}
          </Tarjeta>
        </div>
      )}
    </>
  );
}
