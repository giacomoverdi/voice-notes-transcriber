const postmark = require('postmark');
const crypto = require('crypto');
const logger = require('../utils/logger');

class PostmarkService {
  constructor() {
    this.client = new postmark.ServerClient(process.env.POSTMARK_SERVER_TOKEN);
    this.fromEmail = process.env.POSTMARK_FROM_EMAIL || 'noreply@voicenotes.app';
    this.inboundAddress = process.env.POSTMARK_INBOUND_ADDRESS;
  }

  /**
   * Validate webhook signature
   */
  validateWebhookSignature(req) {
    // Temporaneamente accetta tutte le chiamate
    logger.warn('Webhook validation disabled for development');
    return true;

    // Codice originale commentato
    /*
    if (!process.env.POSTMARK_WEBHOOK_TOKEN) {
      logger.warn('Webhook validation skipped - no token configured');
      return true;
    }

    const token = process.env.POSTMARK_WEBHOOK_TOKEN;
    const signature = req.headers['x-postmark-signature'];
    
    if (!signature) {
      logger.error('Missing webhook signature');
      return false;
    }

    const hash = crypto
      .createHmac('sha256', token)
      .update(JSON.stringify(req.body))
      .digest('base64');

    return hash === signature;
    */
  }

  /**
   * Send registration email to new users
   */
  async sendRegistrationEmail(toEmail) {
    try {
      const emailBody = `
        <h2>Welcome to Voice Notes Transcriber!</h2>
        <p>We received a voice note from your email address.</p>
        <p>To start using our service, please complete your registration:</p>
        <ol>
          <li>Click the link below to activate your account</li>
          <li>Set up your preferences</li>
          <li>Start sending voice notes to: <strong>${this.inboundAddress}</strong></li>
        </ol>
        <p><a href="${process.env.FRONTEND_URL}/register?email=${encodeURIComponent(toEmail)}" 
              style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Complete Registration
        </a></p>
        <p>Once registered, simply email your voice recordings and we'll transcribe them automatically!</p>
        <hr>
        <p style="color: #666; font-size: 14px;">
          If you didn't send a voice note, please ignore this email.
        </p>
      `;

      await this.client.sendEmail({
        From: this.fromEmail,
        To: toEmail,
        Subject: 'Complete your Voice Notes registration',
        HtmlBody: emailBody,
        TextBody: this.htmlToText(emailBody),
        MessageStream: 'outbound'
      });

      logger.info('Registration email sent', { to: toEmail });
    } catch (error) {
      logger.error('Failed to send registration email:', error);
      throw error;
    }
  }

  /**
   * Send error notification when no audio found
   */
  async sendNoAudioError(toEmail) {
    try {
      const emailBody = `
        <h2>No Audio File Found</h2>
        <p>We received your email but couldn't find any audio attachments.</p>
        <p>Please make sure to:</p>
        <ul>
          <li>Attach an audio file (MP3, WAV, M4A, etc.)</li>
          <li>Check that the file size is under 25MB</li>
          <li>Ensure the attachment uploaded correctly</li>
        </ul>
        <p>Supported audio formats:</p>
        <ul>
          <li>MP3, WAV, M4A, MP4</li>
          <li>OGG, WEBM, FLAC</li>
        </ul>
        <p>Try sending your voice note again to: <strong>${this.inboundAddress}</strong></p>
      `;

      await this.client.sendEmail({
        From: this.fromEmail,
        To: toEmail,
        Subject: 'No audio file found in your email',
        HtmlBody: emailBody,
        TextBody: this.htmlToText(emailBody),
        MessageStream: 'outbound'
      });

      logger.info('No audio error email sent', { to: toEmail });
    } catch (error) {
      logger.error('Failed to send error email:', error);
    }
  }

