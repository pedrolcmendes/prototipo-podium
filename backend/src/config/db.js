const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error('MONGO_URI não definida no .env');
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    console.log(`MongoDB conectado: ${conn.connection.host}`);
  } catch (err) {
    console.error('\n--- ERRO DE CONEXÃO COM MONGODB ---');
    console.error('Mensagem:', err.message);
    console.error('\nVerifique:');
    console.error('  1. No MongoDB Atlas > Network Access: seu IP está liberado?');
    console.error('     (Adicione 0.0.0.0/0 para liberar qualquer IP durante desenvolvimento)');
    console.error('  2. O usuário do banco tem permissão de leitura/escrita?');
    console.error('     Atlas > Database Access > Role: "readWriteAnyDatabase"');
    console.error('  3. A connection string no .env está correta?');
    console.error('     Gere uma nova em: Atlas > Connect > Drivers > Node.js\n');
    throw err;
  }
};

module.exports = connectDB;
