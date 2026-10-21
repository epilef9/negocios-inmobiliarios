// Carga un catálogo de muestra para presentar el sitio: 9 propiedades de Villa Libertador San Martín,
// Crespo y Diamante, con fotos, precios y datos completos.
//
// Las fotos son de Unsplash (licencia libre, se pueden usar sin pedir permiso) y NO son de las propiedades:
// sirven para mostrar cómo se ve el sitio. Antes de publicar de verdad hay que reemplazarlas por fotos reales
// (o borrar estas propiedades con --quitar).
//
// Uso (desde la carpeta backend):
//   npm run demo:propiedades -- --probar   → muestra qué haría, sin tocar nada
//   npm run demo:propiedades               → sube las fotos a Cloudinary y crea o actualiza las propiedades
//   npm run demo:propiedades -- --quitar   → borra solo estas propiedades de muestra (por su código NI-1xx)
//   npm run demo:propiedades -- --borrar-otras → además de cargar las de muestra, borra TODAS las demás
//                                              (usalo solo si las que había eran de prueba; con --probar primero)
//
// Se puede correr varias veces: actualiza por código interno y no duplica propiedades ni fotos.

const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('./config/database');
const Property = require('./models/property.model');
const { usaCloudinary, subirUrlACloudinary } = require('./services/imagenes.service');

const SOLO_PROBAR = process.argv.includes('--probar');
const QUITAR = process.argv.includes('--quitar');
const BORRAR_OTRAS = process.argv.includes('--borrar-otras');

// Cotización de referencia guardada junto al precio; el sitio muestra la del día cuando la consigue
const COTIZACION = 1400;
const HORARIO = 'Lun a Vie 9 - 18 h • Sáb 9 - 13 h';
const foto = (id) => `https://images.unsplash.com/photo-${id}?w=1800&q=80&fm=jpg&fit=max`;
const mapa = (lat, lng) => `https://www.google.com/maps?q=${lat},${lng}`;

const ubicacion = {
    vlsm: { ciudad: 'Villa Libertador San Martín', lat: -32.0748, lng: -60.4577 },
    crespo: { ciudad: 'Crespo', lat: -32.0283, lng: -60.3076 },
    diamante: { ciudad: 'Diamante', lat: -32.0655, lng: -60.6402 },
};

// Datos comunes; cada propiedad pisa lo que necesita
const base = (lugar, desplazamiento) => {
    const lat = (lugar.lat + desplazamiento[0]).toFixed(5);
    const lng = (lugar.lng + desplazamiento[1]).toFixed(5);
    return {
        ciudad: lugar.ciudad,
        provincia: 'entre_rios',
        latitud: lat,
        longitud: lng,
        linkGoogleMaps: mapa(lat, lng),
        cotizacionDolar: COTIZACION,
        permitirVisita: true,
        permitirWhatsApp: true,
        permitirEmail: true,
        horarioAtencion: HORARIO,
        telefonoWhatsApp: '',
        estado: 'disponible',
        expensas: 'sin_expensas',
        montoExpensas: 0,
        otrasComodidades: '',
        pisoUnidad: '',
        precioPorNocheUSD: 0,
        minimoNoches: 0,
        huespedesMaximos: 0,
        costoLimpiezaUSD: 0,
        duracionAlquilerMeses: 0,
        unidadDuracionAlquiler: 'meses',
        checkInDesde: '',
        checkOutHasta: '',
        checkInFlexible: 'si',
    };
};

const enDolares = (usd) => ({ moneda: 'USD', price: usd, priceARS: usd * COTIZACION });
const enPesos = (ars) => ({ moneda: 'ARS', price: Number((ars / COTIZACION).toFixed(2)), priceARS: ars });

