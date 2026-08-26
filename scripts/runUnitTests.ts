// Provide global test runners if vitest runner is loaded via node/tsx
let passedTests = 0;
let failedTests = 0;

interface GlobalWithTestHelpers {
  describe?: (name: string, fn: () => void) => void;
  it?: (name: string, fn: () => void | Promise<void>) => void;
}

const customGlobal = globalThis as unknown as GlobalWithTestHelpers;

customGlobal.describe = (name: string, fn: () => void) => {
  console.log(`\n📦 ${name}`);
  fn();
};

customGlobal.it = (name: string, fn: () => void | Promise<void>) => {
  try {
    const res = fn();
    if (res instanceof Promise) {
      res.then(() => {
        passedTests++;
        console.log(`  ✓ ${name}`);
      }).catch((err: unknown) => {
        failedTests++;
        console.error(`  ✗ ${name}:`, err instanceof Error ? err.message : String(err));
      });
    } else {
      passedTests++;
      console.log(`  ✓ ${name}`);
    }
  } catch (err: unknown) {
    failedTests++;
    console.error(`  ✗ ${name}:`, err instanceof Error ? err.message : String(err));
  }
};

async function main() {
  console.log('🚀 Running Unit & Scenario Test Suite...');
  
  // Explicitly import and execute the new V3.3 polish & cheat sheet test suite
  await import('../tests/unit/v33PolishAndCheatSheet.test');
  await import('../tests/unit/followUpEngine.test');
  await import('../tests/unit/mockInterview.test');
  await import('../tests/unit/v33SecurityAndPersistence.test');
  await import('../tests/unit/cloudRepositories.test');

  // Allow async tests to settle
  await new Promise((r) => setTimeout(r, 500));

  console.log(`\n================================`);
  console.log(`Test Execution Results: ${passedTests} passed, ${failedTests} failed`);
  console.log(`================================\n`);

  if (failedTests > 0) {
    process.exit(1);
  }
}

main().catch((err: unknown) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
