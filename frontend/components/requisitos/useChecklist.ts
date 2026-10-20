'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useAuth } from '@/context/AuthContext';
import { request } from '@/services/api';

// Lo que la persona marcó como listo. Sin sesión queda en este navegador; con sesión, también en su cuenta.
type Marcas = Record<string, boolean>;
export type EstadoGuardado = 'navegador' | 'cargando' | 'guardando' | 'cuenta' | 'error';

let marcas: Marcas = {};
let claveActual: string | null = null;
const oyentes = new Set<() => void>();
const VACIO: Marcas = {};

const publicar = (nuevas: Marcas) => {
  marcas = nuevas;
  oyentes.forEach((oyente) => oyente());
};
const suscribir = (oyente: () => void) => {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
};

const leerLocal = (clave: string): Marcas => {
  try {
    const guardado = localStorage.getItem(clave);
    return guardado ? (JSON.parse(guardado) as Marcas) : {};
  } catch {
    return {};
  }
};
const guardarLocal = (clave: string, valor: Marcas) => {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    // Sin almacenamiento (modo privado): la lista sigue funcionando mientras la página esté abierta
  }
};
const aMarcas = (ids: string[]): Marcas => Object.fromEntries(ids.map((id) => [id, true]));
const aIds = (valor: Marcas) => Object.keys(valor).filter((id) => valor[id]);

export function useChecklist() {
  const { user, isLoading } = useAuth();
  const actuales = useSyncExternalStore(suscribir, () => marcas, () => VACIO);
  const [estado, setEstado] = useState<EstadoGuardado>('cargando');
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cada cuenta (y el invitado) tiene su propia copia local, igual que antes del rediseño
  const clave = user ? `checklist_requisitos_${user.id || user.email}` : 'checklist_requisitos_guest';

  useEffect(() => {
    if (isLoading) return;
    if (claveActual !== clave) {
      claveActual = clave;
      publicar(leerLocal(clave));
    }
    if (!user) return;

    // Con sesión, la cuenta manda: se trae lo guardado y se actualiza la copia local
    let vigente = true;
    request<string[]>('/auth/checklist')
      .then((ids) => {
        if (!vigente) return;
        const remotas = aMarcas(Array.isArray(ids) ? ids : []);
        guardarLocal(clave, remotas);
        publicar(remotas);
        setEstado('cuenta');
      })
      .catch(() => {
        if (vigente) setEstado('error');
      });
    return () => {
      vigente = false;
    };
  }, [clave, user, isLoading]);

  const guardar = useCallback(
    (nuevas: Marcas) => {
      publicar(nuevas);
      guardarLocal(clave, nuevas);
      if (!user) return;
      setEstado('guardando');
      if (temporizador.current) clearTimeout(temporizador.current);
      // Se espera un momento para mandar un solo pedido si marca varias cosas seguidas
      temporizador.current = setTimeout(() => {
        request<string[]>('/auth/checklist', { method: 'PUT', body: JSON.stringify({ checklist: aIds(nuevas) }) })
          .then(() => setEstado('cuenta'))
          .catch(() => setEstado('error'));
      }, 300);
    },
    [clave, user]
  );

  const alternar = useCallback((id: string) => guardar({ ...marcas, [id]: !marcas[id] }), [guardar]);

  const desmarcar = useCallback(
    (ids: string[]) => {
      const nuevas = { ...marcas };
      ids.forEach((id) => delete nuevas[id]);
      guardar(nuevas);
    },
    [guardar]
  );

  return {
    marcas: actuales,
    alternar,
    desmarcar,
    estado: user ? estado : ('navegador' as EstadoGuardado),
    nombre: user?.nombre || user?.email || '',
  };
}
