export interface IStorageProvider {
  get(path: string): Promise<Buffer | null>;
  put(path: string, data: Buffer | string): Promise<void>;
  list(prefix: string): Promise<string[]>;
  delete(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  stat(path: string): Promise<{ size: number; mtimeMs: number; isDirectory: boolean }>;
}

export interface ILockProvider {
  acquire(key: string, ttl?: number): Promise<boolean>;
  release(key: string): Promise<void>;
}

// Subset of Node's fs required by isomorphic-git
export interface IFS {
  readFile(path: string, options?: any): Promise<Buffer | string>;
  writeFile(path: string, data: any, options?: any): Promise<void>;
  readdir(path: string, options?: any): Promise<string[]>;
  mkdir(path: string, options?: any): Promise<void>;
  rmdir(path: string, options?: any): Promise<void>;
  stat(path: string, options?: any): Promise<any>;
  lstat(path: string, options?: any): Promise<any>;
  unlink(path: string, options?: any): Promise<void>;
  readlink?(path: string, options?: any): Promise<string>;
  symlink?(target: string, path: string, type?: string): Promise<void>;
}
