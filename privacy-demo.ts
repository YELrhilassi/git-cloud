import { GitCloud, Visibility } from './src/index';
import { LocalStorageProvider } from './src/providers/LocalStorageProvider';
import * as path from 'path';
import * as fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  const baseDir = path.join(__dirname, 'privacy-test-storage');
  
  // Cleanup
  try { await fs.rm(baseDir, { recursive: true, force: true }); } catch (e) {}

  console.log('--- Selective Sync & Privacy Demo ---');
  
  const gitCloud = new GitCloud({
    storage: new LocalStorageProvider(baseDir),
    baseDir: 'medical-vault',
    compression: true
  });

  const repo = await gitCloud.repository('patient-alice-001');
  await repo.init();

  const aliceIdentity = { name: 'Alice', email: 'alice@example.com' };
  const alice = repo.actor(aliceIdentity);

  // 1. Initial Commit on Main (Required to branch)
  console.log('Alice making initial commit on Main...');
  await repo.writeFile('README.md', '# Patient Alice Vault');
  await repo.add({ filepath: 'README.md' });
  await repo.commit({ message: 'Initial commit', author: aliceIdentity });
  
  await alice.setup(); // Now it can create actors/alice
  console.log('Alice now on branch:', await repo.getCurrentBranch());

  // 2. Alice creates a PUBLIC record (Shared with everyone via Main)
  console.log('Alice creating a SHARED collection...');
  const publicBinder = repo.collection('shared-info', { visibility: Visibility.Public });
  await publicBinder.put('emergency-contacts.json', JSON.stringify({ name: 'Bob', phone: '555-0100' }));
  await alice.commit('Added emergency contacts');

  // 2. Alice creates a PRIVATE record (Internal to her branch only)
  console.log('Alice creating an INTERNAL collection...');
  const privateBinder = repo.collection('private-diary', { visibility: Visibility.Private });
  await privateBinder.put('diary.txt', 'Today I feel much better, but I dont want the doctor to see this yet.');
  await alice.commit('Added private diary entry');

  // 3. Selective Publish
  console.log('Alice publishing ONLY shared collections to Main...');
  await alice.publish(); // Should only pick up 'shared-info'

  // 4. Verify Main
  await repo.checkout({ ref: 'main' });
  const mainFiles = await repo.listFiles({ ref: 'main' });
  console.log('Files on Main branch:', mainFiles);
  // Expected: includes shared-info, NOT private-diary

  // 5. Doctor Actor joins and adds a record
  const drWatson = repo.actor({ name: 'Dr. Watson', email: 'watson@medical.uk' });
  await drWatson.setup();
  await drWatson.update(); // Dr. Watson sees Alice's shared info

  console.log('Dr. Watson adding a diagnosis...');
  const drBinder = repo.collection('diagnosis', { visibility: Visibility.Public });
  await drBinder.put('notes.txt', 'Patient Alice is doing well.');
  await drWatson.commit('Added medical notes');
  await drWatson.publish();

  // 6. Alice updates but wants to EXCLUDE certain paths (simulating diversion)
  await alice.update({ excludePaths: ['collections/shared/diagnosis/notes.txt'] });
  
  await repo.checkout({ ref: alice.branchName });
  const aliceFiles = await repo.listFiles({ ref: alice.branchName });
  console.log('Alices files after filtered update:', aliceFiles);
  // Expected: Alice has her private diary, her emergency info, but NOT Dr. Watson's notes.

  console.log('Privacy & Selective Sync demo completed!');
}

run().catch(console.error);
