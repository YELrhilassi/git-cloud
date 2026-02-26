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

  console.log('Initializing GitCloud with LocalStorage and Compression...');
  const gitCloud = new GitCloud({
    storage: new LocalStorageProvider(baseDir),
    baseDir: 'my-workspaces',
    compression: true
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

  console.log('--- Branching & History Demo ---');
  
  const current = await repo.getCurrentBranch();
  console.log('Current branch:', current);

  console.log('Creating and switching to branch "feature-xyz"...');
  await repo.createBranch({ name: 'feature-xyz', checkout: true });
  console.log('Now on branch:', await repo.getCurrentBranch());

  console.log('Creating a file on feature branch...');
  await storage.put(`${repoRoot}/feature.txt`, 'Feature content');
  await repo.add({ filepath: 'feature.txt' });
  await repo.commit({
    message: 'Add feature file',
    author: { name: 'Dev', email: 'dev@example.com' }
  });

  console.log('Files on feature branch:', await repo.listFiles());

  console.log('Switching back to main...');
  await repo.checkout({ ref: 'main' });
  console.log('Back on branch:', await repo.getCurrentBranch());
  console.log('Files on main branch:', await repo.listFiles());

  console.log('Reading tree of "feature-xyz" without switching...');
  const featureFiles = await repo.getTree({ ref: 'feature-xyz' });
  console.log('Files in feature-xyz tree:', featureFiles);

  console.log('--- Medical Records (Binder) Demo ---');
  const patientRecord = repo.collection('patient-001');

  console.log('Adding medical report (compressible)...');
  await patientRecord.put('report.txt', 'Patient shows significant improvement in cognitive tasks after implementing Git-Cloud.');

  console.log('Adding X-Ray image (simulated binary, non-compressible)...');
  const fakeImage = Buffer.alloc(1024 * 10, 0xAF); // 10KB of 0xAF
  await patientRecord.put('xray.jpg', fakeImage);

  console.log('Listing binder contents...');
  const binderFiles = await patientRecord.list();
  console.log('Binder "patient-001" files:', binderFiles);

  console.log('Committing binder changes...');
  await patientRecord.commit('Initial medical record for patient-001', {
    name: 'Dr. Smith',
    email: 'smith@hospital.org'
  });

  const reportContent = await patientRecord.get('report.txt', { encoding: 'utf8' });
  console.log('Retrieved report content:', reportContent);
  
  console.log('Demo completed successfully!');
}

run().catch(console.error);
