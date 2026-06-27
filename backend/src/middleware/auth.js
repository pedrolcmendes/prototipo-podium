const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Não autorizado — token ausente' });
  }

  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-senha');
    if (!req.user) return res.status(401).json({ message: 'Usuário não encontrado' });
    next();
  } catch {
    res.status(401).json({ message: 'Token inválido ou expirado' });
  }
};

const adminOnly = (req, res, next) => {
  if (!req.user?.admin) {
    return res.status(403).json({ message: 'Acesso restrito a administradores' });
  }
  next();
};

module.exports = { protect, adminOnly };
