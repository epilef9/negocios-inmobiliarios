import { request, type ApiProperty } from './api';
import type { FiltrosPropiedades } from '@/components/catalogo/FiltrosCatalogo';

// 113/219: «Avisame cuando esté disponible» y 221: búsquedas guardadas con aviso por mail

export type FiltrosAviso = { operacion: string; localidad: string; tipo: string; precioMin: number | null; precioMax: number | null; ambientes: number | null; comodidad: string };
export type Aviso = {
  _id: string;
  tipo: 'disponibilidad' | 'busqueda';
  propiedad?: Pick<ApiProperty, '_id' | 'titulo' | 'fotos' | 'estado' | 'ciudad' | 'categoriaOperacion'> | null;
  filtros?: FiltrosAviso;
  avisadoEn?: string | null;
  createdAt: string;
};

export const getMisAvisos = () => request<Aviso[]>('/avisos');
export const avisarDisponibilidad = (propiedad: string) => request<Aviso>('/avisos', { method: 'POST', body: JSON.stringify({ tipo: 'disponibilidad', propiedad }) });
export const guardarBusqueda = (filtros: FiltrosPropiedades) => request<Aviso>('/avisos', { method: 'POST', body: JSON.stringify({ tipo: 'busqueda', filtros }) });
export const quitarAviso = (id: string) => request<void>(`/avisos/${id}`, { method: 'DELETE' });
export const bajaDeAviso = (token: string) => request<{ tipo: string }>('/avisos/baja', { method: 'POST', body: JSON.stringify({ token }) });

const OPERACION: Record<string, string> = { venta: 'Compra', alquiler: 'Alquiler', temporario: 'Alquiler por días' };
const TIPO: Record<string, string> = { casa: 'Casa', departamento: 'Departamento', local: 'Local', terreno: 'Terreno' };

// Las búsquedas pueden tener varias opciones por filtro, separadas por coma: «Casa o Departamento»
const unir = (valor: string | undefined, nombres?: Record<string, string>) => {
  const lista = (valor || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
    .map((v) => (nombres ? nombres[v] : v))
    .filter(Boolean);
  return lista.length > 1 ? `${lista.slice(0, -1).join(', ')} o ${lista[lista.length - 1]}` : lista[0] || '';
};

export const describirFiltros = (f?: FiltrosAviso) =>
  f
    ? [
        unir(f.operacion, OPERACION) || 'Cualquier operación',
        unir(f.tipo, TIPO),
        f.localidad ? `en ${unir(f.localidad)}` : '',
        f.ambientes ? `${f.ambientes}+ ambientes` : '',
        f.precioMin != null ? `desde USD ${f.precioMin.toLocaleString('es-AR')}` : '',
        f.precioMax != null ? `hasta USD ${f.precioMax.toLocaleString('es-AR')}` : '',
      ]
        .filter(Boolean)
        .join(' · ')
    : '';
