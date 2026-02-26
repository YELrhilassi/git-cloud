import * as fs from 'fs/promises';
import * as path from 'path';
import type { IStorageProvider } from '../types.js';

export class CachedStorageProvider implements IStorageProvider {
  constructor(
    private remote: IStorageProvider,
    private cacheDir: string
  ) {}

  private getCachePath(filePath: string): string {
    return path.join(this.cacheDir, filePath);
  }

  async get(filePath: string): Promise<Buffer | null> {
    const cachePath = this.getCachePath(filePath);
    
    // Try cache first
    try {
      return await fs.readFile(cachePath);
    } catch (e) {
      // Not in cache, fetch from remote
      const data = await this.remote.get(filePath);
      if (data) {
        // Background write to cache
        await fs.mkdir(path.dirname(cachePath), { recursive: true });
        await fs.writeFile(cachePath, data);
      }
      return data;
    }
  }

  async put(filePath: string, data: Buffer | string): Promise<void> {
    const cachePath = this.getCachePath(filePath);
    
    // Write to both
    await Promise.all([
      this.remote.put(filePath, data),
      (async () => {
        await fs.mkdir(path.dirname(cachePath), { recursive: true });
        await fs.writeFile(cachePath, data);
      })()
    ]);
  }

  async list(prefix: string): Promise<string[]> {
    // List operations always go to remote to ensure freshness
    return this.remote.list(prefix);
  }

  async delete(filePath: string): Promise<void> {
    const cachePath = this.getCachePath(filePath);
    await Promise.all([
      this.remote.delete(filePath),
      fs.unlink(cachePath).catch(() => {})
    ]);
  }

  async exists(filePath: string): Promise<boolean> {
    // Check cache first for existence
    const cachePath = this.getCachePath(filePath);
    try {
      await fs.access(cachePath);
      return true;
    } catch {
      return this.remote.exists(filePath);
    }
  }

  async stat(filePath: string): Promise<{ size: number; mtimeMs: number; isDirectory: boolean }> {
    // Stat can be tricky if cache is stale, so we prefer remote for accuracy
    // unless we implement a more complex TTL/invalidation logic.
    return this.remote.stat(filePath);
  }
}
