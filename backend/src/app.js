const express = require('express');
const cors = require('cors');

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
    return callback(new Error('Origem não permitida pelo CORS.'));
  },
}));
app.use(express.json({ limit: '12mb' })); // artes de evento vão em base64 no corpo

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

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ message: err.message || 'Erro interno do servidor' });
});

module.exports = app;
