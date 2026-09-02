const request = require('supertest');
const app = require('../src/app'); // Asegúrate de que la ruta sea correcta
const User = require('../src/models/user.model'); // Asegúrate de que la ruta sea correcta

describe('Users API', () => {
    beforeEach(async () => {
        await User.deleteMany({});
    });

    it('should create a new user', async () => {
        const res = await request(app)
            .post('/api/users')
            .send({
                name: 'John Doe',
                email: 'john@example.com',
                password: 'password123'
            });
        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('user');
        expect(res.body.user.name).toBe('John Doe');
    });

    it('should get all users', async () => {
        await User.create({
            name: 'John Doe',
            email: 'john@example.com',
            password: 'password123'
        });

        const res = await request(app).get('/api/users');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('users');
        expect(res.body.users.length).toBeGreaterThan(0);
    });

    it('should update an existing user', async () => {
        const user = await User.create({
            name: 'John Doe',
            email: 'john@example.com',
            password: 'password123'
        });

        const res = await request(app)
            .put(`/api/users/${user._id}`)
            .send({
                name: 'Jane Doe'
            });
        expect(res.statusCode).toEqual(200);
        expect(res.body.user.name).toBe('Jane Doe');
    });

    it('should delete a user', async () => {
        const user = await User.create({
            name: 'John Doe',
            email: 'john@example.com',
            password: 'password123'
        });

        const res = await request(app).delete(`/api/users/${user._id}`);
        expect(res.statusCode).toEqual(204);

        const deletedUser = await User.findById(user._id);
        expect(deletedUser).toBeNull();
    });
});