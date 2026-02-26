import type { ILockProvider, IStorageProvider } from '../types.js';

export class StorageLockProvider implements ILockProvider {
  constructor(
    private storage: IStorageProvider,
    private lockDir: string = '.locks'
  ) {}

  private getLockPath(key: string): string {
    return `${this.lockDir}/${key}.lock`;
  }

  async acquire(key: string, ttl: number = 30000): Promise<boolean> {
    const lockPath = this.getLockPath(key);
    
    // Check if lock exists and if it's expired
    try {
      const lockData = await this.storage.get(lockPath);
      if (lockData) {
        const { expiresAt } = JSON.parse(lockData.toString());
        if (Date.now() < expiresAt) {
          return false; // Lock is still valid
        }
      }
    } catch (e) {
      // If error or no lock, proceed to try acquiring it
    }

    // Try to acquire lock by writing it
    const expiresAt = Date.now() + ttl;
    await this.storage.put(lockPath, JSON.stringify({ expiresAt }));
    return true;
  }

  async release(key: string): Promise<void> {
    const lockPath = this.getLockPath(key);
    await this.storage.delete(lockPath);
  }
}
