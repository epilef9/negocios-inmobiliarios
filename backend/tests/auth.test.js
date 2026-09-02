const request = require('supertest');
const app = require('../src/app'); // Asegúrate de que la ruta sea correcta

describe('Auth API', () => {
    let userCredentials = {
        email: 'test@example.com',
        password: 'password123'
    };

    beforeAll(async () => {
        // Aquí puedes agregar lógica para crear un usuario de prueba si es necesario
    });

    afterAll(async () => {
        // Aquí puedes agregar lógica para limpiar la base de datos si es necesario
    });

    it('should log in a user', async () => {
        const response = await request(app)
            .post('/api/auth/login')
            .send(userCredentials);
        
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('token');
    });

    it('should fail to log in with invalid credentials', async () => {
        const response = await request(app)
            .post('/api/auth/login')
            .send({ email: 'wrong@example.com', password: 'wrongpassword' });
        
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('message', 'Invalid credentials');
    });

    it('should log out a user', async () => {
        const loginResponse = await request(app)
            .post('/api/auth/login')
            .send(userCredentials);
        
        const token = loginResponse.body.token;

        const response = await request(app)
            .post('/api/auth/logout')
            .set('Authorization', `Bearer ${token}`);
        
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message', 'Logged out successfully');
    });
});