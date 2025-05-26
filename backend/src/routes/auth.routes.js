const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/verify-email/:token', authController.verifyEmail);
router.post('/forgot-password', authController.requestPasswordReset);
router.post('/reset-password/:token', authController.resetPassword);

// Protected routes
router.get('/me', auth, authController.getCurrentUser);
router.put('/settings', auth, authController.updateSettings);
router.post('/notion', auth, authController.configureNotion);

module.exports = router;
