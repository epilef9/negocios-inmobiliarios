'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { getProperties, type ApiProperty } from '@/services/api';
import { getVisitas, type Visita } from '@/services/visitas';
import { getContratos, type Contrato } from '@/services/contratos';
import Icono from '@/components/panel/Icono';
import { BotonLink, Encabezado, Esqueleto, EstadoVacio, Insignia, Tarjeta, Alerta } from '@/components/panel/ui';
import { ESTADO_VISITA, cuandoEs, estadoDe, fechaDeVisita } from '@/components/panel/estados';
import Recordatorios from '@/components/panel/Recordatorios';
import AccesosRapidos from '@/components/panel/AccesosRapidos';
import { usePendientes } from '@/components/panel/PanelMarco';
import { getResumenPanel, type ItemPendiente } from '@/services/panel';

type Datos = { propiedades: ApiProperty[]; visitas: Visita[]; contratos: Contrato[]; fallas: string[] };

const HOY = new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });

function Resumen({ etiqueta, valor, detalle, href, cargando }: { etiqueta: string; valor: number; detalle: React.ReactNode; href: string; cargando: boolean }) {
  return (
    <Link href={href} className="group flex flex-col gap-1 px-5 py-4 transition-colors hover:bg-panel-hundido">
      <span className="flex items-center justify-between text-[13px] text-panel-suave">
        {etiqueta}
        <Icono nombre="flecha" className="h-4 w-4 text-panel-tenue opacity-0 transition-opacity group-hover:opacity-100" />
      </span>
      {cargando ? <Esqueleto className="my-1.5 h-7 w-14" /> : <span className="tabular text-[28px] font-semibold leading-tight">{valor}</span>}
      <span className="text-[13px] text-panel-tenue">{detalle}</span>
    </Link>
  );
}

const URGENCIA: Record<ItemPendiente['urgencia'], { texto: string; punto: string }> = {
  1: { texto: 'Para hoy', punto: 'bg-red-500 ring-4 ring-red-500/15' },
  2: { texto: 'Esta semana', punto: 'bg-amber-500' },
  3: { texto: 'Cuando puedas', punto: 'bg-panel-tenue' },
};

