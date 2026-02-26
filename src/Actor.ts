import * as git from 'isomorphic-git';
import type { Repository } from './Repository';

export interface ActorIdentity {
  name: string;
  email: string;
}

export class Actor {
  public readonly branchName: string;

  constructor(
    private repo: Repository,
    public readonly identity: ActorIdentity
  ) {
    this.branchName = `actors/${identity.name.toLowerCase().replace(/\s+/g, '-')}`;
  }

  async setup() {
    const branches = await this.repo.listBranches();
    
    if (!branches.includes(this.branchName)) {
      await this.repo.createBranch({ name: this.branchName });
    }
    await this.repo.checkout({ ref: this.branchName });
  }

  async update(options: { excludePaths?: string[] } = {}) {
    if (!options.excludePaths || options.excludePaths.length === 0) {
      await git.merge({
        fs: this.repo.fs,
        dir: '/',
        ours: this.branchName,
        theirs: 'main',
        author: this.identity,
        fastForwardOnly: false
      });
    } else {
      const headBeforeMerge = await git.resolveRef({ fs: this.repo.fs, dir: '/', ref: this.branchName });
      
      await git.merge({
        fs: this.repo.fs,
        dir: '/',
        ours: this.branchName,
        theirs: 'main',
        author: this.identity,
        fastForwardOnly: false
      });

      // Crucial: After merge, we must CHECKOUT the branch to update the working tree
      // before we can reliably remove things from it.
      await this.repo.checkout({ ref: this.branchName });

      for (const path of options.excludePaths) {
         try {
            const content = await git.readBlob({
                fs: this.repo.fs,
                dir: '/',
                oid: headBeforeMerge,
                filepath: path
            }).catch(() => null);

            if (content) {
                await this.repo.writeFile(`/${path}`, Buffer.from(content.blob));
                await this.repo.add({ filepath: path });
            } else {
                // Not there before merge -> Delete it
                await this.repo.fs.unlink(`/${path}`).catch(() => {});
                await git.remove({ fs: this.repo.fs, dir: '/', filepath: path });
            }
         } catch (e) {
            await this.repo.fs.unlink(`/${path}`).catch(() => {});
            await git.remove({ fs: this.repo.fs, dir: '/', filepath: path });
         }
      }
      
      await this.repo.commit({
        message: `Merged main with exclusions`,
        author: this.identity
      });
    }
    
    await this.repo.checkout({ ref: this.branchName });
  }

  async previewUpdate() {
    const mainLog = await this.repo.log({ ref: 'main' });
    const actorLog = await this.repo.log({ ref: this.branchName });
    const actorShas = new Set(actorLog.map(l => l.oid));
    return mainLog.filter(l => !actorShas.has(l.oid));
  }

  async previewPublish() {
    const mainLog = await this.repo.log({ ref: 'main' });
    const actorLog = await this.repo.log({ ref: this.branchName });
    const mainShas = new Set(mainLog.map(l => l.oid));
    return actorLog.filter(l => !mainShas.has(l.oid));
  }

  async publish(options: { paths?: string[] } = {}) {
    let pathsToPublish = options.paths;
    if (!pathsToPublish) {
      const allFiles = await this.repo.listFiles({});
      pathsToPublish = allFiles.filter(f => f.startsWith('collections/shared/'));
    }

    if (pathsToPublish.length === 0) return;
    const currentBranch = (await this.repo.getCurrentBranch())!;
    
    try {
      await this.repo.checkout({ ref: 'main' });
      const actorOid = await git.resolveRef({ fs: this.repo.fs, dir: '/', ref: `refs/heads/${this.branchName}` });
      
      for (const path of pathsToPublish) {
        const content = await git.readBlob({
          fs: this.repo.fs,
          dir: '/',
          oid: actorOid,
          filepath: path
        });
        
        await this.repo.writeFile(`/${path}`, Buffer.from(content.blob));
        await this.repo.add({ filepath: path });
      }

      // Update metadata.json on main
      let metadata: any = {};
      try {
        const metaStr = await this.repo.readFile('/metadata.json', { encoding: 'utf8' });
        metadata = JSON.parse(metaStr as string);
      } catch (e) {}

      metadata.lastPublishedBy = this.identity.name;
      metadata.lastUpdatedAt = new Date().toISOString();

      await this.repo.writeFile('/metadata.json', JSON.stringify(metadata, null, 2));
      await this.repo.add({ filepath: 'metadata.json' });

      await this.repo.commit({
        message: `Published selective changes from ${this.identity.name}`,
        author: this.identity
      });
    } finally {
      await this.repo.checkout({ ref: currentBranch });
    }
  }

  async commit(message: string) {
    await this.repo.commit({
      message,
      author: this.identity,
      dir: '/'
    });
  }

  async revert(depth: number = 1) {
    const log = await this.repo.log({ ref: this.branchName, depth: depth + 1 });
    const target = log[depth];
    if (target) {
      await git.checkout({ fs: this.repo.fs, dir: '/', ref: target.oid, force: true });
      await git.writeRef({
        fs: this.repo.fs,
        dir: '/',
        ref: `refs/heads/${this.branchName}`,
        value: target.oid,
        force: true
      });
    }
  }
}
