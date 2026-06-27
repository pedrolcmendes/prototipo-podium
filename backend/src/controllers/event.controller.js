const path = require('path');
const fs = require('fs');
const Event = require('../models/Event');
const Registration = require('../models/Registration');

const listar = async (req, res) => {
  const filtro = {};
  if (req.query.categoria) filtro.categoria = req.query.categoria;
  if (req.query.status) filtro.status = req.query.status;

  const events = await Event.find(filtro).sort({ data: 1 });

  const comVagas = await Promise.all(
    events.map(async (ev) => {
      const inscritos = await Registration.countDocuments({ eventId: ev._id, status: 'confirmada' });
      return { ...ev.toObject(), inscritos, vagasRestantes: ev.vagas - inscritos };
    })
  );

  res.json(comVagas);
};

const buscarPorId = async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) return res.status(404).json({ message: 'Evento não encontrado' });
  const inscritos = await Registration.countDocuments({ eventId: event._id, status: 'confirmada' });
  res.json({ ...event.toObject(), inscritos, vagasRestantes: event.vagas - inscritos });
};

const criar = async (req, res) => {
  const dados = { ...req.body };
  if (req.file) dados.imagem = `/uploads/eventos/${req.file.filename}`;
  const event = await Event.create(dados);
  res.status(201).json(event);
};

const atualizar = async (req, res) => {
  const dados = { ...req.body };
  if (req.file) {
    // remove imagem anterior se existir
    const anterior = await Event.findById(req.params.id);
    if (anterior?.imagem) {
      const oldPath = path.join(__dirname, '..', '..', '..', 'frontend', 'public', anterior.imagem);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    dados.imagem = `/uploads/eventos/${req.file.filename}`;
  }
  const event = await Event.findByIdAndUpdate(req.params.id, dados, { new: true, runValidators: true });
  if (!event) return res.status(404).json({ message: 'Evento não encontrado' });
  res.json(event);
};

const remover = async (req, res) => {
  const event = await Event.findByIdAndDelete(req.params.id);
  if (!event) return res.status(404).json({ message: 'Evento não encontrado' });
  if (event.imagem) {
    const imgPath = path.join(__dirname, '..', '..', '..', 'frontend', 'public', event.imagem);
    if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
  }
  res.json({ message: 'Evento removido' });
};

module.exports = { listar, buscarPorId, criar, atualizar, remover };
