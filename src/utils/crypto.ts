import CryptoJS from 'crypto-js'
import NodeRSA from 'node-rsa'

export interface KeyPair {
  publicKey: string
  privateKey: string
}

export interface EncryptedData {
  ciphertext: string
  encryptedKeys: Record<string, string>
  iv: string
  authorizedUsers: string[]
  metadata?: {
    timestamp: string
    encryptedBy?: string
    algorithm: string
  }
}

export interface DecryptionResult {
  success: boolean
  data?: string
  error?: string
  userId?: string
}

/**
 * Generate a new RSA key pair
 */
export const generateKeyPair = (): KeyPair => {
  try {
    const key = new NodeRSA({ b: 2048 })
    return {
      publicKey: key.exportKey('public'),
      privateKey: key.exportKey('private')
    }
  } catch (error) {
    throw new Error(`Failed to generate key pair: ${error}`)
  }
}

/**
 * Generate a random AES key
 */
export const generateAESKey = (): string => {
  return CryptoJS.lib.WordArray.random(256/8).toString()
}

/**
 * Generate a random initialization vector
 */
export const generateIV = (): string => {
  return CryptoJS.lib.WordArray.random(128/8).toString()
}

/**
 * Encrypt data with AES
 */
export const encryptWithAES = (data: string, key: string, iv: string): string => {
  try {
    const encrypted = CryptoJS.AES.encrypt(data, key, {
      iv: CryptoJS.enc.Hex.parse(iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    })
    return encrypted.toString()
  } catch (error) {
    throw new Error(`AES encryption failed: ${error}`)
  }
}

/**
 * Decrypt data with AES
 */
export const decryptWithAES = (ciphertext: string, key: string, iv: string): string => {
  try {
    const decrypted = CryptoJS.AES.decrypt(ciphertext, key, {
      iv: CryptoJS.enc.Hex.parse(iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    })
    
    const decryptedText = decrypted.toString(CryptoJS.enc.Utf8)
    if (!decryptedText) {
      throw new Error('Failed to decrypt - invalid key or corrupted data')
    }
    
    return decryptedText
  } catch (error) {
    throw new Error(`AES decryption failed: ${error}`)
  }
}

/**
 * Encrypt data with RSA public key
 */
export const encryptWithRSA = (data: string, publicKey: string): string => {
  try {
    const key = new NodeRSA()
    key.importKey(publicKey, 'public')
    return key.encrypt(data, 'base64')
  } catch (error) {
    throw new Error(`RSA encryption failed: ${error}`)
  }
}

/**
 * Decrypt data with RSA private key
 */
export const decryptWithRSA = (ciphertext: string, privateKey: string): string => {
  try {
    const key = new NodeRSA()
    key.importKey(privateKey, 'private')
    return key.decrypt(ciphertext, 'utf8')
  } catch (error) {
    throw new Error(`RSA decryption failed: ${error}`)
  }
}

/**
 * Get key fingerprint for identification
 */
export const getKeyFingerprint = (publicKey: string): string => {
  const hash = CryptoJS.SHA256(publicKey).toString()
  return hash.slice(0, 16)
}