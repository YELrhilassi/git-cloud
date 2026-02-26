import type { IStorageProvider, ILockProvider } from './types.js';
import { NamespaceManager } from './NamespaceManager.js';
import { GitCloudFS } from './vfs/GitCloudFS.js';
import { StorageLockProvider } from './providers/StorageLockProvider.js';
import { Repository } from './Repository.js';

export interface GitCloudConfig {
  storage: IStorageProvider;
  lock?: ILockProvider;
  baseDir?: string;
}

export class GitCloud {
  private storage: IStorageProvider;
  private lock: ILockProvider;
  private baseDir: string;

  constructor(config: GitCloudConfig) {
    this.storage = config.storage;
    this.baseDir = config.baseDir || 'git-cloud-data';
    this.lock = config.lock || new StorageLockProvider(this.storage, `${this.baseDir}/.locks`);
  }

  /**
   * Accesses a specific repository within the storage.
   * If it doesn't exist, it can be initialized using the returned Repository object.
   */
  async repository(repoId: string): Promise<Repository> {
    const namespace = new NamespaceManager(this.baseDir, repoId);
    const fs = new GitCloudFS(this.storage, namespace);
    
    return new Repository(repoId, fs, this.lock);
  }
}

// Export everything
export * from './types.js';
export * from './providers/LocalStorageProvider.js';
export * from './providers/S3StorageProvider.js';
export * from './providers/SupabaseStorageProvider.js';
export * from './providers/StorageLockProvider.js';
export * from './providers/CachedStorageProvider.js';
export * from './Repository.js';
