const speech = require('@google-cloud/speech');
const fs = require('fs');
const path = require('path');
const { Storage } = require('@google-cloud/storage');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const logger = require('../utils/logger');
const User = require('../models/User').default;

class TranscriptionService {
  constructor() {
    logger.info('Initializing TranscriptionService with Google Cloud credentials');
    
    this.client = new speech.SpeechClient({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
    });

    this.storage = new Storage({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
    });

    this.bucketName = process.env.GCS_BUCKET_NAME || 'voice-notes-audio';
    this.bucket = this.storage.bucket(this.bucketName);
  }

  /**
   * Test connection to Google Cloud
   */
  async testConnection() {
    try {
      // Test con una richiesta semplice
      await this.client.getProjectId();
      return true;
    } catch (error) {
      logger.error('Google Cloud connection test failed:', {
        error: error.message,
        code: error.code,
        stack: error.stack
      });
      return false;
    }
  }

  /**
   * Get user's preferred language
   */
  async getUserLanguage(userId) {
    try {
      if (!userId) {
        logger.warn('No userId provided, using default language');
        return 'it-IT';
      }
      const user = await User.findById(userId);
      return user?.settings?.language || 'it-IT';
    } catch (error) {
      logger.error('Error getting user language:', error);
      return 'it-IT';
    }
  }

  /**
   * Get audio duration in seconds using ffmpeg
   */
  async getAudioDuration(audioPath) {
    try {
      const { stdout } = await execPromise(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`);
      const duration = parseFloat(stdout.trim());
      logger.info('Audio duration from ffprobe:', { duration, path: audioPath });
      return duration;
    } catch (error) {
      logger.error('Error getting audio duration with ffprobe:', {
        error: error.message,
        path: audioPath
      });
      return 0;
    }
  }

  /**
   * Upload audio to GCS and get URI
   */
  async uploadToGCS(audioPath) {
    try {
      const fileName = `${Date.now()}-${path.basename(audioPath)}`;
      const file = this.bucket.file(fileName);

      // Leggi il file
      const fileContent = fs.readFileSync(audioPath);

      // Carica il file su GCS
      await file.save(fileContent, {
        metadata: {
          contentType: 'audio/mpeg'
        }
      });

      const gcsUri = `gs://${this.bucketName}/${fileName}`;
      logger.info('Audio uploaded to GCS:', { gcsUri });

      return gcsUri;
    } catch (error) {
      logger.error('Error uploading to GCS:', error);
      throw error;
    }
  }

  /**
   * Transcribe audio file
   */
  async transcribeAudio(audioPath, options = {}) {
    try {
      const { userId } = options;
      const language = await this.getUserLanguage(userId);

      // Test connection first
      const isConnected = await this.testConnection();
      if (!isConnected) {
        throw new Error('Failed to connect to Google Cloud');
      }

      // Verify file exists
      if (!fs.existsSync(audioPath)) {
        throw new Error(`Audio file not found at path: ${audioPath}`);
      }

      // Get file stats
      const stats = fs.statSync(audioPath);
      logger.info('Audio file stats:', {
        path: audioPath,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime
      });

      // Check file size
      if (stats.size > 480 * 1024 * 1024) { // 480MB limit for Google Cloud
        throw new Error('Audio file too large (max 480MB)');
      }

      // Get audio duration using ffmpeg
      const duration = await this.getAudioDuration(audioPath);
      if (duration === 0) {
        logger.warn('Could not determine audio duration with ffprobe');
      }

      // Upload to GCS and get URI
      const gcsUri = await this.uploadToGCS(audioPath);

      // Configure request
      const audio = {
        uri: gcsUri
      };

      const config = {
        encoding: 'MP3',
        sampleRateHertz: 16000,
        languageCode: 'it-IT',
        enableAutomaticPunctuation: true,
        model: 'default',
        useEnhanced: false,
        audioChannelCount: 1,
        speechContexts: [{
          phrases: ["voicenotes", "nota vocale", "trascrizione"],
          boost: 20
        }]
      };

      logger.info('Transcription configuration:', {
        languageCode: config.languageCode,
        encoding: config.encoding,
        sampleRateHertz: config.sampleRateHertz,
        model: config.model,
        useEnhanced: config.useEnhanced,
        speechContexts: config.speechContexts,
        userId: userId,
        duration: duration,
        userLanguage: language
      });

      const request = {
        audio: audio,
        config: config
      };

      // Perform transcription using LongRunningRecognize
      logger.info('Sending request to Google Cloud with config:', {
        languageCode: request.config.languageCode,
        model: request.config.model,
        gcsUri: request.audio.uri,
        userId: userId,
        duration: duration,
        userLanguage: language
      });

      const [operation] = await this.client.longRunningRecognize(request);
      
      // Wait for operation to complete
      logger.info('Waiting for operation to complete...');
      const [response] = await operation.promise();
      
      logger.info('Received response from Google Cloud:', {
        hasResults: !!response?.results,
        resultsCount: response?.results?.length,
        language: language,
        duration: duration
      });

      // Check if we have results
      if (!response?.results || response.results.length === 0) {
        throw new Error('No transcription results returned from Google Cloud');
      }
      
      // Format response
      const transcription = response.results
        .map(result => result.alternatives[0].transcript)
        .join('\n');

      return {
        text: transcription,
        language: language,
        duration: duration,
        segments: response.results.map(result => ({
          text: result.alternatives[0].transcript,
          confidence: result.alternatives[0].confidence
        })),
        metadata: {
          model: 'Google Cloud Speech-to-Text',
          duration: duration,
          method: 'LongRunningRecognize',
          gcsUri: gcsUri
        }
      };
    } catch (error) {
      logger.error('Transcription error:', {
        error: error.message,
        code: error.code,
        stack: error.stack,
        path: audioPath
      });
      throw error;
    }
  }

  /**
   * Generate summary of transcription
   */
  async generateSummary(text) {
    try {
      // Implementare con Google Cloud Natural Language API
      // Per ora ritorniamo un placeholder
      return "Funzionalità di riassunto in fase di implementazione";
    } catch (error) {
      logger.error('Summary generation error:', error);
      return null;
    }
  }

  /**
   * Extract action items from transcription
   */
  async extractActionItems(text) {
    try {
      // Implementare con Google Cloud Natural Language API
      // Per ora ritorniamo un array vuoto
      return [];
    } catch (error) {
      logger.error('Action items extraction error:', error);
      return [];
    }
  }
}

module.exports = new TranscriptionService();