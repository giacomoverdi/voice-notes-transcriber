const { Note } = require('../models/Note');
const { sequelize } = require('../../config/database');
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const notionService = require('../services/notionService');

class NotesController {
  /**
   * Get all notes for user
   */
  async getAllNotes(req, res) {
    try {
      const userId = req.userId;
      const { 
        page = 1, 
        limit = 20, 
        sortBy = 'createdAt', 
        order = 'DESC',
        archived = false,
        favorite = null
      } = req.query;

      const offset = (page - 1) * limit;
      const where = { 
        userId,
        isArchived: archived === 'true'
      };

      if (favorite !== null) {
        where.isFavorite = favorite === 'true';
      }

      const { count, rows } = await Note.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [[sortBy, order]],
        attributes: {
          exclude: ['metadata.segments'] // Exclude large segment data
        }
      });

      res.json({
        notes: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      });
    } catch (error) {
      logger.error('Error fetching notes:', error);
      res.status(500).json({ error: 'Failed to fetch notes' });
    }
  }

  /**
   * Search notes
   */
  async searchNotes(req, res) {
    try {
      const userId = req.userId;
      const {
        q,
        categories,
        tags,
        startDate,
        endDate,
        page = 1,
        limit = 20
      } = req.query;

      const offset = (page - 1) * limit;

      const searchOptions = {
        categories: categories ? categories.split(',') : [],
        tags: tags ? tags.split(',') : [],
        startDate,
        endDate,
        isArchived: false,
        limit: parseInt(limit),
        offset: parseInt(offset)
      };

      const { count, rows } = await Note.searchNotes(userId, q, searchOptions);

      res.json({
        notes: rows,
        query: q,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      });
    } catch (error) {
      logger.error('Search error:', error);
      res.status(500).json({ error: 'Search failed' });
    }
  }

  /**
   * Get note by ID
   */
  async getNoteById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.userId;

      const note = await Note.findOne({
        where: { id, userId }
      });

      if (!note) {
        return res.status(404).json({ error: 'Note not found' });
      }

      res.json(note);
    } catch (error) {
      logger.error('Error fetching note:', error);
      res.status(500).json({ error: 'Failed to fetch note' });
    }
  }

  /**
   * Update note
   */
  async updateNote(req, res) {
    try {
      const { id } = req.params;
      const userId = req.userId;
      const updates = req.body;

      // Allowed fields for update
      const allowedFields = ['title', 'tags', 'categories', 'summary'];
      const filteredUpdates = {};
      
      allowedFields.forEach(field => {
        if (updates[field] !== undefined) {
          filteredUpdates[field] = updates[field];
        }
      });

      const [updateCount, [updatedNote]] = await Note.update(
        filteredUpdates,
        {
          where: { id, userId },
          returning: true
        }
      );

      if (updateCount === 0) {
        return res.status(404).json({ error: 'Note not found' });
      }

      // Sync to Notion if connected
      const user = await req.user;
      if (user.settings.notionSync && updatedNote.notionPageId) {
        await notionService.updatePage(updatedNote.notionPageId, filteredUpdates);
      }

      res.json(updatedNote);
    } catch (error) {
      logger.error('Update error:', error);
      res.status(500).json({ error: 'Failed to update note' });
    }
  }

  /**
   * Delete note
   */
  async deleteNote(req, res) {
    try {
      const { id } = req.params;
      const userId = req.userId;

      const note = await Note.findOne({
        where: { id, userId }
      });

      if (!note) {
        return res.status(404).json({ error: 'Note not found' });
      }

      // Delete from Notion if synced
      if (note.notionPageId) {
        await notionService.deletePage(note.notionPageId).catch(err => {
          logger.error('Failed to delete from Notion:', err);
        });
      }

      await note.destroy();
      res.json({ message: 'Note deleted successfully' });
    } catch (error) {
      logger.error('Delete error:', error);
      res.status(500).json({ error: 'Failed to delete note' });
    }
  }

  /**
   * Toggle favorite status
   */
  async toggleFavorite(req, res) {
    try {
      const { id } = req.params;
      const userId = req.userId;

      const note = await Note.findOne({
        where: { id, userId }
      });

      if (!note) {
        return res.status(404).json({ error: 'Note not found' });
      }

      note.isFavorite = !note.isFavorite;
      await note.save();

      res.json({ 
        id: note.id, 
        isFavorite: note.isFavorite 
      });
    } catch (error) {
      logger.error('Toggle favorite error:', error);
      res.status(500).json({ error: 'Failed to toggle favorite' });
    }
  }

  /**
   * Toggle archive status
   */
  async toggleArchive(req, res) {
    try {
      const { id } = req.params;
      const userId = req.userId;

      const note = await Note.findOne({
        where: { id, userId }
      });

      if (!note) {
        return res.status(404).json({ error: 'Note not found' });
      }

      note.isArchived = !note.isArchived;
      await note.save();

      res.json({ 
        id: note.id, 
        isArchived: note.isArchived 
      });
    } catch (error) {
      logger.error('Toggle archive error:', error);
      res.status(500).json({ error: 'Failed to toggle archive' });
    }
  }

  /**
   * Get user statistics
   */
  async getStats(req, res) {
    try {
      const userId = req.userId;
      
      const stats = await Note.findAll({
        where: { userId },
        attributes: [
          [sequelize.fn('COUNT', sequelize.col('id')), 'totalNotes'],
          [sequelize.fn('SUM', sequelize.col('duration')), 'totalDuration'],
          [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('categories'))), 'uniqueCategories']
        ],
        raw: true
      });

      const recentNotes = await Note.findAll({
        where: { 
          userId,
          createdAt: {
            [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        },
        attributes: ['id', 'createdAt'],
        order: [['createdAt', 'DESC']]
      });

      const categoryStats = await Note.findAll({
        where: { userId },
        attributes: [
          'categories',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['categories'],
        raw: true
      });

      res.json({
        overview: stats[0],
        recentActivity: {
          lastWeek: recentNotes.length,
          notes: recentNotes.slice(0, 5)
        },
        categories: categoryStats
      });
    } catch (error) {
      logger.error('Stats error:', error);
      res.status(500).json({ error: 'Failed to get statistics' });
    }
  }

  /**
   * Sync note to Notion
   */
  async syncToNotion(req, res) {
    try {
      const { id } = req.params;
      const userId = req.userId;
      const user = req.user;

      if (!user.settings.notionSync || !user.notionCredentials) {
        return res.status(400).json({ 
          error: 'Notion integration not configured' 
        });
      }

      const note = await Note.findOne({
        where: { id, userId }
      });

      if (!note) {
        return res.status(404).json({ error: 'Note not found' });
      }

      await audioController.syncToNotion(note);
      
      res.json({ 
        message: 'Note synced to Notion',
        notionPageId: note.notionPageId
      });
    } catch (error) {
      logger.error('Notion sync error:', error);
      res.status(500).json({ error: 'Failed to sync to Notion' });
    }
  }
}

module.exports = new NotesController();