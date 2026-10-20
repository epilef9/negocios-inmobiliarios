import { request, type ApiProperty } from './api';

// Favoritos de la cuenta del usuario (requieren sesión iniciada)
export const getFavoritosIds = () => request<string[]>('/auth/favoritos');

export const getFavoritosDetalle = () => request<ApiProperty[]>('/auth/favoritos?detalle=1');

export const agregarFavorito = (propertyId: string) =>
  request<string[]>(`/auth/favoritos/${encodeURIComponent(propertyId)}`, { method: 'PUT' });

export const quitarFavorito = (propertyId: string) =>
  request<string[]>(`/auth/favoritos/${encodeURIComponent(propertyId)}`, { method: 'DELETE' });
