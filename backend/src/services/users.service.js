// users.service.js

const User = require('../models/user.model');
const UserRepository = require('../repositories/users.repository');

class UserService {
    async getAllUsers() {
        return await UserRepository.findAll();
    }

    async getUserById(id) {
        return await UserRepository.findById(id);
    }

    async createUser(userData) {
        const newUser = new User(userData);
        return await UserRepository.create(newUser);
    }

    async updateUser(id, userData) {
        return await UserRepository.update(id, userData);
    }

    async deleteUser(id) {
        return await UserRepository.delete(id);
    }
}

module.exports = new UserService();