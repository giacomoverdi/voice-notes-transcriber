const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const Note = sequelize.define('Note', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  originalFilename: {
    type: DataTypes.STRING,
    allowNull: false
  },
  audioUrl: {
    type: DataTypes.STRING,
    allowNull: false
  },
  transcription: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  summary: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  actionItems: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  categories: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  language: {
    type: DataTypes.STRING(10),
    defaultValue: 'en'
  },
  duration: {
    type: DataTypes.INTEGER, // Duration in seconds
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  notionPageId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  notionSyncedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  isArchived: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isFavorite: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  processedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  emailSubject: {
    type: DataTypes.STRING,
    allowNull: true
  },
  emailBody: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  timestamps: true,
  indexes: [
    {
      fields: ['userId']
    },
    {
      fields: ['categories'],
      using: 'GIN'
    },
    {
      fields: ['tags'],
      using: 'GIN'
    },
    {
      fields: ['createdAt']
    },
    {
      type: 'FULLTEXT',
      fields: ['title', 'transcription', 'summary']
    }
  ]
});

// Instance methods
Note.prototype.toJSON = function() {
  const values = { ...this.get() };
  
  // Add computed fields
  values.hasTranscription = !!values.transcription;
  values.hasSummary = !!values.summary;
  values.hasActionItems = values.actionItems && values.actionItems.length > 0;
  
  return values;
};

// Class methods
Note.searchNotes = async function(userId, query, options = {}) {
  const {
    categories = [],
    tags = [],
    startDate,
    endDate,
    isArchived = false,
    limit = 20,
    offset = 0,
    orderBy = 'createdAt',
    orderDirection = 'DESC'
  } = options;

  const where = {
    userId,
    isArchived
  };

  // Full-text search
  if (query) {
    where[sequelize.Op.or] = [
      sequelize.where(
        sequelize.fn('to_tsvector', 'english', sequelize.col('title')),
        '@@',
        sequelize.fn('plainto_tsquery', 'english', query)
      ),
      sequelize.where(
        sequelize.fn('to_tsvector', 'english', sequelize.col('transcription')),
        '@@',
        sequelize.fn('plainto_tsquery', 'english', query)
      ),
      sequelize.where(
        sequelize.fn('to_tsvector', 'english', sequelize.col('summary')),
        '@@',
        sequelize.fn('plainto_tsquery', 'english', query)
      )
    ];
  }

  // Category filter
  if (categories.length > 0) {
    where.categories = {
      [sequelize.Op.overlap]: categories
    };
  }

  // Tag filter
  if (tags.length > 0) {
    where.tags = {
      [sequelize.Op.overlap]: tags
    };
  }

  // Date range filter
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt[sequelize.Op.gte] = startDate;
    if (endDate) where.createdAt[sequelize.Op.lte] = endDate;
  }

  return await this.findAndCountAll({
    where,
    limit,
    offset,
    order: [[orderBy, orderDirection]]
  });
};

module.exports = { Note };