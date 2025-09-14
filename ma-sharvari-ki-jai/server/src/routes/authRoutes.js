const express = require('express');
const { googleLogin, me, logout } = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/google', googleLogin); // expects { idToken }
router.get('/me', requireAuth, me);
router.post('/logout', requireAuth, logout);

module.exports = router;
