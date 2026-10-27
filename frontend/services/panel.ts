import { request } from './api';

// Números del menú del panel: lo que hay para revisar o confirmar en cada sección
export type PendientesPanel = Partial<Record<'visitas' | 'reservas' | 'solicitudes' | 'publicaciones' | 'senas' | 'contratos', number>>;

export const getPendientesPanel = () => request<PendientesPanel>('/panel/pendientes');

// Las pantallas avisan con este evento después de confirmar, rechazar o cerrar algo, y el menú se actualiza
export const EVENTO_PENDIENTES = 'panel-pendientes-cambiaron';
export const avisarPendientes = () => {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENTO_PENDIENTES));
};

// Resumen de la bienvenida: todo lo pendiente, lo más urgente primero.
// urgencia 1 = hoy / no puede esperar, 2 = esta semana, 3 = cuando puedas
export type ItemPendiente = { clave: string; urgencia: 1 | 2 | 3; titulo: string; detalle?: string; href: string; cantidad: number };
export const getResumenPanel = () => request<ItemPendiente[]>('/panel/resumen');

// Accesos rápidos del inicio del panel, guardados en la cuenta (null = nunca los personalizó)
export const getAccesosPanel = () => request<string[] | null>('/panel/accesos');
export const guardarAccesosPanel = (accesos: string[]) =>
  request<string[]>('/panel/accesos', { method: 'PUT', body: JSON.stringify({ accesos }) });
