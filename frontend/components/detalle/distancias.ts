import type { Lugar } from '@/services/ajustes';

// Distancia en línea recta entre dos puntos (fórmula del haversine), en metros
export function metrosEntre(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Por las calles se camina más que en línea recta: se suma un 30 %. Una cuadra ≈ 100 m; a pie ≈ 80 m por minuto.
export function recorrido(metrosRectos: number) {
  const metros = metrosRectos * 1.3;
  return { cuadras: Math.max(1, Math.round(metros / 100)), minutos: Math.max(1, Math.round(metros / 80)), metros };
}

// Lugares de la misma localidad que la propiedad (o a menos de 15 km si no se puede comparar), del más cercano al más lejano
export function lugaresCercanos(lat: number, lng: number, ciudad: string, lugares: Lugar[]) {
  const enMinusculas = (t: string) => t.toLocaleLowerCase('es');
  const ciudadP = enMinusculas(ciudad);
  return lugares
    .map((l) => ({ ...l, ...recorrido(metrosEntre(lat, lng, l.latitud, l.longitud)) }))
    .filter((l) => (l.localidad && ciudadP ? ciudadP.includes(enMinusculas(l.localidad).replace(/^villa\s+/, '')) || enMinusculas(l.localidad).includes(ciudadP) : l.metros < 15000))
    .sort((a, b) => a.metros - b.metros);
}
