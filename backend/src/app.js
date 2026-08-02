const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const bookingRoutes = require('./routes/booking.routes');
const eventRoutes = require('./routes/event.routes');
const registrationRoutes = require('./routes/registration.routes');
const rankingRoutes = require('./routes/ranking.routes');
const blockedSlotRoutes = require('./routes/blockedSlot.routes');
const settingsRoutes = require('./routes/settings.routes');
const seasonRoutes = require('./routes/season.routes');
const paymentRoutes = require('./routes/payment.routes');
const live = require('./utils/live');

const app = express();

app.set('trust proxy', 1);

const configuredOrigins = [
  process.env.FRONTEND_URL,
  ...(process.env.CORS_ORIGINS || '').split(','),
  'https://frontend-five-vert-72.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
].filter(Boolean).map((origin) => origin.trim().replace(/\/$/, ''));

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  const normalized = origin.replace(/\/$/, '');
  if (configuredOrigins.includes(normalized)) return true;
  return /^https:\/\/frontend-[a-z0-9-]+-pedro-luiz-mendes\.vercel\.app$/i.test(normalized);
};

app.use(cors({
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) return callback(null, true);
    const error = new Error('Origem não permitida pelo CORS.');
    error.status = 403;
    error.code = 'CORS_ORIGIN_DENIED';
    return callback(error);
  },
}));
app.use(express.json({ limit: '12mb' })); // artes de evento vão em base64 no corpo

app.get('/api/health', (req, res) => {
  const databaseReady = mongoose.connection.readyState === 1;
  res.status(databaseReady ? 200 : 503).json({
    status: databaseReady ? 'ok' : 'degraded',
    database: databaseReady ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});
app.get('/api/live', live.handler);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/ranking', rankingRoutes);
app.use('/api/blocked-slots', blockedSlotRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/seasons', seasonRoutes);
app.use('/api/pagamentos', paymentRoutes);

app.use('/api', (req, res) => {
  res.status(404).json({
    message: 'Rota da API não encontrada.',
    code: 'API_ROUTE_NOT_FOUND',
  });
});

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  const invalidJson = err instanceof SyntaxError && err.status === 400 && 'body' in err;
  const status = invalidJson ? 400 : (err.status || err.statusCode || 500);
  const isServerError = status >= 500;
  const message = invalidJson
    ? 'O corpo da requisição contém JSON inválido.'
    : (isServerError && process.env.NODE_ENV === 'production'
      ? 'Erro interno do servidor.'
      : (err.message || 'Erro interno do servidor.'));

  if (isServerError) console.error(err.stack);
  return res.status(status).json({
    message,
    code: invalidJson ? 'INVALID_JSON' : (err.code || (isServerError ? 'INTERNAL_ERROR' : 'REQUEST_ERROR')),
  });
});

module.exports = app;
