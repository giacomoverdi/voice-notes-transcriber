const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const logger = require('./logger');

class AudioProcessor {
  constructor() {
    // Set ffmpeg path if provided in environment
    if (process.env.FFMPEG_PATH) {
      ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH);
    }
    if (process.env.FFPROBE_PATH) {
      ffmpeg.setFfprobePath(process.env.FFPROBE_PATH);
    }
  }

  /**
   * Prepare audio for transcription (convert to compatible format)
   */
  async prepareForTranscription(inputPath) {
    try {
      const outputPath = inputPath.replace(path.extname(inputPath), '_processed.mp3');
      
      return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
          .toFormat('mp3')
          .audioCodec('libmp3lame')
          .audioChannels(1) // Mono for speech
          .audioFrequency(16000) // 16kHz optimal for speech
          .audioBitrate('64k') // Lower bitrate for speech
          .on('start', (commandLine) => {
            logger.debug('FFmpeg command:', commandLine);
          })
          .on('progress', (progress) => {
            logger.debug('Processing audio:', progress.percent + '% done');
          })
          .on('end', () => {
            logger.info('Audio processing completed', { outputPath });
            resolve(outputPath);
          })
          .on('error', (err) => {
            logger.error('Audio processing error:', err);
            reject(new Error(`Failed to process audio: ${err.message}`));
          })
          .save(outputPath);
      });
    } catch (error) {
      logger.error('Error in prepareForTranscription:', error);
      throw error;
    }
  }

  /**
   * Split audio into chunks for large files
   */
  async splitAudio(inputPath, maxSizeBytes) {
    try {
      const duration = await this.getAudioDuration(inputPath);
      const fileSize = (await fs.stat(inputPath)).size;
      const chunks = Math.ceil(fileSize / maxSizeBytes);
      const chunkDuration = duration / chunks;
      const outputPaths = [];

      logger.info(`Splitting audio into ${chunks} chunks`, { duration, fileSize });

      for (let i = 0; i < chunks; i++) {
        const outputPath = inputPath.replace(
          path.extname(inputPath), 
          `_chunk_${i}.mp3`
        );
        
        await new Promise((resolve, reject) => {
          ffmpeg(inputPath)
            .setStartTime(i * chunkDuration)
            .setDuration(chunkDuration)
            .toFormat('mp3')
            .audioCodec('libmp3lame')
            .audioChannels(1)
            .audioFrequency(16000)
            .on('end', () => {
              logger.info(`Chunk ${i + 1}/${chunks} created`);
              resolve();
            })
            .on('error', reject)
            .save(outputPath);
        });
        
        outputPaths.push(outputPath);
      }

      return outputPaths;
    } catch (error) {
      logger.error('Error splitting audio:', error);
      throw error;
    }
  }

  /**
   * Get audio duration in seconds
   */
  async getAudioDuration(audioPath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(audioPath, (err, metadata) => {
        if (err) {
          logger.error('Error getting audio duration:', err);
          reject(err);
        } else {
          const duration = metadata.format.duration;
          logger.debug('Audio duration:', duration);
          resolve(duration);
        }
      });
    });
  }

  /**
   * Get detailed audio metadata
   */
  async getAudioMetadata(audioPath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(audioPath, (err, metadata) => {
        if (err) {
          logger.error('Error getting audio metadata:', err);
          reject(err);
        } else {
          const audioStream = metadata.streams.find(s => s.codec_type === 'audio');
          resolve({
            duration: metadata.format.duration,
            bitrate: metadata.format.bit_rate,
            format: metadata.format.format_name,
            codec: audioStream?.codec_name,
            channels: audioStream?.channels,
            sampleRate: audioStream?.sample_rate,
            size: metadata.format.size
          });
        }
      });
    });
  }

  /**
   * Extract audio sample for preview or language detection
   */
  async extractSample(inputPath, durationSeconds = 30, startSeconds = 0) {
    try {
      const outputPath = inputPath.replace(
        path.extname(inputPath), 
        '_sample.mp3'
      );
      
      return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
          .setStartTime(startSeconds)
          .setDuration(durationSeconds)
          .toFormat('mp3')
          .audioCodec('libmp3lame')
          .audioChannels(1)
          .audioFrequency(16000)
          .on('end', () => {
            logger.info('Sample extracted', { duration: durationSeconds });
            resolve(outputPath);
          })
          .on('error', (err) => {
            logger.error('Sample extraction error:', err);
            reject(err);
          })
          .save(outputPath);
      });
    } catch (error) {
      logger.error('Error extracting sample:', error);
      throw error;
    }
  }

  /**
   * Normalize audio levels
   */
  async normalizeAudio(inputPath) {
    try {
      const outputPath = inputPath.replace(
        path.extname(inputPath), 
        '_normalized.mp3'
      );
      
      return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
          .audioFilters([
            'loudnorm=I=-16:TP=-1.5:LRA=11', // EBU R128 loudness normalization
            'highpass=f=80', // Remove low frequency noise
            'lowpass=f=8000' // Remove high frequency noise
          ])
          .toFormat('mp3')
          .audioCodec('libmp3lame')
          .on('end', () => {
            logger.info('Audio normalized');
            resolve(outputPath);
          })
          .on('error', (err) => {
            logger.error('Normalization error:', err);
            reject(err);
          })
          .save(outputPath);
      });
    } catch (error) {
      logger.error('Error normalizing audio:', error);
      throw error;
    }
  }

  /**
   * Convert audio to WAV format (for compatibility)
   */
  async convertToWav(inputPath) {
    try {
      const outputPath = inputPath.replace(path.extname(inputPath), '.wav');
      
      return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
          .toFormat('wav')
          .audioCodec('pcm_s16le')
          .audioChannels(1)
          .audioFrequency(16000)
          .on('end', () => {
            logger.info('Converted to WAV');
            resolve(outputPath);
          })
          .on('error', (err) => {
            logger.error('WAV conversion error:', err);
            reject(err);
          })
          .save(outputPath);
      });
    } catch (error) {
      logger.error('Error converting to WAV:', error);
      throw error;
    }
  }

  /**
   * Generate waveform data for visualization
   */
  async generateWaveform(audioPath, samples = 1000) {
    try {
      // This is a simplified version - in production, you might want to use
      // a specialized library like audiowaveform
      const metadata = await this.getAudioMetadata(audioPath);
      const duration = metadata.duration;
      const sampleInterval = duration / samples;
      const waveformData = [];

      // Generate sample points (simplified)
      for (let i = 0; i < samples; i++) {
        // In a real implementation, you'd extract actual amplitude data
        waveformData.push(Math.random() * 0.8 + 0.1);
      }

      return {
        duration,
        samples: waveformData,
        sampleRate: metadata.sampleRate
      };
    } catch (error) {
      logger.error('Error generating waveform:', error);
      throw error;
    }
  }

  /**
   * Validate audio file
   */
  async validateAudio(audioPath) {
    try {
      const metadata = await this.getAudioMetadata(audioPath);
      
      const validation = {
        isValid: true,
        errors: [],
        warnings: []
      };

      // Check duration
      if (metadata.duration < 1) {
        validation.errors.push('Audio is too short (less than 1 second)');
        validation.isValid = false;
      } else if (metadata.duration > 3600) {
        validation.warnings.push('Audio is very long (over 1 hour)');
      }

      // Check format
      const supportedFormats = ['mp3', 'wav', 'flac', 'ogg', 'm4a', 'webm'];
      const format = path.extname(audioPath).toLowerCase().slice(1);
      if (!supportedFormats.includes(format)) {
        validation.warnings.push(`Format ${format} may need conversion`);
      }

      // Check file size
      if (metadata.size > 26214400) { // 25MB
        validation.errors.push('File size exceeds 25MB limit');
        validation.isValid = false;
      }

      return validation;
    } catch (error) {
      logger.error('Error validating audio:', error);
      return {
        isValid: false,
        errors: ['Failed to validate audio file'],
        warnings: []
      };
    }
  }

  /**
   * Clean up temporary files
   */
  async cleanup(filePaths) {
    if (!Array.isArray(filePaths)) {
      filePaths = [filePaths];
    }

    for (const filePath of filePaths) {
      try {
        await fs.unlink(filePath);
        logger.debug('Cleaned up file:', filePath);
      } catch (error) {
        logger.warn('Failed to clean up file:', filePath, error.message);
      }
    }
  }

  /**
   * Generate unique filename
   */
  generateUniqueFilename(originalName) {
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex');
    const ext = path.extname(originalName);
    const base = path.basename(originalName, ext);
    const safeName = base.replace(/[^a-zA-Z0-9-_]/g, '_');
    return `${safeName}_${timestamp}_${random}${ext}`;
  }
}

module.exports = new AudioProcessor();