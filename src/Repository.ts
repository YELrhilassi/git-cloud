import * as git from 'isomorphic-git';
import defaultHttp from 'isomorphic-git/http/node';
import { GitCloudFS } from './vfs/GitCloudFS';
import type { ILockProvider } from './types';
import { Collection, Visibility } from './Collection';
import { Actor } from './Actor';
import type { ActorIdentity } from './Actor';

export { Visibility };

export class Repository {
  private http: any;

  constructor(
    public readonly id: string,
    public readonly fs: GitCloudFS,
    private lock: ILockProvider,
    http?: any
  ) {
    this.http = http || defaultHttp;
  }

  /**
   * Accesses a specific collection (Binder) within the repository.
   */
  collection(collectionId: string, options?: { baseDir?: string, visibility?: Visibility }) {
    return new Collection(this, collectionId, options?.baseDir, options?.visibility);
  }


  /**
   * Accesses an Actor view of the repository.
   */
  actor(identity: ActorIdentity) {
    return new Actor(this, identity);
  }

  /**
   * Writes a file directly to the repository's filesystem.
   */
  async writeFile(filepath: string, content: Buffer | string) {
    await this.fs.writeFile(filepath, content);
  }

  /**
   * Reads a file directly from the repository's filesystem.
   */
  async readFile(filepath: string, options?: { encoding?: string }) {
    return await this.fs.readFile(filepath, options);
  }

  /**
   * Initializes a new repository with metadata.json
   */
  async init(options: { dir?: string; defaultBranch?: string; metadata?: any } = {}) {
    const defaultBranch = options.defaultBranch || 'main';
    const dir = options.dir || '/';

    await git.init({
      fs: this.fs,
      dir,
      defaultBranch,
    });

    // Create initial metadata.json
    const initialMetadata = {
      repoId: this.id,
      createdAt: new Date().toISOString(),
      ...options.metadata
    };

    await this.writeFile('/metadata.json', JSON.stringify(initialMetadata, null, 2));
    await this.add({ filepath: 'metadata.json', dir });
    
    await git.commit({
      fs: this.fs,
      dir,
      message: 'Initial repository structure with metadata',
      author: { name: 'Git-Cloud System', email: 'system@git-cloud.io' }
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
        http: this.http,
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
      http: this.http,
      url: options.url,
      ref: options.ref,
      onAuth: () => ({ username: options.auth?.token || options.auth?.username, password: options.auth?.password }),
    });
  }

  async pull(options: { ref?: string; auth?: { username?: string; password?: string; token?: string } }) {
    await git.pull({
      fs: this.fs,
      http: this.http,
      dir: '/',
      ref: options.ref,
      singleBranch: true,
      onAuth: () => ({ username: options.auth?.token || options.auth?.username, password: options.auth?.password }),
    });
  }

  async listFiles(options: { dir?: string, ref?: string } = {}) {
    try {
        return await git.listFiles({
            fs: this.fs,
            dir: options.dir || '/',
            ref: options.ref
        });
    } catch (e) {
        return [];
    }
  }

  /**
   * Returns the list of files for a specific ref (branch, commit, or tag)
   */
  async getTree(options: { ref?: string; dir?: string } = {}) {
    return await git.listFiles({
      fs: this.fs,
      dir: options.dir || '/',
      ref: options.ref,
    });
  }

  /**
   * Switches to a different branch or commit
   */
  async checkout(options: { ref: string; force?: boolean; dir?: string }) {
    await git.checkout({
      fs: this.fs,
      dir: options.dir || '/',
      ref: options.ref,
      force: options.force,
    });
  }

  /**
   * Creates a new branch
   */
  async createBranch(options: { name: string; checkout?: boolean; dir?: string }) {
    await git.branch({
      fs: this.fs,
      dir: options.dir || '/',
      ref: options.name,
    });

    if (options.checkout) {
      await this.checkout({ ref: options.name, dir: options.dir });
    }
  }

  /**
   * Lists all local branches
   */
  async listBranches(options: { dir?: string } = {}) {
    return await git.listBranches({
      fs: this.fs,
      dir: options.dir || '/',
    });
  }

  /**
   * Returns the name of the current branch
   */
  async getCurrentBranch(options: { dir?: string } = {}) {
    return await git.currentBranch({
      fs: this.fs,
      dir: options.dir || '/',
      fullname: false,
    });
  }

  async log(options: { depth?: number; dir?: string; ref?: string } = {}) {
    return await git.log({
      fs: this.fs,
      dir: options.dir || '/',
      depth: options.depth,
      ref: options.ref,
    });
  }
}
