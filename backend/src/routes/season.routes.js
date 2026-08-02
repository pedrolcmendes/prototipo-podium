const router = require('express').Router();
const { preview, create, list, getById, cancel } = require('../controllers/season.controller');
const { protect, masterOnly } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

router.use(protect, masterOnly);
router.post('/preview', asyncHandler(preview));
router.get('/', asyncHandler(list));
router.post('/', asyncHandler(create));
router.get('/:id', asyncHandler(getById));
router.patch('/:id/cancel', asyncHandler(cancel));

module.exports = router;
