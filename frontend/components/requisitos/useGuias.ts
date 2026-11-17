'use client';

import { useEffect, useState } from 'react';
import { GUIAS } from './datos';
import { getRequisitos, type Requisito } from '@/services/requisitos';

// Las guías con los requisitos que carga el admin. Mientras llegan (o si la API no responde) queda la guía fija.
// La usan la página de requisitos y el formulario de publicar, así las dos muestran la misma lista.
export function useGuias() {
  const [guias, setGuias] = useState(GUIAS);

  useEffect(() => {
    getRequisitos()
      .then((items) => {
        const actualizadas = GUIAS.map((guia) => {
          const deOperacion = items.filter((item: Requisito) => item.operacion === guia.id);
          let indice = 0;
          const secciones = [...new Set(deOperacion.map((item) => item.seccion))].map((titulo) => ({
            titulo,
            items: deOperacion.filter((item) => item.seccion === titulo).map((item) => ({
              // Se conserva el id histórico de la guía fija para no perder checks ya guardados.
              id: guia.secciones.flatMap((seccion) => seccion.items)[indice++]?.id ?? item._id,
              texto: item.texto,
            })),
          }));
          return secciones.length ? { ...guia, secciones } : guia;
        });
        setGuias(actualizadas);
      })
      .catch(() => {
        // La guía fija queda disponible si la API todavía no está levantada.
      });
  }, []);

  return guias;
}
