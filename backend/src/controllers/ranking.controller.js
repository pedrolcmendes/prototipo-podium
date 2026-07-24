const Ranking = require('../models/Ranking');
const { broadcast } = require('../utils/live');

const listar = async (req, res) => {
  const { esporte, genero, nivel, ano, semestre } = req.query;
  const filtro = {};
  if (esporte) filtro.esporte = esporte;
  if (genero) filtro.genero = genero;
  if (nivel) filtro.nivel = nivel;
  if (ano) filtro.ano = Number(ano);
  if (semestre) filtro.semestre = Number(semestre);

  const rankings = await Ranking.find(filtro);
  res.json(rankings);
};

const atualizar = async (req, res) => {
  const { esporte, genero, nivel, ano, semestre, etapas = [], entries } = req.body;
  if (!esporte || !genero || !nivel || !ano || !semestre || !Array.isArray(entries)) {
    return res.status(400).json({ message: 'Informe modalidade, categoria, nível, ano, semestre e atletas.' });
  }

  const etapasLimpas = etapas.map(String).map(etapa => etapa.trim()).filter(Boolean);
  if (etapasLimpas.length !== 6) {
    return res.status(400).json({ message: 'O ranking deve conter exatamente 6 etapas.' });
  }
  const entriesNormalizadas = entries.map(entry => {
    const pontosPorEtapa = etapasLimpas.map((_, index) => Number(entry.pontosPorEtapa?.[index]) || 0);
    return { ...entry, pontosPorEtapa, pts: pontosPorEtapa.reduce((total, pontos) => total + pontos, 0) };
  }).sort((a, b) => b.pts - a.pts).map((entry, index) => ({ ...entry, pos: index + 1 }));

  // Permite a transição de instalações que ainda possuam o índice do modelo antigo.
  try { await Ranking.collection.dropIndex('esporte_1_genero_1'); } catch (error) { if (error.codeName !== 'IndexNotFound') throw error; }

  const ranking = await Ranking.findOneAndUpdate(
    { esporte, genero, nivel, ano: Number(ano), semestre: Number(semestre) },
    { etapas: etapasLimpas, entries: entriesNormalizadas },
    { new: true, upsert: true, runValidators: true }
  );

  broadcast('ranking');
  res.json(ranking);
};

module.exports = { listar, atualizar };
