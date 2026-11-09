import { request } from './api';

// Ajustes del sitio que edita el administrador: contacto de la oficina, costos de la calculadora, datos bancarios,
// lugares de referencia y las preguntas frecuentes del asistente de Contacto

export type Horario = { dias: string; horas: string };
export type Contacto = {
  telefono: string;
  whatsapp: string;
  email: string;
  direccion: string;
  localidad: string;
  instagram: string;
  horarios: Horario[];
};
export type Costos = {
  publicado: boolean;
  alquiler: { mesesDeposito: number; honorariosPorcentaje: number; selladoPorcentaje: number; gastosFijosARS: number };
  venta: { honorariosPorcentaje: number; escrituraPorcentaje: number; senaPorcentaje: number };
  aclaracion: string;
};
export type Banco = { titular: string; banco: string; cbu: string; alias: string; cuit: string };
// Pago de estadías (alquiler temporario): qué porcentaje del total es la seña que reserva los días
export type Estadias = { senaPorcentaje: number };
export type Lugar = { nombre: string; localidad: string; latitud: number; longitud: number };
export type PreguntaFrecuente = { pregunta: string; respuesta: string; palabras: string[]; enlace?: { texto: string; href: string } };

export type AjustesPublicos = { contacto: Contacto; costos: Costos | null; transferencia: boolean; lugares: Lugar[]; preguntas: PreguntaFrecuente[]; estadias?: Estadias };
export type AjustesAdmin = { contacto: Contacto; costos: Costos; banco: Banco; lugares: Lugar[]; preguntas: PreguntaFrecuente[]; sugeridas: PreguntaFrecuente[]; estadias: Estadias };

// Lo mismo que muestra el sitio si la API no responde (y lo que había fijo antes de poder editarlo)
export const CONTACTO_PREDETERMINADO: Contacto = {
  telefono: '+54 343 446 9522',
  whatsapp: '543434469522',
  email: 'puiggarinegociosinmobiliarios@hotmail.com',
  direccion: '25 de Mayo 726',
  localidad: 'Villa Libertador San Martín',
  instagram: 'aracelibalbuenainmobiliaria',
  horarios: [
    { dias: 'Lunes a jueves', horas: '9 a 13 y 17 a 19 h' },
    { dias: 'Viernes', horas: '9 a 13 h' },
    { dias: 'Fin de semana', horas: 'Cerrado' },
  ],
};

let pedido: Promise<AjustesPublicos> | null = null;

// Una sola consulta compartida por todos los componentes de la página
export function getAjustesPublicos(): Promise<AjustesPublicos> {
  if (!pedido) {
    pedido = request<AjustesPublicos>('/ajustes').catch((e) => {
      pedido = null;
      throw e;
    });
  }
  return pedido;
}

export const olvidarAjustes = () => {
  pedido = null;
};

export const getAjustesAdmin = () => request<AjustesAdmin>('/ajustes/admin');
export const guardarAjustes = (cambios: Partial<{ contacto: Partial<Contacto>; costos: Partial<Costos>; banco: Partial<Banco>; lugares: Lugar[]; preguntas: PreguntaFrecuente[]; estadias: Partial<Estadias> }>) =>
  request<AjustesAdmin>('/ajustes', { method: 'PUT', body: JSON.stringify(cambios) }).then((a) => {
    olvidarAjustes();
    return a;
  });

// Enlaces armados con los datos de contacto
export const enlacesContacto = (c: Contacto) => {
  const direccionCompleta = `${c.direccion}, ${c.localidad}`;
  return {
    whatsappUrl: `https://wa.me/${c.whatsapp.replace(/\D/g, '')}`,
    telefonoUrl: `tel:${c.telefono.replace(/[^\d+]/g, '')}`,
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${direccionCompleta}, Entre Ríos`)}`,
    mapaEmbed: `https://maps.google.com/maps?q=${encodeURIComponent(`${direccionCompleta}, Entre Ríos`)}&z=16&output=embed`,
    instagramUrl: c.instagram ? `https://www.instagram.com/${c.instagram}` : '',
    direccionCompleta,
  };
};