const PROPIEDADES = [
    {
        ...base(ubicacion.vlsm, [0.0021, -0.0034]),
        codigoInterno: 'NI-101',
        title: 'Casa de 3 dormitorios con galería y parque',
        description:
            'Casa de una planta en una calle tranquila y arbolada, a cinco cuadras de la Universidad Adventista del Plata. ' +
            'Living comedor amplio con salida a la galería, cocina con desayunador y lavadero independiente. ' +
            'Tres dormitorios con placares, el principal con baño en suite. Parque de 300 m² con árboles grandes y parrilla. ' +
            'Cochera para un auto. Escritura al día, lista para mudarse.',
        location: 'Villa Libertador San Martín, Entre Ríos',
        direccionCompleta: 'Villa Libertador San Martín, Entre Ríos',
        referenciasUbicacion: 'A cinco cuadras de la Universidad Adventista del Plata y del Sanatorio Adventista.',
        categoria_operacion: 'venta',
        tipo_inmueble: 'casa',
        ...enDolares(118000),
        cantidad_ambientes: 4,
        bedrooms: 3,
        bathrooms: 2,
        area: 165,
        cochera: 'si',
        comodidades: ['cocina', 'calefaccion', 'parrilla', 'laundry', 'aire'],
        otrasComodidades: 'Galería, parque con árboles, termotanque solar',
        fotos: ['1653569511862-8a0320ae66cc', '1583847268964-b28dc8f51f92', '1687946939402-a02bfa7af289', '1615874959474-d609969a20ed', '1584622650111-993a426fbf0a'],
    },
    {
        ...base(ubicacion.vlsm, [-0.0012, 0.0018]),
        codigoInterno: 'NI-102',
        title: 'Departamento monoambiente amoblado cerca de la UAP',
        description:
            'Ideal para estudiantes. Monoambiente amoblado con cama, escritorio, placard y kitchenette equipada (anafe, heladera y microondas). ' +
            'Baño completo con ducha. Wifi y aire acondicionado frío/calor incluidos. ' +
            'Edificio chico y silencioso, con lavadero común y patio para bicicletas. Contrato por ciclo lectivo.',
        location: 'Villa Libertador San Martín, Entre Ríos',
        direccionCompleta: 'Villa Libertador San Martín, Entre Ríos',
        referenciasUbicacion: 'A tres cuadras de la Universidad Adventista del Plata.',
        categoria_operacion: 'alquiler',
        tipo_inmueble: 'departamento',
        ...enPesos(380000),
        cantidad_ambientes: 1,
        bedrooms: 0,
        bathrooms: 1,
        area: 32,
        cochera: 'no',
        pisoUnidad: 'Planta baja, unidad 3',
        expensas: 'incluye',
        montoExpensas: 0,
        duracionAlquilerMeses: 12,
        // Se guarda el total en meses; el panel lo muestra en años
        unidadDuracionAlquiler: 'años',
        comodidades: ['wifi', 'aire', 'cocina', 'laundry'],
        otrasComodidades: 'Amoblado, patio para bicicletas',
        fotos: ['1702014862053-946a122b920d', '1663756915304-40b7eda63e41', '1650894622076-e09ab837c502'],
    },
    {
        ...base(ubicacion.vlsm, [0.0006, 0.0041]),
        codigoInterno: 'NI-103',
        title: 'Departamento de 2 dormitorios con balcón',
        description:
            'Departamento luminoso en primer piso, con balcón al frente. Living comedor integrado, cocina separada con alacena y bajo mesada, ' +
            'dos dormitorios con placares y baño completo. Calefacción a gas y aire acondicionado en el living. ' +
            'Cochera descubierta. Cerca del centro comercial y de la universidad.',
        location: 'Villa Libertador San Martín, Entre Ríos',
        direccionCompleta: 'Villa Libertador San Martín, Entre Ríos',
        referenciasUbicacion: 'A dos cuadras del centro comercial.',
        categoria_operacion: 'alquiler',
        tipo_inmueble: 'departamento',
        ...enPesos(650000),
        cantidad_ambientes: 3,
        bedrooms: 2,
        bathrooms: 1,
        area: 68,
        cochera: 'si',
        pisoUnidad: 'Primer piso, unidad B',
        expensas: 'no_incluye',
        montoExpensas: 45000,
        duracionAlquilerMeses: 24,
        // Se guarda el total en meses; el panel lo muestra en años
        unidadDuracionAlquiler: 'años',
        comodidades: ['balcon', 'cocina', 'calefaccion', 'aire'],
        fotos: ['1665249934445-1de680641f50', '1666282167632-c613fbeb163c', '1725905803121-dd123b058a5c', '1618221118493-9cfa1a1c00da', '1631889993959-41b4e9c6e3c5'],
    },
    {
        ...base(ubicacion.crespo, [0.0034, 0.0025]),
        codigoInterno: 'NI-104',
        title: 'Casa con pileta y quincho en barrio residencial',
        description:
            'Casa de dos plantas sobre lote de 600 m² en uno de los barrios más lindos de Crespo. ' +
            'Planta baja con living de doble altura, cocina comedor con isla y toilette; arriba, tres dormitorios (el principal en suite con vestidor) y un segundo baño. ' +
            'Al fondo, pileta de 8 x 4 m, quincho con parrilla y galería. Cochera cubierta para dos autos.',
        location: 'Crespo, Entre Ríos',
        direccionCompleta: 'Crespo, Entre Ríos',
        referenciasUbicacion: 'Barrio residencial, a ocho cuadras de la plaza principal.',
        categoria_operacion: 'venta',
        tipo_inmueble: 'casa',
        ...enDolares(165000),
        cantidad_ambientes: 5,
        bedrooms: 3,
        bathrooms: 3,
        area: 210,
        cochera: 'si',
        comodidades: ['pileta', 'parrilla', 'cochera_cubierta', 'cocina', 'calefaccion', 'aire', 'laundry'],
        otrasComodidades: 'Quincho, vestidor, riego automático',
        fotos: ['1635108201418-0996823f4cc3', '1774199679021-db3b421867c3', '1502005097973-6a7082348e28', '1595526114035-0d45ed16cfbf', '1634923295030-730da9900a2d'],
    },
    {
        ...base(ubicacion.crespo, [-0.0042, -0.0051]),
        codigoInterno: 'NI-105',
        title: 'Lote de 12 x 30 m con todos los servicios',
        description:
            'Lote de 360 m² en loteo nuevo, con agua corriente, cloacas, luz y calle de ripio con cordón cuneta. ' +
            'Terreno plano, listo para construir. Zona de casas nuevas, a cinco minutos del centro. Escritura inmediata.',
        location: 'Crespo, Entre Ríos',
        direccionCompleta: 'Crespo, Entre Ríos',
        referenciasUbicacion: 'Loteo en el acceso norte, a cinco minutos del centro.',
        categoria_operacion: 'venta',
        tipo_inmueble: 'terreno',
        ...enDolares(24000),
        cantidad_ambientes: 0,
        bedrooms: 0,
        bathrooms: 0,
        area: 360,
        cochera: 'no',
        comodidades: [],
        fotos: ['1598722818387-cbdaa0dc58d2', '1653167970204-27cd0efc716f'],
    },
    {
        ...base(ubicacion.diamante, [0.0058, -0.0047]),
        codigoInterno: 'NI-106',
        title: 'Cabaña para 4 personas cerca del Parque Nacional Pre-Delta',
        description:
            'Cabaña de madera en un predio arbolado y tranquilo, a diez minutos del Parque Nacional Pre-Delta y de la costa del Paraná. ' +
            'Un dormitorio con cama matrimonial y entrepiso con dos camas, living con hogar a leña y cocina completa. ' +
            'Ropa de cama y toallas incluidas. Deck con parrilla. Ideal para una escapada de fin de semana.',
        location: 'Diamante, Entre Ríos',
        direccionCompleta: 'Diamante, Entre Ríos',
        referenciasUbicacion: 'A diez minutos del Parque Nacional Pre-Delta.',
        categoria_operacion: 'temporario',
        tipo_inmueble: 'casa',
        ...enDolares(60),
        precioPorNocheUSD: 60,
        minimoNoches: 2,
        huespedesMaximos: 4,
        costoLimpiezaUSD: 15,
        checkInDesde: '14:00',
        checkOutHasta: '10:00',
        checkInFlexible: 'si',
        cantidad_ambientes: 2,
        bedrooms: 1,
        bathrooms: 1,
        area: 55,
        cochera: 'si',
        comodidades: ['wifi', 'tv', 'cocina', 'calefaccion', 'parrilla', 'aire'],
        otrasComodidades: 'Hogar a leña, deck, ropa blanca incluida',
        fotos: ['1697807650304-907257330a3e', '1680703486830-1b5af60635d7', '1727706572437-4fcda0cbd66f', '1697807713040-b5fb60d6f012'],
    },
    {
        ...base(ubicacion.diamante, [-0.0189, -0.0122]),
        codigoInterno: 'NI-107',
        title: 'Casa quinta en una hectárea',
        description:
            'Casa de campo de dos plantas sobre una hectárea parquizada, a tres kilómetros de Diamante por camino consolidado. ' +
            'Dos dormitorios, living comedor con estufa, cocina amplia y galería con parrilla. ' +
            'Perforación con bomba, tanque elevado y luz. Ideal para vivienda permanente o fin de semana.',
        location: 'Diamante, Entre Ríos',
        direccionCompleta: 'Zona rural, Diamante, Entre Ríos',
        referenciasUbicacion: 'A tres kilómetros del centro de Diamante por camino consolidado.',
        categoria_operacion: 'venta',
        tipo_inmueble: 'casa',
        ...enDolares(95000),
        estado: 'reservado',
        cantidad_ambientes: 3,
        bedrooms: 2,
        bathrooms: 1,
        area: 10000,
        cochera: 'si',
        comodidades: ['parrilla', 'calefaccion', 'cocina'],
        otrasComodidades: 'Perforación con bomba, monte frutal',
        fotos: ['1706408126103-51d1241ecf0d', '1750016064807-10aa86dac43d', '1605774337664-7a846e9cdf17'],
    },
    {
        ...base(ubicacion.vlsm, [-0.0037, -0.0052]),
        codigoInterno: 'NI-108',
        title: 'Casa a estrenar de 2 dormitorios',
        description:
            'Casa nueva, de líneas simples, con muy buena luz natural. Living comedor con cocina integrada y salida al patio, ' +
            'dos dormitorios con placares y baño completo con ducha de obra. Aberturas de aluminio con DVH, preinstalación para aire acondicionado ' +
            'y lugar para ampliar. Apta crédito hipotecario.',
        location: 'Villa Libertador San Martín, Entre Ríos',
        direccionCompleta: 'Villa Libertador San Martín, Entre Ríos',
        referenciasUbicacion: 'Barrio nuevo, a diez cuadras de la universidad.',
        categoria_operacion: 'venta',
        tipo_inmueble: 'casa',
        ...enDolares(89000),
        cantidad_ambientes: 3,
        bedrooms: 2,
        bathrooms: 1,
        area: 92,
        cochera: 'no',
        comodidades: ['cocina', 'calefaccion'],
        otrasComodidades: 'Apta crédito, aberturas con DVH',
        fotos: ['1787672358379-b1d145f4ada2', '1772797583328-f83bc3f94f80', '1643949915134-73a4c880f7c7', '1616486029423-aaa4789e8c9a', '1643949700215-e61cdca053f7'],
    },
    {
        ...base(ubicacion.crespo, [0.0009, 0.0013]),
        codigoInterno: 'NI-109',
        title: 'Local comercial de 85 m² sobre avenida',
        description:
            'Local a la calle sobre una de las avenidas con más movimiento de Crespo, a dos cuadras de la plaza. ' +
            'Salón de 70 m² con vidriera de 6 m de frente, depósito, baño y kitchenette. ' +
            'Instalación eléctrica trifásica y persiana de seguridad. Apto para comercio u oficina.',
        location: 'Crespo, Entre Ríos',
        direccionCompleta: 'Crespo, Entre Ríos',
        referenciasUbicacion: 'Sobre avenida, a dos cuadras de la plaza principal.',
        categoria_operacion: 'alquiler',
        tipo_inmueble: 'local',
        ...enPesos(900000),
        cantidad_ambientes: 2,
        bedrooms: 0,
        bathrooms: 1,
        area: 85,
        cochera: 'no',
        expensas: 'sin_expensas',
        duracionAlquilerMeses: 36,
        // Se guarda el total en meses; el panel lo muestra en años
        unidadDuracionAlquiler: 'años',
        comodidades: ['aire'],
        otrasComodidades: 'Vidriera de 6 m, trifásica, persiana de seguridad',
        fotos: ['1783987597078-84d5ac51d518'],
    },
];

