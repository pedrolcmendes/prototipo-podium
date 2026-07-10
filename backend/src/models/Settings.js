const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  _id: { type: String, default: 'global' },

  // Dados da arena (exibidos no site)
  arenaName: { type: String, default: 'Podium Arena' },
  cnpj: { type: String, default: '' },
  phone: { type: String, default: '(43) 9 9999-9999' },
  address: { type: String, default: 'Rua Manaus, 321 — Telêmaco Borba – PR' },
  email: { type: String, default: 'contato@podiumarena.com.br' },

  // Funcionamento (HH:MM) — define a janela de horários reserváveis
  openWeek: { type: String, default: '06:00' },
  closeWeek: { type: String, default: '23:00' },
  openWeekend: { type: String, default: '06:00' },
  closeWeekend: { type: String, default: '22:00' },

  // Regras de reserva
  cancelWindow: { type: Number, default: 24 },   // horas de antecedência mínima para cancelar
  maxAdvanceDays: { type: Number, default: 30 },  // dias máximos de antecedência para reservar

  // Notificações automáticas
  notifEmailConfirm: { type: Boolean, default: true },   // comprovante ao confirmar reserva
  notifReminder: { type: Boolean, default: true },       // lembrete 2h antes do horário
  notifCancelAlert: { type: Boolean, default: true },    // avisar o admin ao cancelar
  notifWeeklySummary: { type: Boolean, default: false }, // resumo toda segunda-feira

  // Marcador interno do resumo semanal (evita reenvio na mesma semana)
  lastWeeklySummary: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
