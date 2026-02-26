import type { Repository } from './Repository';

export class Collection {
  constructor(
    private repo: Repository,
    public readonly id: string,
    private baseDir: string = 'collections'
  ) {}

  private getCollectionPath(filePath: string): string {
    const path = `${this.baseDir}/${this.id}/${filePath}`.replace(/\/+/g, '/');
    return path.startsWith('/') ? path : `/${path}`;
  }

  /**
   * Adds or updates a file in the collection.
   */
  async put(name: string, content: Buffer | string) {
    const filePath = this.getCollectionPath(name);
    await this.repo.writeFile(filePath, content);
    await this.repo.add({ filepath: filePath.substring(1) }); // remove leading slash for iso-git
  }

  /**
   * Reads a file from the collection.
   */
  async get(name: string, options?: { encoding?: string }) {
    const filePath = this.getCollectionPath(name);
    return await this.repo.readFile(filePath, options);
  }

  /**
   * Lists all files in the collection.
   */
  async list() {
    const dir = this.getCollectionPath('');
    const allFiles = await this.repo.listFiles();
    const prefix = dir.substring(1); // remove leading slash
    return allFiles
      .filter(f => f.startsWith(prefix))
      .map(f => f.substring(prefix.length).replace(/^\/+/, ''));
  }

  /**
   * Commits changes in the collection.
   */
  async commit(message: string, author: { name: string; email: string }) {
    await this.repo.commit({ message, author });
  }

  /**
   * Gets the history of the collection.
   */
  async log(options: { depth?: number } = {}) {
    // Note: This returns full repo log. 
    // Finer-grained per-folder log would require more complex filtering of commits.
    return await this.repo.log(options);
  }
}
