/**
 * Test setup for Bun-based tests
 */

// Set up global test utilities for Bun
global.assert = {
    equal: (a: any, b: any) => a === b,
    deepEqual: (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b),
    ok: (value: any) => !!value,
    throws: async (fn: () => Promise<void>) => {
        try {
            await fn();
            return false;
        } catch {
            return true;
        }
    }
};

// Mock terminal-related globals for tests
if (process.stdout) {
    (process.stdout as any).isTTY = true;
}
if (process.stderr) {
    (process.stderr as any).isTTY = true;
}

// Mock performance.now if needed
if (!global.performance?.now) {
    global.performance = { now: () => Date.now() };
}