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

  /**
   * Initializes the actor's branch from main if it doesn't exist.
   */
  async setup() {
    const branches = await this.repo.listBranches();
    if (!branches.includes(this.branchName)) {
      await this.repo.createBranch({ name: this.branchName });
    }
  }

  /**
   * Updates the actor's branch with the latest changes from main.
   */
  async update() {
    await git.merge({
      fs: this.repo.fs,
      dir: '/',
      ours: this.branchName,
      theirs: 'main',
      author: this.identity,
      fastForwardOnly: false
    });
    await this.repo.checkout({ ref: this.branchName });
  }

  /**
   * Returns a list of changes that would be brought in from main.
   */
  async previewUpdate() {
    const mainLog = await this.repo.log({ ref: 'main' });
    const actorLog = await this.repo.log({ ref: this.branchName });
    
    const actorShas = new Set(actorLog.map(l => l.oid));
    return mainLog.filter(l => !actorShas.has(l.oid));
  }

  /**
   * Returns a list of changes that this actor would publish to main.
   */
  async previewPublish() {
    const mainLog = await this.repo.log({ ref: 'main' });
    const actorLog = await this.repo.log({ ref: this.branchName });
    
    const mainShas = new Set(mainLog.map(l => l.oid));
    return actorLog.filter(l => !mainShas.has(l.oid));
  }

  /**
   * Publishes the actor's changes back to the main branch.
   */
  async publish() {
    await git.merge({
      fs: this.repo.fs,
      dir: '/',
      ours: 'main',
      theirs: this.branchName,
      author: this.identity,
      fastForwardOnly: false
    });
    // Stay on actor branch after publish, or switch to main? 
    // Usually keep the actor on their branch.
  }

  /**
   * Commit changes to the actor's branch.
   */
  async commit(message: string) {
    await this.repo.commit({
      message,
      author: this.identity,
      dir: '/'
    });
  }

  /**
   * Reverts the actor's branch to a previous commit.
   */
  async revert(depth: number = 1) {
    const log = await this.repo.log({ ref: this.branchName, depth: depth + 1 });
    const target = log[depth];
    if (target) {
      await git.checkout({
        fs: this.repo.fs,
        dir: '/',
        ref: target.oid,
        force: true
      });
      // To truly revert the branch head, we'd need to update the ref
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
