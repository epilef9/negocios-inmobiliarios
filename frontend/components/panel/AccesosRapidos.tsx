'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Icono, { type NombreIcono } from './Icono';
import { Boton, Dialogo, Esqueleto, Tarjeta, useAviso } from './ui';
import { getAccesosPanel, guardarAccesosPanel, type PendientesPanel } from '@/services/panel';

type Acceso = { clave: string; href: string; texto: string; icono: NombreIcono; pendiente?: keyof PendientesPanel };

// Todo lo que se puede poner como acceso rápido. La clave es lo que se guarda en la cuenta: no cambiarla.
export const ACCESOS: Acceso[] = [
  { clave: 'nueva-propiedad', href: '/admin/propiedades/nueva', texto: 'Nueva propiedad', icono: 'mas' },
  { clave: 'propiedades', href: '/admin/propiedades', texto: 'Propiedades', icono: 'propiedades' },
  { clave: 'visitas', href: '/admin/visitas', texto: 'Visitas', icono: 'visitas', pendiente: 'visitas' },
  { clave: 'horario', href: '/admin/horario', texto: 'Horario de visitas', icono: 'reloj' },
  { clave: 'reservas', href: '/admin/reservas', texto: 'Reservas', icono: 'maleta', pendiente: 'reservas' },
  { clave: 'disponibilidad', href: '/admin/disponibilidad', texto: 'Disponibilidad', icono: 'calendario' },
  { clave: 'senas', href: '/admin/senas', texto: 'Reservas con seña', icono: 'candado', pendiente: 'senas' },
  { clave: 'solicitudes', href: '/admin/solicitudes', texto: 'Solicitudes', icono: 'solicitudes', pendiente: 'solicitudes' },
  { clave: 'publicaciones', href: '/admin/publicaciones', texto: 'Publicaciones', icono: 'subir', pendiente: 'publicaciones' },
  { clave: 'clientes', href: '/admin/clientes', texto: 'Clientes', icono: 'clientes' },
  { clave: 'contratos', href: '/admin/contratos', texto: 'Contratos', icono: 'documento', pendiente: 'contratos' },
  { clave: 'cobros', href: '/admin/cobros', texto: 'Cobros', icono: 'dinero', pendiente: 'cobros' },
  { clave: 'generar-contrato', href: '/admin/contratos/generar', texto: 'Generar contrato', icono: 'contratos' },
  { clave: 'estadisticas', href: '/admin/estadisticas', texto: 'Estadísticas', icono: 'estrella' },
  { clave: 'catalogo', href: '/admin/catalogo', texto: 'Orden del catálogo', icono: 'catalogo' },
  { clave: 'requisitos', href: '/admin/requisitos', texto: 'Requisitos', icono: 'checklist' },
  { clave: 'sitio', href: '/admin/sitio', texto: 'Datos del sitio', icono: 'editar' },
  { clave: 'configuracion', href: '/admin/configuracion', texto: 'Configuración', icono: 'configuracion' },
  { clave: 'ver-sitio', href: '/', texto: 'Ver el sitio', icono: 'sitio' },
];

const POR_CLAVE = new Map(ACCESOS.map((a) => [a.clave, a]));
const DE_SIEMPRE = ['nueva-propiedad', 'visitas', 'reservas', 'solicitudes', 'contratos', 'generar-contrato', 'catalogo', 'ver-sitio'];
const MAXIMO = 12;

// Copia en este navegador para mostrarlos al instante; la cuenta manda cuando responde
const CLAVE_LOCAL = 'panel_accesos';
const leerLocal = (): string[] | null => {
  try {
    const crudo = localStorage.getItem(CLAVE_LOCAL);
    const lista = crudo ? JSON.parse(crudo) : null;
    return Array.isArray(lista) ? lista : null;
  } catch {
    return null;
  }
};
const guardarLocal = (lista: string[]) => {
  try {
    localStorage.setItem(CLAVE_LOCAL, JSON.stringify(lista));
  } catch {
    // sin almacenamiento: se usa lo de la cuenta
  }
};

