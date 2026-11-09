// Texto de los Términos y la Política de privacidad.
// PROVISORIO: es un borrador con datos de ejemplo para ver cómo queda. Lo revisan Pablo y Araceli antes de mergear.
// Para dejarlo real: reemplazar los datos de abajo, ajustar el texto y poner PROVISORIO = false.

export const PROVISORIO = true;

// Datos del responsable: TODOS ESTOS VALORES SON DE EJEMPLO (inventados). Reemplazar por los reales.
export const NEGOCIO = {
  nombre: 'Araceli Balbuena Negocios Inmobiliarios',
  razonSocial: 'Razón Social de Ejemplo S.R.L.',
  cuit: '30-00000000-0',
  matricula: 'Mat. 0000 (ejemplo)',
  domicilio: 'Calle de Ejemplo 123, Villa Libertador San Martín, Entre Ríos',
  email: 'datos@ejemplo.com.ar',
  jurisdiccion: 'los tribunales ordinarios de la ciudad de Paraná, Entre Ríos (ejemplo)',
};

// Plazos de conservación (provisorios: confirmar con Pablo, Araceli y su contador o abogado)
export const PLAZOS = {
  solicitudesCerradas: '90 días',
  contratos: '10 años desde la finalización del contrato (plazo de ejemplo)',
};

export const ULTIMA_ACTUALIZACION = '8 de noviembre de 2026';

export type Seccion = { titulo: string; parrafos?: string[]; items?: string[] };

export const TERMINOS: Seccion[] = [
  {
    titulo: '1. Quiénes somos',
    parrafos: [
      `Este sitio es operado por ${NEGOCIO.nombre} (${NEGOCIO.razonSocial}, CUIT ${NEGOCIO.cuit}, matrícula ${NEGOCIO.matricula}), con domicilio en ${NEGOCIO.domicilio}. Podés escribirnos a ${NEGOCIO.email}.`,
    ],
  },
  {
    titulo: '2. Qué ofrece el sitio',
    parrafos: [
      'Podés ver propiedades en venta y alquiler, agendar visitas, reservar alquileres por días, iniciar solicitudes de alquiler, pedirnos que publiquemos tu propiedad y consultar el estado de cada trámite desde tu cuenta.',
      'La información de cada propiedad (precio, medidas, fotos, disponibilidad) es orientativa y puede cambiar sin aviso. Antes de firmar o pagar, confirmá los datos con la inmobiliaria.',
    ],
  },
  {
    titulo: '3. Tu cuenta',
    items: [
      'Los datos que cargues tienen que ser verdaderos y estar actualizados.',
      'Sos responsable de tu contraseña. Si creés que alguien más entró a tu cuenta, podés cerrar las sesiones desde tu perfil o escribirnos.',
      'Para crear la cuenta tenés que aceptar estos Términos y la Política de privacidad.',
    ],
  },
  {
    titulo: '4. Uso adecuado',
    items: [
      'No está permitido cargar información falsa o de otra persona, ni documentación que no te pertenezca.',
      'No está permitido intentar acceder a datos de otros usuarios, sobrecargar el sitio o usarlo para enviar spam.',
      'Podemos suspender cuentas que incumplan estas reglas.',
    ],
  },
  {
    titulo: '5. Visitas, reservas y pagos',
    parrafos: [
      'Una visita o una solicitud no garantiza el alquiler ni la compra: cada trámite se confirma después de la revisión de la inmobiliaria. Las condiciones de cada reserva, seña o pago se informan antes de confirmarlas.',
    ],
  },
  {
    titulo: '6. Contenido del sitio',
    parrafos: [
      'Las fotos, textos, logos y el diseño del sitio son de la inmobiliaria o de quienes autorizaron su uso. No pueden copiarse ni reutilizarse sin permiso.',
    ],
  },
  {
    titulo: '7. Responsabilidad',
    parrafos: [
      'Hacemos lo posible para que el sitio funcione sin interrupciones y con información correcta, pero no podemos garantizarlo. No respondemos por daños derivados de fallas del servicio o de datos desactualizados, salvo lo que la ley establezca.',
    ],
  },
  {
    titulo: '8. Cambios en estos Términos',
    parrafos: ['Podemos modificarlos. La versión vigente es la que está publicada en esta página, con su fecha de actualización.'],
  },
  {
    titulo: '9. Ley aplicable',
    parrafos: [`Estos Términos se rigen por las leyes de la República Argentina. Para cualquier conflicto, serán competentes ${NEGOCIO.jurisdiccion}.`],
  },
];

