const { Note } = require('../models/Note');
const { sequelize } = require('../../config/database');
const storageService = require('../services/storageService');
const transcriptionService = require('../services/transcriptionService');
const categoryService = require('../services/categoryService');
const notionService = require('../services/notionService');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class AudioController {
  /**
   * Process audio attachment from email
   */
  async processAudioAttachment({ attachment, user, emailSubject, emailBody }) {
    try {
      logger.info('Processing audio attachment', {
        filename: attachment.Name,
        contentType: attachment.ContentType,
        userId: user.id
      });

      // Decode base64 attachment
      const audioBuffer = Buffer.from(attachment.Content, 'base64');
      
      // Generate unique filename
      const uniqueFilename = `${user.id}/${uuidv4()}_${attachment.Name}`;
      
      // Upload to storage
      const audioUrl = await storageService.uploadAudio(
        audioBuffer, 
        uniqueFilename,
        attachment.ContentType
      );

      // Get audio duration
      const tempPath = await storageService.downloadAudio(audioUrl);
      const duration = await transcriptionService.getAudioDuration(tempPath);
      logger.info('Audio duration:', { duration, path: tempPath });

      // Create initial note record
      const note = await Note.create({
        userId: user.id,
        title: emailSubject || `Voice Note - ${new Date().toLocaleDateString()}`,
        originalFilename: attachment.Name,
        audioUrl,
        emailSubject,
        emailBody,
        duration: Math.round(duration),
        metadata: {
          contentType: attachment.ContentType,
          size: attachment.ContentLength,
          uploadedAt: new Date().toISOString(),
          duration: duration
        }
      });

      // Queue transcription job
      await this.queueTranscription(note.id, audioUrl, user.settings);

      // Update user usage
      await user.incrementUsage();

      // Clean up temp file
      await storageService.cleanupTemp(tempPath);

      return {
        noteId: note.id,
        filename: attachment.Name,
        status: 'processing',
        duration: Math.round(duration)
      };

    } catch (error) {
      logger.error('Error processing audio attachment:', error);
      throw error;
    }
  }

  /**
   * Queue transcription job
   */
  async queueTranscription(noteId, audioUrl, userSettings) {
    try {
      // Download audio for processing
      const audioPath = await storageService.downloadAudio(audioUrl);
      
      // Detect language if not specified
      const language = userSettings.language || 
        await transcriptionService.detectLanguage(audioPath);

      // Transcribe audio
      const transcriptionResult = await transcriptionService.transcribeAudio(
        audioPath,
        { 
          language,
          userEmail: userSettings.email // Pass user's email for language detection
        }
      );

      // Generate summary and extract action items
      const [summary, actionItems] = await Promise.all([
        transcriptionService.generateSummary(transcriptionResult.text),
        transcriptionService.extractActionItems(transcriptionResult.text)
      ]);

      // Categorize the note
      const categories = await categoryService.categorizeNote({
        transcription: transcriptionResult.text,
        summary
      });

      // Update note with results
      const note = await Note.findByPk(noteId);
      await note.update({
        transcription: transcriptionResult.text,
        summary,
        actionItems,
        categories,
        language: transcriptionResult.language,
        processedAt: new Date(),
        metadata: {
          ...note.metadata,
          transcriptionModel: transcriptionResult.metadata.model,
          segments: transcriptionResult.segments
        }
      });

      // Sync to Notion if enabled
      if (userSettings.notionSync) {
        await this.syncToNotion(note);
      }

      // Clean up temporary file
      await storageService.cleanupTemp(audioPath);

      logger.info('Transcription completed', { noteId });
      return note;

    } catch (error) {
      logger.error('Transcription error:', error);
      
      // Update note with error status
      await Note.update(
        { 
          metadata: sequelize.fn('jsonb_set', 
            sequelize.col('metadata'), 
            '{error}', 
            JSON.stringify(error.message)
          )
        },
        { where: { id: noteId } }
      );
      
      throw error;
    }
  }

  /**
   * Sync note to Notion
   */
  async syncToNotion(note) {
    try {
      const user = await note.getUser();
      
      if (!user.notionCredentials) {
        logger.warn('Notion credentials not configured', { userId: user.id });
        return;
      }

      const notionPageId = await notionService.createOrUpdatePage({
        databaseId: user.notionCredentials.databaseId,
        properties: {
          Title: note.title,
          Transcription: note.transcription,
          Summary: note.summary,
          Categories: note.categories,
          Duration: note.duration,
          Date: note.createdAt
        },
        content: this.formatNotionContent(note)
      });

      await note.update({
        notionPageId,
        notionSyncedAt: new Date()
      });

      logger.info('Note synced to Notion', { noteId: note.id, notionPageId });
    } catch (error) {
      logger.error('Notion sync error:', error);
      // Don't throw - Notion sync failures shouldn't break the flow
    }
  }

  /**
   * Format note content for Notion
   */
  formatNotionContent(note) {
    const blocks = [
      {
        type: 'heading_2',
        heading_2: {
          rich_text: [{ text: { content: 'Summary' } }]
        }
      },
      {
        type: 'paragraph',
        paragraph: {
          rich_text: [{ text: { content: note.summary || 'No summary available' } }]
        }
      }
    ];

    if (note.actionItems && note.actionItems.length > 0) {
      blocks.push(
        {
          type: 'heading_2',
          heading_2: {
            rich_text: [{ text: { content: 'Action Items' } }]
          }
        },
        ...note.actionItems.map(item => ({
          type: 'to_do',
          to_do: {
            rich_text: [{ text: { content: item.task } }],
            checked: false
          }
        }))
      );
    }

    blocks.push(
      {
        type: 'divider',
        divider: {}
      },
      {
        type: 'heading_2',
        heading_2: {
          rich_text: [{ text: { content: 'Full Transcription' } }]
        }
      },
      {
        type: 'paragraph',
        paragraph: {
          rich_text: [{ text: { content: note.transcription || 'No transcription available' } }]
        }
      }
    );

    return blocks;
  }

  /**
   * Get audio file for streaming
   */
  async streamAudio(req, res) {
    try {
      const { noteId } = req.params;
      const userId = req.userId;

      logger.info('Streaming audio request:', { noteId, userId });

      const note = await Note.findOne({
        where: { id: noteId, userId }
      });

      if (!note) {
        logger.warn('Note not found for streaming:', { noteId, userId });
        return res.status(404).json({ error: 'Note not found' });
      }

      // Stream audio from storage
      const audioStream = await storageService.getAudioStream(note.audioUrl);
      
      // Set appropriate headers
      res.setHeader('Content-Type', note.metadata.contentType || 'audio/mpeg');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      res.setHeader('Content-Length', note.metadata.size);
      
      // Handle range requests
      const range = req.headers.range;
      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : note.metadata.size - 1;
        const chunksize = (end - start) + 1;

        res.setHeader('Content-Range', `bytes ${start}-${end}/${note.metadata.size}`);
        res.setHeader('Content-Length', chunksize);
        res.status(206);

        logger.info('Streaming audio with range:', { 
          start, 
          end, 
          chunksize,
          noteId,
          contentType: note.metadata.contentType
        });

        audioStream.pipe(res);
      } else {
        logger.info('Streaming full audio:', { 
          noteId,
          contentType: note.metadata.contentType,
          size: note.metadata.size
        });

        audioStream.pipe(res);
      }

      // Handle errors in the stream
      audioStream.on('error', (error) => {
        logger.error('Audio stream error:', { 
          error: error.message,
          noteId,
          userId
        });
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to stream audio' });
        }
      });

    } catch (error) {
      logger.error('Audio streaming error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to stream audio' });
      }
    }
  }

  /**
   * Download audio file
   */
  async downloadAudio(req, res) {
    try {
      const { noteId } = req.params;
      const userId = req.userId;

      const note = await Note.findOne({
        where: { id: noteId, userId }
      });

      if (!note) {
        return res.status(404).json({ error: 'Note not found' });
      }

      // Get audio stream from storage
      const audioStream = await storageService.getAudioStream(note.audioUrl);
      
      // Set appropriate headers for download
      res.setHeader('Content-Type', note.metadata.contentType || 'audio/mpeg');
      res.setHeader('Content-Disposition', `attachment; filename="${note.originalFilename}"`);
      res.setHeader('Content-Length', note.metadata.size);
      
      // Stream the file
      audioStream.pipe(res);
    } catch (error) {
      logger.error('Audio download error:', error);
      res.status(500).json({ error: 'Failed to download audio' });
    }
  }
}

module.exports = new AudioController();