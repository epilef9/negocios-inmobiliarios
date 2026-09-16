module.exports = {
    PORT: process.env.PORT || 3000,
    DB_URI: process.env.MONGODB_URI || process.env.DB_URI,
    JWT_SECRET: process.env.JWT_SECRET || 'your_jwt_secret',
    JWT_EXPIRATION: process.env.JWT_EXPIRATION || '1h',
    CORS_ORIGIN: process.env.CORS_ORIGIN || '*'
};