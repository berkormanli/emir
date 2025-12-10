/**
 * Pseudo-terminal for end-to-end testing
 */

import { EventEmitter } from 'node:events';
import { Writable, Readable } from 'node:stream';

// Bun-compatible process spawning
const getProcessSpawner = () => {
    if (typeof Bun !== 'undefined') {
        // Bun-specific implementation
        return {
            spawn: (command: string, args: string[]) => {
                const proc = Bun.spawn([command, ...args]);
                return {
                    stdout: proc.stdout,
                    stderr: proc.stderr,
                    stdin: proc.stdin,
                    pid: proc.pid,
                    kill: (signal?: string) => proc.kill(signal || 'SIGTERM'),
                    on: (event: string, handler: Function) => {
                        if (event === 'exit') {
                            proc.exited.then((code) => handler(code));
                        }
                    },
                    once: (event: string, handler: Function) => {
                        if (event === 'exit') {
                            proc.exited.then(handler);
                        }
                    }
                };
            },
            createInterface: () => ({
                on: () => {},
                close: () => {}
            })
        };
    } else {
        // Fallback to Node.js modules
        const { spawn: nodeSpawn, ChildProcess } = require('child_process');
        const { createInterface: nodeCreateInterface } = require('readline');
        return {
            spawn: nodeSpawn,
            createInterface: nodeCreateInterface
        };
    }
};

const { spawn, createInterface } = getProcessSpawner();

/**
 * Pseudo-terminal options
 */
export interface PseudoTerminalOptions {
    cols?: number;
    rows?: number;
    env?: Record<string, string>;
    cwd?: string;
    shell?: boolean;
    timeout?: number;
}

/**
 * Pseudo-terminal events
 */
export interface PseudoTerminalEvents {
    'data': (data: string) => void;
    'exit': (code: number | null) => void;
    'error': (error: Error) => void;
    'prompt': () => void;
}

/**
 * Pseudo-terminal implementation
 */
export class PseudoTerminal extends EventEmitter {
    private process: ChildProcess | null = null;
    private stdin: Writable | null = null;
    private stdout: Readable | null = null;
    private stderr: Readable | null = null;
    private readline: Interface | null = null;
    private buffer: string = '';
    private options: Required<PseudoTerminalOptions>;
    private exitPromise: Promise<number | null> | null = null;

    constructor(options: PseudoTerminalOptions = {}) {
        super();

        this.options = {
            cols: options.cols || 80,
            rows: options.rows || 24,
            env: { ...process.env, ...options.env },
            cwd: options.cwd || process.cwd(),
            shell: options.shell !== false,
            timeout: options.timeout || 30000
        };
    }

    /**
     * Spawn a new process
     */
    async spawn(command: string, args: string[] = []): Promise<void> {
        return new Promise((resolve, reject) => {
            this.process = spawn(command, args, {
                env: this.options.env,
                cwd: this.options.cwd,
                shell: this.options.shell,
                stdio: 'pipe'
            });

            if (!this.process.stdin || !this.process.stdout || !this.process.stderr) {
                reject(new Error('Failed to create process streams'));
                return;
            }

            this.stdin = this.process.stdin;
            this.stdout = this.process.stdout;
            this.stderr = this.process.stderr;

            // Setup readline for better input handling
            this.readline = createInterface({
                input: this.stdout,
                terminal: true
            });

            // Handle stdout
            this.stdout.on('data', (data: Buffer) => {
                const text = data.toString();
                this.buffer += text;
                this.emit('data', text);

                // Detect prompt (simple heuristic)
                if (text.includes('$') || text.includes('>')) {
                    this.emit('prompt');
                }
            });

            // Handle stderr
            this.stderr.on('data', (data: Buffer) => {
                const text = data.toString();
                this.buffer += text;
                this.emit('data', text);
            });

            // Handle process exit
            this.process.on('exit', (code) => {
                this.emit('exit', code);
            });

            // Handle errors
            this.process.on('error', (error) => {
                this.emit('error', error);
            });

            this.process.once('spawn', () => {
                resolve();
            });

            // Setup exit promise
            this.exitPromise = new Promise((resolve) => {
                this.process!.once('exit', resolve);
            });
        });
    }

    /**
     * Write data to stdin
     */
    write(data: string): void {
        if (this.stdin && !this.stdin.destroyed) {
            this.stdin.write(data);
        }
    }

    /**
     * Write a line followed by newline
     */
    writeln(data: string): void {
        this.write(data + '\n');
    }

    /**
     * Send special keys
     */
    sendKey(key: string): void {
        const keys: Record<string, string> = {
            'enter': '\r',
            'escape': '\x1b',
            'tab': '\t',
            'backspace': '\x7f',
            'delete': '\x1b[3~',
            'up': '\x1b[A',
            'down': '\x1b[B',
            'left': '\x1b[D',
            'right': '\x1b[C',
            'home': '\x1b[H',
            'end': '\x1b[F',
            'pageup': '\x1b[5~',
            'pagedown': '\x1b[6~',
            'ctrl-c': '\x03',
            'ctrl-d': '\x04',
            'ctrl-z': '\x1a'
        };

        const sequence = keys[key.toLowerCase()];
        if (sequence) {
            this.write(sequence);
        } else {
            this.write(key);
        }
    }

