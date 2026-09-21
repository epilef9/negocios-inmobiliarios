const request = require('supertest');
const app = require('../src/app');
const mongoose = require('mongoose');
const Property = require('../src/models/property.model');
const User = require('../src/models/user.model');
const bcrypt = require('bcrypt');

describe('Properties API', () => {
    let adminToken;
    let clienteToken;

    const propertyPayload = {
        title: 'Beautiful House',
        description: 'A beautiful house in the city center',
        price: 300000,
        location: 'City Center',
        bedrooms: 3,
        bathrooms: 2,
        area: 100,
        categoria_operacion: 'venta',
        tipo_inmueble: 'casa',
        estado: 'disponible',
    };

    beforeAll(async () => {
        const url = process.env.MONGODB_URI || process.env.DB_URI || 'mongodb://localhost:27017/test';
        await mongoose.connect(url);

        const passwordHash = await bcrypt.hash('TestAdmin123', 10);
        await User.deleteMany({ email: { $in: ['admin.test@example.com', 'cliente.test@example.com'] } });

        await User.create({
            nombre: 'Admin',
            apellido: 'Test',
            email: 'admin.test@example.com',
            username: 'admin.test@example.com',
            password: passwordHash,
            role: 'admin',
        });

        await User.create({
            nombre: 'Cliente',
            apellido: 'Test',
            email: 'cliente.test@example.com',
            username: 'cliente.test@example.com',
            password: passwordHash,
            role: 'cliente',
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
            expect(res.body.data.title).toEqual(propertyPayload.title);
        });
    });

    describe('GET /api/properties/:id', () => {
        it('should return a property by id', async () => {
            const property = await Property.create(propertyPayload);

            const res = await request(app).get(`/api/properties/${property._id}`);
            expect(res.statusCode).toEqual(200);
            expect(res.body.data.title).toEqual(property.title);
        });
    });

    describe('PUT /api/properties/:id', () => {
        it('should update a property as admin', async () => {
            const property = await Property.create(propertyPayload);

            const updatedData = { title: 'Updated House' };
            const res = await request(app)
                .put(`/api/properties/${property._id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send(updatedData);
            expect(res.statusCode).toEqual(200);
            expect(res.body.data.title).toEqual(updatedData.title);
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