const conocidas = (lista: string[]) => lista.filter((c) => POR_CLAVE.has(c));

export default function AccesosRapidos({ pendientes }: { pendientes: PendientesPanel }) {
  // Arranca con la copia de este navegador (el panel se dibuja solo en el navegador, después de la sesión)
  const [claves, setClaves] = useState<string[] | null>(() => (typeof window === 'undefined' ? null : conocidas(leerLocal() ?? DE_SIEMPRE)));
  const [editando, setEditando] = useState(false);
  const { mostrar, aviso } = useAviso();

  useEffect(() => {
    let activo = true;
    getAccesosPanel()
      .then((remotos) => {
        if (!activo) return;
        const lista = conocidas(remotos ?? DE_SIEMPRE);
        setClaves(lista);
        guardarLocal(lista);
      })
      .catch(() => {
        // Sin conexión: quedan los de este navegador
      });
    return () => {
      activo = false;
    };
  }, []);

  const guardar = async (lista: string[]) => {
    const anterior = claves;
    setClaves(lista);
    setEditando(false);
    try {
      await guardarAccesosPanel(lista);
      guardarLocal(lista);
      mostrar('Accesos rápidos guardados.');
    } catch {
      setClaves(anterior);
      mostrar('No se pudieron guardar los accesos rápidos. Probá de nuevo.', 'peligro');
    }
  };

  const accesos = (claves ?? []).map((c) => POR_CLAVE.get(c)!).filter(Boolean);

  return (
    <>
      <Tarjeta
        titulo="Accesos rápidos"
        descripcion="Lo que más usás, a un clic. Los números son cosas para revisar."
        acciones={
          <Boton tamano="sm" icono="editar" onClick={() => setEditando(true)} disabled={!claves}>
            Personalizar
          </Boton>
        }
      >
        {!claves ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Esqueleto key={i} className="h-[76px] w-full rounded-lg" />
            ))}
          </div>
        ) : accesos.length === 0 ? (
          <p className="m-0 text-[14px] text-panel-suave">
            No elegiste ningún acceso.{' '}
            <button type="button" onClick={() => setEditando(true)} className="font-medium text-panel-texto underline underline-offset-2">
              Elegir accesos
            </button>
          </p>
        ) : (
          <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 lg:grid-cols-4">
            {accesos.map((a) => {
              const cantidad = a.pendiente ? pendientes[a.pendiente] ?? 0 : 0;
              return (
                <li key={a.clave}>
                  <Link
                    href={a.href}
                    className="group relative flex h-full min-h-[76px] items-center gap-3 rounded-lg border border-panel-borde px-3.5 py-3 transition-colors hover:border-panel-borde-fuerte hover:bg-panel-hundido"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-panel-hundido text-panel-suave transition-colors group-hover:bg-panel-superficie group-hover:text-panel-texto">
                      <Icono nombre={a.icono} className="h-[18px] w-[18px]" />
                    </span>
                    <span className="min-w-0 flex-1 text-[14px] font-medium leading-snug">{a.texto}</span>
                    {cantidad > 0 && (
                      <span className="tabular absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[11.5px] font-semibold text-white shadow-sm sm:static sm:shadow-none">
                        {cantidad > 99 ? '99+' : cantidad}
                        <span className="sr-only"> para revisar</span>
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Tarjeta>

      {/* Se monta al abrir, así cada vez arranca de lo guardado */}
      {claves && editando && <EditorAccesos actuales={claves} alCerrar={() => setEditando(false)} alGuardar={guardar} />}
      {aviso}
    </>
  );
}

function EditorAccesos({ actuales, alCerrar, alGuardar }: { actuales: string[]; alCerrar: () => void; alGuardar: (lista: string[]) => void }) {
  const [lista, setLista] = useState(actuales);

  const mover = (i: number, paso: -1 | 1) =>
    setLista((l) => {
      const j = i + paso;
      if (j < 0 || j >= l.length) return l;
      const copia = [...l];
      [copia[i], copia[j]] = [copia[j], copia[i]];
      return copia;
    });
  const quitar = (clave: string) => setLista((l) => l.filter((c) => c !== clave));
  const agregar = (clave: string) => setLista((l) => (l.length >= MAXIMO || l.includes(clave) ? l : [...l, clave]));

  const disponibles = ACCESOS.filter((a) => !lista.includes(a.clave));
  const lleno = lista.length >= MAXIMO;
  const botonIcono = 'rounded-md p-1.5 text-panel-tenue transition-colors hover:bg-panel-hundido hover:text-panel-texto disabled:pointer-events-none disabled:opacity-30';

  return (
    <Dialogo
      abierto
      alCerrar={alCerrar}
      titulo="Personalizar accesos rápidos"
      descripcion={`Elegí hasta ${MAXIMO} y ordenalos como te quede más cómodo.`}
      ancho="lg"
      acciones={
        <>
          <Boton variante="fantasma" className="mr-auto" onClick={() => setLista(DE_SIEMPRE)}>
            Volver a los de siempre
          </Boton>
          <Boton onClick={alCerrar}>Cancelar</Boton>
          <Boton variante="principal" icono="check" onClick={() => alGuardar(lista)}>
            Guardar
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <section aria-labelledby="accesos-elegidos">
          <h3 id="accesos-elegidos" className="m-0 mb-2 flex items-baseline justify-between text-[13px] font-semibold text-panel-suave">
            En tu inicio
            <span className="tabular font-normal text-panel-tenue">
              {lista.length} de {MAXIMO}
            </span>
          </h3>
          {lista.length === 0 ? (
            <p className="m-0 rounded-lg border border-dashed border-panel-borde-fuerte px-4 py-5 text-center text-[14px] text-panel-suave">Agregá alguno de la lista de abajo.</p>
          ) : (
            <ol className="m-0 list-none divide-y divide-panel-borde rounded-lg border border-panel-borde p-0">
              {lista.map((clave, i) => {
                const a = POR_CLAVE.get(clave)!;
                return (
                  <li key={clave} className="flex items-center gap-3 px-3 py-2">
                    <span className="tabular w-5 text-center text-[12.5px] text-panel-tenue">{i + 1}</span>
                    <Icono nombre={a.icono} className="h-[18px] w-[18px] text-panel-suave" />
                    <span className="min-w-0 flex-1 text-[14px]">{a.texto}</span>
                    <button type="button" className={botonIcono} onClick={() => mover(i, -1)} disabled={i === 0} aria-label={`Subir ${a.texto}`}>
                      <Icono nombre="arriba" className="h-4 w-4" />
                    </button>
                    <button type="button" className={botonIcono} onClick={() => mover(i, 1)} disabled={i === lista.length - 1} aria-label={`Bajar ${a.texto}`}>
                      <Icono nombre="abajo" className="h-4 w-4" />
                    </button>
                    <button type="button" className={`${botonIcono} hover:text-red-600 dark:hover:text-red-400`} onClick={() => quitar(clave)} aria-label={`Quitar ${a.texto}`}>
                      <Icono nombre="cerrar" className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        {disponibles.length > 0 && (
          <section aria-labelledby="accesos-para-agregar">
            <h3 id="accesos-para-agregar" className="m-0 mb-2 text-[13px] font-semibold text-panel-suave">
              Para agregar{lleno && <span className="font-normal text-panel-tenue"> · quitá uno para sumar otro</span>}
            </h3>
            <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2">
              {disponibles.map((a) => (
                <li key={a.clave}>
                  <button
                    type="button"
                    onClick={() => agregar(a.clave)}
                    disabled={lleno}
                    className="flex w-full items-center gap-3 rounded-lg border border-panel-borde px-3 py-2 text-left text-[14px] transition-colors hover:border-panel-borde-fuerte hover:bg-panel-hundido disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <Icono nombre={a.icono} className="h-[18px] w-[18px] text-panel-suave" />
                    <span className="min-w-0 flex-1">{a.texto}</span>
                    <Icono nombre="mas" className="h-4 w-4 text-panel-tenue" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </Dialogo>
  );
}