// Todo lo pendiente del panel, lo más urgente arriba (lo mismo que resume la bienvenida)
function ParaAtender() {
  const [items, setItems] = useState<ItemPendiente[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let activo = true;
    getResumenPanel()
      .then((r) => activo && setItems(r ?? []))
      .catch(() => activo && setError(true));
    return () => {
      activo = false;
    };
  }, []);

  if (error) return null;
  const urgentes = items?.filter((i) => i.urgencia === 1 && i.clave !== 'visitas-hoy').length ?? 0;

  return (
    <Tarjeta
      titulo="Para atender"
      descripcion={
        !items ? 'Revisando…' : items.length === 0 ? 'Nada pendiente.' : urgentes ? `${items.length} temas; ${urgentes} para hoy.` : `${items.length} temas, ninguno urgente.`
      }
      relleno={false}
    >
      {!items ? (
        <div className="flex flex-col gap-3 p-5">
          {[0, 1, 2].map((i) => (
            <Esqueleto key={i} className="h-9 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EstadoVacio icono="check" titulo="Estás al día" texto="Cuando entre una visita, una reserva o una solicitud, aparece acá." />
      ) : (
        <ul className="m-0 list-none divide-y divide-panel-borde p-0">
          {items.map((item) => {
            const u = URGENCIA[item.urgencia];
            return (
              <li key={item.clave}>
                <Link href={item.href} className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3.5 px-5 py-3 transition-colors hover:bg-panel-hundido">
                  <span aria-hidden="true" className={`mt-[7px] h-2 w-2 rounded-full ${u.punto}`} />
                  <span className="min-w-0">
                    <span className="block text-[14px] font-medium">{item.titulo}</span>
                    {item.detalle && <span className="block text-[13px] text-panel-suave">{item.detalle}</span>}
                  </span>
                  <span className="mt-0.5 flex items-center gap-1 whitespace-nowrap text-[12px] text-panel-tenue">
                    {u.texto}
                    <Icono nombre="flecha" className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Tarjeta>
  );
}

export default function AdminInicioPage() {
  const { user } = useAuth();
  const pendientesPanel = usePendientes('/admin');
  const [datos, setDatos] = useState<Datos | null>(null);

  useEffect(() => {
    let vigente = true;
    // Cada fuente puede fallar por separado: se muestra lo que llegó y se avisa lo que no
    Promise.allSettled([getProperties(), getVisitas(), getContratos()]).then(([p, v, c]) => {
      if (!vigente) return;
      const fallas: string[] = [];
      if (p.status === 'rejected') fallas.push('propiedades');
      if (v.status === 'rejected') fallas.push('visitas');
      if (c.status === 'rejected') fallas.push('contratos');
      setDatos({
        propiedades: p.status === 'fulfilled' ? (p.value ?? []) : [],
        visitas: v.status === 'fulfilled' ? (v.value ?? []) : [],
        contratos: c.status === 'fulfilled' ? (c.value ?? []) : [],
        fallas,
      });
    });
    return () => {
      vigente = false;
    };
  }, []);

  const cargando = !datos;
  const propiedades = datos?.propiedades ?? [];
  const visitas = datos?.visitas ?? [];
  const contratos = datos?.contratos ?? [];
  // Igual que el número del menú: pendientes que todavía no pasaron
  const porConfirmar = pendientesPanel.visitas ?? visitas.filter((v) => v.estado === 'pendiente').length;
  const ahora = new Date();
  ahora.setHours(0, 0, 0, 0);
  // Próximas: pendientes o confirmadas desde hoy, la más cercana primero
  const proximas = visitas
    .map((v) => ({ v, cuando: fechaDeVisita(v.fecha, v.horario) }))
    .filter(({ v, cuando }) => (v.estado === 'pendiente' || v.estado === 'confirmada' || v.estado === 'reprogramada') && (!cuando || cuando >= ahora))
    .sort((a, b) => (a.cuando?.getTime() ?? Infinity) - (b.cuando?.getTime() ?? Infinity))
    .slice(0, 6);

  const disponibles = propiedades.filter((p) => !p.estado || p.estado === 'disponible').length;
  const activos = contratos.filter((c) => c.estado === 'activo').length;
  const porVencer = contratos.filter((c) => c.estado === 'por_vencer').length;

  const nombre = user?.nombre || user?.email?.split('@')[0] || '';
  const fecha = HOY.format(new Date());

  return (
    <>
      <Encabezado
        titulo={nombre ? `Hola, ${nombre}.` : 'Hola.'}
        descripcion={<span className="first-letter:uppercase">{fecha}</span>}
        acciones={
          <BotonLink href="/admin/propiedades/nueva" variante="principal" icono="mas">
            Nueva propiedad
          </BotonLink>
        }
      />

      <div className="flex flex-col gap-6">
        {datos?.fallas.length ? (
          <Alerta tono="aviso" titulo={`No se pudieron cargar: ${datos.fallas.join(', ')}.`}>
            Revisá que el backend esté funcionando y volvé a cargar la página.
          </Alerta>
        ) : null}

        <AccesosRapidos pendientes={pendientesPanel} />

        <section
          aria-label="Resumen"
          className="grid grid-cols-2 overflow-hidden rounded-xl border border-panel-borde bg-panel-superficie lg:grid-cols-4 [&>*]:border-panel-borde max-lg:[&>*:nth-child(-n+2)]:border-b [&>*:nth-child(odd)]:border-r lg:[&>*:not(:last-child)]:border-r"
        >
          <Resumen
            etiqueta="Visitas por confirmar"
            valor={porConfirmar}
            detalle={porConfirmar ? 'Esperan tu respuesta' : 'Todo respondido'}
            href="/admin/visitas"
            cargando={cargando}
          />
          <Resumen
            etiqueta="Reservas por confirmar"
            valor={pendientesPanel.reservas ?? 0}
            detalle={pendientesPanel.senas ? `${pendientesPanel.senas} con seña por vencer` : 'Reservas y pagos'}
            href="/admin/reservas"
            cargando={cargando}
          />
          <Resumen etiqueta="Propiedades" valor={propiedades.length} detalle={`${disponibles} disponibles`} href="/admin/propiedades" cargando={cargando} />
          <Resumen
            etiqueta="Contratos activos"
            valor={activos}
            detalle={porVencer ? `${porVencer} por vencer` : `${contratos.length} en total`}
            href="/admin/contratos"
            cargando={cargando}
          />
        </section>

        <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="flex min-w-0 flex-col gap-6">
            <ParaAtender />
            <Tarjeta
              titulo="Próximas visitas"
              descripcion="Pendientes y confirmadas, de la más cercana a la más lejana."
              acciones={
                <Link href="/admin/visitas" className="text-[13px] font-medium text-panel-suave hover:text-panel-texto">
                  Ver todas
                </Link>
              }
              relleno={false}
            >
              {cargando ? (
                <div className="flex flex-col gap-3 p-5">
                  {[0, 1, 2].map((i) => (
                    <Esqueleto key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : proximas.length === 0 ? (
                <EstadoVacio icono="visitas" titulo="No hay visitas próximas" texto="Cuando alguien pida una visita desde el sitio, aparece acá." />
              ) : (
                <ul className="m-0 list-none divide-y divide-panel-borde p-0">
                  {proximas.map(({ v, cuando }) => {
                    const estado = estadoDe(ESTADO_VISITA, v.estado);
                    return (
                      <li key={v.id || v._id}>
                        <Link href="/admin/visitas" className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-panel-hundido">
                          <span className="tabular w-36 shrink-0 whitespace-nowrap text-[13px] font-medium">{cuandoEs(cuando, v.horario)}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[14px] font-medium">{v.cliente?.nombre || 'Sin nombre'}</span>
                            <span className="block truncate text-[13px] text-panel-suave">{v.propiedad?.titulo || 'Propiedad sin título'}</span>
                          </span>
                          <Insignia tono={estado.tono}>{estado.texto}</Insignia>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Tarjeta>
          </div>

          <div className="flex flex-col gap-6">
            <Recordatorios />
          </div>
        </div>
      </div>
    </>
  );
}
