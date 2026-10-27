'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { getProperties, type ApiProperty } from '@/services/api';
import { getVisitas, type Visita } from '@/services/visitas';
import { getContratos, type Contrato } from '@/services/contratos';
import Icono, { type NombreIcono } from '@/components/panel/Icono';
import { BotonLink, Encabezado, Esqueleto, EstadoVacio, Insignia, Tarjeta, Alerta } from '@/components/panel/ui';
import { ESTADO_VISITA, cuandoEs, estadoDe, fechaDeVisita } from '@/components/panel/estados';

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

function Acceso({ href, icono, titulo, texto }: { href: string; icono: NombreIcono; titulo: string; texto: string }) {
  return (
    <Link href={href} className="group flex items-start gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-panel-hundido">
      <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-panel-hundido text-panel-suave group-hover:bg-panel-superficie">
        <Icono nombre={icono} className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-medium">{titulo}</span>
        <span className="block text-[13px] text-panel-suave">{texto}</span>
      </span>
    </Link>
  );
}

export default function AdminInicioPage() {
  const { user } = useAuth();
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
        propiedades: p.status === 'fulfilled' ? p.value ?? [] : [],
        visitas: v.status === 'fulfilled' ? v.value ?? [] : [],
        contratos: c.status === 'fulfilled' ? c.value ?? [] : [],
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
  const pendientes = visitas.filter((v) => v.estado === 'pendiente');
  const ahora = new Date();
  ahora.setHours(0, 0, 0, 0);
  // Próximas: pendientes o confirmadas desde hoy, la más cercana primero
  const proximas = visitas
    .map((v) => ({ v, cuando: fechaDeVisita(v.fecha, v.horario) }))
    .filter(({ v, cuando }) => (v.estado === 'pendiente' || v.estado === 'confirmada' || v.estado === 'reprogramada') && (!cuando || cuando >= ahora))
    .sort((a, b) => (a.cuando?.getTime() ?? Infinity) - (b.cuando?.getTime() ?? Infinity))
    .slice(0, 6);

  const disponibles = propiedades.filter((p) => !p.estado || p.estado === 'disponible').length;
  const sinFoto = propiedades.filter((p) => !p.images?.length);
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
          <>
            <BotonLink href="/admin/contratos/generar" icono="contratos">
              Generar contrato
            </BotonLink>
            <BotonLink href="/admin/propiedades/nueva" variante="principal" icono="mas">
              Nueva propiedad
            </BotonLink>
          </>
        }
      />

      <div className="flex flex-col gap-6">
        {datos?.fallas.length ? (
          <Alerta tono="aviso" titulo={`No se pudieron cargar: ${datos.fallas.join(', ')}.`}>
            Revisá que el backend esté funcionando y volvé a cargar la página.
          </Alerta>
        ) : null}

        <section aria-label="Resumen" className="grid divide-y divide-panel-borde overflow-hidden rounded-xl border border-panel-borde bg-panel-superficie sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <Resumen
            etiqueta="Visitas por confirmar"
            valor={pendientes.length}
            detalle={pendientes.length ? 'Esperan tu respuesta' : 'Todo respondido'}
            href="/admin/visitas"
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

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
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

          <div className="flex flex-col gap-6">
            {!cargando && sinFoto.length > 0 && (
              <Tarjeta titulo="Para revisar" relleno={false}>
                <ul className="m-0 list-none divide-y divide-panel-borde p-0">
                  {sinFoto.slice(0, 4).map((p) => (
                    <li key={p._id}>
                      <Link href={`/admin/propiedades/nueva?editar=${p._id}`} className="flex items-center gap-3 px-5 py-3 text-[14px] hover:bg-panel-hundido">
                        <Icono nombre="imagen" className="h-[18px] w-[18px] text-panel-tenue" />
                        <span className="min-w-0 flex-1 truncate">{p.title}</span>
                        <span className="text-[12.5px] text-panel-tenue">Sin fotos</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                {sinFoto.length > 4 && <p className="m-0 border-t border-panel-borde px-5 py-2.5 text-[13px] text-panel-suave">Y {sinFoto.length - 4} más sin fotos.</p>}
              </Tarjeta>
            )}

            <Tarjeta titulo="Accesos rápidos" relleno={false}>
              <div className="flex flex-col p-2">
                <Acceso href="/admin/catalogo" icono="catalogo" titulo="Ordenar el catálogo" texto="Qué propiedad se ve primero en el sitio." />
                <Acceso href="/propiedades" icono="sitio" titulo="Ver el catálogo público" texto="Como lo ven los clientes." />
                <Acceso href="/admin/requisitos" icono="contratos" titulo="Requisitos" texto="Listas que ven los clientes en la página pública." />
              </div>
            </Tarjeta>
          </div>
        </div>
      </div>
    </>
  );
}
