const router = require('express').Router();
const { listar, atualizar } = require('../controllers/ranking.controller');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/', listar);
router.put('/', protect, adminOnly, atualizar);

module.exports = router;
