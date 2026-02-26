# Git-Cloud Implementation Plan

## Overview
`git-cloud` is a serverless-optimized Git management library that leverages `isomorphic-git` to provide full Git functionality in environments without native Git support (Lambda, Vercel, etc.). It uses an adaptive storage layer to store Git data in S3, Supabase, or Local Storage.

## Design Decisions

- **Git Engine**: We use `isomorphic-git` because it is a pure JavaScript implementation of Git, making it compatible with serverless environments where native binaries are unavailable.
- **Storage Abstraction**: To avoid code duplication, we implement an `IStorageProvider` interface. This allows us to support S3, Supabase, and Local Storage using the same high-level logic.
- **VFS Bridge**: `isomorphic-git` expects a Node-like `fs` interface. We build a `GitCloudFS` that translates these calls into asynchronous storage provider operations.
- **Multi-Tenancy**: We use a `NamespaceManager` to scope operations to a specific `repoId`. This allows multiple repositories to be stored in the same bucket/folder without conflict.
- **Concurrency**: Distributed locking is implemented via the storage provider itself (using `.lock` files) to ensure atomic operations across multiple serverless instances.
- **Performance**: We utilize an optional L1 cache in the environment's `/tmp` directory to reduce latency and egress costs from cloud storage.
- **Supabase Support**: We specifically target Supabase Storage as a first-class citizen, providing a dedicated provider for its unique API.

## Architecture

### 1. Storage Abstraction Layer
- `IStorageProvider`: Interface for blob operations (get, put, list, delete).
- `LocalStorageProvider`: Implementation using `node:fs`.
- `S3StorageProvider`: Implementation using AWS SDK v3.
- `SupabaseStorageProvider`: Implementation using `@supabase/storage-js`.

### 2. Virtual Filesystem (VFS)
- `GitCloudFS`: Implemented the Node `fs` interface required by `isomorphic-git`.
- `NamespaceManager`: Handles path scoping for multi-repo support (`workspaces/{repo-id}/`).
- `L1 Cache`: Optional `/tmp` caching to reduce storage RTT and costs.

### 3. Concurrency Control
- `ILockProvider`: Interface for distributed locking.
- `StorageLockProvider`: Implementation using `.lock` files in the storage backend.

### 4. High-Level API
- `GitCloud`: Main entry point to initialize storage and manage repositories.
- `Repository`: Wrapper around `isomorphic-git` for common workflows (clone, commit, push, pull).

## Roadmap

### Phase 1: Core Foundation (COMPLETED)
- Define interfaces (`IStorageProvider`, `IFS`, `ILockProvider`).
- Implement `NamespaceManager`.

### Phase 2: Base Providers (IN PROGRESS)
- Implement `LocalStorageProvider` for development.

### Phase 3: VFS Implementation
- Build `GitCloudFS` to bridge `isomorphic-git` and `IStorageProvider`.
- Implement simple file-based locking.

### Phase 4: Cloud Providers
- Implement `S3StorageProvider`.
- Implement `SupabaseStorageProvider`.

### Phase 5: Optimizations & API
- Implement `/tmp` caching layer.
- High-level `GitCloud` class.
- Documentation and examples.
