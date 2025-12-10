/**
 * End-to-end CLI tests
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createScenario, runCommand } from '../../src/testing/pseudoterminal';
import { createBenchmarkSuite } from '../../src/testing/benchmark';
import { join } from 'path';

describe('CLI End-to-End Tests', () => {
    const examplePath = join(__dirname, '../../examples');

    describe('Basic CLI Operations', () => {
        it('should display help when no arguments provided', async () => {
            const { output, exitCode } = await runCommand('node', ['dist/index.js']);
            expect(exitCode).toBe(0);
            expect(output).toContain('Usage:');
            expect(output).toContain('Commands:');
        });

        it('should display version with --version flag', async () => {
            const { output, exitCode } = await runCommand('node', ['dist/index.js', '--version']);
            expect(exitCode).toBe(0);
            expect(output).toMatch(/\d+\.\d+\.\d+/);
        });

        it('should show help for specific command', async () => {
            const { output, exitCode } = await runCommand('node', ['dist/index.js', 'help', 'hello']);
            expect(exitCode).toBe(0);
            expect(output).toContain('hello');
        });

        it('should handle unknown command gracefully', async () => {
            const { output, exitCode } = await runCommand('node', ['dist/index.js', 'unknown-command']);
            expect(exitCode).toBe(1);
            expect(output).toContain('Unknown command');
        });
    });

    describe('Command Execution', () => {
        it('should execute hello command', async () => {
            const scenario = createScenario()
                .spawn('node', ['dist/index.js'])
                .waitFor('>')
                .writeln('hello')
                .waitFor('Hello, World!')
                .waitFor('>')
                .sendKey('ctrl-c');

            const { output } = await scenario.execute();
            expect(output).toContain('Hello, World!');
        });

        it('should pass options to commands', async () => {
            const { output, exitCode } = await runCommand(
                'node',
                ['dist/index.js', 'hello', '--name', 'Alice']
            );
            expect(exitCode).toBe(0);
            expect(output).toContain('Hello, Alice!');
        });

        it('should handle interactive input', async () => {
            const scenario = createScenario()
                .spawn('node', ['dist/index.js', 'interactive'])
                .waitFor('name:')
                .writeln('John Doe')
                .waitFor('email:')
                .writeln('john@example.com')
                .waitFor('Form submitted')
                .waitFor('>')
                .sendKey('ctrl-c');

            const { output } = await scenario.execute();
            expect(output).toContain('John Doe');
            expect(output).toContain('john@example.com');
        });
    });

    describe('Error Handling', () => {
        it('should handle invalid options', async () => {
            const { output, exitCode } = await runCommand(
                'node',
                ['dist/index.js', 'hello', '--invalid-option']
            );
            expect(exitCode).toBe(1);
            expect(output).toContain('Unknown option');
        });

        it('should handle missing required arguments', async () => {
            const { output, exitCode } = await runCommand(
                'node',
                ['dist/index.js', 'create', '--name']
            );
            expect(exitCode).toBe(1);
            expect(output).toContain('Option --name requires a value');
        });

        it('should handle command errors gracefully', async () => {
            const { output, exitCode } = await runCommand(
                'node',
                ['dist/index.js', 'risky-operation']
            );
            expect(exitCode).toBe(1);
            expect(output).toContain('Error:');
        });
    });

    describe('Subcommands', () => {
        it('should execute subcommands', async () => {
            const scenario = createScenario()
                .spawn('node', ['dist/index.js'])
                .waitFor('>')
                .writeln('user create')
                .waitFor('User created')
                .waitFor('>')
                .writeln('user list')
                .waitFor('Users:')
                .waitFor('>')
                .sendKey('ctrl-c');

            const { output } = await scenario.execute();
            expect(output).toContain('User created');
            expect(output).toContain('Users:');
        });

        it('should show help for subcommands', async () => {
            const { output, exitCode } = await runCommand(
                'node',
                ['dist/index.js', 'help', 'user']
            );
            expect(exitCode).toBe(0);
            expect(output).toContain('user create');
            expect(output).toContain('user list');
        });
    });

    describe('Global Options', () => {
        it('should apply global options', async () => {
            const { output } = await runCommand(
                'node',
                ['dist/index.js', '--verbose', 'hello']
            );
            expect(output).toContain('[DEBUG]');
            expect(output).toContain('Executing hello command');
        });

        it('should handle config file', async () => {
            const { output, exitCode } = await runCommand(
                'node',
                ['dist/index.js', '--config', 'test-config.json', 'hello']
            );
            expect(exitCode).toBe(0);
            // Config file behavior would depend on implementation
        });
    });

    describe('Scaffolding Tool', () => {
        it('should list available templates', async () => {
            const { output, exitCode } = await runCommand(
                'node',
                ['dist/index.js', 'scaffold', 'list']
            );
            expect(exitCode).toBe(0);
            expect(output).toContain('CLI Application');
            expect(output).toContain('Hybrid Application');
        });

        it('should create project from template', async () => {
            const tempDir = '/tmp/emir-test-project';

            const scenario = createScenario({ cwd: '/tmp' })
                .spawn('node', [join(process.cwd(), 'dist/index.js'), 'scaffold', 'create', 'test-app', 'cli-app'])
                .waitFor('Project created successfully')
                .waitFor('Next steps:');

            const { output } = await scenario.execute();
            expect(output).toContain('Project created successfully');
            expect(output).toContain('cd test-app');
        });
    });
});

describe('Performance Benchmarks', () => {
    let suite: ReturnType<typeof createBenchmarkSuite>;

    beforeAll(() => {
        suite = createBenchmarkSuite('./tests/benchmark-results');
    });

    it('benchmark CLI startup time', async () => {
        await suite.add('CLI Startup', async () => {
            await runCommand('node', ['dist/index.js', '--version']);
        }, { iterations: 50, warmup: 5 });

        const results = await suite.run();
        expect(results).toHaveLength(1);
        expect(results[0].opsPerSecond).toBeGreaterThan(10);
    }, 30000);

    it('benchmark command parsing', async () => {
        await suite.add('Command Parsing', async () => {
            await runCommand('node', ['dist/index.js', 'hello', '--name', 'Test', '--verbose']);
        }, { iterations: 100, warmup: 10 });

        const results = await suite.run();
        expect(results).toHaveLength(1);
        expect(results[0].opsPerSecond).toBeGreaterThan(50);
    }, 30000);

    it('benchmark help generation', async () => {
        await suite.add('Help Generation', async () => {
            await runCommand('node', ['dist/index.js', 'help']);
        }, { iterations: 50, warmup: 5 });

        const results = await suite.run();
        expect(results).toHaveLength(1);
        expect(results[0].duration).toBeLessThan(1000);
    }, 30000);

    it('benchmark scaffolding', async () => {
        await suite.add('Project Scaffolding', async () => {
            await runCommand('node', ['dist/index.js', 'scaffold', 'list']);
        }, { iterations: 20, warmup: 2 });

        const results = await suite.run();
        expect(results).toHaveLength(1);
        expect(results[0].duration).toBeLessThan(500);
    }, 30000);
});

describe('Integration Tests', () => {
    it('should complete full workflow', async () => {
        const scenario = createScenario()
            .spawn('node', ['dist/index.js'])
            .waitFor('>')
            .writeln('scaffold create my-app cli-app')
            .waitFor('Project created')
            .waitFor('>')
            .sendKey('ctrl-c')
            .spawn('node', ['dist/index.js'])
            .waitFor('>')
            .writeln('--version')
            .waitFor(/\d+\.\d+\.\d+/)
            .waitFor('>')
            .sendKey('ctrl-c');

        const { output } = await scenario.execute();
        expect(output).toContain('Project created');
        expect(output).toMatch(/\d+\.\d+\.\d+/);
    });

    it('should handle concurrent commands', async () => {
        const promises = Array.from({ length: 5 }, (_, i) =>
            runCommand('node', ['dist/index.js', 'hello', '--name', `User${i}`])
        );

        const results = await Promise.all(promises);
        results.forEach((result, i) => {
            expect(result.output).toContain(`Hello, User${i}!`);
            expect(result.exitCode).toBe(0);
        });
    });

    it('should maintain state across sessions', async () => {
        // First session
        const { output: firstOutput } = await runCommand(
            'node',
            ['dist/index.js', 'config', 'set', 'theme', 'dark']
        );

        // Second session
        const { output: secondOutput } = await runCommand(
            'node',
            ['dist/index.js', 'config', 'get', 'theme']
        );

        expect(firstOutput).toContain('Theme set to dark');
        expect(secondOutput).toContain('dark');
    });
});

describe('Edge Cases', () => {
    it('should handle very long arguments', async () => {
        const longArg = 'a'.repeat(10000);
        const { output, exitCode } = await runCommand(
            'node',
            ['dist/index.js', 'echo', longArg]
        );
        expect(exitCode).toBe(0);
        expect(output).toContain(longArg);
    });

    it('should handle special characters', async () => {
        const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
        const { output, exitCode } = await runCommand(
            'node',
            ['dist/index.js', 'echo', specialChars]
        );
        expect(exitCode).toBe(0);
        expect(output).toContain(specialChars);
    });

    it('should handle Unicode characters', async () => {
        const unicode = 'Hello 世界 🌍';
        const { output, exitCode } = await runCommand(
            'node',
            ['dist/index.js', 'echo', unicode]
        );
        expect(exitCode).toBe(0);
        expect(output).toContain(unicode);
    });

    it('should handle rapid input', async () => {
        const scenario = createScenario()
            .spawn('node', ['dist/index.js', 'interactive'])
            .waitFor('>');

        // Send rapid inputs
        for (let i = 0; i < 100; i++) {
            scenario.sendKey('up');
            scenario.sendKey('down');
        }

        scenario.sendKey('ctrl-c');

        const { exitCode } = await scenario.execute();
        expect(exitCode).toBe(0);
    });
});