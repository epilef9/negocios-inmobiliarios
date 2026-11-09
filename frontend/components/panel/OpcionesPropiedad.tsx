import type { ApiProperty } from '@/services/api';
import { operacionesAbiertas, operacionesDe } from '@/components/sitio/operaciones';

// Opciones de un <select> de propiedades, agrupadas por tipo de inmueble (los mismos tipos que al cargar una propiedad).
// Cada opción dice título · localidad · operación, así se distinguen aunque dos títulos se parezcan.

const GRUPOS: { tipo: NonNullable<ApiProperty['tipoInmueble']>; titulo: string }[] = [
  { tipo: 'casa', titulo: 'Casas' },
  { tipo: 'departamento', titulo: 'Departamentos' },
  { tipo: 'local', titulo: 'Locales' },
  { tipo: 'terreno', titulo: 'Terrenos' },
];

const OPERACION: Record<string, string> = { venta: 'Venta', alquiler: 'Alquiler', temporario: 'Temporario' };

// Las vendidas o alquiladas no se pueden visitar ni contratar de nuevo, salvo la venta con inquilino adentro (HU-28)
export const propiedadOfrecida = (p: ApiProperty) => p.estado === 'reservado' || operacionesAbiertas(p).length > 0;

export const etiquetaPropiedad = (p: ApiProperty) =>
  [p.titulo, p.ciudad, operacionesDe(p).map((o) => OPERACION[o]).join(' y '), p.estado === 'reservado' ? 'reservada' : '']
    .filter(Boolean)
    .join(' · ');

// Un monoambiente es un departamento de 1 ambiente (así se carga en el panel)
const tipoGeneral = (p: ApiProperty) => (p.tipoInmueble === 'monoambiente' ? 'departamento' : p.tipoInmueble);

export default function OpcionesPropiedad({ propiedades }: { propiedades: ApiProperty[] }) {
  const sinTipo = propiedades.filter((p) => !GRUPOS.some((g) => g.tipo === tipoGeneral(p)));
  return (
    <>
      {GRUPOS.map(({ tipo, titulo }) => {
        const delGrupo = propiedades.filter((p) => tipoGeneral(p) === tipo);
        return delGrupo.length ? (
          <optgroup key={tipo} label={titulo}>
            {delGrupo.map((p) => (
              <option key={p._id} value={p._id}>
                {etiquetaPropiedad(p)}
              </option>
            ))}
          </optgroup>
        ) : null;
      })}
      {sinTipo.length > 0 && (
        <optgroup label="Sin tipo cargado">
          {sinTipo.map((p) => (
            <option key={p._id} value={p._id}>
              {etiquetaPropiedad(p)}
            </option>
          ))}
        </optgroup>
      )}
    </>
  );
}
