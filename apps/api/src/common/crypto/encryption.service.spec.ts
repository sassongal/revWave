import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EncryptionService } from './encryption.service';
import * as crypto from 'crypto';

describe('EncryptionService', () => {
  let service: EncryptionService;
  let configService: ConfigService;

  // Generate a valid 32-byte key for testing
  const testKey = crypto.randomBytes(32).toString('base64');

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncryptionService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'ENCRYPTION_KEY') {
                return testKey;
              }
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<EncryptionService>(EncryptionService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('encrypt/decrypt roundtrip', () => {
    it('should encrypt and decrypt a simple string', () => {
      const plaintext = 'Hello, World!';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
      expect(encrypted).not.toBe(plaintext);
    });

    it('should encrypt and decrypt a long string', () => {
      const plaintext = 'a'.repeat(1000);
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt and decrypt special characters', () => {
      const plaintext = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt and decrypt unicode characters', () => {
      const plaintext = 'Hello 世界 🌍 émojis';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt and decrypt JSON strings', () => {
      const plaintext = JSON.stringify({
        accessToken: 'ya29.a0AfH6SMB...',
        refreshToken: '1//0gK9...',
        expiresAt: '2024-01-01T00:00:00Z',
      });
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
      expect(JSON.parse(decrypted)).toEqual(JSON.parse(plaintext));
    });

    it('should produce different ciphertext for same plaintext (due to random IV)', () => {
      const plaintext = 'same text';
      const encrypted1 = service.encrypt(plaintext);
      const encrypted2 = service.encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);

      const decrypted1 = service.decrypt(encrypted1);
      const decrypted2 = service.decrypt(encrypted2);

      expect(decrypted1).toBe(plaintext);
      expect(decrypted2).toBe(plaintext);
    });

    it('should encrypt OAuth tokens correctly', () => {
      const accessToken = 'ya29.a0AfH6SMBxYz1234567890abcdefghijklmnopqrstuvwxyz';
      const refreshToken = '1//0gK9aBcDeFgHiJkLmNoPqRsTuVwXyZ';

      const encryptedAccess = service.encrypt(accessToken);
      const encryptedRefresh = service.encrypt(refreshToken);

      const decryptedAccess = service.decrypt(encryptedAccess);
      const decryptedRefresh = service.decrypt(encryptedRefresh);

      expect(decryptedAccess).toBe(accessToken);
      expect(decryptedRefresh).toBe(refreshToken);
    });
  });

  describe('testRoundtrip', () => {
    it('should return true for successful roundtrip', () => {
      const result = service.testRoundtrip();
      expect(result).toBe(true);
    });

    it('should return true with custom test string', () => {
      const result = service.testRoundtrip('my custom test');
      expect(result).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should throw error when encrypting empty string', () => {
      expect(() => service.encrypt('')).toThrow('Cannot encrypt empty string');
    });

    it('should throw error when decrypting empty string', () => {
      expect(() => service.decrypt('')).toThrow('Cannot decrypt empty string');
    });

    it('should throw error when decrypting invalid format', () => {
      expect(() => service.decrypt('invalid')).toThrow('Invalid ciphertext format');
    });

    it('should throw error when decrypting with wrong key', () => {
      const plaintext = 'secret message';
      const encrypted = service.encrypt(plaintext);

      // Create a new service with a different key
      const wrongKeyService = new EncryptionService({
        get: () => crypto.randomBytes(32).toString('base64'),
      } as any);

      expect(() => wrongKeyService.decrypt(encrypted)).toThrow('Decryption failed');
    });
  });

  describe('encryption key parsing', () => {
    it('should accept base64-encoded key', () => {
      const base64Key = crypto.randomBytes(32).toString('base64');
      const testService = new EncryptionService({
        get: () => base64Key,
      } as any);

      expect(testService).toBeDefined();
      expect(testService.testRoundtrip()).toBe(true);
    });

    it('should accept hex-encoded key', () => {
      const hexKey = crypto.randomBytes(32).toString('hex');
      const testService = new EncryptionService({
        get: () => hexKey,
      } as any);

      expect(testService).toBeDefined();
      expect(testService.testRoundtrip()).toBe(true);
    });

    it('should throw error when key is missing', () => {
      expect(() => {
        new EncryptionService({
          get: () => undefined,
        } as any);
      }).toThrow('ENCRYPTION_KEY is not set in environment');
    });

    it('should throw error when key is wrong length', () => {
      expect(() => {
        new EncryptionService({
          get: () => crypto.randomBytes(16).toString('base64'), // Only 16 bytes
        } as any);
      }).toThrow('ENCRYPTION_KEY must be 32 bytes when decoded');
    });
  });

  describe('encrypted format', () => {
    it('should produce ciphertext in format: iv:authTag:ciphertext', () => {
      const plaintext = 'test';
      const encrypted = service.encrypt(plaintext);

      const parts = encrypted.split(':');
      expect(parts).toHaveLength(3);

      // Check IV is 12 bytes (16 chars base64)
      const iv = Buffer.from(parts[0], 'base64');
      expect(iv.length).toBe(12);

      // Check auth tag is 16 bytes (~22 chars base64)
      const authTag = Buffer.from(parts[1], 'base64');
      expect(authTag.length).toBe(16);

      // Check ciphertext exists
      expect(parts[2].length).toBeGreaterThan(0);
    });
  });
});
