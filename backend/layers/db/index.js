const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

/**
 * Utility functions for database operations
 */
module.exports = {
  /**
   * Get an item from DynamoDB
   */
  getItem: async (tableName, key) => {
    try {
      const params = {
        TableName: tableName,
        Key: key
      };
      
      const result = await dynamodb.get(params).promise();
      return result.Item;
    } catch (error) {
      console.error('Error getting item:', error);
      throw error;
    }
  },
  
  /**
   * Put an item in DynamoDB
   */
  putItem: async (tableName, item) => {
    try {
      const params = {
        TableName: tableName,
        Item: item
      };
      
      await dynamodb.put(params).promise();
      return item;
    } catch (error) {
      console.error('Error putting item:', error);
      throw error;
    }
  },
  
  /**
   * Query items from DynamoDB
   */
  queryItems: async (params) => {
    try {
      const result = await dynamodb.query(params).promise();
      return result;
    } catch (error) {
      console.error('Error querying items:', error);
      throw error;
    }
  },
  
  /**
   * Scan items from DynamoDB
   */
  scanItems: async (params) => {
    try {
      const result = await dynamodb.scan(params).promise();
      return result;
    } catch (error) {
      console.error('Error scanning items:', error);
      throw error;
    }
  },
  
  /**
   * Delete an item from DynamoDB
   */
  deleteItem: async (tableName, key) => {
    try {
      const params = {
        TableName: tableName,
        Key: key
      };
      
      await dynamodb.delete(params).promise();
      return true;
    } catch (error) {
      console.error('Error deleting item:', error);
      throw error;
    }
  }
};
