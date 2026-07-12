const Ranking = require('../models/Ranking');
const { broadcast } = require('../utils/live');

const listar = async (req, res) => {
  const { esporte, genero } = req.query;
  const filtro = {};
  if (esporte) filtro.esporte = esporte;
  if (genero) filtro.genero = genero;

  const rankings = await Ranking.find(filtro);
  res.json(rankings);
};

const atualizar = async (req, res) => {
  const { esporte, genero, entries } = req.body;
  if (!esporte || !genero || !entries) {
    return res.status(400).json({ message: 'esporte, genero e entries são obrigatórios' });
  }

  const ranking = await Ranking.findOneAndUpdate(
    { esporte, genero },
    { entries },
    { new: true, upsert: true, runValidators: true }
  );

  broadcast('ranking');
  res.json(ranking);
};

module.exports = { listar, atualizar };
