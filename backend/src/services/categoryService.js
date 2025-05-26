const natural = require('natural');
const compromise = require('compromise');
const logger = require('../utils/logger');

class CategoryService {
  constructor() {
    this.categories = {
      'meeting': {
        keywords: ['meeting', 'discussion', 'agenda', 'minutes', 'action items', 'follow up', 'schedule', 'conference', 'team', 'project'],
        patterns: /\b(meeting|call|conference|discussion|agenda)\b/i
      },
      'idea': {
        keywords: ['idea', 'thought', 'concept', 'brainstorm', 'innovation', 'creative', 'suggestion', 'proposal', 'imagine'],
        patterns: /\b(idea|thought|what if|maybe we could|suggestion)\b/i
      },
      'todo': {
        keywords: ['todo', 'task', 'reminder', 'need to', 'must', 'should', 'deadline', 'due', 'complete', 'finish'],
        patterns: /\b(need to|have to|must|should|todo|task|remind me)\b/i
      },
      'personal': {
        keywords: ['personal', 'private', 'diary', 'journal', 'feeling', 'emotion', 'family', 'friend', 'life'],
        patterns: /\b(personal|private|myself|feeling|family)\b/i
      },
      'work': {
        keywords: ['work', 'job', 'office', 'colleague', 'boss', 'client', 'project', 'deadline', 'professional'],
        patterns: /\b(work|office|client|project|boss|colleague)\b/i
      },
      'learning': {
        keywords: ['learn', 'study', 'course', 'book', 'article', 'research', 'understand', 'knowledge', 'education'],
        patterns: /\b(learn|study|read|research|course|understand)\b/i
      },
      'finance': {
        keywords: ['money', 'budget', 'expense', 'income', 'investment', 'savings', 'cost', 'price', 'payment'],
        patterns: /\b(money|budget|expense|cost|pay|investment|dollar|euro)\b/i
      },
      'health': {
        keywords: ['health', 'fitness', 'exercise', 'diet', 'medical', 'doctor', 'wellness', 'symptom', 'medication'],
        patterns: /\b(health|fitness|exercise|doctor|medical|symptom)\b/i
      }
    };

    // Initialize NLP tools
    this.tokenizer = new natural.WordTokenizer();
    this.tfidf = new natural.TfIdf();
  }

  /**
   * Categorize note based on content
   */
  async categorizeNote({ transcription, summary }) {
    try {
      const text = `${transcription} ${summary}`.toLowerCase();
      const categories = [];
      const scores = {};

      // Pattern matching
      for (const [category, config] of Object.entries(this.categories)) {
        if (config.patterns.test(text)) {
          scores[category] = (scores[category] || 0) + 2;
        }
      }

      // Keyword matching
      const tokens = this.tokenizer.tokenize(text);
      for (const [category, config] of Object.entries(this.categories)) {
        const keywordScore = this.calculateKeywordScore(tokens, config.keywords);
        scores[category] = (scores[category] || 0) + keywordScore;
      }

      // NLP analysis with compromise
      const doc = compromise(text);
      
      // Check for specific entities
      if (doc.people().length > 0 || doc.places().length > 0) {
        scores['meeting'] = (scores['meeting'] || 0) + 1;
      }
      
      if (doc.money().length > 0) {
        scores['finance'] = (scores['finance'] || 0) + 2;
      }
      
      // Check for dates using regex
      const datePattern = /\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b|\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(st|nd|rd|th)?,?\s+\d{4}\b/i;
      if (datePattern.test(text)) {
        scores['todo'] = (scores['todo'] || 0) + 1;
      }

      // Select top categories
      const sortedCategories = Object.entries(scores)
        .filter(([_, score]) => score > 2)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([category]) => category);

      // Default category if none found
      if (sortedCategories.length === 0) {
        sortedCategories.push('general');
      }

      return sortedCategories;
    } catch (error) {
      logger.error('Categorization error:', error);
      return ['general'];
    }
  }

  /**
   * Calculate keyword score
   */
  calculateKeywordScore(tokens, keywords) {
    let score = 0;
    const tokenSet = new Set(tokens);
    
    for (const keyword of keywords) {
      if (tokenSet.has(keyword)) {
        score += 1;
      }
      // Partial matching for compound words
      if (tokens.some(token => token.includes(keyword) || keyword.includes(token))) {
        score += 0.5;
      }
    }
    
    return score;
  }

  /**
   * Extract tags from content
   */
  extractTags(text) {
    try {
      const doc = compromise(text);
      const tags = new Set();

      // Extract nouns as potential tags
      doc.nouns().forEach(noun => {
        const tag = noun.text().toLowerCase();
        if (tag.length > 3 && tag.length < 20) {
          tags.add(tag);
        }
      });

      // Extract topics
      doc.topics().forEach(topic => {
        tags.add(topic.text().toLowerCase());
      });

      // Extract hashtags if any
      const hashtagPattern = /#(\w+)/g;
      let match;
      while ((match = hashtagPattern.exec(text)) !== null) {
        tags.add(match[1].toLowerCase());
      }

      return Array.from(tags).slice(0, 10);
    } catch (error) {
      logger.error('Tag extraction error:', error);
      return [];
    }
  }

  /**
   * Get category suggestions based on user history
   */
  async getUserCategoryTrends(userId) {
    try {
      const { Note } = require('../models/Note');
      const { Op } = require('sequelize');
      
      // Get recent notes
      const recentNotes = await Note.findAll({
        where: {
          userId,
          createdAt: {
            [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        },
        attributes: ['categories'],
        limit: 100
      });

      // Count category frequency
      const categoryCount = {};
      recentNotes.forEach(note => {
        note.categories.forEach(category => {
          categoryCount[category] = (categoryCount[category] || 0) + 1;
        });
      });

      // Sort by frequency
      return Object.entries(categoryCount)
        .sort((a, b) => b[1] - a[1])
        .map(([category, count]) => ({ category, count }));
    } catch (error) {
      logger.error('Category trends error:', error);
      return [];
    }
  }
}

module.exports = new CategoryService();