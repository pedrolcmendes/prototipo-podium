const Settings = require('../models/Settings');
const { broadcast } = require('../utils/live');

const CAMPOS_TEXTO = ['arenaName', 'cnpj', 'phone', 'address', 'email', 'openWeek', 'closeWeek', 'openWeekend', 'closeWeekend'];
const CAMPOS_NUMERO = ['cancelWindow', 'maxAdvanceDays', 'paymentTimeoutMinutes'];
const CAMPOS_BOOL = ['notifEmailConfirm', 'notifReminder', 'notifCancelAlert', 'notifWeeklySummary'];

const publicSettings = (s) => {
  const out = {};
  [...CAMPOS_TEXTO, ...CAMPOS_NUMERO, ...CAMPOS_BOOL].forEach((c) => { out[c] = s[c]; });
  return out;
};

const obterOuCriar = async () => {
  let s = await Settings.findById('global');
  if (!s) s = await Settings.create({ _id: 'global' });
  return s;
};

const getSettings = async (req, res) => {
  const s = await obterOuCriar();
  res.json(publicSettings(s));
};

const updateSettings = async (req, res) => {
  const update = {};
  CAMPOS_TEXTO.forEach((c) => { if (req.body[c] !== undefined) update[c] = String(req.body[c]).trim(); });
  CAMPOS_NUMERO.forEach((c) => { if (req.body[c] !== undefined) update[c] = Number(req.body[c]) || 0; });
  CAMPOS_BOOL.forEach((c) => { if (req.body[c] !== undefined) update[c] = Boolean(req.body[c]); });

  if (update.paymentTimeoutMinutes !== undefined
    && (!Number.isInteger(update.paymentTimeoutMinutes)
      || update.paymentTimeoutMinutes < 30
      || update.paymentTimeoutMinutes > 1440)) {
    return res.status(400).json({ message: 'O tempo de pagamento deve ficar entre 30 e 1440 minutos' });
  }

  const s = await Settings.findByIdAndUpdate('global', update, { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true });
  broadcast('settings');
  res.json(publicSettings(s));
};

module.exports = { getSettings, updateSettings, obterOuCriar };
