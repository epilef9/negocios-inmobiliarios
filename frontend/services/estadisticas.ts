import { API_URL, request } from './api';

// 222: contadores por propiedad. El navegador solo avisa vistas de la ficha y clics en WhatsApp.

export type FilaEstadistica = {
  id: string;
  titulo: string;
  estado: string;
  operacion: string;
  ciudad: string;
  foto: string;
  vistas: number;
  whatsapp: number;
  visitas: number;
  favoritos: number;
  solicitudes: number;
};
export type Totales = Pick<FilaEstadistica, 'vistas' | 'whatsapp' | 'visitas' | 'favoritos' | 'solicitudes'>;
export type ResumenEstadisticas = { desde: string; hasta: string; dias: number; totales: Totales; propiedades: FilaEstadistica[]; serie: (Totales & { dia: string })[] };

export const getEstadisticas = (dias: number) => request<ResumenEstadisticas>(`/estadisticas?dias=${dias}`);

// Fire-and-forget: con keepalive llega aunque la persona se vaya a WhatsApp en ese momento
export function registrarEvento(propiedad: string, tipo: 'vista' | 'whatsapp') {
  try {
    void fetch(`${API_URL}/estadisticas/evento`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propiedad, tipo }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // sin red: no se cuenta
  }
}

// Una vista por propiedad y por pestaña (recargar no infla el número)
export function registrarVistaUnica(propiedad: string) {
  const clave = `vista-${propiedad}`;
  try {
    if (sessionStorage.getItem(clave)) return;
    sessionStorage.setItem(clave, '1');
  } catch {
    // sin almacenamiento: se cuenta igual
  }
  registrarEvento(propiedad, 'vista');
}
