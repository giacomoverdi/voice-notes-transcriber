const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');
const { auth: authLimiter } = require('../middleware/rateLimiter');
const { body, validationResult } = require('express-validator');

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Public routes
router.post('/register', 
  authLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('name').optional().trim().isLength({ min: 2 })
  ],
  validate,
  authController.register
);

router.post('/login',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
  ],
  validate,
  authController.login
);

router.get('/verify-email/:token', authController.verifyEmail);

router.post('/forgot-password',
  authLimiter,
  [body('email').isEmail().normalizeEmail()],
  validate,
  authController.requestPasswordReset
);

router.post('/reset-password/:token',
  authLimiter,
  [body('password').isLength({ min: 6 })],
  validate,
  authController.resetPassword
);

// Protected routes
router.get('/me', auth, authController.getCurrentUser);
router.put('/settings', auth, authController.updateSettings);
router.post('/notion', auth, authController.configureNotion);

module.exports = router;