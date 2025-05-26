const postmarkService = require('../services/postmarkService');
const audioController = require('./audioController');
const logger = require('../utils/logger');
const { User } = require('../models/User');

class WebhookController {
  constructor() {
    // Bind all methods to preserve 'this' context
    this.handleInboundEmail = this.handleInboundEmail.bind(this);
    this.getUserFromEmail = this.getUserFromEmail.bind(this);
    this.isAudioFile = this.isAudioFile.bind(this);
    this.healthCheck = this.healthCheck.bind(this);
  }

  /**
   * Handle incoming email from Postmark
   */
  async handleInboundEmail(req, res) {
    try {
      const inboundEmail = req.body;
      
      logger.info('Received inbound email', {
        from: inboundEmail.From,
        subject: inboundEmail.Subject,
        attachments: inboundEmail.Attachments?.length || 0
      });

      // Validate webhook signature
      if (!postmarkService.validateWebhookSignature(req)) {
        return res.status(401).json({ error: 'Invalid webhook signature' });
      }

      // Extract user from email
      const user = await this.getUserFromEmail(inboundEmail.From);
      if (!user) {
        logger.warn('Email from unregistered user', { email: inboundEmail.From });
        // Send registration email
        await postmarkService.sendRegistrationEmail(inboundEmail.From);
        return res.json({ message: 'Registration email sent' });
      }

      // Process attachments
      const audioAttachments = inboundEmail.Attachments?.filter(att => 
        this.isAudioFile(att.ContentType)
      ) || [];

      if (audioAttachments.length === 0) {
        logger.warn('No audio attachments found');
        await postmarkService.sendNoAudioError(inboundEmail.From);
        return res.json({ message: 'No audio attachments' });
      }

      // Process each audio attachment
      const results = [];
      for (const attachment of audioAttachments) {
        try {
          const result = await audioController.processAudioAttachment({
            attachment,
            user,
            emailSubject: inboundEmail.Subject,
            emailBody: inboundEmail.TextBody
          });
          results.push(result);
        } catch (error) {
          logger.error('Error processing attachment', { 
            filename: attachment.Name, 
            error: error.message 
          });
          results.push({ 
            filename: attachment.Name, 
            error: error.message 
          });
        }
      }

      // Send confirmation email
      await postmarkService.sendProcessingConfirmation(
        inboundEmail.From, 
        results
      );

      res.json({ 
        message: 'Email processed successfully', 
        attachments: results.length 
      });

    } catch (error) {
      logger.error('Webhook processing error:', error);
      res.status(500).json({ error: 'Failed to process inbound email' });
    }
  }

  /**
   * Get or create user from email address
   */
  async getUserFromEmail(email) {
    try {
      let user = await User.findOne({ where: { email } });
      
      if (!user) {
        // Auto-create user for first-time senders
        user = await User.create({
          email,
          isActive: false, // Require activation
          settings: {
            autoTranscribe: true,
            notionSync: false,
            emailNotifications: true
          }
        });
      }

      return user;
    } catch (error) {
      logger.error('Error finding/creating user:', error);
      return null;
    }
  }

  /**
   * Check if content type is audio
   */
  isAudioFile(contentType) {
    const audioTypes = [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/x-wav',
      'audio/mp4',
      'audio/x-m4a',
      'audio/ogg',
      'audio/webm',
      'audio/flac'
    ];
    return audioTypes.includes(contentType.toLowerCase());
  }

  /**
   * Health check for webhook endpoint
   */
  async healthCheck(req, res) {
    res.json({ 
      status: 'ok', 
      webhook: 'active',
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = new WebhookController();