const { User } = require('../models/User');
const logger = require('../utils/logger');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Check if demo user already exists
      const existingUser = await User.findOne({
        where: { email: 'demo@voicenotes.app' }
      });

      if (!existingUser) {
        // Create demo user
        await User.create({
          email: 'demo@voicenotes.app',
          password: 'demo123',
          name: 'Demo User',
          isActive: true,
          isVerified: true,
          settings: {
            autoTranscribe: true,
            emailNotifications: true,
            dailySummary: false,
            notionSync: false,
            language: 'it',
            timezone: 'Europe/Rome'
          }
        });

        logger.info('Demo user created successfully');
      } else {
        logger.info('Demo user already exists');
      }
    } catch (error) {
      logger.error('Error creating demo user:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      await User.destroy({
        where: { email: 'demo@voicenotes.app' }
      });
      logger.info('Demo user removed successfully');
    } catch (error) {
      logger.error('Error removing demo user:', error);
      throw error;
    }
  }
}; 