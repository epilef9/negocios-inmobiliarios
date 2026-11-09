import { request } from './api';

export type OperacionRequisito = 'alquilar' | 'comprar' | 'publicar';

export type Requisito = {
  _id: string;
  operacion: OperacionRequisito;
  seccion: string;
  texto: string;
  orden: number;
  activo: boolean;
};

export const getRequisitos = () => request<Requisito[]>('/requisitos');
export const getRequisitosAdmin = () => request<Requisito[]>('/requisitos/admin');
export const createRequisito = (data: Omit<Requisito, '_id'>) =>
  request<Requisito>('/requisitos', { method: 'POST', body: JSON.stringify(data) });
export const updateRequisito = (id: string, data: Partial<Omit<Requisito, '_id'>>) =>
  request<Requisito>(`/requisitos/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteRequisito = (id: string) =>
  request<void>(`/requisitos/${id}`, { method: 'DELETE' });
