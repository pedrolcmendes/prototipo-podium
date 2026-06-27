const router = require('express').Router();
const { register, login, googleAuth, me } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.get('/me', protect, me);

module.exports = router;
