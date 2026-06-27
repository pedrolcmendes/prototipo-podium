const Registration = require('../models/Registration');
const Event = require('../models/Event');

const minhasInscricoes = async (req, res) => {
  const registrations = await Registration.find({ userId: req.user._id })
    .populate('eventId', 'nome data hora local status')
    .sort({ createdAt: -1 });
  res.json(registrations);
};

const porEvento = async (req, res) => {
  const registrations = await Registration.find({ eventId: req.params.eventId })
    .populate('userId', 'nome email tel')
    .sort({ createdAt: 1 });
  res.json(registrations);
};

const inscrever = async (req, res) => {
  const event = await Event.findById(req.params.eventId);
  if (!event) return res.status(404).json({ message: 'Evento não encontrado' });

  if (event.status !== 'aberto') {
    return res.status(400).json({ message: 'Inscrições encerradas para este evento' });
  }

  const inscritos = await Registration.countDocuments({
    eventId: event._id,
    status: 'confirmada',
  });

  if (inscritos >= event.vagas) {
    return res.status(409).json({ message: 'Evento sem vagas disponíveis' });
  }

  const jaInscrito = await Registration.findOne({
    userId: req.user._id,
    eventId: event._id,
  });

  if (jaInscrito) {
    if (jaInscrito.status === 'confirmada') {
      return res.status(409).json({ message: 'Você já está inscrito neste evento' });
    }
    jaInscrito.status = 'confirmada';
    await jaInscrito.save();
    return res.json(jaInscrito);
  }

  const registration = await Registration.create({
    userId: req.user._id,
    userName: req.user.nome,
    eventId: event._id,
    eventNome: event.nome,
    preco: event.preco,
  });

  res.status(201).json(registration);
};

const cancelar = async (req, res) => {
  const registration = await Registration.findById(req.params.id);
  if (!registration) return res.status(404).json({ message: 'Inscrição não encontrada' });

  const ehDono = registration.userId.toString() === req.user._id.toString();
  if (!req.user.admin && !ehDono) {
    return res.status(403).json({ message: 'Sem permissão' });
  }

  registration.status = 'cancelada';
  await registration.save();
  res.json({ message: 'Inscrição cancelada', registration });
};

module.exports = { minhasInscricoes, porEvento, inscrever, cancelar };
