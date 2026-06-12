import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-cbc';
  private readonly key: Buffer;

  constructor() {
    try {
      const encryptionSecret = process.env.ENCRYPTION_KEY;
      if (!encryptionSecret) {
        throw new Error('ENCRYPTION_KEY is not defined in environment variables.');
      }
      // Hash key to ensure it is exactly 32 bytes (256 bits) for AES-256
      this.key = crypto.createHash('sha256').update(encryptionSecret).digest();
    } catch (error) {
      throw new InternalServerErrorException('EncryptionService initialization failed: ' + error.message);
    }
  }

  encrypt(buffer: Buffer): { encryptedData: Buffer; iv: string } {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
      const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
      return {
        encryptedData: encrypted,
        iv: iv.toString('hex'),
      };
    } catch (error) {
      throw new InternalServerErrorException('Encryption failed: ' + error.message);
    }
  }

  decrypt(encryptedBuffer: Buffer, ivHex: string): Buffer {
    try {
      const iv = Buffer.from(ivHex, 'hex');
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      const decrypted = Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
      return decrypted;
    } catch (error) {
      throw new InternalServerErrorException('Decryption failed: ' + error.message);
    }
  }
}
