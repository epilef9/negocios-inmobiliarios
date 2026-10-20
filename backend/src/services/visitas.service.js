const visitasRepository = require('../repositories/visitas.repository');

const INITIAL_SEED_VISITAS = [
    {
        cliente: {
            nombre: 'Martina López',
            telefono: '+54 9 343 555 1234',
            email: 'martina.lopez@gmail.com',
            iniciales: 'ML',
        },
        propiedad: {
            titulo: 'Dpto. 2 amb. Centro',
            direccion: 'San Martín 840, Paraná',
            precio: 'USD 55.000',
        },
        fecha: '08/07/2026',
        horario: '10:30 h',
        estado: 'pendiente',
        notaAdicional: 'Interesada en ver las condiciones de iluminación y expensas.',
    },
    {
        cliente: {
            nombre: 'Federico Soria',
            telefono: '+54 9 343 555 5678',
            email: 'fede.soria@hotmail.com',
            iniciales: 'FS',
        },
        propiedad: {
            titulo: 'Casa 3 dorm. Oro Verde',
            direccion: 'Los Tilos 340, Oro Verde',
            precio: 'USD 120.000',
        },
        fecha: '09/07/2026',
        horario: '16:00 h',
        estado: 'confirmada',
        notaAdicional: 'Asistirá con su pareja. Solicita ver el patio y la cochera.',
    },
    {
        cliente: {
            nombre: 'Carla Méndez',
            telefono: '+54 9 343 555 6102',
            email: 'carla.mendez@yahoo.com',
            iniciales: 'CM',
        },
        propiedad: {
            titulo: 'Dpto. monoambiente Centro',
            direccion: 'Urquiza 1120, Paraná',
            precio: 'USD 38.000',
        },
        fecha: '09/07/2026',
        horario: '11:00 h',
        estado: 'pendiente',
        notaAdicional: 'Consulta si aceptan mascota pequeña.',
    },
    {
        cliente: {
            nombre: 'Joaquín Pérez',
            telefono: '+54 9 343 555 3344',
            email: 'joaquin.perez@live.com',
            iniciales: 'JP',
        },
        propiedad: {
            titulo: 'Local comercial San Martín',
            direccion: 'San Martín 450, Paraná',
            precio: 'ARS 450.000 / mes',
        },
        fecha: '10/07/2026',
        horario: '09:00 h',
        estado: 'reprogramada',
        notaAdicional: 'Reprogramada a pedido del cliente por motivos laborales.',
    },
    {
        cliente: {
            nombre: 'Sofía Ramírez',
            telefono: '+54 9 343 555 7766',
            email: 'sofia.ramirez@gmail.com',
            iniciales: 'SR',
        },
        propiedad: {
            titulo: 'Casa 4 dorm. Bajada Grande',
            direccion: 'Larramendi 2240, Paraná',
            precio: 'USD 145.000',
        },
        fecha: '11/07/2026',
        horario: '17:30 h',
        estado: 'confirmada',
        notaAdicional: 'Confirmada telefónicamente.',
    },
    {
        cliente: {
            nombre: 'Lucas Benítez',
            telefono: '+54 9 343 555 8899',
            email: 'lucas.benitez@gmail.com',
            iniciales: 'LB',
        },
        propiedad: {
            titulo: 'Dpto. 1 dorm. Parque Urquiza',
            direccion: 'Mitre 250, Paraná',
            precio: 'USD 62.000',
        },
        fecha: '12/07/2026',
        horario: '14:00 h',
        estado: 'rechazada',
        motivoRechazo: 'El propietario no tiene disponibilidad en ese horario.',
    },
    {
        cliente: {
            nombre: 'Mariana Gómez',
            telefono: '+54 9 343 555 9911',
            email: 'mariana.gomez@gmail.com',
            iniciales: 'MG',
        },
        propiedad: {
            titulo: 'Casa quinta Las Colinas',
            direccion: 'Ruta 11 Km 15, Oro Verde',
            precio: 'USD 95.000',
        },
        fecha: '13/07/2026',
        horario: '18:00 h',
        estado: 'rechazada',
        motivoRechazo: 'Propiedad con seña previa en trámite.',
    },
    {
        cliente: {
            nombre: 'Gonzalo Fernández',
            telefono: '+54 9 343 555 2233',
            email: 'gonzalo.f@gmail.com',
            iniciales: 'GF',
        },
        propiedad: {
            titulo: 'Dpto. 3 amb. Costanera',
            direccion: 'Güemes 120, Paraná',
            precio: 'USD 115.000',
        },
        fecha: '14/07/2026',
        horario: '10:00 h',
        estado: 'pendiente',
    },
    {
        cliente: {
            nombre: 'Valentina Rossi',
            telefono: '+54 9 343 555 4455',
            email: 'valen.rossi@gmail.com',
            iniciales: 'VR',
        },
        propiedad: {
            titulo: 'Local céntrico Peatonal',
            direccion: 'Peatonal San Martín 680, Paraná',
            precio: 'ARS 600.000 / mes',
        },
        fecha: '15/07/2026',
        horario: '11:30 h',
        estado: 'pendiente',
    },
    {
        cliente: {
            nombre: 'Mateo Álvarez',
            telefono: '+54 9 343 555 6677',
            email: 'mateo.alvarez@gmail.com',
            iniciales: 'MA',
        },
        propiedad: {
            titulo: 'Casa 2 dorm. San Agustín',
            direccion: 'Galán 1420, Paraná',
            precio: 'USD 70.000',
        },
        fecha: '16/07/2026',
        horario: '15:30 h',
        estado: 'pendiente',
    },
    {
        cliente: {
            nombre: 'Camila Torres',
            telefono: '+54 9 343 555 1122',
            email: 'cami.torres@gmail.com',
            iniciales: 'CT',
        },
        propiedad: {
            titulo: 'Dpto. 2 amb. Balcón al Río',
            direccion: 'Laurencena 410, Paraná',
            precio: 'USD 88.000',
        },
        fecha: '17/07/2026',
        horario: '16:30 h',
        estado: 'confirmada',
    },
    {
        cliente: {
            nombre: 'Diego Navarro',
            telefono: '+54 9 343 555 3322',
            email: 'diego.navarro@gmail.com',
            iniciales: 'DN',
        },
        propiedad: {
            titulo: 'Oficina céntrica equipada',
            direccion: '25 de Mayo 180, Paraná',
            precio: 'ARS 350.000 / mes',
        },
        fecha: '18/07/2026',
        horario: '09:30 h',
        estado: 'confirmada',
    },
    {
        cliente: {
            nombre: 'Lucía Morales',
            telefono: '+54 9 343 555 9988',
            email: 'lucia.morales@gmail.com',
            iniciales: 'LM',
        },
        propiedad: {
            titulo: 'Casa estilo clásico',
            direccion: 'Alameda de la Federación 320, Paraná',
            precio: 'USD 160.000',
        },
        fecha: '19/07/2026',
        horario: '11:00 h',
        estado: 'confirmada',
    },
    {
        cliente: {
            nombre: 'Esteban Díaz',
            telefono: '+54 9 343 555 4411',
            email: 'esteban.diaz@gmail.com',
            iniciales: 'ED',
        },
        propiedad: {
            titulo: 'Terreno 500m2 loteo cerrado',
            direccion: 'Acceso Norte, Paraná',
            precio: 'USD 32.000',
        },
        fecha: '20/07/2026',
        horario: '15:00 h',
        estado: 'confirmada',
    },
    {
        cliente: {
            nombre: 'Florencia Castro',
            telefono: '+54 9 343 555 7722',
            email: 'flor.castro@gmail.com',
            iniciales: 'FC',
        },
        propiedad: {
            titulo: 'Dpto. semipiso c/cochera',
            direccion: 'Santa Fe 290, Paraná',
            precio: 'USD 130.000',
        },
        fecha: '21/07/2026',
        horario: '17:00 h',
        estado: 'confirmada',
    },
    {
        cliente: {
            nombre: 'Javier Romero',
            telefono: '+54 9 343 555 8833',
            email: 'javier.romero@gmail.com',
            iniciales: 'JR',
        },
        propiedad: {
            titulo: 'Monoambiente a estrenar',
            direccion: 'Gualeguaychú 520, Paraná',
            precio: 'USD 42.000',
        },
        fecha: '22/07/2026',
        horario: '10:30 h',
        estado: 'confirmada',
    },
    {
        cliente: {
            nombre: 'Paula Herrera',
            telefono: '+54 9 343 555 2211',
            email: 'paula.herrera@gmail.com',
            iniciales: 'PH',
        },
        propiedad: {
            titulo: 'Galpón industrial 300m2',
            direccion: 'Almafuerte 3100, Paraná',
            precio: 'ARS 850.000 / mes',
        },
        fecha: '23/07/2026',
        horario: '16:00 h',
        estado: 'confirmada',
    },
    {
        cliente: {
            nombre: 'Agustín Giménez',
            telefono: '+54 9 343 555 6644',
            email: 'agustin.gimenez@gmail.com',
            iniciales: 'AG',
        },
        propiedad: {
            titulo: 'Casa con pileta y quincho',
            direccion: 'Bv. Racedo 780, Paraná',
            precio: 'USD 175.000',
        },
        fecha: '24/07/2026',
        horario: '18:00 h',
        estado: 'confirmada',
    },
];

