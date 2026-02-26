# git-cloud

A serverless-optimized Git management library for Node.js. 

`git-cloud` allows you to have full Git functionality in ephemeral environments (like AWS Lambda, Vercel, or Google Cloud Functions) where native Git binaries are missing. It leverages `isomorphic-git` and provides an adaptive storage layer to store your `.git` data anywhere.

## Features

- **☁️ Cloud Native**: Designed for serverless environments with no native dependencies.
- **📂 Adaptive Storage**: Support for AWS S3, Supabase Storage, and Local Filesystem.
- **👥 Multi-Tenancy**: Manage multiple independent repositories in a single storage bucket using namespaces.
- **🔒 Concurrency Control**: Distributed locking ensures safe operations across multiple serverless instances.
- **⚡ Performance Caching**: Optional L1 cache using `/tmp` to minimize cloud storage latency and costs.
- **📦 Smart Compression**: Automatic Zlib compression for text and Git objects, while skipping already compressed formats (JPG, PDF, etc.).
- **📂 Binder Paradigm**: High-level `Collection` API for managing sets of files (like medical records) as logical units.
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
// ...
```

## Binders & Collections

The `Collection` API allows you to manage logical sets of files (like patient binders) without dealing with full paths manually.

```javascript
const patientRecord = repo.collection('patient-001');

// Add a file to the binder
await patientRecord.put('report.txt', 'Health summary...');

// Add a binary file (automatically handles skip-compression for .jpg)
await patientRecord.put('xray.jpg', imageBuffer);

// Commit binder changes
await patientRecord.commit('Added annual checkup', { name: 'Dr. Smith', email: 'smith@hosp.org' });

// List contents of the binder
const files = await patientRecord.list(); // ['report.txt', 'xray.jpg']
```

## Custom HTTP Plugin

If you are using this in a custom environment or need specific proxy settings, you can provide your own `http` plugin (compatible with `isomorphic-git`'s http plugin API).

```javascript
import { GitCloud } from 'git-cloud';
import http from 'isomorphic-git/http/node'; // or your custom plugin

const gitCloud = new GitCloud({
  storage: myStorageProvider,
  http: http 
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
