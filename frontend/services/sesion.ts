// La sesión viaja en una cookie httpOnly que el navegador manda solo: el JavaScript de la página no ve el token.
// Los pedidos que cambian datos llevan además el valor de la cookie "csrf" en X-CSRF-Token (el backend compara los dos).

function leerCookie(nombre: string): string | null {
  if (typeof document === "undefined") return null;
  const par = document.cookie.split("; ").find((c) => c.startsWith(`${nombre}=`));
  return par ? decodeURIComponent(par.slice(nombre.length + 1)) : null;
}

// Opciones de fetch para hablar con la API con la sesión: cookies incluidas (también cuando el backend está en otro puerto,
// en desarrollo) y el encabezado csrf si hay sesión. `headers` son los propios del pedido.
export function conSesion(opciones: RequestInit = {}, headers: Record<string, string> = {}): RequestInit {
  const csrf = leerCookie("csrf");
  return {
    ...opciones,
    credentials: "include",
    headers: { ...(csrf ? { "X-CSRF-Token": csrf } : {}), ...headers },
  };
}
