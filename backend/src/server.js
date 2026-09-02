require("dotenv").config();

const connectDB = require('./config/database');
const app = require('./app');
const port = Number(process.env.PORT) || 4000;

connectDB()
    .then(() => {
        app.listen(port, () => {
            console.log(`Backend listening on http://localhost:${port}`);
        });
    })
    .catch(() => {
        process.exit(1);
    });