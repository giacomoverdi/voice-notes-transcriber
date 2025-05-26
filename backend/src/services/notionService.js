const { Client } = require('@notionhq/client');
const logger = require('../utils/logger');

class NotionService {
  constructor() {
    this.clients = new Map(); // Cache clients per user
  }

  /**
   * Get or create Notion client for user
   */
  getClient(apiKey) {
    if (!this.clients.has(apiKey)) {
      this.clients.set(apiKey, new Client({ auth: apiKey }));
    }
    return this.clients.get(apiKey);
  }

  /**
   * Create or update a page in Notion
   */
  async createOrUpdatePage({ apiKey, databaseId, properties, content }) {
    try {
      const notion = this.getClient(apiKey || process.env.NOTION_API_KEY);
      
      // Format properties for Notion
      const notionProperties = {
        Title: {
          title: [
            {
              text: {
                content: properties.Title || 'Untitled Voice Note'
              }
            }
          ]
        },
        Summary: {
          rich_text: [
            {
              text: {
                content: properties.Summary || ''
              }
            }
          ]
        },
        Categories: {
          multi_select: (properties.Categories || []).map(cat => ({
            name: cat
          }))
        },
        Duration: {
          number: properties.Duration || 0
        },
        Date: {
          date: {
            start: properties.Date || new Date().toISOString()
          }
        }
      };

      // Create the page
      const response = await notion.pages.create({
        parent: {
          database_id: databaseId || process.env.NOTION_DATABASE_ID
        },
        properties: notionProperties,
        children: content || []
      });

      logger.info('Notion page created', { pageId: response.id });
      return response.id;
    } catch (error) {
      logger.error('Notion create page error:', error);
      throw new Error(`Failed to create Notion page: ${error.message}`);
    }
  }

  /**
   * Update existing Notion page
   */
  async updatePage(pageId, updates, apiKey) {
    try {
      const notion = this.getClient(apiKey || process.env.NOTION_API_KEY);
      
      const properties = {};
      
      if (updates.title) {
        properties.Title = {
          title: [
            {
              text: {
                content: updates.title
              }
            }
          ]
        };
      }
      
      if (updates.summary) {
        properties.Summary = {
          rich_text: [
            {
              text: {
                content: updates.summary
              }
            }
          ]
        };
      }
      
      if (updates.categories) {
        properties.Categories = {
          multi_select: updates.categories.map(cat => ({
            name: cat
          }))
        };
      }

      await notion.pages.update({
        page_id: pageId,
        properties
      });

      logger.info('Notion page updated', { pageId });
    } catch (error) {
      logger.error('Notion update error:', error);
      throw new Error(`Failed to update Notion page: ${error.message}`);
    }
  }

  /**
   * Delete Notion page
   */
  async deletePage(pageId, apiKey) {
    try {
      const notion = this.getClient(apiKey || process.env.NOTION_API_KEY);
      
      await notion.pages.update({
        page_id: pageId,
        archived: true
      });

      logger.info('Notion page archived', { pageId });
    } catch (error) {
      logger.error('Notion delete error:', error);
      // Don't throw - deletion failures shouldn't break the flow
    }
  }

  /**
   * Verify Notion integration
   */
  async verifyIntegration(apiKey, databaseId) {
    try {
      const notion = this.getClient(apiKey);
      
      // Try to retrieve the database
      const database = await notion.databases.retrieve({
        database_id: databaseId
      });

      // Check required properties
      const requiredProps = ['Title', 'Summary', 'Categories', 'Duration', 'Date'];
      const dbProps = Object.keys(database.properties);
      const missingProps = requiredProps.filter(prop => !dbProps.includes(prop));

      if (missingProps.length > 0) {
        return {
          valid: false,
          error: `Missing required properties in Notion database: ${missingProps.join(', ')}`
        };
      }

      return {
        valid: true,
        databaseName: database.title[0]?.plain_text || 'Untitled Database'
      };
    } catch (error) {
      logger.error('Notion verification error:', error);
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Create Notion database template
   */
  async createDatabaseTemplate(apiKey, pageId, title = 'Voice Notes') {
    try {
      const notion = this.getClient(apiKey);
      
      const database = await notion.databases.create({
        parent: {
          page_id: pageId
        },
        title: [
          {
            text: {
              content: title
            }
          }
        ],
        properties: {
          Title: {
            title: {}
          },
          Summary: {
            rich_text: {}
          },
          Transcription: {
            rich_text: {}
          },
          Categories: {
            multi_select: {
              options: [
                { name: 'meeting', color: 'blue' },
                { name: 'idea', color: 'yellow' },
                { name: 'todo', color: 'red' },
                { name: 'personal', color: 'green' },
                { name: 'work', color: 'purple' },
                { name: 'general', color: 'gray' }
              ]
            }
          },
          Duration: {
            number: {
              format: 'number'
            }
          },
          Date: {
            date: {}
          },
          Audio: {
            url: {}
          },
          ActionItems: {
            rich_text: {}
          },
          Favorite: {
            checkbox: {}
          }
        }
      });

      logger.info('Notion database created', { 
        databaseId: database.id,
        title 
      });

      return database.id;
    } catch (error) {
      logger.error('Database creation error:', error);
      throw new Error(`Failed to create Notion database: ${error.message}`);
    }
  }
}

module.exports = new NotionService();