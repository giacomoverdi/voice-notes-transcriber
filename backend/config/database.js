const { Sequelize } = require('sequelize');
const logger = require('../src/utils/logger');

// Database URL from environment
const databaseUrl = process.env.DATABASE_URL || 
  `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST || 'postgres'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME}`;

// Sequelize configuration
const config = {
  dialect: 'postgres',
  logging: (msg) => {
    if (process.env.NODE_ENV === 'development') {
      logger.debug(msg);
    }
  },
  pool: {
    max: parseInt(process.env.DB_POOL_MAX) || 5,
    min: parseInt(process.env.DB_POOL_MIN) || 0,
    acquire: parseInt(process.env.DB_POOL_ACQUIRE) || 30000,
    idle: parseInt(process.env.DB_POOL_IDLE) || 10000
  },
  dialectOptions: {
    ssl: process.env.DB_SSL === 'true' ? {
      require: true,
      rejectUnauthorized: false
    } : false,
    keepAlive: true,
    statement_timeout: 10000,
    idle_in_transaction_session_timeout: 10000
  },
  define: {
    underscored: false,
    freezeTableName: false,
    timestamps: true
  },
  retry: {
    max: 3,
    match: [
      /SequelizeConnectionError/,
      /SequelizeConnectionRefusedError/,
      /SequelizeHostNotFoundError/,
      /SequelizeHostNotReachableError/,
      /SequelizeInvalidConnectionError/,
      /SequelizeConnectionTimedOutError/
    ]
  }
};

// Create Sequelize instance
const sequelize = new Sequelize(databaseUrl, config);

// Test connection function
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    logger.info('Database connection has been established successfully.');
    return true;
  } catch (error) {
    logger.error('Unable to connect to the database:', error);
    return false;
  }
};

// Sync database function
const syncDatabase = async (options = {}) => {
  try {
    const defaultOptions = {
      alter: process.env.NODE_ENV === 'development',
      force: false
    };
    
    await sequelize.sync({ ...defaultOptions, ...options });
    logger.info('Database synchronized successfully');
    return true;
  } catch (error) {
    logger.error('Database synchronization failed:', error);
    return false;
  }
};

// Graceful shutdown
const closeConnection = async () => {
  try {
    await sequelize.close();
    logger.info('Database connection closed.');
  } catch (error) {
    logger.error('Error closing database connection:', error);
  }
};

// Export modules
module.exports = {
  sequelize,
  Sequelize,
  testConnection,
  syncDatabase,
  closeConnection
};