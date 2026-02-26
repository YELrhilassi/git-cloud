import * as fs from 'fs/promises';
import * as path from 'path';
import type { IStorageProvider } from '../types';

export class LocalStorageProvider implements IStorageProvider {
  constructor(private baseDir: string) {}

  private getFullPath(filePath: string): string {
    return path.join(this.baseDir, filePath);
  }

  async get(filePath: string): Promise<Buffer | null> {
    try {
      return await fs.readFile(this.getFullPath(filePath));
    } catch (error: any) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  }

  async put(filePath: string, data: Buffer | string): Promise<void> {
    const fullPath = this.getFullPath(filePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, data);
  }

  async list(prefix: string): Promise<string[]> {
    const fullPath = this.getFullPath(prefix);
    try {
      const entries = await fs.readdir(fullPath, { withFileTypes: true, recursive: true });
      return entries
        .filter(entry => entry.isFile())
        .map(entry => {
           const parentPath = (entry as any).path || (entry as any).parentPath || fullPath;
           const relative = path.relative(this.baseDir, path.join(parentPath, entry.name));
           return relative;
        });
    } catch (error: any) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
  }

  async delete(filePath: string): Promise<void> {
    try {
      await fs.unlink(this.getFullPath(filePath));
    } catch (error: any) {
      if (error.code !== 'ENOENT') throw error;
    }
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(this.getFullPath(filePath));
      return true;
    } catch {
      return false;
    }
  }

  async stat(filePath: string): Promise<{ size: number; mtimeMs: number; isDirectory: boolean }> {
    const stats = await fs.stat(this.getFullPath(filePath));
    return {
      size: stats.size,
      mtimeMs: stats.mtimeMs,
      isDirectory: stats.isDirectory(),
    };
  }
}
