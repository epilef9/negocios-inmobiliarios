const User = require('../models/user.model');

class UserRepository {
    async createUser(userData) {
        const user = new User(userData);
        return await user.save();
    }

    async getAllUsers() {
        return await User.find();
    }

    async getUserById(userId) {
        return await User.findById(userId);
    }

    async updateUser(userId, userData) {
        return await User.findByIdAndUpdate(userId, userData, { new: true });
    }

    async deleteUser(userId) {
        return await User.findByIdAndDelete(userId);
    }
}

module.exports = new UserRepository();