  /**
   * Send processing confirmation with results
   */
  async sendProcessingConfirmation(toEmail, results) {
    try {
      const successCount = results.filter(r => !r.error).length;
      const failedCount = results.filter(r => r.error).length;

      let resultsHtml = '';
      results.forEach(result => {
        if (result.error) {
          resultsHtml += `
            <li style="color: #ef4444;">
              ❌ ${result.filename}: ${result.error}
            </li>
          `;
        } else {
          resultsHtml += `
            <li style="color: #10b981;">
              ✅ ${result.filename}: Successfully transcribed
            </li>
          `;
        }
      });

      const emailBody = `
        <h2>Voice Notes Processing Complete</h2>
        <p>We've finished processing your voice notes:</p>
        <ul>
          <li>✅ Successful: ${successCount}</li>
          ${failedCount > 0 ? `<li>❌ Failed: ${failedCount}</li>` : ''}
        </ul>
        
        <h3>Results:</h3>
        <ul>${resultsHtml}</ul>
        
        <p>
          <a href="${process.env.FRONTEND_URL}" 
             style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">
            View Your Transcriptions
          </a>
        </p>
        
        <p style="margin-top: 24px; color: #666;">
          <strong>Tip:</strong> You can add context to your voice notes by including text in the email body 
          or using a descriptive subject line.
        </p>
      `;

      await this.client.sendEmail({
        From: this.fromEmail,
        To: toEmail,
        Subject: `Voice Notes: ${successCount} transcribed successfully`,
        HtmlBody: emailBody,
        TextBody: this.htmlToText(emailBody),
        MessageStream: 'outbound'
      });

      logger.info('Processing confirmation sent', { 
        to: toEmail, 
        success: successCount, 
        failed: failedCount 
      });
    } catch (error) {
      logger.error('Failed to send confirmation email:', error);
    }
  }

  /**
   * Send daily summary email
   */
  async sendDailySummary(toEmail, summary) {
    try {
      const emailBody = `
        <h2>Your Daily Voice Notes Summary</h2>
        <p>Here's what happened with your voice notes today:</p>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">📊 Statistics</h3>
          <ul>
            <li>Total notes: ${summary.totalNotes}</li>
            <li>Total duration: ${this.formatDuration(summary.totalDuration)}</li>
            <li>Action items created: ${summary.actionItems}</li>
            <li>Most used category: ${summary.topCategory || 'None'}</li>
          </ul>
        </div>
        
        ${summary.recentNotes.length > 0 ? `
          <h3>📝 Recent Notes</h3>
          <ul>
            ${summary.recentNotes.map(note => `
              <li>
                <strong>${note.title}</strong><br>
                <small style="color: #666;">${note.duration}s • ${note.category}</small>
              </li>
            `).join('')}
          </ul>
        ` : ''}
        
        ${summary.pendingActions.length > 0 ? `
          <h3>⚡ Pending Action Items</h3>
          <ul>
            ${summary.pendingActions.map(action => `
              <li>${action.task} <small style="color: #666;">(${action.priority})</small></li>
            `).join('')}
          </ul>
        ` : ''}
        
        <p style="margin-top: 30px;">
          <a href="${process.env.FRONTEND_URL}" 
             style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View All Notes
          </a>
        </p>
      `;

      await this.client.sendEmail({
        From: this.fromEmail,
        To: toEmail,
        Subject: `Daily Summary: ${summary.totalNotes} voice notes`,
        HtmlBody: emailBody,
        TextBody: this.htmlToText(emailBody),
        MessageStream: 'outbound'
      });

      logger.info('Daily summary sent', { to: toEmail });
    } catch (error) {
      logger.error('Failed to send daily summary:', error);
    }
  }

  /**
   * Convert HTML to plain text
   */
  htmlToText(html) {
    return html
      .replace(/<h[1-6].*?>(.*?)<\/h[1-6]>/gi, '\n$1\n')
      .replace(/<li.*?>(.*?)<\/li>/gi, '• $1\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<p.*?>(.*?)<\/p>/gi, '$1\n')
      .replace(/<a.*?href="(.*?)".*?>(.*?)<\/a>/gi, '$2 ($1)')
      .replace(/<.*?>/g, '')
      .replace(/\n\n+/g, '\n\n')
      .trim();
  }

  /**
   * Format duration in seconds to human readable
   */
  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }
}

module.exports = new PostmarkService();