'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { agregarFavorito, getFavoritosIds, quitarFavorito } from '@/services/favoritos';

// Estado compartido de favoritos: una sola carga por sesión y todas las tarjetas se enteran de los cambios
let ids: ReadonlySet<string> = new Set();
let cargadoPara: string | null = null;
const oyentes = new Set<() => void>();

const publicar = (nuevos: Iterable<string>) => {
  ids = new Set(nuevos);
  oyentes.forEach((oyente) => oyente());
};

const suscribir = (oyente: () => void) => {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
};

const VACIO: ReadonlySet<string> = new Set();

export function useFavoritos() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const actuales = useSyncExternalStore(suscribir, () => ids, () => VACIO);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      cargadoPara = null;
      if (ids.size) publicar([]);
      return;
    }
    if (cargadoPara === user.id) return;
    cargadoPara = user.id;
    getFavoritosIds()
      .then(publicar)
      .catch(() => {
        cargadoPara = null;
      });
  }, [user, isLoading]);

  const alternar = useCallback(
    async (propiedadId: string) => {
      if (!user) {
        router.push(`/login?volver=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        return;
      }
      const yaEsta = ids.has(propiedadId);
      const anterior = ids;
      // Cambio optimista: el corazón responde al instante y se revierte si el servidor falla
      const siguiente = new Set(ids);
      if (yaEsta) siguiente.delete(propiedadId);
      else siguiente.add(propiedadId);
      publicar(siguiente);
      try {
        publicar(yaEsta ? await quitarFavorito(propiedadId) : await agregarFavorito(propiedadId));
      } catch (error) {
        publicar(anterior);
        // Se conserva el motivo que manda el servidor (sesión vencida, propiedad inexistente, etc.)
        throw error instanceof Error ? error : new Error('No se pudo actualizar el favorito');
      }
    },
    [user, router]
  );

  return { favoritos: actuales, esFavorito: (id: string) => actuales.has(id), alternar, conSesion: Boolean(user) };
}
