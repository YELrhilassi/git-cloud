# git-cloud

A serverless-optimized Git management library for Node.js. 

`git-cloud` allows you to have full Git functionality in ephemeral environments (like AWS Lambda, Vercel, or Google Cloud Functions) where native Git binaries are missing. It leverages `isomorphic-git` and provides an adaptive storage layer to store your `.git` data anywhere with built-in encryption, compression, and a robust actor-based workflow.

## Features

- **☁️ Cloud Native**: Designed for serverless environments with no native dependencies.
- **📂 Adaptive Storage**: Support for AWS S3, Supabase Storage, and Local Filesystem.
- **🔐 AES-256-GCM Encryption**: Transparently encrypt your Git data at the storage level.
- **📦 Smart Compression**: Automatic Zlib compression for text and Git objects, skipping already compressed formats (JPG, PDF, etc.).
- **👥 Actor-Based Workflow**: Managed branching model for multi-user collaboration with `publish` and `update` flows.
- **🏢 Multi-Tenancy**: Manage multiple independent repositories in a single storage bucket using namespaces.
- **🔒 Concurrency Control**: Distributed locking ensures safe operations across multiple serverless instances.
- **⚡ Performance Caching**: Optional L1 cache using `/tmp` to minimize cloud storage latency and costs.
- **📂 Binder Paradigm**: High-level `Collection` API for managing sets of files (like medical records) as logical units.

## Installation

```bash
npm install git-cloud isomorphic-git
```

## Quick Start

```javascript
import { GitCloud, LocalStorageProvider } from 'git-cloud';

const gitCloud = new GitCloud({
  storage: new LocalStorageProvider('./my-git-storage'),
  baseDir: 'workspaces',
  compression: true,
  encryptionKey: Buffer.from('your-32-byte-secret-key-here...') 
});

const repo = await gitCloud.repository('my-project');

// Initializes with a metadata.json automatic commit
await repo.init({ metadata: { owner: 'Alice' } });

await repo.commit({
  message: 'Initial commit',
  author: { name: 'Alice', email: 'alice@example.com' }
});
```

---

## API Reference

### `GitCloud` (Main Factory)

Entry point for configuring storage and accessing repositories.

| Option | Type | Description |
| --- | --- | --- |
| `storage` | `IStorageProvider` | The storage backend (Local, S3, Supabase). |
| `baseDir` | `string` | Root directory/prefix in storage (Default: `git-cloud-data`). |
| `encryptionKey`| `Buffer` | 32-byte key for AES-256-GCM encryption. |
| `compression` | `boolean` | Enable transparent Zlib compression. |
| `lock` | `ILockProvider` | Custom locking provider (Optional). |
| `http` | `any` | Custom `isomorphic-git` http plugin (Optional). |

#### Methods
- `repository(id: string): Promise<Repository>`: Returns a repository instance.

---

### `Repository`

Standard Git operations wrapped for cloud storage.

- `init(options?)`: Initializes repo with `metadata.json`.
- `clone(options)`: Clone a remote repository.
- `commit(options)`: Commit staged changes.
- `push(options)`: Push to a remote.
- `pull(options)`: Pull from a remote.
- `checkout(options)`: Switch branches or refs.
- `createBranch(options)`: Create a new branch.
- `listBranches()`: List all local branches.
- `getCurrentBranch()`: Get current branch name.
- `getTree(options)`: Get file list for a specific ref.
- `actor(identity)`: Get an `Actor` view for branching workflows.
- `collection(id, options)`: Get a `Collection` (Binder) view.

---

### `Actor` (Collaborative Workflow)

Each actor (User/Doctor/Bot) operates on their own branch (`actors/{name}`) and syncs with `main`.

- `setup()`: Creates the actor's branch if it doesn't exist.
- `update(options?)`: Merges `main` into the actor's branch.
    - `excludePaths`: Array of paths to ignore during the merge (keeps actor's version).
- `publish(options?)`: Merges actor's changes into `main`.
    - `paths`: Selective list of files/folders to publish. Default: everything in `shared` collections.
    - *Note: Automatically updates `metadata.json` on main.*
- `previewUpdate()` / `previewPublish()`: Returns log entries for pending changes.
- `revert(depth)`: Rolls back the actor's branch.

---

### `Collection` (Binder Paradigm)

Scoped view of files within a repository, perfect for records management.

- `put(name, content)`: Writes and stages a file in the collection.
- `get(name, options)`: Reads a file from the collection.
- `list()`: Lists files within the collection scope.
- `commit(message, author)`: Commits changes made to the collection.

**Visibility Scopes:**
Collections can be `Public` (Shared) or `Private` (Internal).
```javascript
const notes = repo.collection('session-notes', { visibility: Visibility.Private });
// Private collections stay on the Actor's branch during publish()
```

---

## Storage Providers

### AWS S3 / Generic S3
```javascript
import { S3StorageProvider } from 'git-cloud';

const storage = new S3StorageProvider({
  bucket: 'my-git-bucket',
  region: 'us-east-1',
  credentials: {
    accessKeyId: '...',
    secretAccessKey: '...'
  }
});
```

### Supabase Storage
```javascript
import { SupabaseStorageProvider } from 'git-cloud';

const storage = new SupabaseStorageProvider({
  url: 'https://xyz.supabase.co',
  key: 'service-role-key',
  bucket: 'git-vault'
});
```

## Performance & Security

### Smart Compression
`git-cloud` automatically detects compressible files (JSON, TXT, Git Objects) and uses `pako` for Zlib compression. It skips binary formats like `JPG`, `PNG`, and `PDF` to avoid wasting CPU.

### AES-256-GCM Encryption
When `encryptionKey` is provided, all data is encrypted before leaving the serverless environment. 
**Chain:** `FS -> Encryption -> Compression -> Cloud Storage`.

## License

MIT
