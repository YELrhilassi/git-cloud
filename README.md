# git-cloud

A serverless-optimized Git management library for Node.js. 

`git-cloud` allows you to have full Git functionality in ephemeral environments (like AWS Lambda, Vercel, or Google Cloud Functions) where native Git binaries are missing. It leverages `isomorphic-git` and provides an adaptive storage layer to store your `.git` data anywhere.

## Features

- **☁️ Cloud Native**: Designed for serverless environments with no native dependencies.
- **📂 Adaptive Storage**: Support for AWS S3, Supabase Storage, and Local Filesystem.
- **👥 Multi-Tenancy**: Manage multiple independent repositories in a single storage bucket using namespaces.
- **🔒 Concurrency Control**: Distributed locking ensures safe operations across multiple serverless instances.
- **⚡ Performance Caching**: Optional L1 cache using `/tmp` to minimize cloud storage latency and costs.
- **🛠️ High-Level API**: Simple wrappers for `clone`, `commit`, `push`, `pull`, and `log`.

## Installation

```bash
npm install git-cloud isomorphic-git
```

## Quick Start (Local Storage)

```javascript
import { GitCloud, LocalStorageProvider } from 'git-cloud';

const gitCloud = new GitCloud({
  storage: new LocalStorageProvider('./my-git-storage'),
  baseDir: 'workspaces'
});

const repo = await gitCloud.repository('my-project');
await repo.init();
await repo.commit({
  message: 'Initial commit',
  author: { name: 'Dev', email: 'dev@example.com' }
});
```

## Cloud Storage Examples

### AWS S3 / Generic S3
```javascript
import { S3StorageProvider } from 'git-cloud';

const storage = new S3StorageProvider({
  bucket: 'my-git-bucket',
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});
```

### Supabase Storage
```javascript
import { SupabaseStorageProvider } from 'git-cloud';

const storage = new SupabaseStorageProvider({
  url: process.env.SUPABASE_URL,
  key: process.env.SUPABASE_SERVICE_ROLE_KEY,
  bucket: 'git-repos'
});
```

## Architecture

1. **Storage Provider**: Abstract layer for blob storage (S3, Supabase, etc.).
2. **GitCloudFS**: A virtual filesystem that makes `isomorphic-git` believe it's talking to a disk.
3. **Namespace Manager**: Prepends repository IDs to paths for isolation.
4. **Lock Manager**: Prevents race conditions during write operations.

## License

MIT
