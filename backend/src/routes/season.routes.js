const router = require('express').Router();
const { preview, create, list, getById, cancel } = require('../controllers/season.controller');
const { protect, masterOnly } = require('../middleware/auth');

router.use(protect, masterOnly);
router.post('/preview', preview);
router.get('/', list);
router.post('/', create);
router.get('/:id', getById);
router.patch('/:id/cancel', cancel);

module.exports = router;
