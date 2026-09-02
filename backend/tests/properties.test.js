const request = require('supertest');
const app = require('../src/app'); // Asegúrate de que la ruta sea correcta
const mongoose = require('mongoose');
const Property = require('../src/models/property.model');

describe('Properties API', () => {
    beforeAll(async () => {
        const url = process.env.MONGODB_URI || 'mongodb://localhost:27017/test'; // Cambia la URL según tu configuración
        await mongoose.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    beforeEach(async () => {
        await Property.deleteMany({});
    });

    describe('GET /api/properties', () => {
        it('should return an empty array initially', async () => {
            const res = await request(app).get('/api/properties');
            expect(res.statusCode).toEqual(200);
            expect(res.body).toEqual([]);
        });
    });

    describe('POST /api/properties', () => {
        it('should create a new property', async () => {
            const propertyData = {
                title: 'Beautiful House',
                description: 'A beautiful house in the city center',
                price: 300000,
                location: 'City Center',
                bedrooms: 3,
                bathrooms: 2,
            };

            const res = await request(app).post('/api/properties').send(propertyData);
            expect(res.statusCode).toEqual(201);
            expect(res.body).toHaveProperty('_id');
            expect(res.body.title).toEqual(propertyData.title);
        });
    });

    describe('GET /api/properties/:id', () => {
        it('should return a property by id', async () => {
            const property = await Property.create({
                title: 'Beautiful House',
                description: 'A beautiful house in the city center',
                price: 300000,
                location: 'City Center',
                bedrooms: 3,
                bathrooms: 2,
            });

            const res = await request(app).get(`/api/properties/${property._id}`);
            expect(res.statusCode).toEqual(200);
            expect(res.body.title).toEqual(property.title);
        });
    });

    describe('PUT /api/properties/:id', () => {
        it('should update a property', async () => {
            const property = await Property.create({
                title: 'Beautiful House',
                description: 'A beautiful house in the city center',
                price: 300000,
                location: 'City Center',
                bedrooms: 3,
                bathrooms: 2,
            });

            const updatedData = { title: 'Updated House' };
            const res = await request(app).put(`/api/properties/${property._id}`).send(updatedData);
            expect(res.statusCode).toEqual(200);
            expect(res.body.title).toEqual(updatedData.title);
        });
    });

    describe('DELETE /api/properties/:id', () => {
        it('should delete a property', async () => {
            const property = await Property.create({
                title: 'Beautiful House',
                description: 'A beautiful house in the city center',
                price: 300000,
                location: 'City Center',
                bedrooms: 3,
                bathrooms: 2,
            });

            const res = await request(app).delete(`/api/properties/${property._id}`);
            expect(res.statusCode).toEqual(204);
        });
    });
});