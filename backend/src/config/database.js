const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');
const demoUserSeeder = require('../seeders/20240320000000-demo-user');

// Initialize Sequelize
const sequelize = new Sequelize(
  process.env.DB_NAME || 'voicenotes',
  process.env.DB_USER || 'voicenotes',
  process.env.DB_PASSWORD || 'voicenotes123',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: (msg) => logger.debug(msg),
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// Test connection and sync database
async function initializeDatabase() {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established successfully');

    // Sync all models
    await sequelize.sync();
    logger.info('Database synchronized successfully');

    // Run demo user seeder
    await demoUserSeeder.up();
    logger.info('Database seeding completed');

  } catch (error) {
    logger.error('Database initialization error:', error);
    throw error;
  }
}

module.exports = {
  sequelize,
  initializeDatabase
}; 