const CODIGOS = PROPIEDADES.map((p) => p.codigoInterno);

async function subirFotos(propiedad) {
    const direcciones = [];
    for (const [indice, id] of propiedad.fotos.entries()) {
        const original = foto(id);
        if (SOLO_PROBAR) {
            direcciones.push(original);
            continue;
        }
        // Sin Cloudinary se guarda el enlace de Unsplash directamente (también se ve, pero depende de ellos)
        direcciones.push(usaCloudinary() ? await subirUrlACloudinary(original, `muestra-${propiedad.codigoInterno.toLowerCase()}-${indice + 1}`) : original);
    }
    return direcciones;
}

async function cargar() {
    await connectDB();

    if (QUITAR) {
        const existentes = await Property.find({ codigoInterno: { $in: CODIGOS } }).select('title codigoInterno').lean();
        existentes.forEach((p) => console.log(`  ${SOLO_PROBAR ? 'Se borraría' : 'Borrada'}: ${p.codigoInterno} · ${p.title}`));
        if (!SOLO_PROBAR) await Property.deleteMany({ codigoInterno: { $in: CODIGOS } });
        console.log(`\n${SOLO_PROBAR ? 'Prueba:' : '✅'} ${existentes.length} propiedades de muestra ${SOLO_PROBAR ? 'para borrar' : 'borradas'}.`);
        return;
    }

    if (!usaCloudinary()) {
        console.log('⚠️ No hay CLOUDINARY_URL en backend/.env: las fotos quedan enlazadas a Unsplash en vez de subirse a Cloudinary.\n');
    }

    for (const [indice, { fotos, ...datos }] of PROPIEDADES.entries()) {
        const images = await subirFotos({ fotos, codigoInterno: datos.codigoInterno });
        const existente = await Property.findOne({ codigoInterno: datos.codigoInterno }).select('_id').lean();
        const cambios = { ...datos, images, orden: indice + 1, updatedAt: new Date() };
        if (!SOLO_PROBAR) {
            await Property.updateOne({ codigoInterno: datos.codigoInterno }, { $set: cambios, $setOnInsert: { createdAt: new Date() } }, { upsert: true, runValidators: true });
        }
        console.log(`  ${existente ? 'Actualizada' : 'Creada'}${SOLO_PROBAR ? ' (prueba)' : ''}: ${datos.codigoInterno} · ${datos.title} · ${images.length} fotos`);
    }

    // Las demás propiedades quedan como estaban, después de las de muestra en el catálogo
    const otras = await Property.find({ codigoInterno: { $nin: CODIGOS } }).select('title codigoInterno images orden').lean();
    if (!SOLO_PROBAR) {
        await Promise.all(otras.map((p, i) => Property.updateOne({ _id: p._id }, { $set: { orden: PROPIEDADES.length + 1 + i } })));
    }
    console.log(`\n${SOLO_PROBAR ? 'Prueba terminada: no se cambió nada.' : `✅ Listo: ${PROPIEDADES.length} propiedades de muestra cargadas.`}`);
    if (otras.length && BORRAR_OTRAS) {
        if (!SOLO_PROBAR) await Property.deleteMany({ _id: { $in: otras.map((p) => p._id) } });
        console.log(`\n${SOLO_PROBAR ? 'Se borrarían' : '🗑  Borradas'} las otras ${otras.length} propiedades:`);
        otras.forEach((p) => console.log(`  - ${p.title}${p.codigoInterno ? ` (${p.codigoInterno})` : ''}`));
    } else if (otras.length) {
        console.log('\nOtras propiedades que ya estaban en la base (si son de prueba, borralas desde el panel o corré con --borrar-otras):');
        otras.forEach((p) => console.log(`  - ${p.title}${p.codigoInterno ? ` (${p.codigoInterno})` : ''} · ${p.images?.length || 0} fotos`));
    }
}

cargar()
    .catch((error) => {
        console.error('❌ No se pudo cargar el catálogo de muestra:', error.message);
        process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect().catch(() => {}));
