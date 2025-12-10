import { AnsiUtils } from './ansi-utils.js';
import type { TerminalState, TerminalSize, TerminalCapabilities } from './types.js';

export class TerminalController {
    private originalState: TerminalState;
    private currentState: TerminalState;
    public capabilities: TerminalCapabilities;

    constructor() {
        this.originalState = {
            rawMode: false,
            cursorVisible: true,
            alternateScreen: false
        };
        this.currentState = { ...this.originalState };
        
        // Detect capabilities immediately
        this.capabilities = this.detectCapabilities();
        
        // Set up cleanup on process exit
        this.setupCleanupHandlers();
    }

    /**
     * Enable raw mode for terminal input
     */
    enableRawMode(): void {
        if (process.stdin.isTTY && !this.currentState.rawMode) {
            process.stdin.setRawMode(true);
            this.currentState.rawMode = true;
        }
    }

    /**
     * Disable raw mode and restore normal terminal input
     */
    disableRawMode(): void {
        if (process.stdin.isTTY && this.currentState.rawMode) {
            process.stdin.setRawMode(false);
            this.currentState.rawMode = false;
        }
    }

    /**
     * Clear the entire screen
     */
    clearScreen(): void {
        process.stdout.write(AnsiUtils.clearScreen());
        process.stdout.write(AnsiUtils.moveCursor(1, 1));
    }

    /**
     * Move cursor to specific position (1-based coordinates)
     */
    moveCursor(x: number, y: number): void {
        process.stdout.write(AnsiUtils.moveCursor(x, y));
    }

    /**
     * Hide the cursor
     */
    hideCursor(): void {
        if (this.currentState.cursorVisible) {
            process.stdout.write(AnsiUtils.hideCursor());
            this.currentState.cursorVisible = false;
        }
    }

    /**
     * Show the cursor
     */
    showCursor(): void {
        if (!this.currentState.cursorVisible) {
            process.stdout.write(AnsiUtils.showCursor());
            this.currentState.cursorVisible = true;
        }
    }

    /**
     * Get current terminal size
     */
    getTerminalSize(): TerminalSize {
        return {
            width: process.stdout.columns || 80,
            height: process.stdout.rows || 24
        };
    }

    /**
     * Write text at specific position
     */
    writeAt(x: number, y: number, text: string): void {
        process.stdout.write(AnsiUtils.writeAt(x, y, text));
    }

    /**
     * Enter alternate screen buffer
     */
    enterAlternateScreen(): void {
        if (!this.currentState.alternateScreen) {
            process.stdout.write(AnsiUtils.enterAlternateScreen());
            this.currentState.alternateScreen = true;
        }
    }

    /**
     * Exit alternate screen buffer
     */
    exitAlternateScreen(): void {
        if (this.currentState.alternateScreen) {
            process.stdout.write(AnsiUtils.exitAlternateScreen());
            this.currentState.alternateScreen = false;
        }
    }

    /**
     * Detect terminal capabilities
     */
    detectCapabilities(): TerminalCapabilities {
        const capabilities: TerminalCapabilities = {
            colors: this.detectColorSupport(),
            unicode: this.detectUnicodeSupport(),
            mouse: this.detectMouseSupport(),
            alternateScreen: this.detectAlternateScreenSupport()
        };

        return capabilities;
    }

    /**
     * Check if terminal supports TUI features
     */
    isTUISupported(): boolean {
        // Check if we have a TTY
        if (!process.stdout.isTTY || !process.stdin.isTTY) {
            return false;
        }

        // Check if we're in a supported environment
        const term = process.env.TERM;
        if (!term) {
            return false;
        }

        // Basic terminal type checks
        const unsupportedTerms = ['dumb', 'unknown'];
        if (unsupportedTerms.includes(term.toLowerCase())) {
            return false;
        }

        return true;
    }

    /**
     * Restore terminal to original state
     */
    restore(): void {
        if (this.currentState.alternateScreen) {
            this.exitAlternateScreen();
        }
        
        if (!this.currentState.cursorVisible) {
            this.showCursor();
        }
        
        if (this.currentState.rawMode) {
            this.disableRawMode();
        }

        // Reset any styling
        process.stdout.write(AnsiUtils.reset());
    }

    /**
     * Get current terminal state
     */
    getState(): TerminalState {
        return { ...this.currentState };
    }

    /**
     * Get original terminal state
     */
    getOriginalState(): TerminalState {
        return { ...this.originalState };
    }

    private detectColorSupport(): number {
        const colorTerm = process.env.COLORTERM;
        const term = process.env.TERM || '';

        // Check for 24-bit color support
        if (colorTerm === 'truecolor' || colorTerm === '24bit') {
            return 16777216; // 24-bit
        }

        // Check for 256-color support
        if (term.includes('256') || term.includes('256color')) {
            return 256;
        }

        // Check for basic color support
        if (term.includes('color') || process.stdout.hasColors?.()) {
            return 16;
        }

        return 0; // No color support
    }

    private detectUnicodeSupport(): boolean {
        const lang = process.env.LANG || process.env.LC_ALL || '';
        return lang.toLowerCase().includes('utf');
    }

    private detectMouseSupport(): boolean {
        // Most modern terminals support mouse, but we'll be conservative
        const term = process.env.TERM || '';
        return term.includes('xterm') || term.includes('screen') || term.includes('tmux');
    }

    private detectAlternateScreenSupport(): boolean {
        // Most terminals support alternate screen
        const term = process.env.TERM || '';
        return !['dumb', 'unknown'].includes(term.toLowerCase());
    }

    private setupCleanupHandlers(): void {
        const cleanup = () => {
            this.restore();
        };

        // Handle various exit scenarios
        process.on('exit', cleanup);
        process.on('SIGINT', () => {
            cleanup();
            process.exit(0);
        });
        process.on('SIGTERM', () => {
            cleanup();
            process.exit(0);
        });
        process.on('uncaughtException', (error) => {
            cleanup();
            console.error('Uncaught Exception:', error);
            process.exit(1);
        });
        process.on('unhandledRejection', (reason) => {
            cleanup();
            console.error('Unhandled Rejection:', reason);
            process.exit(1);
        });
    }
}