const express = require('express');
const { googleLogin, me, logout, googleAuthStart, googleCallback, debug, updateProfile, changePassword } = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/debug', debug); // debug endpoint
router.post('/google', googleLogin); // expects { idToken }
router.get('/google/start', googleAuthStart);
router.get('/google/callback', googleCallback);
router.get('/me', requireAuth, me);
router.post('/logout', requireAuth, logout);
router.patch('/profile', requireAuth, updateProfile);
router.post('/change-password', requireAuth, changePassword);

module.exports = router;
