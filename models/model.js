import { PrismaClient } from "@prisma/client";
import { EncryptionService, createEncryptionMiddleware, ENCRYPTION_MAPPINGS } from '../../shared/utils/encryption.js';

// Initialize Prisma client
const prisma = new PrismaClient();

// Initialize encryption service
let encryptionService = null;
// TEMPORARILY DISABLE ENCRYPTION FOR LOGIN DEBUGGING
console.log('🔧 TEMPORARILY DISABLING ENCRYPTION FOR LOGIN DEBUGGING');
console.warn('⚠️  Database encryption is DISABLED for debugging login performance');

// Enhanced Prisma client with encryption capabilities
class EncryptedPrismaClient {
  constructor(client, encryptionService) {
    this.client = client;
    this.encryption = encryptionService;
    
    // Proxy all Prisma methods
    return new Proxy(this, {
      get(target, prop) {
        if (prop in target) {
          return target[prop];
        }
        return target.client[prop];
      }
    });
  }

  /**
   * Search users by encrypted email field
   * @param {string} email - Plain text email to search for
   * @returns {Promise} User object or null
   */
  async findUserByEmail(email) {
    if (!this.encryption) {
      // Fallback to regular search if encryption disabled
      return this.client.users.findUnique({
        where: { email }
      });
    }

    try {
      // For encrypted search, use search token
      const searchToken = this.encryption.generateSearchToken(email, 'EMAIL');
      
      const user = await this.client.users.findUnique({
        where: { email_search_token: searchToken }
      });
      
      // Manually decrypt the result
      if (user) {
        return this.decryptUserData(user);
      }
      return null;
    } catch (error) {
      console.error('Error searching encrypted email:', error);
      return null;
    }
  }

  /**
   * Search users by encrypted phone field
   * @param {string} phone - Plain text phone to search for
   * @returns {Promise} User object or null
   */
  async findUserByPhone(phone) {
    if (!this.encryption) {
      return this.client.users.findFirst({
        where: { phone_number: phone }
      });
    }

    try {
      // Use search token for encrypted phone search
      const searchToken = this.encryption.generateSearchToken(phone, 'PHONE');
      
      const user = await this.client.users.findFirst({
        where: { phone_search_token: searchToken }
      });
      
      // Manually decrypt the result
      if (user) {
        return this.decryptUserData(user);
      }
      return null;
    } catch (error) {
      console.error('Error searching encrypted phone:', error);
      return null;
    }
  }

  /**
   * Create user with automatic encryption
   * @param {Object} userData - User data to create
   * @returns {Promise} Created user object
   */
  async createUser(userData) {
    if (!this.encryption) {
      return this.client.users.create({
        data: userData
      });
    }

    try {
      const encryptedData = this.encryptUserData(userData);
      const result = await this.client.users.create({
        data: encryptedData
      });
      
      return this.decryptUserData(result);
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Update user with automatic encryption
   * @param {string} userId - User ID
   * @param {Object} updateData - Data to update
   * @returns {Promise} Updated user object
   */
  async updateUser(userId, updateData) {
    if (!this.encryption) {
      return this.client.users.update({
        where: { id: userId },
        data: updateData
      });
    }

    try {
      const encryptedData = this.encryptUserData(updateData);
      const result = await this.client.users.update({
        where: { id: userId },
        data: encryptedData
      });
      
      return this.decryptUserData(result);
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  /**
   * Encrypt user data fields
   * @param {Object} userData - User data to encrypt
   * @returns {Object} Encrypted user data
   */
  encryptUserData(userData) {
    if (!this.encryption) {
      return userData;
    }

    const encryptedData = { ...userData };
    const fieldMappings = {
      email: 'EMAIL',
      phone_number: 'PHONE',
      first_name: 'NAME',
      last_name: 'NAME'
    };

    // Encrypt fields
    for (const [field, type] of Object.entries(fieldMappings)) {
      if (encryptedData[field]) {
        encryptedData[field] = this.encryption.encryptField(encryptedData[field], type);
      }
    }

    // Generate search tokens for encrypted fields
    if (userData.email) {
      encryptedData.email_search_token = this.encryption.generateSearchToken(userData.email, 'EMAIL');
    }
    if (userData.phone_number) {
      encryptedData.phone_search_token = this.encryption.generateSearchToken(userData.phone_number, 'PHONE');
    }

    return encryptedData;
  }

  /**
   * Decrypt user data fields
   * @param {Object} userData - Encrypted user data
   * @returns {Object} Decrypted user data
   */
  decryptUserData(userData) {
    if (!this.encryption || !userData) {
      return userData;
    }

    const decryptedData = { ...userData };
    const fieldMappings = {
      email: 'EMAIL',
      phone_number: 'PHONE',
      first_name: 'NAME',
      last_name: 'NAME'
    };

    // Decrypt fields
    for (const [field, type] of Object.entries(fieldMappings)) {
      if (decryptedData[field]) {
        try {
          decryptedData[field] = this.encryption.decryptField(decryptedData[field], type);
        } catch (error) {
          console.error(`Error decrypting ${field}:`, error.message);
          // Keep encrypted value if decryption fails
        }
      }
    }

    return decryptedData;
  }

  /**
   * Get encryption status and health
   * @returns {Object} Encryption status information
   */
  getEncryptionStatus() {
    return {
      enabled: !!this.encryption,
      fieldsEncrypted: this.encryption ? Object.keys(ENCRYPTION_MAPPINGS.USER) : [],
      masterKeyConfigured: !!process.env.ENCRYPTION_MASTER_KEY,
      version: process.env.ENCRYPTION_KEY_VERSION || 1
    };
  }

  /**
   * Test encryption functionality
   * @returns {Object} Test results
   */
  async testEncryption() {
    if (!this.encryption) {
      return { success: false, error: 'Encryption not enabled' };
    }

    try {
      const testData = {
        email: 'test@example.com',
        phone: '+1234567890',
        name: 'Test User'
      };

      // Test encryption
      const encrypted = this.encryption.encryptObject(testData, {
        email: 'EMAIL',
        phone: 'PHONE',
        name: 'NAME'
      });

      // Test decryption
      const decrypted = this.encryption.decryptObject(encrypted, {
        email: 'EMAIL',
        phone: 'PHONE', 
        name: 'NAME'
      });

      // Verify data integrity
      const isValid = JSON.stringify(testData) === JSON.stringify(decrypted);

      return {
        success: isValid,
        encrypted: encrypted,
        decrypted: decrypted,
        dataIntegrityOk: isValid
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Disconnect the Prisma client
   */
  async disconnect() {
    await this.client.$disconnect();
  }
}

// Create enhanced client instance
const enhancedPrisma = new EncryptedPrismaClient(prisma, encryptionService);

export default enhancedPrisma;
export { encryptionService };