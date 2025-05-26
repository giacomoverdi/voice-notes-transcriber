module.exports = {
    // Postmark configuration
    serverToken: process.env.POSTMARK_SERVER_TOKEN,
    
    // Inbound email settings
    inbound: {
      address: process.env.POSTMARK_INBOUND_ADDRESS,
      webhookToken: process.env.POSTMARK_WEBHOOK_TOKEN,
      
      // Maximum attachment size (in bytes)
      maxAttachmentSize: 26214400, // 25MB
      
      // Allowed attachment types
      allowedContentTypes: [
        'audio/mpeg',
        'audio/mp3',
        'audio/wav',
        'audio/x-wav',
        'audio/mp4',
        'audio/x-m4a',
        'audio/ogg',
        'audio/webm',
        'audio/flac'
      ]
    },
    
    // Outbound email settings
    outbound: {
      fromEmail: process.env.POSTMARK_FROM_EMAIL || 'noreply@voicenotes.app',
      replyToEmail: process.env.POSTMARK_REPLY_TO || 'support@voicenotes.app',
      
      // Email templates
      templates: {
        welcome: 'welcome-email',
        transcriptionComplete: 'transcription-complete',
        dailySummary: 'daily-summary',
        errorNotification: 'error-notification'
      },
      
      // Message streams
      streams: {
        transactional: 'outbound',
        broadcast: 'broadcast'
      }
    },
    
    // Rate limiting
    rateLimit: {
      maxEmailsPerMinute: 30,
      maxAttachmentsPerEmail: 5
    },
    
    // Error handling
    errorHandling: {
      retryAttempts: 3,
      retryDelay: 1000,
      notifyOnError: true
    }
  };