# API Documentation

This document provides a detailed reference for the `git-cloud` classes and interfaces.

## GitCloud

The root factory class for configuring your storage environment.

### Constructor
```typescript
new GitCloud(config: GitCloudConfig)
```

#### `GitCloudConfig`
- `storage`: `IStorageProvider` (Required)
- `lock`: `ILockProvider` (Optional) - Defaults to `StorageLockProvider`
- `baseDir`: `string` (Optional) - Root path for all repos (Default: `'git-cloud-data'`)
- `http`: `any` (Optional) - `isomorphic-git` compatible HTTP plugin
- `compression`: `boolean` (Optional) - Enable Zlib compression
- `encryptionKey`: `Buffer` (Optional) - 32-byte key for AES-256-GCM

### Methods
- `repository(repoId: string): Promise<Repository>`
  Gets a repository handle scoped to the provided ID.

---

## Repository

High-level Git operations.

### Methods

#### `init(options?: { metadata?: any })`
Initializes a new Git repository. Automatically creates a `metadata.json` file in the root and performs an initial commit.

#### `actor(identity: { name: string, email: string }): Actor`
Creates an actor instance for managed branching workflows.

#### `collection(id: string, options?: { visibility?: Visibility }): Collection`
Creates a collection (binder) instance for grouped file management.

#### `commit(options: { message: string, author: ActorIdentity })`
Performs a Git commit on the current branch.

#### `checkout(options: { ref: string, force?: boolean })`
Switches the current branch or ref.

#### `listBranches(): Promise<string[]>`
Lists all branches in the repository.

#### `getCurrentBranch(): Promise<string>`
Returns the name of the current active branch.

---

## Actor

Managed branching workflow where each actor has an isolated environment.

### Branching Logic
Actors use the branch pattern: `actors/{name-slug}`.

### Methods

#### `setup()`
Ensures the actor's branch exists (creating it from `main` if necessary) and switches to it.

#### `update(options?: { excludePaths?: string[] })`
Merges the `main` branch into the actor's branch. 
If `excludePaths` is provided, those specific files/folders are reverted to their state prior to the merge (effectively ignoring changes from main for those paths).

#### `publish(options?: { paths?: string[] })`
Selectively publishes changes to `main`.
- If `paths` is provided, only those paths are synced.
- Otherwise, only files in `Public` collections are synced.
- Updates `metadata.json` on `main` with audit info.

#### `revert(depth: number)`
Rolls back the actor's branch by the specified number of commits.

---

## Collection (Binder)

The Binder paradigm for managing logical groups of files.

### Visibility Scopes
- `Visibility.Public`: Stored in `/collections/shared/`. Published to `main` by default.
- `Visibility.Private`: Stored in `/collections/internal/`. Stays on the actor branch.

### Methods

#### `put(name: string, content: Buffer | string)`
Writes a file to the collection and stages it for commit.

#### `get(name: string, options?: { encoding: string })`
Reads a file from the collection.

#### `list(): Promise<string[]>`
Lists all files currently in the collection (on the active branch).

---

## Storage Providers

### `LocalStorageProvider(path: string)`
Uses the local filesystem. Ideal for development or VPS environments.

### `S3StorageProvider(config: S3Config)`
Uses AWS SDK v3. Compatible with AWS S3, DigitalOcean Spaces, Cloudflare R2, etc.

### `SupabaseStorageProvider(config: SupabaseConfig)`
Direct integration with Supabase Storage buckets.

### `CachedStorageProvider(remote: IStorageProvider, cacheDir: string)`
L1 cache decorator. Speeds up operations by caching files in a local directory (e.g., `/tmp`).

### `EncryptedStorageProvider(remote: IStorageProvider, key: Buffer)`
Encryption decorator. Transparently encrypts all written data with AES-256-GCM.

### `CompressedStorageProvider(remote: IStorageProvider)`
Compression decorator. Automatically applies Zlib compression to text-based files.
