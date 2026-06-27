const BlockedSlot = require('../models/BlockedSlot');

const listar = async (req, res) => {
  const filtro = {};
  if (req.query.courtId) filtro.courtId = req.query.courtId;
  if (req.query.date) filtro.date = req.query.date;

  const slots = await BlockedSlot.find(filtro).sort({ date: 1, hour: 1 });
  res.json(slots);
};

const criar = async (req, res) => {
  const { courtId, date, hour, motivo } = req.body;
  if (!courtId || !date || hour === undefined) {
    return res.status(400).json({ message: 'courtId, date e hour são obrigatórios' });
  }

  try {
    const slot = await BlockedSlot.create({ courtId, date, hour, motivo });
    res.status(201).json(slot);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Este horário já está bloqueado' });
    }
    throw err;
  }
};

const remover = async (req, res) => {
  const slot = await BlockedSlot.findByIdAndDelete(req.params.id);
  if (!slot) return res.status(404).json({ message: 'Bloqueio não encontrado' });
  res.json({ message: 'Bloqueio removido' });
};

module.exports = { listar, criar, remover };
