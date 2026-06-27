require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT} [${process.env.NODE_ENV}]`);
  });
}).catch((err) => {
  console.error('Falha ao conectar ao MongoDB:', err.message);
  process.exit(1);
});
