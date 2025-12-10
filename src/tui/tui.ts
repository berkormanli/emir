import { TerminalController } from './terminal-controller.js';
import type { Component } from './types.js';

export class TUI {
    name: string;
    version: string;
    description: string;
    components: Component[] = [];
    terminal: TerminalController;
    private running: boolean = false;

    constructor(name: string, version: string, description: string) {
        this.name = name;
        this.version = version;
        this.description = description;
        this.terminal = new TerminalController();
    }

    /**
     * Add a component to the TUI
     */
    addComponent(component: Component): void {
        this.components.push(component);
    }

    /**
     * Remove a component from the TUI
     */
    removeComponent(componentId: string): boolean {
        const index = this.components.findIndex(c => c.id === componentId);
        if (index !== -1) {
            this.components.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * Get a component by ID
     */
    getComponent(componentId: string): Component | undefined {
        return this.components.find(c => c.id === componentId);
    }

    /**
     * Start the TUI application
     */
    async start(): Promise<void> {
        if (this.running) {
            throw new Error('TUI is already running');
        }

        // Check if TUI is supported
        if (!this.terminal.isTUISupported()) {
            throw new Error('TUI is not supported in this terminal environment');
        }

        this.running = true;

        try {
            // Initialize terminal
            this.terminal.enableRawMode();
            this.terminal.enterAlternateScreen();
            this.terminal.hideCursor();
            this.terminal.clearScreen();

            // Detect capabilities
            this.terminal.detectCapabilities();
            
            // Set up input handling for raw mode
            this.setupInputHandling();
            
            // Set up resize handler
            this.setupResizeHandler();
            
            // Initial render
            this.render();

        } catch (error) {
            this.running = false;
            this.terminal.restore();
            throw error;
        }
    }

    /**
     * Set up input handling for raw mode
     */
    private setupInputHandling(): void {
        process.stdin.on('data', (data: Buffer) => {
            if (!this.running) return;
            
            const input = data.toString();
            
            // Handle Ctrl+C (ASCII 3)
            if (input === '\u0003') {
                this.stop();
                process.exit(0);
            }
            
            // Handle ESC key
            if (input === '\u001b') {
                this.stop();
                process.exit(0);
            }
            
            // Route input to focused component
            // For now, just pass to all components
            for (const component of this.components) {
                if (component.visible) {
                    const handled = component.handleInput(input);
                    if (handled) break;
                }
            }
        });
    }

    /**
     * Set up resize handler
     */
    private setupResizeHandler(): void {
        process.stdout.on('resize', () => {
            if (this.running) {
                // Update terminal size info and re-render
                this.render();
            }
        });
    }

    /**
     * Stop the TUI application
     */
    stop(): void {
        if (!this.running) {
            return;
        }

        this.running = false;
        this.terminal.restore();
    }

    /**
     * Render all components
     */
    render(): void {
        if (!this.running) {
            return;
        }

        // Clear screen
        this.terminal.clearScreen();

        // Render each visible component
        for (const component of this.components) {
            if (component.visible) {
                const content = component.render();
                if (content) {
                    this.terminal.writeAt(
                        component.position.x + 1, // Convert to 1-based
                        component.position.y + 1, // Convert to 1-based
                        content
                    );
                }
            }
        }
    }

    /**
     * Update a specific component and re-render if needed
     */
    updateComponent(componentId: string, data?: any): void {
        const component = this.getComponent(componentId);
        if (component) {
            component.update(data);
            if (this.running) {
                this.render();
            }
        }
    }

    /**
     * Check if TUI is currently running
     */
    isRunning(): boolean {
        return this.running;
    }

    /**
     * Get terminal size
     */
    getTerminalSize() {
        return this.terminal.getTerminalSize();
    }

    /**
     * Get terminal capabilities
     */
    getCapabilities() {
        return this.terminal.detectCapabilities();
    }
}