class VisitasService {
    async getAllVisitas(filters = {}) {
        // Las visitas de ejemplo solo se cargan en desarrollo: en el sitio publicado serían datos inventados
        if (process.env.NODE_ENV !== 'production') {
            const count = await visitasRepository.countVisitas();
            if (count === 0) {
                await this.seedDefaultVisitas();
            }
        }
        return visitasRepository.getAllVisitas(filters);
    }

    async getVisitaById(id) {
        return visitasRepository.getVisitaById(id);
    }

    async createVisita(data) {
        const normalized = { ...data };
        if (normalized.cliente && !normalized.cliente.iniciales && normalized.cliente.nombre) {
            normalized.cliente.iniciales = normalized.cliente.nombre
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map((word) => word[0]?.toUpperCase() || '')
                .join('') || 'CL';
        }
        return visitasRepository.createVisita(normalized);
    }

    async updateVisita(id, data) {
        return visitasRepository.updateVisita(id, data);
    }

    async updateEstadoVisita(id, estado, extra = {}) {
        const updateData = {
            estado,
        };

        if (extra.nuevaFecha) {
            updateData.fecha = extra.nuevaFecha;
        }

        if (extra.nuevoHorario) {
            updateData.horario = extra.nuevoHorario;
        }

        if (extra.motivo !== undefined) {
            updateData.motivoRechazo = extra.motivo;
        }

        return visitasRepository.updateVisita(id, updateData);
    }

    async deleteVisita(id) {
        return visitasRepository.deleteVisita(id);
    }

    async seedDefaultVisitas(force = false) {
        if (force) {
            await visitasRepository.deleteAll();
        }
        return visitasRepository.insertMany(INITIAL_SEED_VISITAS);
    }
}

module.exports = new VisitasService();
