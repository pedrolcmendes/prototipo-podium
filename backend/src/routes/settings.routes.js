const router = require('express').Router();
const { getSettings, updateSettings } = require('../controllers/settings.controller');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/', getSettings);
router.put('/', protect, adminOnly, updateSettings);

module.exports = router;