    /**
     * Send mouse events (xterm-compatible)
     */
    sendMouseEvent(type: 'press' | 'release' | 'move', button: number, x: number, y: number): void {
        const code = button === 0 ? 32 : button - 1;
        const sequence = `\x1b[M${String.fromCharCode(code + 32)}${String.fromCharCode(x + 33)}${String.fromCharCode(y + 33)}`;
        this.write(sequence);
    }

    /**
     * Wait for a pattern in the output
     */
    async waitFor(pattern: RegExp | string, timeout: number = 5000): Promise<string> {
        return new Promise((resolve, reject) => {
            const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
            const timeoutId = setTimeout(() => {
                this.removeListener('data', onData);
                reject(new Error(`Timeout waiting for pattern: ${pattern}`));
            }, timeout);

            const onData = (data: string) => {
                if (regex.test(data)) {
                    clearTimeout(timeoutId);
                    this.removeListener('data', onData);
                    resolve(data);
                }
            };

            this.on('data', onData);

            // Check if pattern already exists in buffer
            if (regex.test(this.buffer)) {
                clearTimeout(timeoutId);
                this.removeListener('data', onData);
                resolve(this.buffer);
            }
        });
    }

    /**
     * Wait for prompt
     */
    async waitForPrompt(timeout: number = 5000): Promise<void> {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                this.removeListener('prompt', onPrompt);
                reject(new Error('Timeout waiting for prompt'));
            }, timeout);

            const onPrompt = () => {
                clearTimeout(timeoutId);
                this.removeListener('prompt', onPrompt);
                resolve();
            };

            this.on('prompt', onPrompt);

            // Check if already at prompt
            if (/\$|>/.test(this.buffer)) {
                clearTimeout(timeoutId);
                this.removeListener('prompt', onPrompt);
                resolve();
            }
        });
    }

    /**
     * Get the current output buffer
     */
    getOutput(): string {
        return this.buffer;
    }

    /**
     * Clear the output buffer
     */
    clearBuffer(): void {
        this.buffer = '';
    }

    /**
     * Get the exit code
     */
    async getExitCode(): Promise<number | null> {
        if (!this.exitPromise) {
            throw new Error('Process not spawned');
        }
        return this.exitPromise;
    }

    /**
     * Kill the process
     */
    kill(signal?: string): void {
        if (this.process) {
            this.process.kill(signal);
        }
    }

    /**
     * Resize the terminal
     */
    resize(cols: number, rows: number): void {
        if (this.process && this.process.pid) {
            // On Unix systems, we can send SIGWINCH
            if (process.platform !== 'win32') {
                this.process.kill('SIGWINCH');
            }
        }
    }

    /**
     * Clean up resources
     */
    dispose(): void {
        if (this.readline) {
            this.readline.close();
        }
        if (this.stdin) {
            this.stdin.end();
        }
        this.removeAllListeners();
    }
}

/**
 * Helper class for building test scenarios
 */
export class TestScenario {
    private terminal: PseudoTerminal;
    private steps: Array<() => Promise<void>> = [];

    constructor(options?: PseudoTerminalOptions) {
        this.terminal = new PseudoTerminal(options);
    }

    /**
     * Spawn a command
     */
    spawn(command: string, args?: string[]): this {
        this.steps.push(async () => {
            await this.terminal.spawn(command, args || []);
        });
        return this;
    }

    /**
     * Write text
     */
    write(text: string): this {
        this.steps.push(async () => {
            this.terminal.write(text);
        });
        return this;
    }

    /**
     * Write a line
     */
    writeln(text: string): this {
        this.steps.push(async () => {
            this.terminal.writeln(text);
        });
        return this;
    }

    /**
     * Send a key
     */
    sendKey(key: string): this {
        this.steps.push(async () => {
            this.terminal.sendKey(key);
        });
        return this;
    }

    /**
     * Wait for pattern
     */
    waitFor(pattern: RegExp | string, timeout?: number): this {
        this.steps.push(async () => {
            await this.terminal.waitFor(pattern, timeout);
        });
        return this;
    }

    /**
     * Wait for prompt
     */
    waitForPrompt(timeout?: number): this {
        this.steps.push(async () => {
            await this.terminal.waitForPrompt(timeout);
        });
        return this;
    }

    /**
     * Add a custom step
     */
    step(fn: (terminal: PseudoTerminal) => Promise<void>): this {
        this.steps.push(async () => {
            await fn(this.terminal);
        });
        return this;
    }

    /**
     * Execute all steps
     */
    async execute(): Promise<{ output: string; exitCode: number | null }> {
        for (const step of this.steps) {
            await step();
        }

        const output = this.terminal.getOutput();
        const exitCode = await this.terminal.getExitCode();

        return { output, exitCode };
    }

    /**
     * Execute and return the terminal for further interaction
     */
    async start(): Promise<PseudoTerminal> {
        for (const step of this.steps) {
            await step();
        }
        return this.terminal;
    }
}

/**
 * Create a new test scenario
 */
export function createScenario(options?: PseudoTerminalOptions): TestScenario {
    return new TestScenario(options);
}

/**
 * Quick helper for simple commands
 */
export async function runCommand(
    command: string,
    args: string[] = [],
    input: string = '',
    timeout: number = 5000
): Promise<{ output: string; exitCode: number | null }> {
    const terminal = new PseudoTerminal({ timeout });

    await terminal.spawn(command, args);

    if (input) {
        terminal.write(input);
    }

    const exitCode = await terminal.getExitCode();
    const output = terminal.getOutput();

    terminal.dispose();

    return { output, exitCode };
}