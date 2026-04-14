require('dotenv').config();

const app = require('./app');
const { connectDB } = require('./config/db');

const port = Number(process.env.PORT) || 5000;

connectDB()
  .then(() => {
    app.listen(port, () => {
      console.log(`API listening on http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error('Database connection failed:', err.message);
    process.exit(1);
  });
