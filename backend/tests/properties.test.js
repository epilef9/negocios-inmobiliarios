const request = require('supertest');
const app = require('../src/app');
const mongoose = require('mongoose');
const Property = require('../src/models/property.model');
const User = require('../src/models/user.model');
const bcrypt = require('bcrypt');
const { uriDePrueba } = require('./base-de-prueba');

describe('Properties API', () => {
    let adminToken;
    let clienteToken;

    const propertyPayload = {
        titulo: 'Beautiful House',
        descripcion: 'A beautiful house in the city center',
        precio: 300000,
        ubicacion: 'City Center',
        latitud: '-32.0712',
        longitud: '-60.4591',
        dormitorios: 3,
        banos: 2,
        area: 100,
        categoriaOperacion: 'venta',
        tipoInmueble: 'casa',
        estado: 'disponible',
    };

    beforeAll(async () => {
        // Nunca la base real: este archivo borra todas las propiedades antes de cada prueba
        await mongoose.connect(uriDePrueba());

        const passwordHash = await bcrypt.hash('TestAdmin123', 10);
        await User.deleteMany({ email: { $in: ['admin.test@example.com', 'cliente.test@example.com'] } });

        await User.create({
            nombre: 'Admin',
            apellido: 'Test',
            email: 'admin.test@example.com',
            nombreUsuario: 'admin.test@example.com',
            contrasena: passwordHash,
            rol: 'admin',
        });

        await User.create({
            nombre: 'Cliente',
            apellido: 'Test',
            email: 'cliente.test@example.com',
            nombreUsuario: 'cliente.test@example.com',
            contrasena: passwordHash,
            rol: 'cliente',
        });

        const adminLogin = await request(app)
            .post('/api/auth/login')
            .send({ email: 'admin.test@example.com', password: 'TestAdmin123' });
        adminToken = adminLogin.body.data?.token || adminLogin.body.token;

        const clienteLogin = await request(app)
            .post('/api/auth/login')
            .send({ email: 'cliente.test@example.com', password: 'TestAdmin123' });
        clienteToken = clienteLogin.body.data?.token || clienteLogin.body.token;
    });

    afterAll(async () => {
        await User.deleteMany({ email: { $in: ['admin.test@example.com', 'cliente.test@example.com'] } });
        await mongoose.connection.close();
    });

    beforeEach(async () => {
        await Property.deleteMany({});
    });

    describe('GET /api/properties', () => {
        it('should return an empty array initially', async () => {
            const res = await request(app).get('/api/properties');
            expect(res.statusCode).toEqual(200);
            expect(res.body.data).toEqual([]);
        });

        it('should return every property that has the requested amenity', async () => {
            await Property.create([
                { ...propertyPayload, titulo: 'With air 1', comodidades: ['aire', 'wifi'] },
                { ...propertyPayload, titulo: 'With air 2', comodidades: ['aire'] },
                { ...propertyPayload, titulo: 'Without air', comodidades: ['pileta'] },
            ]);

            const res = await request(app).get('/api/properties?comodidad=aire');

            expect(res.statusCode).toEqual(200);
            expect(res.body.data.map((property) => property.titulo)).toEqual(expect.arrayContaining(['With air 1', 'With air 2']));
            expect(res.body.data).toHaveLength(2);
        });
    });

    describe('POST /api/properties', () => {
        it('should reject create without authentication', async () => {
            const res = await request(app).post('/api/properties').send(propertyPayload);
            expect(res.statusCode).toEqual(401);
        });

        it('should reject create when user is not admin', async () => {
            const res = await request(app)
                .post('/api/properties')
                .set('Authorization', `Bearer ${clienteToken}`)
                .send(propertyPayload);
            expect(res.statusCode).toEqual(403);
        });

        it('should create a new property as admin', async () => {
            const res = await request(app)
                .post('/api/properties')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(propertyPayload);
            expect(res.statusCode).toEqual(201);
            expect(res.body.data).toHaveProperty('_id');
            expect(res.body.data.titulo).toEqual(propertyPayload.titulo);
        });
    });

    describe('GET /api/properties/:id', () => {
        it('should return a property by id', async () => {
            const property = await Property.create(propertyPayload);

            const res = await request(app).get(`/api/properties/${property._id}`);
            expect(res.statusCode).toEqual(200);
            expect(res.body.data.titulo).toEqual(property.titulo);
        });
    });

    describe('PUT /api/properties/:id', () => {
        it('should update a property as admin', async () => {
            const property = await Property.create(propertyPayload);

            const updatedData = { titulo: 'Updated House' };
            const res = await request(app)
                .put(`/api/properties/${property._id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send(updatedData);
            expect(res.statusCode).toEqual(200);
            expect(res.body.data.titulo).toEqual(updatedData.titulo);
        });
    });

    describe('DELETE /api/properties/:id', () => {
        it('should delete a property as admin', async () => {
            const property = await Property.create(propertyPayload);

            const res = await request(app)
                .delete(`/api/properties/${property._id}`)
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toEqual(204);
        });
    });
});
