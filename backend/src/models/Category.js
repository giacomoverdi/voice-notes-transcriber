const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const Category = sequelize.define('Category', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  slug: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  color: {
    type: DataTypes.STRING,
    defaultValue: '#6366f1'
  },
  icon: {
    type: DataTypes.STRING,
    defaultValue: '📌'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isSystem: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: true, // null for system categories
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  usageCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  timestamps: true,
  hooks: {
    beforeCreate: (category) => {
      if (!category.slug) {
        category.slug = category.name.toLowerCase().replace(/\s+/g, '-');
      }
    }
  }
});

// Seed default categories
Category.seedDefaults = async function() {
  const defaults = [
    { name: 'Meeting', slug: 'meeting', icon: '👥', color: '#3b82f6', isSystem: true },
    { name: 'Idea', slug: 'idea', icon: '💡', color: '#eab308', isSystem: true },
    { name: 'Todo', slug: 'todo', icon: '✅', color: '#ef4444', isSystem: true },
    { name: 'Personal', slug: 'personal', icon: '👤', color: '#10b981', isSystem: true },
    { name: 'Work', slug: 'work', icon: '💼', color: '#8b5cf6', isSystem: true },
    { name: 'Learning', slug: 'learning', icon: '📚', color: '#6366f1', isSystem: true },
    { name: 'Finance', slug: 'finance', icon: '💰', color: '#10b981', isSystem: true },
    { name: 'Health', slug: 'health', icon: '🏃', color: '#ec4899', isSystem: true },
    { name: 'General', slug: 'general', icon: '📌', color: '#6b7280', isSystem: true }
  ];

  for (const cat of defaults) {
    await this.findOrCreate({
      where: { slug: cat.slug },
      defaults: cat
    });
  }
};

module.exports = { Category };