export const PRIVACIDAD: Seccion[] = [
  {
    titulo: '1. Quién es responsable de tus datos',
    parrafos: [
      `${NEGOCIO.nombre} (${NEGOCIO.razonSocial}, CUIT ${NEGOCIO.cuit}), con domicilio en ${NEGOCIO.domicilio}. Contacto para todo lo que tenga que ver con tus datos: ${NEGOCIO.email}.`,
    ],
  },
  {
    titulo: '2. Qué datos guardamos',
    items: [
      'De tu cuenta: nombre, apellido, email, teléfono y contraseña (la contraseña se guarda cifrada, nunca en texto plano).',
      'Cuando pedís un alquiler o la publicación de tu propiedad: DNI, CUIL/CUIT, ingresos, datos de contacto y la documentación que adjuntes (por ejemplo, constancias y recibos).',
      'De tu actividad: visitas agendadas, reservas, solicitudes, propiedades favoritas y mensajes que nos mandes.',
      'Datos técnicos: tipo de navegador y ubicación aproximada de tus ingresos, que usamos para avisarte si alguien entra a tu cuenta desde un dispositivo nuevo.',
    ],
  },
  {
    titulo: '3. Para qué los usamos',
    items: [
      'Crear y proteger tu cuenta.',
      'Coordinar visitas, reservas, contratos y pagos.',
      'Evaluar tu solicitud de alquiler o el pedido de publicación de tu propiedad.',
      'Responder tus consultas y mandarte los avisos de cada trámite por email.',
      'Cumplir obligaciones legales.',
    ],
    parrafos: ['No vendemos tus datos ni los usamos para otra finalidad distinta de estas.'],
  },
  {
    titulo: '4. Cuánto tiempo los guardamos',
    items: [
      `Documentación de solicitudes rechazadas, vencidas o cerradas: ${PLAZOS.solicitudesCerradas}. Pasado ese plazo se borran los archivos; queda el registro de la solicitud y la fecha de borrado.`,
      `Contratos y registros de operaciones: ${PLAZOS.contratos}.`,
      'Tu cuenta: mientras esté activa. Podés pedir que la borremos en cualquier momento.',
    ],
  },
  {
    titulo: '5. Quién puede ver tus datos',
    parrafos: [
      'Solo el personal autorizado de la inmobiliaria, con acceso por usuario y contraseña. Los documentos que subís se guardan cifrados.',
      'Para que el sitio funcione usamos proveedores que tratan datos por nuestra cuenta: alojamiento del sitio y de la base de datos, almacenamiento de fotos, envío de emails, verificación «no soy un robot» y cobro de reservas. Solo reciben lo necesario para cumplir su función.',
    ],
  },
  {
    titulo: '6. Tus derechos',
    parrafos: [
      `Según la Ley 25.326 de Protección de los Datos Personales, podés pedir acceso a tus datos, que los corrijamos, los actualicemos o los borremos. Escribinos a ${NEGOCIO.email} desde el email de tu cuenta y te respondemos dentro de los plazos que fija la ley.`,
      'La Agencia de Acceso a la Información Pública, en su carácter de Órgano de Control de la Ley 25.326, tiene la atribución de atender las denuncias y reclamos que se interpongan con relación al incumplimiento de las normas sobre protección de datos personales.',
    ],
  },
  {
    titulo: '7. Cookies',
    parrafos: [
      'Usamos cookies solo para mantener tu sesión iniciada y para proteger tus pedidos. No usamos cookies de publicidad.',
    ],
  },
  {
    titulo: '8. Cambios en esta política',
    parrafos: ['Si la modificamos, publicamos la versión nueva en esta página con su fecha de actualización.'],
  },
];
