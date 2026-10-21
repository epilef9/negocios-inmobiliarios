// Cuándo ve el administrador la pantalla de bienvenida:
// - cada vez que inicia sesión;
// - cada vez que abre el sitio de nuevo (pestaña nueva o al volver otro día).
// Recargar la misma pestaña no la repite: se recuerda en sessionStorage, que dura lo que dura la pestaña.

const CLAVE = 'bienvenida_admin_vista';

export const RUTA_BIENVENIDA = '/admin/bienvenida';

export function marcarBienvenidaVista() {
  try {
    sessionStorage.setItem(CLAVE, '1');
  } catch {
    // Sin almacenamiento (modo privado estricto): la bienvenida puede repetirse, no pasa nada
  }
}

export function bienvenidaYaVista() {
  try {
    return sessionStorage.getItem(CLAVE) === '1';
  } catch {
    return true;
  }
}

export function olvidarBienvenida() {
  try {
    sessionStorage.removeItem(CLAVE);
  } catch {
    // nada que hacer
  }
}

// Ruta de la bienvenida recordando a dónde quería ir el administrador
export const rutaBienvenida = (volver?: string | null) =>
  volver && volver !== '/' && !volver.startsWith(RUTA_BIENVENIDA) ? `${RUTA_BIENVENIDA}?volver=${encodeURIComponent(volver)}` : RUTA_BIENVENIDA;
