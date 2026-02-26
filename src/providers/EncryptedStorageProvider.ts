import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import type { IStorageProvider } from '../types';

export class EncryptedStorageProvider implements IStorageProvider {
  private algorithm = 'aes-256-gcm';
  private ivLength = 12;
  private tagLength = 16;

  constructor(
    private remote: IStorageProvider,
    private secretKey: Buffer // Must be 32 bytes
  ) {
    if (secretKey.length !== 32) {
      throw new Error('Secret key must be exactly 32 bytes (256 bits)');
    }
  }

  async get(filePath: string): Promise<Buffer | null> {
    const rawData = await this.remote.get(filePath);
    if (!rawData) return null;

    try {
      // Extract IV, Tag, and Ciphertext
      const iv = rawData.subarray(0, this.ivLength);
      const tag = rawData.subarray(this.ivLength, this.ivLength + this.tagLength);
      const ciphertext = rawData.subarray(this.ivLength + this.tagLength);

      const decipher = createDecipheriv(this.algorithm, this.secretKey, iv) as any;
      decipher.setAuthTag(tag);

      return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    } catch (e) {
      // If decryption fails, it might be unencrypted data or wrong key
      throw new Error(`Decryption failed for ${filePath}: ${e instanceof Error ? e.message : 'Invalid key or corrupted data'}`);
    }
  }

  async put(filePath: string, data: Buffer | string): Promise<void> {
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const iv = randomBytes(this.ivLength);
    const cipher = createCipheriv(this.algorithm, this.secretKey, iv) as any;

    const ciphertext = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const tag = cipher.getAuthTag();

    // Store as [IV][TAG][CIPHERTEXT]
    const finalBuffer = Buffer.concat([iv, tag, ciphertext]);
    await this.remote.put(filePath, finalBuffer);
  }

  async list(prefix: string): Promise<string[]> {
    return this.remote.list(prefix);
  }

  async delete(filePath: string): Promise<void> {
    await this.remote.delete(filePath);
  }

  async exists(filePath: string): Promise<boolean> {
    return this.remote.exists(filePath);
  }

  async stat(filePath: string): Promise<{ size: number; mtimeMs: number; isDirectory: boolean }> {
    const s = await this.remote.stat(filePath);
    // Note: encrypted size is slightly larger than original
    return s;
  }
}
