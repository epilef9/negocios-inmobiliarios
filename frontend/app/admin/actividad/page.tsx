'use client';

import { useEffect, useState } from 'react';
import { Encabezado, EstadoVacio, Insignia, Tarjeta, useAviso } from '@/components/panel/ui';
import { getActividadReciente, textoActividad, type EntidadActividad, type RegistroActividad } from '@/services/actividad';

const ENTIDADES: Record<EntidadActividad, string> = {
  visita: 'Visita', reserva: 'Reserva', sena: 'Reserva con seña', solicitud: 'Solicitud',
  propiedad: 'Propiedad', publicacion: 'Publicación', empleado: 'Empleado',
};

// Registro de actividad del panel (solo administrador): quién hizo qué y cuándo
export default function AdminActividadPage() {
  const [lista, setLista] = useState<RegistroActividad[]>([]);
  const [cargando, setCargando] = useState(true);
  const { mostrar, aviso } = useAviso();

  useEffect(() => {
    let vigente = true;
    getActividadReciente()
      .then((registros) => vigente && setLista(registros))
      .catch((e) => vigente && mostrar(e instanceof Error ? e.message : 'No se pudo cargar la actividad', 'peligro'))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [mostrar]);

  return (
    <div className="flex flex-col gap-6">
      <Encabezado titulo="Actividad" descripcion="Lo último que hizo cada persona del panel al confirmar, cancelar o cambiar visitas, reservas, solicitudes y propiedades." />
      {aviso}
      {cargando ? (
        <Tarjeta><p className="m-0 text-sm text-panel-suave">Cargando…</p></Tarjeta>
      ) : lista.length === 0 ? (
        <EstadoVacio icono="reloj" titulo="Todavía no hay actividad" texto="Va a aparecer acá a medida que se confirmen o cambien cosas desde el panel." />
      ) : (
        <Tarjeta relleno={false}>
          <ul className="m-0 flex list-none flex-col divide-y divide-panel-borde p-0">
            {lista.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm">
                <Insignia>{ENTIDADES[r.entidad] ?? r.entidad}</Insignia>
                <span className="min-w-0 flex-1">
                  {textoActividad(r)}
                  {r.detalle ? <span className="text-panel-suave"> · {r.detalle}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        </Tarjeta>
      )}
    </div>
  );
}
