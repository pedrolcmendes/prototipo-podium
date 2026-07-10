require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

async function fixCpfIndex(db) {
  try {
    const col = db.collection('users');
    const indexes = await col.indexes();
    const cpfIdx = indexes.find(i => i.name === 'cpf_1');
    if (cpfIdx && !cpfIdx.sparse) {
      await col.dropIndex('cpf_1');
      await col.createIndex({ cpf: 1 }, { unique: true, sparse: true });
      console.log('Índice CPF recriado com sparse: true');
    }
  } catch (e) {
    console.warn('Aviso ao verificar índice CPF:', e.message);
  }
}

connectDB().then(async () => {
  const mongoose = require('mongoose');
  await fixCpfIndex(mongoose.connection.db);
  const { iniciarScheduler } = require('./utils/scheduler');
  iniciarScheduler();
  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT} [${process.env.NODE_ENV}]`);
  });
}).catch((err) => {
  console.error('Falha ao conectar ao MongoDB:', err.message);
  process.exit(1);
});
