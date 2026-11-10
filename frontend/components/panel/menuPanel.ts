'use client';

// Secciones del menú del panel y qué va en el menú principal y qué en «Más opciones».
// Cada persona del panel elige lo suyo en Configuración → Menú del panel; se guarda en la cuenta
// (con una copia en este navegador para que el menú salga armado al instante).
import { useCallback, useEffect, useState } from 'react';
import type { NombreIcono } from './Icono';
import { getMenuPanel, guardarMenuPanel, type PendientesPanel } from '@/services/panel';

// `clave`: lo que se guarda en la cuenta (no cambiarla). `fija`: siempre en el menú principal, no se puede mover.
// `incluye`: otras rutas que marcan la sección como activa. `pendiente`: el número que se muestra al lado.
// `enConfiguracion`: quien puede entrar a Configuración la encuentra ahí, no en el menú (el empleado con permiso
// la sigue viendo en el menú, porque Configuración es solo del administrador).
// `claves`: de dónde sale el número (si son varias, se suman)
export type Pendiente = { claves: (keyof PendientesPanel)[]; texto: string };
export type SeccionMenu = {
  clave: string;
  href: string;
  texto: string;
  icono: NombreIcono;
  exacta?: boolean;
  incluye?: string[];
  pendiente?: Pendiente;
  fija?: boolean;
  enConfiguracion?: boolean;
};

export const SECCIONES: SeccionMenu[] = [
  { clave: 'inicio', href: '/admin', texto: 'Inicio', icono: 'inicio', exacta: true, fija: true },
  { clave: 'propiedades', href: '/admin/propiedades', texto: 'Propiedades', icono: 'propiedades' },
  { clave: 'estadisticas', href: '/admin/estadisticas', texto: 'Estadísticas', icono: 'estrella' },
  { clave: 'visitas', href: '/admin/visitas', texto: 'Visitas', icono: 'visitas', pendiente: { claves: ['visitas'], texto: 'por confirmar' } },
  { clave: 'horario', href: '/admin/horario', texto: 'Horario de visitas', icono: 'reloj' },
  // Reservas por días y con seña, en una sola pantalla con dos pestañas
  { clave: 'reservas', href: '/admin/reservas', texto: 'Reservas', icono: 'maleta', incluye: ['/admin/senas'], pendiente: { claves: ['reservas', 'senas'], texto: 'por confirmar o por vencer' } },
  { clave: 'disponibilidad', href: '/admin/disponibilidad', texto: 'Disponibilidad', icono: 'calendario' },
  { clave: 'solicitudes', href: '/admin/solicitudes', texto: 'Solicitudes', icono: 'solicitudes', pendiente: { claves: ['solicitudes'], texto: 'por revisar' } },
  { clave: 'clientes', href: '/admin/clientes', texto: 'Clientes', icono: 'clientes' },
  { clave: 'contratos', href: '/admin/contratos', texto: 'Contratos', icono: 'documento', pendiente: { claves: ['contratos'], texto: 'para revisar (vencen o actualizan precio)' } },
  { clave: 'cobros', href: '/admin/cobros', texto: 'Cobros', icono: 'dinero', pendiente: { claves: ['cobros'], texto: 'alquileres atrasados o pagos para revisar' } },
  { clave: 'publicaciones', href: '/admin/publicaciones', texto: 'Publicaciones', icono: 'subir', pendiente: { claves: ['publicaciones'], texto: 'por revisar' } },
  { clave: 'requisitos', href: '/admin/requisitos', texto: 'Requisitos', icono: 'checklist', enConfiguracion: true },
  { clave: 'empleados', href: '/admin/empleados', texto: 'Empleados', icono: 'clientes' },
  { clave: 'actividad', href: '/admin/actividad', texto: 'Actividad', icono: 'reloj' },
  { clave: 'configuracion', href: '/admin/configuracion', texto: 'Configuración', icono: 'configuracion', incluye: ['/admin/catalogo', '/admin/sitio', '/admin/requisitos'], fija: true },
];

// Lo del día a día va arriba; lo que se usa de vez en cuando, en «Más opciones»
export const MENU_DE_SIEMPRE = ['propiedades', 'visitas', 'reservas', 'solicitudes', 'publicaciones', 'contratos', 'cobros'];

