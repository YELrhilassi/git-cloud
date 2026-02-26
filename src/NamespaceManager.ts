import path from 'path-browserify';

export class NamespaceManager {
  constructor(private baseDir: string, private repoId: string) {}

  /**
   * Resolves a relative path within the repository to a full path in the storage.
   */
  resolve(relativePath: string): string {
    // Normalize path to remove leading slashes and prevent directory traversal
    const normalized = relativePath.startsWith('/') ? relativePath.substring(1) : relativePath;
    return path.join(this.baseDir, this.repoId, normalized);
  }

  /**
   * Extracts the relative path from a full storage path.
   */
  relative(fullPath: string): string {
    const prefix = path.join(this.baseDir, this.repoId);
    if (fullPath.startsWith(prefix)) {
      return fullPath.substring(prefix.length).replace(/^[/\\]+/, '');
    }
    return fullPath;
  }

  /**
   * Returns the root path of the repository in storage.
   */
  getRepoRoot(): string {
    return path.join(this.baseDir, this.repoId);
  }
}
