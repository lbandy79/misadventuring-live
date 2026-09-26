import { defineConfig } from 'vitest/config';

/**
 * Firestore security-rules tests. Kept out of the main vitest config
 * because they need the Firestore emulator (Java) running, and `npm test`
 * must keep working without it.
 *
 * Run with:  npm run test:rules
 * which wraps this in `firebase emulators:exec` so the emulator starts and
 * stops around the run. The port matches firebase.json → emulators.firestore.
 */
export default defineConfig({
  test: {
    include: ['src/test/rules/**/*.test.ts'],
    environment: 'node',
    testTimeout: 20_000,
    hookTimeout: 30_000,
    // Every test file shares one emulator; running them in parallel would
    // let one file's clearFirestore() wipe another's fixtures mid-test.
    fileParallelism: false,
  },
});
