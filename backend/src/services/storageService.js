const AWS = require('aws-sdk');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class StorageService {
  constructor() {
    // Force local storage if FORCE_LOCAL_STORAGE is true, regardless of AWS credentials
    if (process.env.FORCE_LOCAL_STORAGE === 'true') {
      this.useS3 = false;
      this.localStoragePath = path.join(__dirname, '../../uploads');
      this.ensureLocalStorage();
      logger.info('Storage service using local filesystem (forced)');
    } else {
    this.useS3 = !!(process.env.AWS_ACCESS_KEY_ID && process.env.S3_BUCKET_NAME);
    
    if (this.useS3) {
      this.s3 = new AWS.S3({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || 'us-east-1',
        endpoint: process.env.S3_ENDPOINT
      });
      this.bucketName = process.env.S3_BUCKET_NAME;
      logger.info('Storage service using AWS S3');
    } else {
      this.localStoragePath = path.join(__dirname, '../../uploads');
      this.ensureLocalStorage();
      logger.info('Storage service using local filesystem');
      }
    }
  }

  /**
   * Ensure local storage directory exists
   */
  async ensureLocalStorage() {
    try {
      await fs.mkdir(this.localStoragePath, { recursive: true });
    } catch (error) {
      logger.error('Failed to create local storage directory:', error);
    }
  }

  /**
   * Upload audio file
   */
  async uploadAudio(buffer, filename, contentType) {
    try {
      if (this.useS3) {
        return await this.uploadToS3(buffer, filename, contentType);
      } else {
        return await this.uploadToLocal(buffer, filename);
      }
    } catch (error) {
      logger.error('Upload error:', error);
      throw new Error('Failed to upload audio file');
    }
  }

  /**
   * Upload to S3
   */
  async uploadToS3(buffer, filename, contentType) {
    const params = {
      Bucket: this.bucketName,
      Key: `audio/${filename}`,
      Body: buffer,
      ContentType: contentType || 'audio/mpeg',
      Metadata: {
        uploadedAt: new Date().toISOString()
      }
    };

    const result = await this.s3.upload(params).promise();
    return result.Location;
  }

  /**
   * Upload to local filesystem
   */
  async uploadToLocal(buffer, filename) {
    const safeFilename = filename.replace(/[^a-zA-Z0-9.-_\/]/g, '_');
    const filePath = path.join(this.localStoragePath, safeFilename);
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    
    // Write file
    await fs.writeFile(filePath, buffer);
    
    // Return URL-like path
    return `/uploads/${safeFilename}`;
  }

  /**
   * Download audio for processing
   */
  async downloadAudio(audioUrl) {
    try {
      const tempPath = path.join('/tmp', `${uuidv4()}.audio`);
      
      if (this.useS3) {
        // Extract S3 key from URL
        const key = audioUrl.split('.com/')[1];
        const params = {
          Bucket: this.bucketName,
          Key: key
        };
        
        const data = await this.s3.getObject(params).promise();
        await fs.writeFile(tempPath, data.Body);
      } else {
        // Copy from local storage
        const sourcePath = path.join(
          this.localStoragePath, 
          audioUrl.replace('/uploads/', '')
        );
        await fs.copyFile(sourcePath, tempPath);
      }
      
      return tempPath;
    } catch (error) {
      logger.error('Download error:', error);
      throw new Error('Failed to download audio file');
    }
  }

  /**
   * Get audio stream for playback
   */
  async getAudioStream(audioUrl) {
    try {
      if (this.useS3) {
        const key = audioUrl.split('.com/')[1];
        const params = {
          Bucket: this.bucketName,
          Key: key
        };
        return this.s3.getObject(params).createReadStream();
      } else {
        const filePath = path.join(
          this.localStoragePath,
          audioUrl.replace('/uploads/', '')
        );
        const { createReadStream } = require('fs');
        return createReadStream(filePath);
      }
    } catch (error) {
      logger.error('Stream error:', error);
      throw new Error('Failed to stream audio file');
    }
  }

  /**
   * Delete audio file
   */
  async deleteAudio(audioUrl) {
    try {
      if (this.useS3) {
        const key = audioUrl.split('.com/')[1];
        await this.s3.deleteObject({
          Bucket: this.bucketName,
          Key: key
        }).promise();
      } else {
        const filePath = path.join(
          this.localStoragePath,
          audioUrl.replace('/uploads/', '')
        );
        await fs.unlink(filePath);
      }
      logger.info('Audio file deleted', { audioUrl });
    } catch (error) {
      logger.error('Delete error:', error);
      // Don't throw - deletion failures shouldn't break the flow
    }
  }

  /**
   * Clean up temporary file
   */
  async cleanupTemp(tempPath) {
    try {
      await fs.unlink(tempPath);
    } catch (error) {
      logger.warn('Failed to cleanup temp file:', tempPath);
    }
  }

  /**
   * Get signed URL for direct access (S3 only)
   */
  async getSignedUrl(audioUrl, expiresIn = 3600) {
    if (!this.useS3) {
      return audioUrl; // Return as-is for local storage
    }

    try {
      const key = audioUrl.split('.com/')[1];
      const params = {
        Bucket: this.bucketName,
        Key: key,
        Expires: expiresIn
      };
      return await this.s3.getSignedUrlPromise('getObject', params);
    } catch (error) {
      logger.error('Signed URL error:', error);
      return audioUrl;
    }
  }
}

module.exports = new StorageService();