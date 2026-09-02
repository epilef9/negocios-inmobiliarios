const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const bcrypt = require('bcrypt');
const config = require('../config/env');

const authService = {
    register: async (userData) => {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        const newUser = new User({
            ...userData,
            password: hashedPassword,
        });
        return await newUser.save();
    },

    login: async (email, password) => {
        const user = await User.findOne({ email });
        if (!user) {
            throw new Error('User not found');
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            throw new Error('Invalid credentials');
        }
        const token = jwt.sign({ id: user._id }, config.JWT_SECRET, { expiresIn: '1h' });
        return { token, user };
    },

    logout: async (token) => {
        // Implement logout logic if needed, e.g., blacklist the token
        return { message: 'Logged out successfully' };
    },

    verifyToken: (token) => {
        return jwt.verify(token, config.JWT_SECRET);
    },
};

module.exports = authService;