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
const live = require('./utils/live');

const app = express();

app.use(cors());
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

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ message: err.message || 'Erro interno do servidor' });
});

module.exports = app;
