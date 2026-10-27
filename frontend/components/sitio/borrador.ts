// Borradores de formularios largos en sessionStorage: si la página se recarga por error, lo escrito vuelve.
// Solo dura mientras la pestaña está abierta. Nunca guardar contraseñas ni datos sensibles.
// Todo va con try/catch: en modo incógnito o con el almacenamiento bloqueado, simplemente no se guarda.

export function leerBorrador<T extends Record<string, string>>(clave: string, campos: readonly (keyof T)[]): Partial<T> {
  try {
    const crudo = JSON.parse(sessionStorage.getItem(clave) || 'null');
    if (!crudo || typeof crudo !== 'object') return {};
    const limpio: Partial<T> = {};
    for (const campo of campos) {
      const valor = (crudo as Record<string, unknown>)[campo as string];
      if (typeof valor === 'string') limpio[campo] = valor.slice(0, 300) as T[keyof T];
    }
    return limpio;
  } catch {
    return {};
  }
}

export function guardarBorrador<T extends Record<string, string>>(clave: string, datos: T, campos: readonly (keyof T)[]) {
  try {
    const solo = Object.fromEntries(campos.map((c) => [c, datos[c]]));
    if (Object.values(solo).some((v) => v)) sessionStorage.setItem(clave, JSON.stringify(solo));
    else sessionStorage.removeItem(clave);
  } catch {
    // sin almacenamiento disponible: no pasa nada
  }
}

export function borrarBorrador(clave: string) {
  try {
    sessionStorage.removeItem(clave);
  } catch {
    // idem
  }
}
