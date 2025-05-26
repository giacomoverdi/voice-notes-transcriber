const jwt = require('jsonwebtoken');
const { User } = require('../models/User');
const postmarkService = require('../services/postmarkService');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class AuthController {
  constructor() {
    // Bind all methods to preserve 'this' context
    this.register = this.register.bind(this);
    this.login = this.login.bind(this);
    this.verifyEmail = this.verifyEmail.bind(this);
    this.requestPasswordReset = this.requestPasswordReset.bind(this);
    this.resetPassword = this.resetPassword.bind(this);
    this.getCurrentUser = this.getCurrentUser.bind(this);
    this.updateSettings = this.updateSettings.bind(this);
    this.configureNotion = this.configureNotion.bind(this);
    this.generateToken = this.generateToken.bind(this);
    this.sendVerificationEmail = this.sendVerificationEmail.bind(this);
    this.sendPasswordResetEmail = this.sendPasswordResetEmail.bind(this);
  }
  /**
   * Register new user
   */
  async register(req, res) {
    try {
      const { email, password, name } = req.body;

      // Check if user exists
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      // Create user with automatic activation
      const user = await User.create({
        email,
        password,
        name,
        isActive: true,
        isVerified: true
      });

      // Generate JWT
      const token = this.generateToken(user);

      res.status(201).json({
        message: 'Registration successful',
        token,
        user: user.toJSON()
      });
    } catch (error) {
      logger.error('Registration error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  }

  /**
   * Login user
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await User.findOne({ where: { email } });
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Validate password
      const isValid = await user.validatePassword(password);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(403).json({ 
          error: 'Account not activated. Please check your email.' 
        });
      }

      // Update last login
      user.lastLoginAt = new Date();
      await user.save();

      // Generate token
      const token = this.generateToken(user);

      res.json({
        token,
        user: user.toJSON()
      });
    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }

  /**
   * Verify email
   */
  async verifyEmail(req, res) {
    try {
      const { token } = req.params;

      const user = await User.findOne({ 
        where: { verificationToken: token } 
      });

      if (!user) {
        return res.status(400).json({ error: 'Invalid verification token' });
      }

      user.isActive = true;
      user.isVerified = true;
      user.verificationToken = null;
      await user.save();

      res.json({ message: 'Email verified successfully' });
    } catch (error) {
      logger.error('Verification error:', error);
      res.status(500).json({ error: 'Verification failed' });
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(req, res) {
    try {
      const { email } = req.body;

      const user = await User.findOne({ where: { email } });
      if (!user) {
        // Don't reveal if user exists
        return res.json({ 
          message: 'If the email exists, a reset link has been sent.' 
        });
      }

      // Generate reset token
      const resetToken = uuidv4();
      user.resetPasswordToken = resetToken;
      user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
      await user.save();

      // Send reset email
      await this.sendPasswordResetEmail(user, resetToken);

      res.json({ 
        message: 'If the email exists, a reset link has been sent.' 
      });
    } catch (error) {
      logger.error('Password reset request error:', error);
      res.status(500).json({ error: 'Failed to process request' });
    }
  }

  /**
   * Reset password
   */
  async resetPassword(req, res) {
    try {
      const { token } = req.params;
      const { password } = req.body;

      const user = await User.findOne({
        where: {
          resetPasswordToken: token,
          resetPasswordExpires: {
            [Op.gt]: new Date()
          }
        }
      });

      if (!user) {
        return res.status(400).json({ 
          error: 'Invalid or expired reset token' 
        });
      }

      // Update password
      user.password = password;
      user.resetPasswordToken = null;
      user.resetPasswordExpires = null;
      await user.save();

      res.json({ message: 'Password reset successful' });
    } catch (error) {
      logger.error('Password reset error:', error);
      res.status(500).json({ error: 'Failed to reset password' });
    }
  }

  /**
   * Get current user
   */
  async getCurrentUser(req, res) {
    try {
      const user = await User.findByPk(req.userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json(user.toJSON());
    } catch (error) {
      logger.error('Get user error:', error);
      res.status(500).json({ error: 'Failed to get user' });
    }
  }

  /**
   * Update user settings
   */
  async updateSettings(req, res) {
    try {
      const { settings } = req.body;
      const user = await User.findByPk(req.userId);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Merge settings
      user.settings = {
        ...user.settings,
        ...settings
      };
      await user.save();

      res.json({
        message: 'Settings updated',
        settings: user.settings
      });
    } catch (error) {
      logger.error('Update settings error:', error);
      res.status(500).json({ error: 'Failed to update settings' });
    }
  }

  /**
   * Configure Notion integration
   */
  async configureNotion(req, res) {
    try {
      const { apiKey, databaseId } = req.body;
      const user = await User.findByPk(req.userId);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Verify Notion credentials
      const notionService = require('../services/notionService');
      const verification = await notionService.verifyIntegration(
        apiKey, 
        databaseId
      );

      if (!verification.valid) {
        return res.status(400).json({ 
          error: verification.error 
        });
      }

      // Save credentials
      user.notionCredentials = {
        apiKey,
        databaseId,
        databaseName: verification.databaseName
      };
      user.settings.notionSync = true;
      await user.save();

      res.json({
        message: 'Notion integration configured',
        databaseName: verification.databaseName
      });
    } catch (error) {
      logger.error('Notion configuration error:', error);
      res.status(500).json({ error: 'Failed to configure Notion' });
    }
  }

  /**
   * Generate JWT token
   */
  generateToken(user) {
    return jwt.sign(
      { 
        userId: user.id, 
        email: user.email 
      },
      process.env.JWT_SECRET,
      { 
        expiresIn: process.env.JWT_EXPIRES_IN || '7d' 
      }
    );
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(user) {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${user.verificationToken}`;
    
    const emailBody = `
      <h2>Welcome to Voice Notes Transcriber!</h2>
      <p>Please verify your email address to activate your account.</p>
      <p>
        <a href="${verificationUrl}" 
           style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Verify Email
        </a>
      </p>
      <p>Or copy this link: ${verificationUrl}</p>
      <p>This link will expire in 24 hours.</p>
    `;

    await postmarkService.client.sendEmail({
      From: postmarkService.fromEmail,
      To: user.email,
      Subject: 'Verify your Voice Notes account',
      HtmlBody: emailBody,
      TextBody: postmarkService.htmlToText(emailBody),
      MessageStream: 'outbound'
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(user, token) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;
    
    const emailBody = `
      <h2>Password Reset Request</h2>
      <p>We received a request to reset your password.</p>
      <p>
        <a href="${resetUrl}" 
           style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Reset Password
        </a>
      </p>
      <p>Or copy this link: ${resetUrl}</p>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `;

    await postmarkService.client.sendEmail({
      From: postmarkService.fromEmail,
      To: user.email,
      Subject: 'Reset your Voice Notes password',
      HtmlBody: emailBody,
      TextBody: postmarkService.htmlToText(emailBody),
      MessageStream: 'outbound'
    });
  }
}

module.exports = new AuthController();