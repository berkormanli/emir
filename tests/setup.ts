/**
 * Test setup for Bun-based tests
 */

// Mock Node.js modules that don't exist in Bun
global.fs = await import('node:fs');
global.path = await import('node:path');
global.process = process;
global.console = console;

// Mock child_process for tests
global.spawn = async (command: string, args: string[]) => {
    // In a real Bun environment, we would use Bun.spawn
    return {
        stdout: new ReadableStream(),
        stderr: new ReadableStream(),
        stdin: new WritableStream(),
        kill: () => {},
        on: () => {},
        once: () => {}
    };
};

// Mock readline for tests
global.createInterface = () => ({
    on: () => {},
    close: () => {}
});

// Set up global test utilities
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

// Mock terminal-related globals
global.process.stdout.isTTY = true;
global.process.stderr.isTTY = true;

// Mock performance.now if needed
if (!global.performance.now) {
    global.performance.now = () => Date.now();
}