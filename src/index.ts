import type { IStorageProvider, ILockProvider } from './types';
import { NamespaceManager } from './NamespaceManager';
import { GitCloudFS } from './vfs/GitCloudFS';
import { StorageLockProvider } from './providers/StorageLockProvider';
import { CompressedStorageProvider } from './providers/CompressedStorageProvider';
import { Repository } from './Repository';

export interface GitCloudConfig {
  storage: IStorageProvider;
  lock?: ILockProvider;
  baseDir?: string;
  http?: any;
  compression?: boolean;
}

export class GitCloud {
  private storage: IStorageProvider;
  private lock: ILockProvider;
  private baseDir: string;
  private http: any;

  constructor(config: GitCloudConfig) {
    this.storage = config.compression 
      ? new CompressedStorageProvider(config.storage) 
      : config.storage;
    this.baseDir = config.baseDir || 'git-cloud-data';
    this.lock = config.lock || new StorageLockProvider(this.storage, `${this.baseDir}/.locks`);
    this.http = config.http;
  }

  /**
   * Accesses a specific repository within the storage.
   * If it doesn't exist, it can be initialized using the returned Repository object.
   */
  async repository(repoId: string): Promise<Repository> {
    const namespace = new NamespaceManager(this.baseDir, repoId);
    const fs = new GitCloudFS(this.storage, namespace);
    
    return new Repository(repoId, fs, this.lock, this.http);
  }
}

// Export everything
export * from './types';
export * from './providers/LocalStorageProvider';
export * from './providers/S3StorageProvider';
export * from './providers/SupabaseStorageProvider';
export * from './providers/StorageLockProvider';
export * from './providers/CachedStorageProvider';
export * from './providers/CompressedStorageProvider';
export * from './Repository';
export * from './Collection';
