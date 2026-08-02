const router = require('express').Router();
const { listar, atualizar } = require('../controllers/ranking.controller');
const { protect, adminOnly } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

router.get('/', asyncHandler(listar));
router.put('/', protect, adminOnly, asyncHandler(atualizar));

module.exports = router;
