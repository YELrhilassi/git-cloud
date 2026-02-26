import { GitCloud } from './src/index.js';
import { LocalStorageProvider } from './src/providers/LocalStorageProvider.js';
import * as path from 'path';
import * as fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  const baseDir = path.join(__dirname, 'test-storage');
  
  // Cleanup previous runs
  try {
    await fs.rm(baseDir, { recursive: true, force: true });
  } catch (e) {}

  console.log('Initializing GitCloud with LocalStorage...');
  const gitCloud = new GitCloud({
    storage: new LocalStorageProvider(baseDir),
    baseDir: 'my-workspaces'
  });

  console.log('Accessing repository "demo-repo"...');
  const repo = await gitCloud.repository('demo-repo');

  console.log('Initializing repository...');
  await repo.init();

  console.log('Creating a file...');
  const repoRoot = 'my-workspaces/demo-repo';
  const storage = new LocalStorageProvider(baseDir);
  await storage.put(`${repoRoot}/hello.txt`, 'Hello Git-Cloud!');

  console.log('Adding file to git...');
  await repo.add({ filepath: 'hello.txt' });

  console.log('Committing changes...');
  await repo.commit({
    message: 'Initial commit from Git-Cloud',
    author: {
      name: 'Git Cloud Bot',
      email: 'bot@git-cloud.io'
    }
  });

  console.log('Listing files in git...');
  const files = await repo.listFiles();
  console.log('Files in git:', files);

  console.log('Checking git log...');
  const log = await repo.log({ depth: 1 });
  if (log && log[0]) {
    console.log('Last commit:', log[0].commit.message);
  }
  
  console.log('Demo completed successfully!');
}

run().catch(console.error);
