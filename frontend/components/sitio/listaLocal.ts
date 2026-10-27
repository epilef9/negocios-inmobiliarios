'use client';

import { useSyncExternalStore } from 'react';

// Listas de ids guardadas en el navegador (localStorage), compartidas entre componentes y pestañas:
// «vistas recientemente» y «para comparar». No hace falta cuenta. Todo con try/catch: en modo incógnito
// o con el almacenamiento bloqueado simplemente no se recuerda.

type Lista = { leer: () => string[]; guardar: (ids: string[]) => void; suscribir: (fn: () => void) => () => void };

const VACIA: string[] = [];

function crearLista(clave: string, maximo: number): Lista {
  let cache: string[] | null = null;
  const oyentes = new Set<() => void>();

  const leerDisco = (): string[] => {
    try {
      const datos = JSON.parse(localStorage.getItem(clave) || '[]');
      return Array.isArray(datos) ? datos.filter((x): x is string => typeof x === 'string' && /^[a-f\d]{24}$/i.test(x)).slice(0, maximo) : [];
    } catch {
      return [];
    }
  };
  const avisar = () => oyentes.forEach((fn) => fn());

  return {
    leer: () => (cache ??= leerDisco()),
    guardar: (ids) => {
      cache = [...new Set(ids)].slice(0, maximo);
      try {
        localStorage.setItem(clave, JSON.stringify(cache));
      } catch {
        // sin almacenamiento: queda solo en memoria
      }
      avisar();
    },
    suscribir: (fn) => {
      oyentes.add(fn);
      // Otra pestaña cambió la lista
      const alCambiarOtra = (e: StorageEvent) => {
        if (e.key === clave) {
          cache = null;
          fn();
        }
      };
      window.addEventListener('storage', alCambiarOtra);
      return () => {
        oyentes.delete(fn);
        window.removeEventListener('storage', alCambiarOtra);
      };
    },
  };
}

export const vistasRecientes = crearLista('vistasRecientes', 6);
export const paraComparar = crearLista('paraComparar', 3);
export const MAXIMO_COMPARAR = 3;

export const useLista = (lista: Lista) => useSyncExternalStore(lista.suscribir, lista.leer, () => VACIA);

// La más reciente primero
export const registrarVista = (id: string) => vistasRecientes.guardar([id, ...vistasRecientes.leer().filter((x) => x !== id)]);

export function alternarComparar(id: string): 'agregada' | 'quitada' | 'llena' {
  const actuales = paraComparar.leer();
  if (actuales.includes(id)) {
    paraComparar.guardar(actuales.filter((x) => x !== id));
    return 'quitada';
  }
  if (actuales.length >= MAXIMO_COMPARAR) return 'llena';
  paraComparar.guardar([...actuales, id]);
  return 'agregada';
}
