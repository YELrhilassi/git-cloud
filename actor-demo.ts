import { GitCloud } from './src/index';
import { LocalStorageProvider } from './src/providers/LocalStorageProvider';
import * as path from 'path';
import * as fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { Buffer } from 'buffer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  const baseDir = path.join(__dirname, 'actor-test-storage');
  const encryptionKey = Buffer.alloc(32, 'my-super-secret-encryption-key-!!');

  // Cleanup
  try { await fs.rm(baseDir, { recursive: true, force: true }); } catch (e) {}

  console.log('--- Ownership & Actor Workflow Demo ---');
  
  const gitCloud = new GitCloud({
    storage: new LocalStorageProvider(baseDir),
    baseDir: 'medical-records',
    encryptionKey,
    compression: true
  });

  const repo = await gitCloud.repository('patient-john-doe-001');
  await repo.init();

  // 1. Initial State (Owned by the Patient/Manager)
  const patient = { name: 'John Doe', email: 'john@doe.com' };
  const patientBinder = repo.collection('personal-info');
  await patientBinder.put('profile.json', JSON.stringify({ dob: '1985-05-15', bloodType: 'O+' }));
  await patientBinder.commit('Patient profile initialized', patient);

  console.log('Main branch initialized by patient.');

  // 2. Doctor Actor joins
  const drHouse = repo.actor({ name: 'Gregory House', email: 'house@princeton-plainsboro.edu' });
  console.log(`Setting up branch for Actor: ${drHouse.identity.name}...`);
  await drHouse.setup();
  await drHouse.update(); // Sync with main

  // 3. Doctor makes changes on their own branch
  console.log('Doctor adding diagnosis to their branch...');
  const drBinder = repo.collection('diagnoses');
  await drBinder.put('case-001.txt', 'Differential diagnosis: It might be lupus. (Wait, it is never lupus).');
  await drHouse.commit('Added preliminary diagnosis');

  // 4. Preview changes
  const pendingUpdate = await drHouse.previewUpdate();
  console.log(`Pending changes in main for doctor to pull: ${pendingUpdate.length}`);
  
  const pendingPublish = await drHouse.previewPublish();
  console.log(`Changes doctor is about to publish to main: ${pendingPublish.length}`);
  if (pendingPublish[0]) {
    console.log(`  - ${pendingPublish[0].commit.message}`);
  }

  // 5. Doctor publishes to main
  console.log('Doctor publishing changes to main binder...');
  await drHouse.publish();

  // 6. Verify main has the changes
  await repo.checkout({ ref: 'main' });
  const allFiles = await repo.listFiles();
  console.log('Files in main branch after doctor publish:', allFiles);

  console.log('Actor workflow demo completed!');
}

run().catch(console.error);
