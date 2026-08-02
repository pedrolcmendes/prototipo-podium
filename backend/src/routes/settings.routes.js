const router = require('express').Router();
const { getSettings, updateSettings } = require('../controllers/settings.controller');
const { protect, masterOnly } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

router.get('/', asyncHandler(getSettings));
router.put('/', protect, masterOnly, asyncHandler(updateSettings));

module.exports = router;
