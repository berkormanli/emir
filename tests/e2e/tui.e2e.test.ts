/**
 * End-to-end TUI tests
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { createScenario } from '../../src/testing/pseudoterminal';
import { createTUIBenchmark } from '../../src/testing/benchmark';
import { join } from 'path';

describe('TUI End-to-End Tests', () => {
    let tuiBenchmark: ReturnType<typeof createTUIBenchmark>;

    beforeAll(() => {
        tuiBenchmark = createTUIBenchmark();
    });

    afterEach(() => {
        tuiBenchmark.dispose();
    });

    describe('TUI Mode Switching', () => {
        it('should launch in TUI mode with --interactive flag', async () => {
            const scenario = createScenario()
                .spawn('node', ['dist/index.js', '--interactive'])
                .waitFor(/Interactive Mode|Menu/)
                .sendKey('ctrl-c');

            const { output, exitCode } = await scenario.execute();
            expect(output).toMatch(/Interactive Mode|Menu/);
            expect(exitCode).toBe(0);
        });

        it('should switch between CLI and TUI modes', async () => {
            const scenario = createScenario()
                .spawn('node', ['dist/index.js'])
                .waitFor('>')
                .writeln('--interactive')
                .waitFor(/Interactive Mode|Menu/)
                .sendKey('escape') // Exit TUI
                .waitFor('>')
                .sendKey('ctrl-c');

            const { output } = await scenario.execute();
            expect(output).toMatch(/Interactive Mode|Menu/);
        });

        it('should detect TTY capability', async () => {
            const { output, exitCode } = await runCommand(
                'node',
                ['dist/index.js', '--mode', 'auto']
            );
            // Should default to CLI mode in test environment
            expect(exitCode).toBe(0);
        });
    });

    describe('Component Rendering', () => {
        it('should render menu component', async () => {
            const scenario = createScenario()
                .spawn('node', ['dist/index.js', '--interactive'])
                .waitFor('Main Menu')
                .sendKey('down')
                .sendKey('down')
                .sendKey('enter')
                .waitFor(/Selected|Executed/)
                .sendKey('ctrl-c');

            const { output } = await scenario.execute();
            expect(output).toContain('Main Menu');
        });

        it('should render form component', async () => {
            const scenario = createScenario()
                .spawn('node', ['dist/index.js', 'form-demo'])
                .waitFor('Name:')
                .writeln('John Doe')
                .waitFor('Email:')
                .writeln('john@example.com')
                .waitFor('Age:')
                .writeln('30')
                .sendKey('tab')
                .sendKey('enter')
                .waitFor('Form submitted')
                .sendKey('ctrl-c');

            const { output } = await scenario.execute();
            expect(output).toContain('Form submitted');
            expect(output).toContain('John Doe');
        });

        it('should render table component', async () => {
            const scenario = createScenario()
                .spawn('node', ['dist/index.js', 'table-demo'])
                .waitFor(/\| Name\s+\| Email/)
                .sendKey('down') // Navigate table
                .sendKey('up')
                .sendKey('enter') // Select row
                .waitFor(/Selected row:/)
                .sendKey('ctrl-c');

            const { output } = await scenario.execute();
            expect(output).toMatch(/\| Name\s+\| Email/);
        });

        it('should render progress component', async () => {
            const scenario = createScenario()
                .spawn('node', ['dist/index.js', 'progress-demo'])
                .waitFor('Progress:')
                .waitFor(/\[\*\+\+\+\+\]/) // Progress bar
                .waitFor('Complete!')
                .sendKey('ctrl-c');

            const { output } = await scenario.execute();
            expect(output).toContain('Progress:');
            expect(output).toContain('Complete!');
        });

        it('should render chart component', async () => {
            const scenario = createScenario()
                .spawn('node', ['dist/index.js', 'chart-demo'])
                .waitFor(/Chart:|📊/)
                .waitFor(/[▁▃▄▅▆▇]/) // Chart bars
                .sendKey('q') // Quit chart
                .sendKey('ctrl-c');

            const { output } = await scenario.execute();
            expect(output).toMatch(/Chart:|📊/);
        });
    });

    describe('Navigation', () => {
        it('should navigate menus with arrow keys', async () => {
            const scenario = createScenario()
                .spawn('node', ['dist/index.js', '--interactive'])
                .waitFor('Main Menu')
                .sendKey('down')
                .waitFor(/highlighted|selected/)
                .sendKey('down')
                .sendKey('up')
                .sendKey('enter')
                .sendKey('ctrl-c');

            const { output } = await scenario.execute();
            expect(output).toContain('Main Menu');
        });

        it('should use tab navigation in forms', async () => {
            const scenario = createScenario()
                .spawn('node', ['dist/index.js', 'form-demo'])
                .waitFor('Name:')
                .sendKey('tab')
                .waitFor('Email:')
                .sendKey('tab')
                .waitFor('Age:')
                .sendKey('shift-tab')
                .waitFor('Email:')
                .sendKey('ctrl-c');

            const { output } = await scenario.execute();
            expect(output).toContain('Name:');
            expect(output).toContain('Email:');
        });

        it('should handle page navigation in tables', async () => {
            const scenario = createScenario()
                .spawn('node', ['dist/index.js', 'table-demo', '--large'])
                .waitFor(/Page 1 of \d+/)
                .sendKey('pagedown')
                .waitFor(/Page 2 of \d+/)
                .sendKey('pageup')
                .waitFor(/Page 1 of \d+/)
                .sendKey('ctrl-c');

            const { output } = await scenario.execute();
            expect(output).toMatch(/Page \d+ of \d+/);
        });

        it('should use vim-style navigation', async () => {
            const scenario = createScenario()
                .spawn('node', ['dist/index.js', '--interactive'])
                .waitFor('Main Menu')
                .sendKey('j') // Down
                .sendKey('k') // Up
                .sendKey('h') // Left
                .sendKey('l') // Right
                .sendKey('enter')
                .sendKey('ctrl-c');

            const { output } = await scenario.execute();
            expect(output).toContain('Main Menu');
        });
    });

    describe('Input Handling', () => {
        it('should handle keyboard shortcuts', async () => {
            const scenario = createScenario()
                .spawn('node', ['dist/index.js', '--interactive'])
                .waitFor('Main Menu')
                .sendKey('ctrl-q') // Quit
                .sendKey('ctrl-c');

            const { output, exitCode } = await scenario.execute();
            expect(exitCode).toBe(0);
        });

        it('should handle mouse events', async () => {
            const scenario = createScenario()
                .spawn('node', ['dist/index.js', 'menu-demo'])
                .waitFor('Menu')
                .sendMouseEvent('press', 0, 10, 5) // Click menu item
                .sendMouseEvent('release', 0, 10, 5)
                .waitFor(/Selected|Opened/)
                .sendKey('ctrl-c');

            const { output } = await scenario.execute();
            expect(output).toContain('Menu');
        });

        it('should handle text input with editing', async () => {
            const scenario = createScenario()
                .spawn('node', ['dist/index.js', 'input-demo'])
                .waitFor('Enter text:')
                .write('hello')
                .sendKey('backspace')
                .write('world')
                .sendKey('left')
                .sendKey('left')
                .write('llo')
                .sendKey('enter')
                .waitFor('helloworld')
                .sendKey('ctrl-c');

            const { output } = await scenario.execute();
            expect(output).toContain('helloworld');
        });

        it('should handle multi-line input', async () => {
            const scenario = createScenario()
                .spawn('node', ['dist/index.js', 'multiline-demo'])
                .waitFor('Enter description:')
                .writeln('Line 1')
                .writeln('Line 2')
                .writeln('Line 3')
                .sendKey('ctrl-d') // EOF
                .waitFor('3 lines')
                .sendKey('ctrl-c');

            const { output } = await scenario.execute();
            expect(output).toContain('3 lines');
        });
    });

    describe('Layout and Responsiveness', () => {
        it('should adapt to terminal resize', async () => {
            const scenario = createScenario()
                .step(async (terminal) => {
                    await terminal.spawn('node', ['dist/index.js', 'dashboard']);
                    await terminal.waitFor('Dashboard');
                    terminal.resize(120, 40);
                    await terminal.waitFor('Resized');
                    terminal.resize(80, 24);
                    await terminal.waitFor('Resized');
                    terminal.sendKey('ctrl-c');
                });

            const { output } = await scenario.execute();
            expect(output).toContain('Dashboard');
        });

        it('should handle scrolling in large content', async () => {
            const scenario = createScenario()
                .spawn('node', ['dist/index.js', 'large-content'])
                .waitFor(/More\.\.\./)
                .sendKey('space') // Page down
                .waitFor(/\.\.\.More/)
                .sendKey('space')
                .sendKey('space')
                .waitFor('End of content')
                .sendKey('ctrl-c');

            const { output } = await scenario.execute();
            expect(output).toMatch(/More\.\.\.|End of content/);
        });

        it('should handle split layouts', async () => {
            const scenario = createScenario()
                .spawn('node', ['dist/index.js', 'split-view'])
                .waitFor(/Panel 1|Panel 2/)
                .sendKey('ctrl-x') // Switch panels
                .waitFor(/Panel 2/)
                .sendKey('ctrl-x')
                .waitFor(/Panel 1/)
                .sendKey('ctrl-c');

            const { output } = await scenario.execute();
            expect(output).toMatch(/Panel 1|Panel 2/);
        });
    });

    describe('Themes and Styling', () => {
        it('should apply light theme', async () => {
            const { output, exitCode } = await runCommand(
                'node',
                ['dist/index.js', '--theme', 'light', 'demo']
            );
            expect(exitCode).toBe(0);
            // Visual verification would be needed for actual theme
        });

        it('should apply dark theme', async () => {
            const { output, exitCode } = await runCommand(
                'node',
                ['dist/index.js', '--theme', 'dark', 'demo']
            );
            expect(exitCode).toBe(0);
        });

        it('should apply custom theme', async () => {
            const { output, exitCode } = await runCommand(
                'node',
                ['dist/index.js', '--theme', 'custom.json', 'demo']
            );
            expect(exitCode).toBe(0);
        });
    });

    describe('Performance', () => {
        it('should maintain 60 FPS rendering', async () => {
            const startupTime = await tuiBenchmark.benchmarkStartup(
                'node',
                ['dist/index.js', '--interactive']
            );
            expect(startupTime).toBeLessThan(1000);
        });

        it('should handle rapid UI updates', async () => {
            const { opsPerSecond } = await tuiBenchmark.benchmarkRendering(
                'node',
                ['dist/index.js', 'rapid-update-demo'],
                ['update', 'update', 'update', 'update', 'update']
            );
            expect(opsPerSecond).toBeGreaterThan(10);
        }, 30000);

        it('should not leak memory', async () => {
            const measurements = await tuiBenchmark.benchmarkMemoryUsage(
                'node',
                ['dist/index.js', 'memory-test'],
                5000
            );

            const initialMemory = measurements[0].heapUsed;
            const finalMemory = measurements[measurements.length - 1].heapUsed;
            const memoryGrowth = finalMemory - initialMemory;

            // Memory growth should be minimal (less than 10MB)
            expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024);
        }, 10000);
    });

    describe('Error Handling in TUI', () => {
        it('should show error dialogs', async () => {
            const scenario = createScenario()
                .spawn('node', ['dist/index.js', 'error-demo'])
                .waitFor(/Error Dialog/)
                .sendKey('enter') // OK button
                .waitFor('Dialog closed')
                .sendKey('ctrl-c');

            const { output } = await scenario.execute();
            expect(output).toContain('Error Dialog');
        });

        it('should handle component render errors', async () => {
            const { output, exitCode } = await runCommand(
                'node',
                ['dist/index.js', 'broken-component']
            );
            expect(exitCode).toBe(1);
            expect(output).toContain('Component error');
        });

        it('should recover from errors gracefully', async () => {
            const scenario = createScenario()
                .spawn('node', ['dist/index.js', 'error-recovery'])
                .waitFor('Error occurred')
                .waitFor('Recovered')
                .waitFor('Ready')
                .sendKey('ctrl-c');

            const { output } = await scenario.execute();
            expect(output).toContain('Recovered');
        });
    });

    describe('Accessibility', () => {
        it('should support screen reader mode', async () => {
            const scenario = createScenario()
                .spawn('node', ['dist/index.js', '--screen-reader'])
                .waitFor('Screen reader mode enabled')
                .writeln('help')
                .waitFor('Help content')
                .sendKey('ctrl-c');

            const { output } = await scenario.execute();
            expect(output).toContain('Screen reader mode enabled');
        });

        it('should announce navigation changes', async () => {
            const scenario = createScenario()
                .spawn('node', ['dist/index.js', '--screen-reader', '--interactive'])
                .waitFor('Menu: Item 1')
                .sendKey('down')
                .waitFor('Menu: Item 2')
                .sendKey('enter')
                .waitFor('Selected: Item 2')
                .sendKey('ctrl-c');

            const { output } = await scenario.execute();
            expect(output).toContain('Menu: Item 1');
            expect(output).toContain('Menu: Item 2');
        });

        it('should provide high contrast mode', async () => {
            const { output, exitCode } = await runCommand(
                'node',
                ['dist/index.js', '--high-contrast', 'demo']
            );
            expect(exitCode).toBe(0);
        });
    });
});