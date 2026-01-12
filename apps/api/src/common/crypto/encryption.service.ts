import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * EncryptionService provides AES-256-GCM encryption/decryption
 * for sensitive data like OAuth tokens.
 *
 * Uses ENCRYPTION_KEY from environment (32 bytes, base64 or hex encoded)
 */
@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor(private readonly configService: ConfigService) {
    this.key = this.parseEncryptionKey();
  }

  /**
   * Parse ENCRYPTION_KEY from environment
   * Supports base64 and hex encoding
   * Must be 32 bytes when decoded
   */
  private parseEncryptionKey(): Buffer {
    const keyString = this.configService.get<string>('ENCRYPTION_KEY');

    if (!keyString) {
      throw new Error(
        'ENCRYPTION_KEY is not set in environment. Generate one with: openssl rand -base64 32'
      );
    }

    let key: Buffer;

    // Try base64 first
    try {
      key = Buffer.from(keyString, 'base64');
      if (key.length === 32) {
        this.logger.log('Encryption key loaded (base64)');
        return key;
      }
    } catch (error) {
      // Not valid base64, try hex
    }

    // Try hex
    try {
      key = Buffer.from(keyString, 'hex');
      if (key.length === 32) {
        this.logger.log('Encryption key loaded (hex)');
        return key;
      }
    } catch (error) {
      // Not valid hex
    }

    // Try raw string (must be exactly 32 bytes)
    key = Buffer.from(keyString, 'utf-8');
    if (key.length === 32) {
      this.logger.warn(
        'Using raw string as encryption key. Consider using base64 or hex encoding for better security.'
      );
      return key;
    }

    throw new Error(
      `ENCRYPTION_KEY must be 32 bytes when decoded. Current length: ${key.length} bytes. ` +
      'Generate a valid key with: openssl rand -base64 32'
    );
  }

  /**
   * Encrypt plaintext using AES-256-GCM
   * Returns base64-encoded string: iv:authTag:ciphertext
   */
  encrypt(plaintext: string): string {
    if (!plaintext) {
      throw new Error('Cannot encrypt empty string');
    }

    // Generate random IV (12 bytes for GCM)
    const iv = crypto.randomBytes(12);

    // Create cipher
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

    // Encrypt
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    // Get authentication tag (16 bytes for GCM)
    const authTag = cipher.getAuthTag();

    // Combine iv:authTag:ciphertext (all base64 encoded)
    const result = `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;

    return result;
  }

  /**
   * Decrypt ciphertext using AES-256-GCM
   * Expects base64-encoded string: iv:authTag:ciphertext
   */
  decrypt(ciphertext: string): string {
    if (!ciphertext) {
      throw new Error('Cannot decrypt empty string');
    }

    try {
      // Split into components
      const parts = ciphertext.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid ciphertext format. Expected: iv:authTag:ciphertext');
      }

      const [ivBase64, authTagBase64, encryptedBase64] = parts;

      // Decode from base64
      const iv = Buffer.from(ivBase64, 'base64');
      const authTag = Buffer.from(authTagBase64, 'base64');
      const encrypted = Buffer.from(encryptedBase64, 'base64');

      // Validate IV length (should be 12 bytes for GCM)
      if (iv.length !== 12) {
        throw new Error(`Invalid IV length: ${iv.length} bytes (expected 12)`);
      }

      // Validate auth tag length (should be 16 bytes for GCM)
      if (authTag.length !== 16) {
        throw new Error(`Invalid auth tag length: ${authTag.length} bytes (expected 16)`);
      }

      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(authTag);

      // Decrypt
      let decrypted = decipher.update(encrypted.toString('base64'), 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      this.logger.error('Decryption failed', error);
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Test if encryption/decryption works correctly
   */
  testRoundtrip(testString: string = 'test-encryption-roundtrip'): boolean {
    try {
      const encrypted = this.encrypt(testString);
      const decrypted = this.decrypt(encrypted);
      return decrypted === testString;
    } catch (error) {
      this.logger.error('Encryption roundtrip test failed', error);
      return false;
    }
  }
}
