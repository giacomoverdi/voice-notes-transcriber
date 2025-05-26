const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

// Postmark inbound webhook
router.post('/inbound', express.raw({ type: 'application/json' }), webhookController.handleInboundEmail);

// Health check
router.get('/health', webhookController.healthCheck);

module.exports = router;
