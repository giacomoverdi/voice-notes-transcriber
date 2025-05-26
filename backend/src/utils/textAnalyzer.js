const natural = require('natural');
const compromise = require('compromise');

class TextAnalyzer {
  constructor() {
    this.tokenizer = new natural.WordTokenizer();
    this.stemmer = natural.PorterStemmer;
    this.sentiment = new natural.SentimentAnalyzer('English', this.stemmer, 'afinn');
  }

  /**
   * Analyze text and extract insights
   */
  analyzeText(text) {
    const doc = compromise(text);
    
    return {
      entities: this.extractEntities(doc),
      keywords: this.extractKeywords(text),
      sentiment: this.analyzeSentiment(text),
      topics: this.extractTopics(doc),
      questions: this.extractQuestions(doc),
      dates: this.extractDates(doc),
      numbers: this.extractNumbers(doc)
    };
  }

  /**
   * Extract named entities
   */
  extractEntities(doc) {
    return {
      people: doc.people().out('array'),
      places: doc.places().out('array'),
      organizations: doc.organizations().out('array'),
      emails: this.extractEmails(doc.text()),
      urls: this.extractUrls(doc.text()),
      phoneNumbers: this.extractPhoneNumbers(doc.text())
    };
  }

  /**
   * Extract keywords using TF-IDF
   */
  extractKeywords(text) {
    const tfidf = new natural.TfIdf();
    tfidf.addDocument(text);
    
    const keywords = [];
    tfidf.listTerms(0).slice(0, 10).forEach(item => {
      if (item.term.length > 3 && item.tfidf > 1) {
        keywords.push({
          term: item.term,
          score: item.tfidf
        });
      }
    });
    
    return keywords;
  }

  /**
   * Analyze sentiment
   */
  analyzeSentiment(text) {
    const tokens = this.tokenizer.tokenize(text);
    const score = this.sentiment.getSentiment(tokens);
    
    let label = 'neutral';
    if (score > 0.1) label = 'positive';
    else if (score < -0.1) label = 'negative';
    
    return {
      score,
      label,
      confidence: Math.abs(score)
    };
  }

  /**
   * Extract topics/themes
   */
  extractTopics(doc) {
    const topics = doc.topics().out('array');
    const nouns = doc.nouns().out('array');
    
    // Combine and deduplicate
    const allTopics = [...new Set([...topics, ...nouns])]
      .filter(topic => topic.length > 3)
      .slice(0, 10);
    
    return allTopics;
  }

  /**
   * Extract questions
   */
  extractQuestions(doc) {
    return doc.questions().out('array');
  }

  /**
   * Extract dates and times
   */
  extractDates(doc) {
    const dates = doc.dates().out('array');
    const times = doc.times().out('array');
    
    return {
      dates,
      times,
      combined: [...dates, ...times]
    };
  }

  /**
   * Extract numbers and amounts
   */
  extractNumbers(doc) {
    return {
      numbers: doc.values().out('array'),
      money: doc.money().out('array'),
      percentages: doc.percentages().out('array')
    };
  }

  /**
   * Extract email addresses
   */
  extractEmails(text) {
    const emailRegex = /[\w.-]+@[\w.-]+\.\w+/g;
    return text.match(emailRegex) || [];
  }

  /**
   * Extract URLs
   */
  extractUrls(text) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex) || [];
  }

  /**
   * Extract phone numbers
   */
  extractPhoneNumbers(text) {
    const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g;
    const matches = text.match(phoneRegex) || [];
    return matches.filter(match => match.replace(/\D/g, '').length >= 10);
  }

  /**
   * Calculate reading time
   */
  calculateReadingTime(text) {
    const wordsPerMinute = 200;
    const wordCount = text.split(/\s+/).length;
    const minutes = Math.ceil(wordCount / wordsPerMinute);
    
    return {
      minutes,
      wordCount,
      characterCount: text.length
    };
  }

  /**
   * Extract action items
   */
  extractActionItems(text) {
    const actionPatterns = [
      /(?:need to|have to|must|should|will|going to)\s+(\w+.*?)(?:\.|$)/gi,
      /(?:todo|task|action item):\s*(.+?)(?:\.|$)/gi,
      /(?:remind me to|remember to|don't forget to)\s+(.+?)(?:\.|$)/gi
    ];
    
    const actions = [];
    actionPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        actions.push(match[1].trim());
      }
    });
    
    return [...new Set(actions)];
  }
}

module.exports = new TextAnalyzer();