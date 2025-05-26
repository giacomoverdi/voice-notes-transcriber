module.exports = {
    // OpenAI Whisper configuration
    whisper: {
      model: 'whisper-1',
      apiKey: process.env.OPENAI_API_KEY,
      
      // Default transcription options
      defaultOptions: {
        temperature: 0.2,
        language: null, // Auto-detect if not specified
        response_format: 'verbose_json'
      },
      
      // File size limits
      maxFileSize: 25 * 1024 * 1024, // 25MB (Whisper limit)
      chunkSize: 20 * 1024 * 1024, // 20MB chunks for splitting
      
      // Supported audio formats
      supportedFormats: [
        'mp3',
        'mp4',
        'mpeg',
        'mpga',
        'm4a',
        'wav',
        'webm',
        'flac',
        'ogg'
      ],
      
      // Retry configuration
      retry: {
        attempts: 3,
        delay: 1000,
        backoff: 2
      }
    },
    
    // GPT configuration for summaries
    gpt: {
      model: process.env.OPENAI_GPT_MODEL || 'gpt-4-turbo-preview',
      
      // Summary generation
      summary: {
        maxTokens: 500,
        temperature: 0.3,
        systemPrompt: `You are a helpful assistant that creates concise summaries of voice notes. 
                       Focus on key points, action items, and important information.
                       Format the summary with clear sections if applicable.`
      },
      
      // Action items extraction
      actionItems: {
        maxTokens: 300,
        temperature: 0.1,
        systemPrompt: `Extract action items and tasks from the text. 
                       Return a JSON array of objects with: 
                       { "task": "description", "priority": "high|medium|low", "deadline": "date if mentioned" }`
      }
    }
  };