const MOVIBLES = new Set(SECCIONES.filter((s) => !s.fija).map((s) => s.clave));
const conocidas = (lista: string[]) => lista.filter((c) => MOVIBLES.has(c));

const enRuta = (ruta: string, href: string) => ruta === href || ruta.startsWith(`${href}/`);
export const esActiva = (ruta: string, s: SeccionMenu) =>
  s.exacta ? ruta === s.href : enRuta(ruta, s.href) || Boolean(s.incluye?.some((otra) => enRuta(ruta, otra)));

// Copia en este navegador. La cuenta manda cuando responde.
const CLAVE_LOCAL = 'panel_menu_principal';
const leerLocal = (): string[] | null => {
  try {
    const lista = JSON.parse(localStorage.getItem(CLAVE_LOCAL) ?? 'null');
    return Array.isArray(lista) ? conocidas(lista) : null;
  } catch {
    return null;
  }
};
const guardarLocal = (lista: string[] | null) => {
  try {
    if (lista) localStorage.setItem(CLAVE_LOCAL, JSON.stringify(lista));
    else localStorage.removeItem(CLAVE_LOCAL);
  } catch {
    // sin almacenamiento: se usa lo de la cuenta
  }
};

// Avisa al menú (en la misma pestaña) que cambió la elección hecha en Configuración
const EVENTO_MENU = 'panel-menu-cambio';

// Claves que van en el menú principal (las fijas no hace falta guardarlas) y cómo cambiarlas
export function useMenuPanel() {
  const [principal, setPrincipal] = useState<string[]>(() => (typeof window === 'undefined' ? MENU_DE_SIEMPRE : leerLocal() ?? MENU_DE_SIEMPRE));
  const [personalizado, setPersonalizado] = useState(() => typeof window !== 'undefined' && leerLocal() !== null);

  useEffect(() => {
    let activo = true;
    getMenuPanel()
      .then((remoto) => {
        if (!activo) return;
        const lista = remoto ? conocidas(remoto) : null;
        setPrincipal(lista ?? MENU_DE_SIEMPRE);
        setPersonalizado(lista !== null);
        guardarLocal(lista);
      })
      .catch(() => {
        // Sin conexión o sin permiso: queda lo de este navegador
      });
    const alCambiar = (e: Event) => {
      const lista = (e as CustomEvent<string[] | null>).detail;
      setPrincipal(lista ?? MENU_DE_SIEMPRE);
      setPersonalizado(lista !== null);
    };
    window.addEventListener(EVENTO_MENU, alCambiar);
    return () => {
      activo = false;
      window.removeEventListener(EVENTO_MENU, alCambiar);
    };
  }, []);

  // null = volver al menú de siempre. Si la cuenta no lo guarda, vuelve a lo anterior y avisa con el error.
  const guardar = useCallback(
    async (lista: string[] | null) => {
      const anterior = personalizado ? principal : null;
      const nueva = lista ? conocidas(lista) : null;
      const avisar = (valor: string[] | null) => window.dispatchEvent(new CustomEvent(EVENTO_MENU, { detail: valor }));
      guardarLocal(nueva);
      avisar(nueva);
      try {
        await guardarMenuPanel(nueva);
      } catch (error) {
        guardarLocal(anterior);
        avisar(anterior);
        throw error;
      }
    },
    [principal, personalizado]
  );

  return { principal, personalizado, guardar };
}

// Reparte las secciones visibles: las del menú principal (en el orden de siempre) y las de «Más opciones»
// Las secciones que esta persona ve en el menú (las de Configuración no, si puede entrar a Configuración)
export const seccionesDelMenu = (puedeEntrar: (href: string) => boolean) => {
  const conConfiguracion = puedeEntrar('/admin/configuracion');
  return SECCIONES.filter((s) => puedeEntrar(s.href) && !(s.enConfiguracion && conConfiguracion));
};

export function repartir(visibles: SeccionMenu[], principal: string[]) {
  const arriba = visibles.filter((s) => s.fija || principal.includes(s.clave));
  const mas = visibles.filter((s) => !s.fija && !principal.includes(s.clave));
  return { arriba, mas };
}
