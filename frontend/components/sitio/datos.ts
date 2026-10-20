'use client';

import { getLocalidades, getProperties, type ApiProperty } from '@/services/api';

// Una sola consulta compartida por las secciones del Home
let propiedades: Promise<ApiProperty[]> | null = null;
let localidades: Promise<string[]> | null = null;

export const LOCALIDADES_RESPALDO = ['Villa Libertador San Martín', 'Crespo', 'Diamante'];

export function obtenerPropiedades() {
  if (!propiedades) {
    propiedades = getProperties().catch((error) => {
      propiedades = null;
      throw error;
    });
  }
  return propiedades;
}

export function obtenerLocalidades() {
  if (!localidades) {
    localidades = getLocalidades()
      .then((lista) => (lista.length ? lista.map((l) => l.nombre) : LOCALIDADES_RESPALDO))
      .catch(() => {
        localidades = null;
        return LOCALIDADES_RESPALDO;
      });
  }
  return localidades;
}

export const normalizar = (texto = '') => texto.toLocaleLowerCase('es').trim();

export const etiquetaOperacion: Record<string, string> = {
  venta: 'Venta',
  alquiler: 'Alquiler',
  temporario: 'Por días',
};
