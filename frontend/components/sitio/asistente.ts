import type { Contacto, PreguntaFrecuente } from '@/services/ajustes';
import type { OperacionRequisito, Requisito } from '@/services/requisitos';

// Asistente de Contacto: busca entre las preguntas frecuentes la que mejor coincide con lo que escribió la persona
// y completa la respuesta con los datos del sitio. Sin servicios externos: todo pasa en el navegador.

const VACIAS = new Set([
  'que', 'qué', 'los', 'las', 'una', 'uno', 'unos', 'unas', 'del', 'por', 'para', 'con', 'sin', 'como', 'cual', 'cuales',
  'hay', 'son', 'esta', 'estan', 'tienen', 'tiene', 'tengo', 'quiero', 'queria', 'necesito', 'puedo', 'pueden', 'hola',
  'buenas', 'buen', 'dia', 'tarde', 'noches', 'gracias', 'consulta', 'pregunta', 'favor', 'saber', 'sobre', 'mas', 'muy',
  'este', 'ese', 'eso', 'esto', 'algo', 'alguna', 'algun', 'ustedes', 'usted', 'ellos', 'mis', 'sus', 'tus', 'nos', 'les',
]);

export const normalizar = (texto: string) =>
  texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const palabrasDe = (texto: string) => normalizar(texto).split(' ').filter((p) => p.length >= 3 && !VACIAS.has(p));

// «alquilo», «alquilar» y «alquileres» cuentan como la misma palabra: se comparan las primeras 5 letras
const raiz = (palabra: string) => palabra.slice(0, Math.max(4, Math.min(5, palabra.length)));
const coincide = (a: string, b: string) => a === b || (a.length >= 4 && b.length >= 4 && raiz(a) === raiz(b));

export type Resultado = { pregunta: PreguntaFrecuente; puntos: number };

// Las preguntas ordenadas de la que más coincide a la que menos (solo las que coinciden en algo)
export function buscar(preguntas: PreguntaFrecuente[], consulta: string): Resultado[] {
  const texto = ` ${normalizar(consulta)} `;
  const dichas = palabrasDe(consulta);
  if (!dichas.length) return [];
  return preguntas
    .map((pregunta) => {
      let puntos = 0;
      const usadas = new Set<string>();
      for (const clave of pregunta.palabras ?? []) {
        const c = normalizar(clave);
        if (!c) continue;
        // Una clave de varias palabras («cuanto vale») tiene que aparecer entera
        if (c.includes(' ')) {
          if (texto.includes(` ${c} `)) puntos += 3;
          continue;
        }
        const encontrada = dichas.find((d) => coincide(d, c));
        if (encontrada && !usadas.has(encontrada)) {
          usadas.add(encontrada);
          puntos += 2;
        }
      }
      // Las palabras de la pregunta también suman, pero menos que las claves
      for (const p of palabrasDe(pregunta.pregunta)) {
        if (p.length < 4) continue;
        const encontrada = dichas.find((d) => coincide(d, p));
        if (encontrada && !usadas.has(encontrada)) {
          usadas.add(encontrada);
          puntos += 1;
        }
      }
      return { pregunta, puntos };
    })
    .filter((r) => r.puntos > 0)
    .sort((a, b) => b.puntos - a.puntos);
}

// Con 2 puntos alcanza (una palabra clave); con menos, la respuesta sería un manotazo
export const PUNTOS_MINIMOS = 2;

export type DatosRespuesta = { contacto: Contacto; requisitos: Requisito[] | null };

const listaRequisitos = (requisitos: Requisito[] | null, operacion: OperacionRequisito) => {
  const deOperacion = (requisitos ?? []).filter((r) => r.operacion === operacion);
  if (!deOperacion.length) return 'La lista completa está en la página de Requisitos.';
  return deOperacion.map((r) => `• ${r.texto}`).join('\n');
};

// Completa las marcas de la respuesta con los datos del sitio
export function completar(respuesta: string, { contacto, requisitos }: DatosRespuesta) {
  const direccion = [contacto.direccion, contacto.localidad].filter(Boolean).join(', ');
  const horario = contacto.horarios.map((h) => `• ${h.dias}: ${h.horas}`).join('\n');
  return respuesta
    .replace(/\{horario\}/g, horario)
    .replace(/\{direccion\}/g, direccion)
    .replace(/\{telefono\}/g, contacto.telefono)
    .replace(/\{email\}/g, contacto.email)
    .replace(/\{requisitos-(alquilar|comprar|publicar)\}/g, (_, operacion: OperacionRequisito) => listaRequisitos(requisitos, operacion));
}

// Mensaje de WhatsApp armado con la consulta, para lo que el asistente no sabe responder
export const mensajeWhatsapp = (consulta: string) => `Hola, tengo una consulta: ${consulta.trim()}`;
