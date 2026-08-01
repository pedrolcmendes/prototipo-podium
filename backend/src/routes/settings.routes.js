const router = require('express').Router();
const { getSettings, updateSettings } = require('../controllers/settings.controller');
const { protect, masterOnly } = require('../middleware/auth');

router.get('/', getSettings);
router.put('/', protect, masterOnly, updateSettings);

module.exports = router;
