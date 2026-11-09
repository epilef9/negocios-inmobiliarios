// Pasos del recorrido «Cómo funciona» de cada pantalla del panel.
// `objetivo` es el data-guia de la parte que se ilumina (en la pantalla o en su Tarjeta con guia="…").
// "acciones" lo pone solo el Encabezado: son los botones de arriba a la derecha.
// Sin objetivo, o si esa parte no está en pantalla (una lista vacía, por ejemplo), el paso sale en el centro.
export type PasoGuia = { objetivo?: string; titulo: string; texto: string };
type Guia = { titulo: string; pasos: PasoGuia[] };

const GUIAS_PANEL = {
  inicio: {
    titulo: 'Inicio del panel',
    pasos: [
      { objetivo: 'acciones', titulo: 'Lo más usado, a mano', texto: 'Desde acá cargás una propiedad nueva sin pasar por el listado. Este botón «Cómo funciona» está en todas las pantallas del panel.' },
      { objetivo: 'accesos', titulo: 'Accesos rápidos', texto: 'Atajos a lo que más usás. Los números marcan cosas para revisar. Con «Editar» elegís cuáles aparecen y en qué orden.' },
      { objetivo: 'resumen', titulo: 'El día en números', texto: 'Visitas, reservas, propiedades y solicitudes de un vistazo. Tocá cualquiera para ir a esa sección.' },
      { objetivo: 'para-atender', titulo: 'Para atender', texto: 'Todo lo que espera una respuesta tuya, lo más urgente primero. Cuando está vacío, estás al día.' },
      { objetivo: 'proximas-visitas', titulo: 'Próximas visitas', texto: 'Las visitas pendientes y confirmadas, de la más cercana a la más lejana. Tocá una para abrir Visitas.' },
      { objetivo: 'recordatorios', titulo: 'Recordatorios', texto: 'Lo que viene: las visitas de mañana, los contratos que vencen o actualizan el precio, y las propiedades más vistas del mes.' },
    ],
  },
  propiedades: {
    titulo: 'Propiedades',
    pasos: [
      { objetivo: 'acciones', titulo: 'Cargar y ordenar', texto: '«Nueva propiedad» abre el formulario para publicar una. «Ordenar catálogo» define cuál aparece primero en el sitio.' },
      { objetivo: 'filtros', titulo: 'Buscar y filtrar', texto: 'Escribí parte del título, la ubicación o el código, o filtrá por tipo, operación y estado. «Limpiar» saca los filtros.' },
      { objetivo: 'lista', titulo: 'Todas tus propiedades', texto: 'Cada renglón es una propiedad con su operación y su precio. Tocá el título para editarla.' },
      { objetivo: 'estado', titulo: 'Cambiar el estado', texto: 'Disponible, reservada, alquilada o vendida. El cambio se ve enseguida en el sitio: las que no están disponibles dejan de ofrecerse.' },
      { objetivo: 'acciones-fila', titulo: 'Imprimir, editar o borrar', texto: 'Imprimí la ficha para entregarla en papel, editá los datos y las fotos, o borrá la propiedad (pide confirmación).' },
    ],
  },
  estadisticas: {
    titulo: 'Estadísticas',
    pasos: [
      { objetivo: 'periodo', titulo: 'Elegí el período', texto: 'Los últimos 7, 30 o 90 días, o el último año. Todo lo de abajo se recalcula con el período elegido.' },
      { objetivo: 'metricas', titulo: 'Los totales', texto: 'Cuántas veces se abrieron las fichas y cuántos clics en WhatsApp, visitas, favoritos y solicitudes generaron.' },
      { objetivo: 'grafico', titulo: 'Vistas por día', texto: 'Cada barra es un día. Pasá el mouse por encima para ver el número exacto.' },
      { objetivo: 'por-propiedad', titulo: 'Por propiedad', texto: 'La más vista arriba. Sirve para ver qué interesa y cuáles conviene destacar o revisar el precio.' },
    ],
  },
  visitas: {
    titulo: 'Visitas',
    pasos: [
      { objetivo: 'acciones', titulo: 'Agendar a mano', texto: 'Si alguien llama o escribe por WhatsApp, cargá la visita desde «Agendar visita» y queda en la misma lista.' },
      { objetivo: 'pestanas', titulo: 'Por confirmar primero', texto: 'Las visitas que pidieron desde el sitio esperan tu confirmación. Las demás pestañas muestran las confirmadas, las rechazadas o todas.' },
      { objetivo: 'filtros', titulo: 'Buscar', texto: 'Por cliente, teléfono o propiedad, y por fecha.' },
      { objetivo: 'lista', titulo: 'La lista de visitas', texto: 'Día y hora, quién viene, a qué propiedad y en qué estado está. Las que ya pasaron se ven más claras.' },
      { objetivo: 'detalle', titulo: 'Ver el detalle', texto: 'Tocá el nombre para ver los datos de contacto, reprogramar o borrar la visita.' },
      { objetivo: 'acciones-fila', titulo: 'Confirmar o rechazar', texto: 'Al confirmar o rechazar, al cliente le llega un mail. Si rechazás, podés contarle por qué.' },
    ],
  },
  horario: {
    titulo: 'Horario de visitas',
    pasos: [
      { objetivo: 'franjas', titulo: 'Días y franjas', texto: 'Para cada día de la semana, elegí en qué horas se reciben visitas. Podés tener más de una franja por día (mañana y tarde) y copiar un día a otros.' },
      { objetivo: 'duracion', titulo: 'Duración del turno', texto: 'Cada franja se reparte en turnos de esta duración. Cada turno es una visita.' },
      { objetivo: 'proximos-dias', titulo: 'Los próximos 7 días', texto: 'Cuántos turnos se ofrecen cada día con el horario actual, incluidos los cambios que todavía no guardaste.' },
      { objetivo: 'vista-previa', titulo: 'Lo que ve el cliente', texto: 'Los horarios que aparecen cuando alguien toca «Agendar una visita» en una propiedad.' },
      { objetivo: 'cerrados', titulo: 'Días cerrados', texto: 'Feriados y vacaciones: esos días no se ofrecen turnos aunque normalmente se atienda.' },
      { titulo: 'No te olvides de guardar', texto: 'Cuando cambiás algo aparece una barra abajo para guardar. Hasta que no guardes, el sitio sigue con el horario anterior.' },
    ],
  },
  reservas: {
    titulo: 'Reservas por días',
    pasos: [
      { objetivo: 'tipos', titulo: 'Dos tipos de reserva', texto: 'Una reserva es una propiedad apartada para alguien. «Por días»: estadías en alquiler temporario que piden desde el sitio. «Con seña»: propiedades en venta o alquiler apartadas con una seña. Las solicitudes (con documentación) están en Solicitudes.' },
      { objetivo: 'pestanas', titulo: 'Reservas de estadía', texto: 'Pedidos de alquiler por días. En «Por confirmar» están las que esperan tu respuesta; las que no respondés a tiempo pasan a «Vencidas».' },
      { objetivo: 'filtros', titulo: 'Buscar', texto: 'Por cliente, email o propiedad.' },
      { objetivo: 'lista', titulo: 'La lista', texto: 'Fechas, huésped, propiedad, total y estado. Las que están por vencer se marcan en rojo.' },
      { objetivo: 'acciones-fila', titulo: 'Confirmar, rechazar o ver el pago', texto: 'Si el cliente pagó por transferencia, revisá el comprobante antes de confirmar. Al cliente le llega un mail con tu respuesta.' },
    ],
  },
  disponibilidad: {
    titulo: 'Disponibilidad',
    pasos: [
      { objetivo: 'propiedad', titulo: 'Elegí la propiedad', texto: 'Solo aparecen las de alquiler temporario.' },
      { objetivo: 'franja', titulo: 'Las próximas semanas', texto: 'Cada barra es una noche: ocupada, bloqueada o libre. Tocá un mes para verlo en el calendario.' },
      { objetivo: 'calendario', titulo: 'Bloquear noches', texto: 'Tocá la primera y la última noche para marcar un rango en que no se puede alquilar (por ejemplo, si la usa el dueño). En el sitio esas noches no se ofrecen.' },
      { objetivo: 'temporada', titulo: 'La temporada', texto: 'Las estadías reservadas y los huecos libres, desde hoy. Sirve para ver qué fechas quedan por llenar.' },
    ],
  },
  senas: {
    titulo: 'Reservas con seña',
    pasos: [
      { objetivo: 'tipos', titulo: 'Dos tipos de reserva', texto: 'Una reserva es una propiedad apartada para alguien. «Con seña»: propiedades en venta o alquiler apartadas con una seña hasta una fecha límite. «Por días»: estadías en alquiler temporario que piden desde el sitio.' },
      { objetivo: 'acciones', titulo: 'Registrar una reserva', texto: 'Cuando alguien deja una seña por una propiedad en venta o alquiler, registrala acá con el monto y la fecha límite.' },
      { objetivo: 'pestanas', titulo: 'Activas e historial', texto: 'Mientras la reserva está activa, la propiedad se ve «Reservada» en el sitio. Las concretadas y canceladas pasan al historial.' },
      { objetivo: 'lista', titulo: 'Cada reserva', texto: 'Quién reservó, cuánto dejó y hasta cuándo. Las que están por vencer se destacan.' },
      { objetivo: 'acciones-fila', titulo: 'Concretar, extender o cancelar', texto: '«Concretar» cierra la operación y marca la propiedad como vendida o alquilada. También podés cambiar la fecha límite o cancelar la reserva.' },
    ],
  },
  solicitudes: {
    titulo: 'Solicitudes',
    pasos: [
      { objetivo: 'pestanas', titulo: 'Activas y archivadas', texto: 'Los pedidos de alquiler o compra con la documentación del cliente. Las que ya resolviste podés archivarlas para que no molesten; las rechazadas, vencidas o cerradas se borran solas a los 90 días, con su documentación.' },
      { objetivo: 'filtros', titulo: 'Buscar y ordenar', texto: 'Por nombre, email o propiedad; por operación (alquiler o compra), por estado y por fecha.' },
      { objetivo: 'lista', titulo: 'Cada solicitud', texto: 'Cliente, propiedad, operación y estado. Si la propiedad ya no está disponible, se avisa.' },
      { objetivo: 'acciones-fila', titulo: 'Revisar', texto: '«Ver» abre los datos, los ingresos y los documentos. Desde ahí la aprobás, la rechazás o le pedís al cliente lo que falta; le llega un mail.' },
    ],
  },
  clientes: {
    titulo: 'Clientes',
    pasos: [
      { objetivo: 'acciones', titulo: 'Asignar a una propiedad', texto: 'Indicá quién es el dueño o el inquilino de cada propiedad. Puede tener cuenta en el sitio o no.' },
      { objetivo: 'resumen', titulo: 'El resumen', texto: 'Dueños, inquilinos, cuentas del sitio y propiedades sin dueño. Tocá un número para ver esa lista.' },
      { objetivo: 'pestanas', titulo: 'Quién es quién', texto: 'Separá propietarios, inquilinos y las cuentas creadas en el sitio.' },
      { objetivo: 'filtros', titulo: 'Buscar', texto: 'Por nombre, email, teléfono o propiedad.' },
      { objetivo: 'lista', titulo: 'La lista', texto: 'Cada cliente con sus propiedades y sus datos de contacto. Si una asignación quedó mal, la quitás desde acá.' },
    ],
  },
  contratos: {
    titulo: 'Contratos',
    pasos: [
      { objetivo: 'acciones', titulo: 'Generar un contrato', texto: 'Arma el contrato con los datos de la propiedad y del cliente ya cargados; vos completás lo que falta.' },
      { objetivo: 'pestanas', titulo: 'Por estado', texto: 'Activos, por vencer, firmados, borradores y cerrados. «Por vencer» conviene mirarla seguido.' },
      { objetivo: 'filtros', titulo: 'Buscar', texto: 'Por número de contrato, cliente o propiedad.' },
      { objetivo: 'lista', titulo: 'La lista', texto: 'Cada contrato con sus fechas y su estado.' },
      { objetivo: 'acciones-fila', titulo: 'Ver o editar', texto: '«Ver detalle» muestra el contrato completo; «Editar» te deja corregir los datos.' },
    ],
  },
  cobros: {
    titulo: 'Cobros',
    pasos: [
      { objetivo: 'mes', titulo: 'Elegí el mes', texto: 'Con las flechas pasás de mes. «Este mes» te trae de vuelta al actual.' },
      { objetivo: 'resumen', titulo: 'Cuánto se cobró', texto: 'Lo cobrado, lo pendiente y lo atrasado del mes, según los contratos vigentes.' },
      { objetivo: 'pestanas', titulo: 'Filtrar', texto: 'Mirá solo los atrasados, los pendientes o los pagados.' },
      { objetivo: 'lista', titulo: 'Un renglón por alquiler', texto: 'Inquilino, propiedad, monto y día de vencimiento. Pasado ese día sin pago, el alquiler figura atrasado.' },
      { objetivo: 'acciones-fila', titulo: 'Registrar el pago', texto: 'Al registrar el pago se genera el recibo para imprimir o mandar. También podés avisar un atraso por mail o cargar el monto nuevo después de una actualización.' },
    ],
  },
  publicaciones: {
    titulo: 'Solicitudes de publicación',
    pasos: [
      { objetivo: 'pestanas', titulo: 'Filtrar por estado', texto: 'Pendientes, aprobadas y rechazadas. Las pendientes esperan tu revisión.' },
      { objetivo: 'lista', titulo: 'Los pedidos', texto: 'Dueños que quieren publicar su propiedad desde el sitio, con su foto principal.' },
      { objetivo: 'detalle', titulo: 'Revisar y aprobar', texto: 'Tocá el pedido para ver los datos, las fotos y la documentación. «Aprobar y crear» la publica en el catálogo; si la rechazás, al dueño le llega el motivo.' },
    ],
  },
  requisitos: {
    titulo: 'Requisitos',
    pasos: [
      { objetivo: 'formulario', titulo: 'Agregar un requisito', texto: 'Elegí la operación (alquilar, comprar o publicar), la sección y escribí el requisito. Aparece en la página Requisitos del sitio.' },
      { objetivo: 'lista', titulo: 'Las listas', texto: 'Editá o borrá cada requisito. Los cambios se ven enseguida en el sitio.' },
    ],
  },
  empleados: {
    titulo: 'Empleados',
    pasos: [
      { objetivo: 'acciones', titulo: 'Crear un empleado', texto: 'Le armás una cuenta para entrar al panel y marcás qué secciones puede usar.' },
      { objetivo: 'lista', titulo: 'Permisos de cada uno', texto: 'Cada empleado ve y usa solo las secciones que tiene marcadas. Podés cambiarle los permisos o darlo de baja cuando quieras.' },
    ],
  },
  actividad: {
    titulo: 'Actividad',
    pasos: [
      { objetivo: 'lista', titulo: 'Quién hizo qué', texto: 'Cada vez que alguien del panel confirma, cancela o cambia una visita, reserva, solicitud o propiedad, queda anotado acá con la fecha y la hora.' },
    ],
  },
  configuracion: {
    titulo: 'Configuración',
    pasos: [
      { objetivo: 'datos-sitio', titulo: 'Datos del sitio', texto: 'Teléfono, WhatsApp, dirección, horario, lugares de referencia, la calculadora y los datos para transferencias.' },
      { objetivo: 'orden-catalogo', titulo: 'Orden del catálogo', texto: 'Qué propiedad aparece primero en el catálogo y en el inicio del sitio.' },
      { objetivo: 'requisitos', titulo: 'Requisitos', texto: 'Lo que se pide para alquilar, comprar o publicar. Se ve en la página Requisitos y lo usa el asistente de Contacto para responder.' },
      { objetivo: 'menu', titulo: 'Tu menú', texto: 'Elegí qué secciones van en el menú principal y cuáles en «Más opciones».' },
      { objetivo: 'apariencia', titulo: 'Claro u oscuro', texto: 'El modo oscuro cansa menos la vista de noche. También se cambia desde abajo del menú.' },
      { objetivo: 'colores', titulo: 'Colores del panel', texto: 'El color del menú y de los acentos. El sitio público no cambia.' },
    ],
  },
  catalogo: {
    titulo: 'Orden del catálogo',
    pasos: [
      { objetivo: 'buscar', titulo: 'Ubicar una propiedad', texto: 'Escribí parte del nombre para encontrarla rápido en la lista.' },
      { objetivo: 'lista', titulo: 'Arrastrá o usá las flechas', texto: 'La de arriba de todo es la primera en el catálogo y en el inicio del sitio. El cambio se aplica cuando guardás.' },
      { objetivo: 'acciones', titulo: 'Ver cómo queda', texto: 'Abre el catálogo del sitio en otra pestaña para comprobar el orden.' },
    ],
  },
  sitio: {
    titulo: 'Datos del sitio',
    pasos: [
      { objetivo: 'contacto', titulo: 'Contacto de la oficina', texto: 'Teléfono, WhatsApp, email, dirección y horario. Se ven en la barra de arriba, en el pie y en Contacto.' },
      { objetivo: 'lugares', titulo: 'Lugares de referencia', texto: 'Pegá el link de Google Maps de cada lugar (la Universidad, el Sanatorio…). En cada ficha se muestra a cuántas cuadras queda.' },
      { objetivo: 'calculadora', titulo: 'La calculadora', texto: 'Depósito, honorarios, sellado y escritura. Con esto el cliente ve cuánto necesita para entrar a una propiedad.' },
      { objetivo: 'banco', titulo: 'Datos para transferencias', texto: 'CBU o alias y titular. Los ve solo quien está pagando una reserva por transferencia.' },
      { objetivo: 'preguntas', titulo: 'Preguntas del asistente', texto: 'Lo que responde solo el asistente de Contacto: horarios, requisitos, cómo agendar o publicar. Agregá las que te hacen siempre; lo que no sepa responder te llega por WhatsApp.' },
      { titulo: 'Cada bloque se guarda solo', texto: 'Cada tarjeta tiene su botón «Guardar»: lo que cambiás en una no toca las otras.' },
    ],
  },
} satisfies Record<string, Guia>;

export type ClaveGuia = keyof typeof GUIAS_PANEL;
export const GUIAS: Record<ClaveGuia, Guia> = GUIAS_PANEL;
