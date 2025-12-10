import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TerminalController } from '../terminal-controller.js';

// Mock process.stdout and process.stdin
const mockStdout = {
    write: vi.fn(),
    isTTY: true,
    columns: 80,
    rows: 24,
    hasColors: vi.fn(() => true),
    on: vi.fn()
};

const mockStdin = {
    isTTY: true,
    setRawMode: vi.fn()
};

const mockEnv = {
    TERM: 'xterm-256color',
    COLORTERM: 'truecolor',
    LANG: 'en_US.UTF-8'
};

const mockProcess = {
    stdout: mockStdout,
    stdin: mockStdin,
    env: mockEnv,
    on: vi.fn(),
    exit: vi.fn()
};

// Mock the global process object
vi.stubGlobal('process', mockProcess);

describe('TerminalController', () => {
    let terminal: TerminalController;

    beforeEach(() => {
        vi.clearAllMocks();
        // Reset mock values
        mockStdout.isTTY = true;
        mockStdin.isTTY = true;
        mockEnv.TERM = 'xterm-256color';
        mockEnv.COLORTERM = 'truecolor';
        mockEnv.LANG = 'en_US.UTF-8';
        terminal = new TerminalController();
    });

    afterEach(() => {
        terminal.restore();
    });

    describe('Raw mode control', () => {
        it('should enable raw mode when TTY is available', () => {
            terminal.enableRawMode();
            expect(mockStdin.setRawMode).toHaveBeenCalledWith(true);
        });

        it('should disable raw mode', () => {
            terminal.enableRawMode();
            terminal.disableRawMode();
            expect(mockStdin.setRawMode).toHaveBeenCalledWith(false);
        });

        it('should not enable raw mode if not TTY', () => {
            mockStdin.isTTY = false;
            terminal.enableRawMode();
            expect(mockStdin.setRawMode).not.toHaveBeenCalled();
        });
    });

    describe('Screen control', () => {
        it('should clear screen and move cursor to home', () => {
            terminal.clearScreen();
            expect(mockStdout.write).toHaveBeenCalledWith('\x1b[2J');
            expect(mockStdout.write).toHaveBeenCalledWith('\x1b[1;1H');
        });

        it('should move cursor to specified position', () => {
            terminal.moveCursor(10, 5);
            expect(mockStdout.write).toHaveBeenCalledWith('\x1b[5;10H');
        });

        it('should write text at specified position', () => {
            terminal.writeAt(10, 5, 'Hello');
            expect(mockStdout.write).toHaveBeenCalledWith('\x1b[5;10HHello');
        });
    });

    describe('Cursor visibility', () => {
        it('should hide cursor', () => {
            terminal.hideCursor();
            expect(mockStdout.write).toHaveBeenCalledWith('\x1b[?25l');
        });

        it('should show cursor', () => {
            terminal.hideCursor();
            terminal.showCursor();
            expect(mockStdout.write).toHaveBeenCalledWith('\x1b[?25h');
        });

        it('should not hide cursor if already hidden', () => {
            terminal.hideCursor();
            vi.clearAllMocks();
            terminal.hideCursor();
            expect(mockStdout.write).not.toHaveBeenCalled();
        });
    });

    describe('Alternate screen', () => {
        it('should enter alternate screen', () => {
            terminal.enterAlternateScreen();
            expect(mockStdout.write).toHaveBeenCalledWith('\x1b[?1049h');
        });

        it('should exit alternate screen', () => {
            terminal.enterAlternateScreen();
            terminal.exitAlternateScreen();
            expect(mockStdout.write).toHaveBeenCalledWith('\x1b[?1049l');
        });

        it('should not enter alternate screen if already active', () => {
            terminal.enterAlternateScreen();
            vi.clearAllMocks();
            terminal.enterAlternateScreen();
            expect(mockStdout.write).not.toHaveBeenCalled();
        });
    });

    describe('Terminal size', () => {
        it('should return current terminal size', () => {
            const size = terminal.getTerminalSize();
            expect(size).toEqual({ width: 80, height: 24 });
        });

        it('should return default size when columns/rows not available', () => {
            mockStdout.columns = undefined as any;
            mockStdout.rows = undefined as any;
            const size = terminal.getTerminalSize();
            expect(size).toEqual({ width: 80, height: 24 });
        });
    });

    describe('TUI support detection', () => {
        it('should detect TUI support with proper TTY and TERM', () => {
            expect(terminal.isTUISupported()).toBe(true);
        });

        it('should not support TUI without TTY', () => {
            mockStdout.isTTY = false;
            expect(terminal.isTUISupported()).toBe(false);
        });

        it('should not support TUI without TERM environment variable', () => {
            mockEnv.TERM = undefined as any;
            expect(terminal.isTUISupported()).toBe(false);
        });

        it('should not support TUI with unsupported terminal types', () => {
            mockEnv.TERM = 'dumb';
            expect(terminal.isTUISupported()).toBe(false);
        });
    });

    describe('Capability detection', () => {
        it('should detect 24-bit color support', () => {
            const capabilities = terminal.detectCapabilities();
            expect(capabilities.colors).toBe(16777216);
        });

        it('should detect 256-color support', () => {
            mockEnv.COLORTERM = undefined as any;
            mockEnv.TERM = 'xterm-256color';
            const capabilities = terminal.detectCapabilities();
            expect(capabilities.colors).toBe(256);
        });

        it('should detect basic color support', () => {
            mockEnv.COLORTERM = undefined as any;
            mockEnv.TERM = 'xterm-color';
            const capabilities = terminal.detectCapabilities();
            expect(capabilities.colors).toBe(16);
        });

        it('should detect no color support', () => {
            mockEnv.COLORTERM = undefined as any;
            mockEnv.TERM = 'dumb';
            mockStdout.hasColors = vi.fn(() => false);
            const capabilities = terminal.detectCapabilities();
            expect(capabilities.colors).toBe(0);
        });

        it('should detect unicode support', () => {
            mockEnv.LANG = 'en_US.UTF-8';
            const capabilities = terminal.detectCapabilities();
            expect(capabilities.unicode).toBe(true);
        });

        it('should detect mouse support for xterm', () => {
            const capabilities = terminal.detectCapabilities();
            expect(capabilities.mouse).toBe(true);
        });

        it('should cache capabilities after first detection', () => {
            const caps1 = terminal.detectCapabilities();
            const caps2 = terminal.detectCapabilities();
            expect(caps1).toBe(caps2); // Same object reference
        });
    });

    describe('State management', () => {
        it('should track current state', () => {
            const initialState = terminal.getState();
            expect(initialState.rawMode).toBe(false);
            expect(initialState.cursorVisible).toBe(true);
            expect(initialState.alternateScreen).toBe(false);

            terminal.enableRawMode();
            terminal.hideCursor();
            terminal.enterAlternateScreen();

            const currentState = terminal.getState();
            expect(currentState.rawMode).toBe(true);
            expect(currentState.cursorVisible).toBe(false);
            expect(currentState.alternateScreen).toBe(true);
        });

        it('should preserve original state', () => {
            terminal.enableRawMode();
            terminal.hideCursor();
            terminal.enterAlternateScreen();

            const originalState = terminal.getOriginalState();
            expect(originalState.rawMode).toBe(false);
            expect(originalState.cursorVisible).toBe(true);
            expect(originalState.alternateScreen).toBe(false);
        });
    });

    describe('Restoration', () => {
        it('should restore terminal to original state', () => {
            terminal.enableRawMode();
            terminal.hideCursor();
            terminal.enterAlternateScreen();

            vi.clearAllMocks();
            terminal.restore();

            expect(mockStdout.write).toHaveBeenCalledWith('\x1b[?1049l'); // Exit alternate screen
            expect(mockStdout.write).toHaveBeenCalledWith('\x1b[?25h');   // Show cursor
            expect(mockStdout.write).toHaveBeenCalledWith('\x1b[0m');     // Reset styling
            expect(mockStdin.setRawMode).toHaveBeenCalledWith(false);     // Disable raw mode
        });

        it('should only restore changed settings', () => {
            // Only enable raw mode
            terminal.enableRawMode();

            vi.clearAllMocks();
            terminal.restore();

            expect(mockStdout.write).toHaveBeenCalledWith('\x1b[0m');     // Reset styling
            expect(mockStdin.setRawMode).toHaveBeenCalledWith(false);     // Disable raw mode
            expect(mockStdout.write).not.toHaveBeenCalledWith('\x1b[?1049l'); // Should not exit alternate screen
            expect(mockStdout.write).not.toHaveBeenCalledWith('\x1b[?25h');   // Should not show cursor (already visible)
        });
    });
});