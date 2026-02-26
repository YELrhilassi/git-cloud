import pako from 'pako';
import type { IStorageProvider } from '../types';

export class CompressedStorageProvider implements IStorageProvider {
  private compressibleExtensions = new Set([
    '.txt', '.json', '.md', '.html', '.xml', '.csv', '.js', '.ts', '.css', '.yaml', '.yml'
  ]);

  constructor(private remote: IStorageProvider) {}

  private isCompressible(filePath: string): boolean {
    const ext = filePath.toLowerCase().substring(filePath.lastIndexOf('.'));
    // If it's a git object (usually no extension and in .git/objects), it's highly compressible
    if (filePath.includes('.git/objects/')) return true;
    return this.compressibleExtensions.has(ext);
  }

  async get(filePath: string): Promise<Buffer | null> {
    const data = await this.remote.get(filePath);
    if (!data) return null;

    // Check for our custom "compression header" (e.g., first byte 0x78 for zlib or our own marker)
    // For simplicity, we'll try to inflate and if it fails, return as-is
    try {
      if (this.isCompressible(filePath)) {
        return Buffer.from(pako.inflate(data));
      }
    } catch (e) {
      // Fallback if not compressed or inflate fails
    }
    return data;
  }

  async put(filePath: string, data: Buffer | string): Promise<void> {
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
    
    if (this.isCompressible(filePath)) {
      const compressed = pako.deflate(buffer);
      await this.remote.put(filePath, Buffer.from(compressed));
    } else {
      await this.remote.put(filePath, buffer);
    }
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
    // Note: Remote size will be the compressed size. 
    // For accurate file sizing, we'd need to decompress or store original size in metadata.
    // However, for Git purposes, compressed size is usually acceptable for storage tracking.
    return this.remote.stat(filePath);
  }
}
