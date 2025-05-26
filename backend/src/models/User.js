const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: true // Can be null for email-only users
  },
  name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  verificationToken: {
    type: DataTypes.STRING,
    allowNull: true
  },
  resetPasswordToken: {
    type: DataTypes.STRING,
    allowNull: true
  },
  resetPasswordExpires: {
    type: DataTypes.DATE,
    allowNull: true
  },
  settings: {
    type: DataTypes.JSONB,
    defaultValue: {
      autoTranscribe: true,
      emailNotifications: true,
      dailySummary: false,
      notionSync: false,
      language: 'en',
      timezone: 'UTC'
    }
  },
  usage: {
    type: DataTypes.JSONB,
    defaultValue: {
      totalNotes: 0,
      totalDuration: 0,
      lastActivity: null,
      monthlyUsage: {}
    }
  },
  notionCredentials: {
    type: DataTypes.JSONB,
    defaultValue: null
  },
  lastLoginAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  timestamps: true,
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password') && user.password) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    }
  }
});

// Instance methods
User.prototype.validatePassword = async function(password) {
  if (!this.password) return false;
  return bcrypt.compare(password, this.password);
};

User.prototype.toJSON = function() {
  const values = { ...this.get() };
  delete values.password;
  delete values.verificationToken;
  delete values.resetPasswordToken;
  delete values.notionCredentials;
  return values;
};

User.prototype.incrementUsage = async function(duration = 0) {
  this.usage.totalNotes += 1;
  this.usage.totalDuration += duration;
  this.usage.lastActivity = new Date();
  
  // Update monthly usage
  const month = new Date().toISOString().slice(0, 7);
  if (!this.usage.monthlyUsage[month]) {
    this.usage.monthlyUsage[month] = { notes: 0, duration: 0 };
  }
  this.usage.monthlyUsage[month].notes += 1;
  this.usage.monthlyUsage[month].duration += duration;
  
  await this.save();
};

module.exports = { User };