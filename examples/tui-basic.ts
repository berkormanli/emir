#!/usr/bin/env bun

import { TUI, AnsiUtils } from '../src/index.js';
import type { Component } from '../src/index.js';

// Simple text component for demonstration
class TextComponent implements Component {
    id: string;
    position = { x: 0, y: 0 };
    size = { width: 20, height: 1 };
    visible = true;
    private text: string;

    constructor(id: string, text: string, x: number = 0, y: number = 0) {
        this.id = id;
        this.text = text;
        this.position = { x, y };
    }

    render(): string {
        return AnsiUtils.colorText(this.text, 2); // Green text
    }

    handleInput(_input: any): boolean {
        return false;
    }

    focus(): void {
        // Not implemented for this simple component
    }

    blur(): void {
        // Not implemented for this simple component
    }

    update(data?: any): void {
        if (data && typeof data === 'string') {
            this.text = data;
        }
    }
}

async function main() {
    const tui = new TUI('Basic TUI Example', '1.0.0', 'A simple TUI demonstration');

    try {
        // Check if TUI is supported
        if (!tui.terminal.isTUISupported()) {
            console.log('TUI is not supported in this terminal environment');
            process.exit(1);
        }

        // Add some components
        tui.addComponent(new TextComponent('title', 'Welcome to TUI!', 2, 1));
        tui.addComponent(new TextComponent('info', 'Terminal capabilities detected:', 2, 3));

        // Start the TUI
        await tui.start();

        // Display terminal capabilities
        const capabilities = tui.getCapabilities();
        const size = tui.getTerminalSize();

        tui.addComponent(new TextComponent('colors', `Colors: ${capabilities.colors}`, 4, 4));
        tui.addComponent(new TextComponent('unicode', `Unicode: ${capabilities.unicode}`, 4, 5));
        tui.addComponent(new TextComponent('mouse', `Mouse: ${capabilities.mouse}`, 4, 6));
        tui.addComponent(new TextComponent('size', `Terminal size: ${size.width}x${size.height}`, 4, 7));
        tui.addComponent(new TextComponent('exit', 'Press Ctrl+C or ESC to exit', 2, 9));

        // Re-render with new components
        tui.render();

        // Set up a timer to update the terminal size display every second
        const updateTimer = setInterval(() => {
            if (tui.isRunning()) {
                const currentSize = tui.getTerminalSize();
                tui.updateComponent('size', `Terminal size: ${currentSize.width}x${currentSize.height}`);
            } else {
                clearInterval(updateTimer);
            }
        }, 1000);

        // Keep the TUI running until interrupted
        process.stdin.resume();

    } catch (error) {
        console.error('Error starting TUI:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown (this won't be called in raw mode, but good to have as fallback)
process.on('SIGINT', () => {
    console.log('\nGoodbye!');
    process.exit(0);
});

main().catch(console.error);