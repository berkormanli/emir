/**
 * Performance benchmarks for Emir CLI Framework
 */

import { describe, it, expect } from 'vitest';
import { createBenchmarkSuite } from '../../src/testing/benchmark';
import { PseudoTerminal } from '../../src/testing/pseudoterminal';
import { join } from 'path';

describe('Performance Benchmarks', () => {
    const suite = createBenchmarkSuite('./tests/benchmark-results');

    describe('CLI Performance', () => {
        it('benchmark: CLI startup time', async () => {
            await suite.add('CLI Startup', async () => {
                const terminal = new PseudoTerminal();
                await terminal.spawn('node', [join(process.cwd(), 'dist/index.js'), '--version']);
                const exitCode = await terminal.getExitCode();
                terminal.dispose();
                expect(exitCode).toBe(0);
            }, {
                iterations: 50,
                warmup: 5,
                minSamples: 10
            });
        }, 60000);

        it('benchmark: Command parsing', async () => {
            await suite.add('Command Parsing', async () => {
                const terminal = new PseudoTerminal();
                await terminal.spawn('node', [
                    join(process.cwd(), 'dist/index.js'),
                    'hello',
                    '--name',
                    'Benchmark Test',
                    '--verbose'
                ]);
                const exitCode = await terminal.getExitCode();
                terminal.dispose();
            }, {
                iterations: 100,
                warmup: 10
            });
        }, 60000);

        it('benchmark: Help generation', async () => {
            await suite.add('Help Generation', async () => {
                const terminal = new PseudoTerminal();
                await terminal.spawn('node', [join(process.cwd(), 'dist/index.js'), '--help']);
                await terminal.waitFor('Usage:');
                terminal.dispose();
            }, {
                iterations: 30,
                warmup: 3
            });
        }, 60000);

        it('benchmark: Argument validation', async () => {
            await suite.add('Argument Validation', async () => {
                const terminal = new PseudoTerminal();
                await terminal.spawn('node', [
                    join(process.cwd(), 'dist/index.js'),
                    'validate',
                    '--string', 'test',
                    '--number', '42',
                    '--boolean',
                    '--array', 'a,b,c'
                ]);
                const exitCode = await terminal.getExitCode();
                terminal.dispose();
            }, {
                iterations: 80,
                warmup: 8
            });
        }, 60000);
    });

    describe('TUI Performance', () => {
        it('benchmark: TUI startup time', async () => {
            await suite.add('TUI Startup', async () => {
                const terminal = new PseudoTerminal({ cols: 80, rows: 24 });
                await terminal.spawn('node', [
                    join(process.cwd(), 'dist/index.js'),
                    '--interactive'
                ]);
                await terminal.waitFor(/Menu|Interactive/, 5000);
                terminal.sendKey('ctrl-c');
                await terminal.getExitCode();
                terminal.dispose();
            }, {
                iterations: 20,
                warmup: 2,
                timeout: 10000
            });
        }, 60000);

        it('benchmark: Component rendering', async () => {
            await suite.add('Component Rendering', async () => {
                const terminal = new PseudoTerminal({ cols: 80, rows: 24 });
                await terminal.spawn('node', [
                    join(process.cwd(), 'dist/index.js'),
                    'render-test'
                ]);
                await terminal.waitFor('Rendered', 2000);
                terminal.sendKey('ctrl-c');
                terminal.dispose();
            }, {
                iterations: 30,
                warmup: 3
            });
        }, 60000);

        it('benchmark: Layout calculations', async () => {
            await suite.add('Layout Calculations', async () => {
                const terminal = new PseudoTerminal({ cols: 120, rows: 40 });
                await terminal.spawn('node', [
                    join(process.cwd(), 'dist/index.js'),
                    'layout-test'
                ]);
                await terminal.waitFor('Layout complete', 2000);
                terminal.sendKey('ctrl-c');
                terminal.dispose();
            }, {
                iterations: 25,
                warmup: 2
            });
        }, 60000);

        it('benchmark: Input handling', async () => {
            await suite.add('Input Handling', async () => {
                const terminal = new PseudoTerminal();
                await terminal.spawn('node', [
                    join(process.cwd(), 'dist/index.js'),
                    'input-test'
                ]);

                // Simulate rapid input
                for (let i = 0; i < 100; i++) {
                    terminal.sendKey('up');
                    terminal.sendKey('down');
                }

                terminal.sendKey('enter');
                await terminal.waitFor('Done', 3000);
                terminal.dispose();
            }, {
                iterations: 15,
                warmup: 2
            });
        }, 60000);
    });

    describe('Memory Performance', () => {
        it('benchmark: Memory usage - CLI operations', async () => {
            await suite.add('Memory - CLI Operations', async () => {
                const terminal = new PseudoTerminal();

                // Multiple operations
                for (let i = 0; i < 10; i++) {
                    await terminal.spawn('node', [
                        join(process.cwd(), 'dist/index.js'),
                        'process',
                        '--items', '100'
                    ]);
                    await terminal.getExitCode();
                }

                terminal.dispose();
            }, {
                iterations: 10,
                warmup: 1
            });
        }, 60000);

        it('benchmark: Memory usage - TUI operations', async () => {
            await suite.add('Memory - TUI Operations', async () => {
                const terminal = new PseudoTerminal();
                await terminal.spawn('node', [
                    join(process.cwd(), 'dist/index.js'),
                    'memory-tui-test'
                ]);

                // Simulate TUI interactions
                for (let i = 0; i < 20; i++) {
                    terminal.sendKey('tab');
                    terminal.sendKey('enter');
                }

                terminal.sendKey('ctrl-c');
                terminal.dispose();
            }, {
                iterations: 5,
                warmup: 1
            });
        }, 60000);

        it('benchmark: Garbage collection', async () => {
            await suite.add('Garbage Collection', async () => {
                if (global.gc) {
                    global.gc();
                }

                const terminals: PseudoTerminal[] = [];

                // Create many terminals
                for (let i = 0; i < 50; i++) {
                    const terminal = new PseudoTerminal();
                    terminals.push(terminal);
                }

                // Dispose all
                terminals.forEach(t => t.dispose());

                if (global.gc) {
                    global.gc();
                }
            }, {
                iterations: 10,
                warmup: 1
            });
        }, 60000);
    });

    describe('I/O Performance', () => {
        it('benchmark: File operations', async () => {
            await suite.add('File Operations', async () => {
                const terminal = new PseudoTerminal();
                await terminal.spawn('node', [
                    join(process.cwd(), 'dist/index.js'),
                    'file-ops',
                    '--count', '100'
                ]);
                await terminal.waitFor('Processed 100 files', 5000);
                terminal.dispose();
            }, {
                iterations: 20,
                warmup: 2
            });
        }, 60000);

        it('benchmark: Stream processing', async () => {
            await suite.add('Stream Processing', async () => {
                const terminal = new PseudoTerminal();
                await terminal.spawn('node', [
                    join(process.cwd(), 'dist/index.js'),
                    'stream-test'
                ]);

                // Send data to stream
                for (let i = 0; i < 1000; i++) {
                    terminal.writeln(`Line ${i}`);
                }

                terminal.sendKey('ctrl-d');
                await terminal.waitFor('Stream complete', 5000);
                terminal.dispose();
            }, {
                iterations: 15,
                warmup: 2
            });
        }, 60000);

        it('benchmark: Configuration loading', async () => {
            await suite.add('Configuration Loading', async () => {
                const terminal = new PseudoTerminal();
                await terminal.spawn('node', [
                    join(process.cwd(), 'dist/index.js'),
                    '--config',
                    'test-config.json'
                ]);
                await terminal.waitFor('Config loaded', 2000);
                terminal.dispose();
            }, {
                iterations: 40,
                warmup: 4
            });
        }, 60000);
    });

    describe('Scaffolding Performance', () => {
        it('benchmark: Project generation', async () => {
            await suite.add('Project Generation', async () => {
                const terminal = new PseudoTerminal({ cwd: '/tmp' });
                await terminal.spawn('node', [
                    join(process.cwd(), 'dist/index.js'),
                    'scaffold',
                    'create',
                    `test-${Date.now()}`,
                    'cli-app'
                ]);
                await terminal.waitFor('Project created', 5000);
                terminal.dispose();
            }, {
                iterations: 5,
                warmup: 1
            });
        }, 60000);

        it('benchmark: Template processing', async () => {
            await suite.add('Template Processing', async () => {
                const terminal = new PseudoTerminal();
                await terminal.spawn('node', [
                    join(process.cwd(), 'dist/index.js'),
                    'scaffold',
                    'process-template',
                    'cli-app'
                ]);
                await terminal.waitFor('Template processed', 3000);
                terminal.dispose();
            }, {
                iterations: 20,
                warmup: 2
            });
        }, 60000);
    });

    // Run all benchmarks and generate report
    it('generate performance report', async () => {
        console.log('\n📊 Running all performance benchmarks...');

        const results = await suite.run();

        // Performance assertions
        results.forEach(result => {
            expect(result.opsPerSecond).toBeGreaterThan(1);
            expect(result.duration).toBeLessThan(60000); // 60 seconds max

            // Memory should not grow excessively
            const memoryGrowthMB = result.memory.delta / 1024 / 1024;
            expect(memoryGrowthMB).toBeLessThan(100); // 100MB max growth

            // Check coefficient of variation
            const cv = calculateCV(result.samples);
            expect(cv).toBeLessThan(0.5); // 50% max variation
        });

        console.log('✅ Performance benchmarks completed');
        console.log(`📄 Report saved to ./tests/benchmark-results/report.html`);
    }, 300000); // 5 minutes for all benchmarks
});

/**
 * Calculate coefficient of variation
 */
function calculateCV(samples: number[]): number {
    if (samples.length < 2) return 1;

    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    const variance = samples.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / samples.length;
    const stdDev = Math.sqrt(variance);

    return stdDev / mean;
}