// Avisos breves al cerrar o iniciar sesión (los muestra AvisoSalida en el sitio).
// Se guardan en sessionStorage con la hora: si nadie los muestra enseguida (por ejemplo, el admin cerró sesión
// en el panel y lo mandó a ingresar), vencen solos y no aparecen después en otra cuenta.

export const AVISO_SALIDA = 'sesion_cerrada';
export const AVISO_INGRESO = 'sesion_iniciada';
const VIGENCIA_MS = 60_000;

type Marca = { t: number; nombre?: string };

export function marcarAviso(clave: typeof AVISO_SALIDA | typeof AVISO_INGRESO, nombre?: string) {
  try {
    // Un aviso reemplaza al otro: al ingresar ya no corresponde «Cerraste sesión», y al salir tampoco el saludo
    sessionStorage.removeItem(clave === AVISO_SALIDA ? AVISO_INGRESO : AVISO_SALIDA);
    sessionStorage.setItem(clave, JSON.stringify({ t: Date.now(), nombre } satisfies Marca));
  } catch {
    // sin almacenamiento: no se muestra el aviso
  }
}

// Lee el aviso y lo borra (se muestra una sola vez). Devuelve null si no hay o si ya venció.
export function tomarAviso(clave: typeof AVISO_SALIDA | typeof AVISO_INGRESO): Marca | null {
  try {
    const crudo = sessionStorage.getItem(clave);
    sessionStorage.removeItem(clave);
    if (!crudo) return null;
    const marca = JSON.parse(crudo) as Marca;
    return typeof marca?.t === 'number' && Date.now() - marca.t < VIGENCIA_MS ? marca : null;
  } catch {
    return null;
  }
}
