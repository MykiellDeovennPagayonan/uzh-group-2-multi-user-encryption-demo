// services/multiUserEncryption.ts
import {
  generateAESKey,
  generateIV,
  encryptWithAES,
  decryptWithAES,
  encryptWithRSA,
  decryptWithRSA,
  EncryptedData,
  DecryptionResult
} from '../utils/crypto'

export class MultiUserEncryptionService {
  /**
   * Encrypt data for multiple users
   */
  static async encryptForMultipleUsers(
    data: string,
    userPublicKeys: Record<string, string>, // userId -> publicKey
    encryptedBy?: string
  ): Promise<EncryptedData> {
    try {
      // Generate AES key and IV
      const aesKey = generateAESKey()
      const iv = generateIV()
      
      // Encrypt data with AES
      const ciphertext = encryptWithAES(data, aesKey, iv)
      
      // Encrypt AES key with each user's public key
      const encryptedKeys: Record<string, string> = {}
      const authorizedUsers: string[] = []
      
      for (const [userId, publicKey] of Object.entries(userPublicKeys)) {
        const encryptedAesKey = encryptWithRSA(aesKey, publicKey)
        encryptedKeys[userId] = encryptedAesKey
        authorizedUsers.push(userId)
      }
      
      return {
        ciphertext,
        encryptedKeys,
        iv,
        authorizedUsers,
        metadata: {
          timestamp: new Date().toISOString(),
          encryptedBy,
          algorithm: 'AES-256-CBC + RSA-2048'
        }
      }
    } catch (error) {
      throw new Error(`Multi-user encryption failed: ${error}`)
    }
  }

  /**
   * Decrypt data for a specific user
   */
  static async decryptForUser(
    encryptedData: EncryptedData,
    userId: string,
    privateKey: string
  ): Promise<DecryptionResult> {
    try {
      // Check if user has access
      const encryptedAesKey = encryptedData.encryptedKeys[userId]
      if (!encryptedAesKey) {
        return {
          success: false,
          error: 'Access denied: User not authorized to decrypt this data',
          userId
        }
      }

      // Decrypt AES key with user's private key
      const aesKey = decryptWithRSA(encryptedAesKey, privateKey)
      
      // Decrypt actual data
      const decryptedData = decryptWithAES(
        encryptedData.ciphertext,
        aesKey,
        encryptedData.iv
      )
      
      return {
        success: true,
        data: decryptedData,
        userId
      }
    } catch (error) {
      return {
        success: false,
        error: `Decryption failed: ${error}`,
        userId
      }
    }
  }

  /**
   * Add new user access to existing encrypted data
   */
  static async addUserAccess(
    encryptedData: EncryptedData,
    newUserId: string,
    newUserPublicKey: string,
    decryptorUserId: string,
    decryptorPrivateKey: string
  ): Promise<EncryptedData> {
    try {
      // First decrypt to get the AES key
      const decryptResult = await this.decryptForUser(
        encryptedData,
        decryptorUserId,
        decryptorPrivateKey
      )
      
      if (!decryptResult.success || !decryptResult.data) {
        throw new Error('Cannot add user access: Unable to decrypt data')
      }

      // Get the AES key by decrypting with current user's key
      const encryptedAesKey = encryptedData.encryptedKeys[decryptorUserId]
      const aesKey = decryptWithRSA(encryptedAesKey, decryptorPrivateKey)
      
      // Encrypt AES key with new user's public key
      const newEncryptedAesKey = encryptWithRSA(aesKey, newUserPublicKey)
      
      // Return updated encrypted data
      return {
        ...encryptedData,
        encryptedKeys: {
          ...encryptedData.encryptedKeys,
          [newUserId]: newEncryptedAesKey
        },
        authorizedUsers: [...encryptedData.authorizedUsers, newUserId]
      }
    } catch (error) {
      throw new Error(`Failed to add user access: ${error}`)
    }
  }

  /**
   * Remove user access from encrypted data
   */
  static removeUserAccess(
    encryptedData: EncryptedData,
    userIdToRemove: string
  ): EncryptedData {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { [userIdToRemove]: removed, ...remainingKeys } = encryptedData.encryptedKeys
    
    return {
      ...encryptedData,
      encryptedKeys: remainingKeys,
      authorizedUsers: encryptedData.authorizedUsers.filter(id => id !== userIdToRemove)
    }
  }

  /**
   * Check if user has access to encrypted data
   */
  static hasAccess(encryptedData: EncryptedData, userId: string): boolean {
    return encryptedData.authorizedUsers.includes(userId) && 
           encryptedData.encryptedKeys[userId] !== undefined
  }

  /**
   * Get metadata about encrypted data
   */
  static getEncryptionInfo(encryptedData: EncryptedData) {
    return {
      authorizedUserCount: encryptedData.authorizedUsers.length,
      authorizedUsers: encryptedData.authorizedUsers,
      encryptedAt: encryptedData.metadata?.timestamp,
      encryptedBy: encryptedData.metadata?.encryptedBy,
      algorithm: encryptedData.metadata?.algorithm
    }
  }
}