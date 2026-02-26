import type { IFS, IStorageProvider } from '../types.js';
import { NamespaceManager } from '../NamespaceManager.js';
import path from 'path-browserify';

export class GitCloudFS implements IFS {
  constructor(
    private storage: IStorageProvider,
    private namespace: NamespaceManager
  ) {}

  async readFile(filePath: string, options?: any): Promise<Buffer | string> {
    const resolvedPath = this.namespace.resolve(filePath);
    const data = await this.storage.get(resolvedPath);
    if (data === null) {
      const error: any = new Error(`ENOENT: no such file or directory, open '${filePath}'`);
      error.code = 'ENOENT';
      throw error;
    }
    
    if (options === 'utf8' || (options && options.encoding === 'utf8')) {
      return data.toString('utf8');
    }
    return data;
  }

  async writeFile(filePath: string, data: any, options?: any): Promise<void> {
    const resolvedPath = this.namespace.resolve(filePath);
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
    await this.storage.put(resolvedPath, buffer);
  }

  async readdir(dirPath: string, options?: any): Promise<string[]> {
    const resolvedPath = this.namespace.resolve(dirPath);
    const files = await this.storage.list(resolvedPath);
    
    // storage.list returns paths relative to baseDir. 
    // We need to return names relative to dirPath.
    const repoRoot = this.namespace.getRepoRoot();
    const relativeToRepoRoot = path.relative(repoRoot, resolvedPath);
    
    const result = new Set<string>();
    for (const file of files) {
        // file is relative to storage baseDir
        const fileInRepo = this.namespace.relative(file);
        const relativeToRequested = path.relative(dirPath.replace(/^\//, ''), fileInRepo);
        
        const firstPart = relativeToRequested.split(/[/\\]/)[0];
        if (firstPart && firstPart !== '..') {
            result.add(firstPart);
        }
    }
    
    return Array.from(result);
  }

  async mkdir(dirPath: string, options?: any): Promise<void> {
    // Most cloud storages are key-value and don't need explicit directory creation.
    // We can just ensure the path exists by putting a placeholder if needed, 
    // but usually, it's enough to just let writeFile handle it.
    // For LocalStorageProvider, mkdir is already handled in put().
  }

  async rmdir(dirPath: string, options?: any): Promise<void> {
    // Cloud storage: would need to delete all objects with this prefix.
    // For now, we'll implement a simple version or leave as-is if storage handles it.
  }

  async stat(filePath: string, options?: any): Promise<any> {
    const resolvedPath = this.namespace.resolve(filePath);
    try {
      const s = await this.storage.stat(resolvedPath);
      const mtime = new Date(s.mtimeMs);
      return {
        size: s.size,
        mtimeMs: s.mtimeMs,
        mtime: mtime,
        ctime: mtime,
        atime: mtime,
        isDirectory: () => s.isDirectory,
        isFile: () => !s.isDirectory,
        isSymbolicLink: () => false,
        dev: 1,
        ino: 1,
        mode: s.isDirectory ? 0o40755 : 0o100644,
        nlink: 1,
        uid: 1,
        gid: 1,
        rdev: 0,
        blksize: 4096,
        blocks: Math.ceil(s.size / 4096),
      };
    } catch (e: any) {
      // If file doesn't exist, it might be a directory in cloud storage (no object, but prefix exists)
      const list = await this.storage.list(resolvedPath);
      if (list.length > 0) {
        const now = new Date();
        return {
          size: 0,
          mtimeMs: now.getTime(),
          mtime: now,
          ctime: now,
          atime: now,
          isDirectory: () => true,
          isFile: () => false,
          isSymbolicLink: () => false,
          dev: 1,
          ino: 1,
          mode: 0o40755,
          nlink: 1,
          uid: 1,
          gid: 1,
          rdev: 0,
          blksize: 4096,
          blocks: 0,
        };
      }
      const error: any = new Error(`ENOENT: no such file or directory, stat '${filePath}'`);
      error.code = 'ENOENT';
      throw error;
    }
  }

  async lstat(filePath: string, options?: any): Promise<any> {
    return this.stat(filePath, options);
  }

  async unlink(filePath: string, options?: any): Promise<void> {
    const resolvedPath = this.namespace.resolve(filePath);
    await this.storage.delete(resolvedPath);
  }

  async readlink(filePath: string): Promise<string> {
    throw new Error('Method not implemented: readlink');
  }

  async symlink(target: string, filePath: string): Promise<void> {
    throw new Error('Method not implemented: symlink');
  }
}
