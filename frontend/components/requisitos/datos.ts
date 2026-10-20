// Requisitos de la inmobiliaria agrupados por operación.
// Los ids se guardan en la cuenta del usuario: no cambiarlos para no perder lo que ya marcó.

export type Operacion = 'alquilar' | 'comprar' | 'publicar';

export type SeccionRequisitos = {
  titulo: string;
  items: { id: string; texto: string }[];
};

export type GuiaRequisitos = {
  id: Operacion;
  pestana: string;
  titulo: string;
  bajada: string;
  // Mensaje con el que se abre WhatsApp desde esta guía
  consulta: string;
  accion: string;
  secciones: SeccionRequisitos[];
};

export const GUIAS: GuiaRequisitos[] = [
  {
    id: 'alquilar',
    pestana: 'Alquilar',
    titulo: 'Para alquilar',
    bajada: 'Lo que te vamos a pedir para firmar un contrato de alquiler.',
    consulta: 'Hola, tengo una consulta sobre los requisitos para alquilar.',
    accion: 'Consultar por WhatsApp',
    secciones: [
      {
        titulo: 'Documentación personal',
        items: [
          { id: 'alq-dni', texto: 'DNI del titular y co-titular (frente y dorso)' },
          { id: 'alq-cuil', texto: 'Constancia de CUIL/CUIT' },
          { id: 'alq-sueldo', texto: 'Recibo de sueldo de los últimos 3 meses o constancia de ingresos' },
          { id: 'alq-domicilio', texto: 'Comprobante de domicilio actual' },
        ],
      },
      {
        titulo: 'Garantía',
        items: [
          { id: 'alq-garantia-prop', texto: 'Garantía propietaria con escritura en la provincia de Entre Ríos' },
          { id: 'alq-recibo-garante', texto: 'Recibo de sueldo del garante (ingreso mínimo equivalente a 2 alquileres)' },
          { id: 'alq-caucion', texto: 'Alternativa: seguro de caución (sujeto a evaluación)' },
        ],
      },
      {
        titulo: 'Condiciones económicas',
        items: [
          { id: 'alq-deposito', texto: 'Depósito en garantía equivalente a 1 mes de alquiler' },
          { id: 'alq-comision', texto: 'Comisión inmobiliaria: 3% a cargo del inquilino' },
          { id: 'alq-contrato', texto: 'Contrato con actualización según índice vigente' },
        ],
      },
    ],
  },
  {
    id: 'comprar',
    pestana: 'Comprar',
    titulo: 'Para comprar',
    bajada: 'Lo necesario para reservar y escriturar una propiedad.',
    consulta: 'Hola, tengo una consulta sobre los requisitos para comprar una propiedad.',
    accion: 'Consultar por WhatsApp',
    secciones: [
      {
        titulo: 'Documentación personal',
        items: [
          { id: 'comp-dni', texto: 'DNI del titular y co-titular (frente y dorso)' },
          { id: 'comp-cuil', texto: 'Constancia de CUIL/CUIT' },
          { id: 'comp-ingresos', texto: 'Comprobante de ingresos o certificado de ingresos' },
          { id: 'comp-domicilio', texto: 'Comprobante de domicilio actual' },
        ],
      },
      {
        titulo: 'Financiación (si aplica)',
        items: [
          { id: 'comp-preaprobacion', texto: 'Pre-aprobación bancaria o capacidad de pago demostrable' },
          { id: 'comp-doc-bancaria', texto: 'Documentación adicional solicitada por la entidad financiera' },
        ],
      },
      {
        titulo: 'Condiciones económicas',
        items: [
          { id: 'comp-sena', texto: 'Seña: 10% del valor de la propiedad' },
          { id: 'comp-comision', texto: 'Comisión inmobiliaria: 3% a cargo del comprador' },
          { id: 'comp-escritura', texto: 'Gastos de escritura: a cargo del comprador' },
        ],
      },
    ],
  },
  {
    id: 'publicar',
    pestana: 'Publicar',
    titulo: 'Para publicar tu propiedad',
    bajada: 'Si querés vender o alquilar tu propiedad con nosotros, esto es lo que vamos a necesitar.',
    consulta: 'Hola, quiero publicar mi propiedad con ustedes. Les cuento de qué se trata:',
    accion: 'Quiero publicar mi propiedad',
    secciones: [
      {
        titulo: 'Documentación de la propiedad',
        items: [
          { id: 'pub-escritura', texto: 'Escritura o título de propiedad' },
          { id: 'pub-planos', texto: 'Planos (si los tuviera)' },
          { id: 'pub-impuestos', texto: 'Impuestos y servicios al día' },
          { id: 'pub-reglamento', texto: 'Reglamento de copropiedad (si aplica)' },
        ],
      },
      {
        titulo: 'Información requerida',
        items: [
          { id: 'pub-datos', texto: 'Datos completos de la propiedad' },
          { id: 'pub-desc', texto: 'Descripción detallada y características' },
          { id: 'pub-fotos', texto: 'Fotografías de buena calidad' },
          { id: 'pub-precio', texto: 'Precio de venta o alquiler deseado' },
        ],
      },
      {
        titulo: 'Condiciones',
        items: [
          { id: 'pub-condiciones', texto: 'La propiedad debe estar en condiciones de ser comercializada' },
          { id: 'pub-autorizacion', texto: 'Firmar autorización para publicar' },
          { id: 'pub-disponibilidad', texto: 'Disponibilidad para visitas y/o tasaciones' },
        ],
      },
    ],
  },
];

export const esOperacion = (valor: string | null): valor is Operacion =>
  valor === 'alquilar' || valor === 'comprar' || valor === 'publicar';
