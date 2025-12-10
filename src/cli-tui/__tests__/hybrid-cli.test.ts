import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HybridCLI, TUICommand } from '../hybrid-cli';
import { Command } from '../../index';
import { TerminalController } from '../../tui/terminal-controller';

// Mock the TUI module
vi.mock('../../tui/tui', () => ({
    TUI: vi.fn().mockImplementation(() => ({
        start: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn(),
        setRootComponent: vi.fn()
    }))
}));

// Mock the TerminalController
vi.mock('../../tui/terminal-controller', () => ({
    TerminalController: vi.fn().mockImplementation(() => ({
        capabilities: {
            alternateScreen: true,
            colors: 256,
            unicode: true,
            mouse: false
        },
        enterAlternateScreen: vi.fn(),
        exitAlternateScreen: vi.fn(),
        hideCursor: vi.fn(),
        showCursor: vi.fn(),
        clearScreen: vi.fn(),
        restore: vi.fn()
    }))
}));

describe('HybridCLI', () => {
    let cli: HybridCLI;
    let consoleLogSpy: any;
    let consoleWarnSpy: any;
    let consoleErrorSpy: any;

    beforeEach(() => {
        cli = new HybridCLI('test-cli', '1.0.0', 'Test CLI');
        consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.clearAllMocks();
        consoleLogSpy.mockRestore();
        consoleWarnSpy.mockRestore();
        consoleErrorSpy.mockRestore();
    });

    describe('Constructor', () => {
        it('should initialize with default options', () => {
            const cli = new HybridCLI('test', '1.0.0', 'Test');
            expect(cli.getCurrentMode()).toBe('cli');
            expect(cli.name).toBe('test');
            expect(cli.version).toBe('1.0.0');
        });

        it('should accept custom options', () => {
            const cli = new HybridCLI('test', '1.0.0', 'Test', {
                defaultMode: 'tui',
                allowModeSwitch: false,
                tuiEnabled: false
            });
            expect(cli.getCurrentMode()).toBe('tui');
        });

        it('should add interactive global option', () => {
            expect(cli.globalOptions).toContainEqual(
                expect.objectContaining({
                    short: 'i',
                    long: 'interactive',
                    description: 'Launch in interactive TUI mode'
                })
            );
        });
    });

    describe('Mode Management', () => {
        it('should get current mode', () => {
            expect(cli.getCurrentMode()).toBe('cli');
        });

        it('should set mode', () => {
            cli.setMode('tui');
            expect(cli.getCurrentMode()).toBe('tui');
            
            cli.setMode('auto');
            expect(cli.getCurrentMode()).toBe('auto');
        });

        it('should warn when mode switching is disabled', () => {
            const cli = new HybridCLI('test', '1.0.0', 'Test', {
                allowModeSwitch: false
            });
            cli.setMode('tui');
            expect(consoleWarnSpy).toHaveBeenCalledWith('Mode switching is disabled');
        });

        it('should warn when TUI mode is disabled', () => {
            const cli = new HybridCLI('test', '1.0.0', 'Test', {
                tuiEnabled: false
            });
            cli.setMode('tui');
            expect(consoleWarnSpy).toHaveBeenCalledWith('TUI mode is disabled');
        });
    });

    describe('Hybrid Commands', () => {
        it('should add hybrid command', () => {
            const command = new Command('test', 'Test command', () => {});
            const tuiCommand = new TestTUICommand();
            
            cli.addHybridCommand(command, tuiCommand);
            
            expect(cli.commands).toContainEqual(command);
        });

        it('should add regular command without TUI', () => {
            const command = new Command('test', 'Test command', () => {});
            cli.addHybridCommand(command);
            expect(cli.commands).toContainEqual(command);
        });
    });

    describe('Parse with Interactive Mode', () => {
        it('should detect interactive flag', () => {
            const command = new Command('test', 'Test command', vi.fn());
            cli.addCommand(command);
            
            // Mock to prevent actual TUI launch
            const launchMenuSpy = vi.spyOn(cli as any, 'launchInteractiveMenu')
                .mockImplementation(() => Promise.resolve());
            
            cli.parse(['-i']);
            
            expect(launchMenuSpy).toHaveBeenCalled();
        });

        it('should remove interactive flag from args', () => {
            const action = vi.fn();
            const command = new Command('test', 'Test command', action);
            cli.addCommand(command);
            
            // Test with --interactive flag
            cli.parse(['test', '--interactive', 'arg1']);
            
            // The command should receive args without the flag
            expect(action).toHaveBeenCalledWith(['arg1'], expect.any(Object));
        });

        it('should execute command in CLI mode when no interactive flag', () => {
            const action = vi.fn();
            const command = new Command('test', 'Test command', action);
            cli.addCommand(command);
            
            cli.parse(['test', 'arg1']);
            
            expect(action).toHaveBeenCalledWith(['arg1'], expect.any(Object));
        });
    });

    describe('Dialog Methods', () => {
        it('should have confirm method', () => {
            expect(cli.confirm).toBeDefined();
            expect(typeof cli.confirm).toBe('function');
        });

        it('should have prompt method', () => {
            expect(cli.prompt).toBeDefined();
            expect(typeof cli.prompt).toBe('function');
        });

        it('should have alert method', () => {
            expect(cli.alert).toBeDefined();
            expect(typeof cli.alert).toBe('function');
        });

        it('should fall back to console in CLI mode for confirm', async () => {
            const result = await cli.confirm('Test message');
            expect(consoleLogSpy).toHaveBeenCalledWith('Confirm: Test message (y/n)');
            expect(result).toBe(true); // Placeholder returns true
        });

        it('should fall back to console in CLI mode for prompt', async () => {
            const result = await cli.prompt('Test message', 'Title', 'default');
            expect(consoleLogSpy).toHaveBeenCalledWith('Title: Test message');
            expect(result).toBe('default');
        });

        it('should fall back to console in CLI mode for alert', async () => {
            await cli.alert('Test message', 'Title');
            expect(consoleLogSpy).toHaveBeenCalledWith('Title: Test message');
        });
    });

    describe('Cleanup', () => {
        it('should have dispose method', () => {
            expect(cli.dispose).toBeDefined();
            cli.dispose();
            // Should not throw
        });
    });
});

/**
 * Test TUI Command implementation
 */
class TestTUICommand extends TUICommand {
    constructor() {
        super('test', 'Test TUI command');
    }

    async execute(args: string[], terminal: TerminalController): Promise<void> {
        // Mock implementation
    }
}
