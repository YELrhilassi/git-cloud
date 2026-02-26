import * as git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';
import { GitCloudFS } from './vfs/GitCloudFS.js';
import type { ILockProvider } from './types.js';

export class Repository {
  constructor(
    public readonly id: string,
    private fs: GitCloudFS,
    private lock: ILockProvider
  ) {}

  /**
   * Initializes a new repository
   */
  async init(options: { dir?: string; defaultBranch?: string } = {}) {
    await git.init({
      fs: this.fs,
      dir: options.dir || '/',
      defaultBranch: options.defaultBranch || 'main',
    });
  }

  async add(options: { filepath: string; dir?: string }) {
    await git.add({
      fs: this.fs,
      dir: options.dir || '/',
      filepath: options.filepath,
    });
  }

  /**
   * Initializes or clones a repository
   */
  async clone(options: { url: string; dir?: string; singleBranch?: boolean; depth?: number; onProgress?: (p: any) => void; auth?: { username?: string; password?: string; token?: string } }) {
    const dir = options.dir || '/';
    
    // Acquire lock for clone operation
    const locked = await this.lock.acquire(`clone-${this.id}`);
    if (!locked) throw new Error('Repository is currently being cloned or modified by another instance');

    try {
      await git.clone({
        fs: this.fs,
        http,
        dir,
        url: options.url,
        singleBranch: options.singleBranch,
        depth: options.depth,
        onProgress: options.onProgress,
        onAuth: () => ({ username: options.auth?.token || options.auth?.username, password: options.auth?.password }),
      });
    } finally {
      await this.lock.release(`clone-${this.id}`);
    }
  }

  async commit(options: { message: string; author: { name: string; email: string }; dir?: string }) {
    const dir = options.dir || '/';
    await git.commit({
      fs: this.fs,
      dir,
      message: options.message,
      author: options.author,
    });
  }

  async push(options: { url?: string; ref?: string; auth?: { username?: string; password?: string; token?: string } }) {
    await git.push({
      fs: this.fs,
      http,
      url: options.url,
      ref: options.ref,
      onAuth: () => ({ username: options.auth?.token || options.auth?.username, password: options.auth?.password }),
    });
  }

  async pull(options: { ref?: string; auth?: { username?: string; password?: string; token?: string } }) {
    await git.pull({
      fs: this.fs,
      http,
      ref: options.ref,
      singleBranch: true,
      onAuth: () => ({ username: options.auth?.token || options.auth?.username, password: options.auth?.password }),
    });
  }

  async listFiles(dir: string = '/') {
    return await git.listFiles({
      fs: this.fs,
      dir,
    });
  }

  async log(options: { depth?: number; dir?: string } = {}) {
    return await git.log({
      fs: this.fs,
      dir: options.dir || '/',
      depth: options.depth,
    });
  }
}
