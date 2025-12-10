import type { InputEvent, MouseEvent } from './types';

/**
 * Type for input event listeners
 */
export type InputListener = (event: InputEvent) => boolean | void;

/**
 * Key sequence mapping for special keys
 */
const KEY_SEQUENCES: Record<string, string> = {
    '\r': 'enter',
    '\n': 'enter',
    '\t': 'tab',
    '\x7f': 'backspace',
    '\x08': 'backspace',
    '\x1b': 'escape',
    ' ': 'space',
    
    // Arrow keys
    '\x1b[A': 'up',
    '\x1b[B': 'down',
    '\x1b[C': 'right',
    '\x1b[D': 'left',
    
    // Arrow keys (alternative sequences)
    '\x1bOA': 'up',
    '\x1bOB': 'down',
    '\x1bOC': 'right',
    '\x1bOD': 'left',
    
    // Function keys
    '\x1bOP': 'f1',
    '\x1bOQ': 'f2',
    '\x1bOR': 'f3',
    '\x1bOS': 'f4',
    '\x1b[15~': 'f5',
    '\x1b[17~': 'f6',
    '\x1b[18~': 'f7',
    '\x1b[19~': 'f8',
    '\x1b[20~': 'f9',
    '\x1b[21~': 'f10',
    '\x1b[23~': 'f11',
    '\x1b[24~': 'f12',
    
    // Home/End keys
    '\x1b[H': 'home',
    '\x1b[F': 'end',
    '\x1b[1~': 'home',
    '\x1b[4~': 'end',
    '\x1bOH': 'home',
    '\x1bOF': 'end',
    
    // Page Up/Down
    '\x1b[5~': 'pageup',
    '\x1b[6~': 'pagedown',
    
    // Insert/Delete
    '\x1b[2~': 'insert',
    '\x1b[3~': 'delete',
};

/**
 * Control key combinations
 */
const CTRL_KEY_MAP: Record<string, string> = {
    '\x01': 'a',
    '\x02': 'b',
    '\x03': 'c',
    '\x04': 'd',
    '\x05': 'e',
    '\x06': 'f',
    '\x07': 'g',
    '\x08': 'h',
    '\x09': 'i',
    '\x0a': 'j',
    '\x0b': 'k',
    '\x0c': 'l',
    '\x0d': 'm',
    '\x0e': 'n',
    '\x0f': 'o',
    '\x10': 'p',
    '\x11': 'q',
    '\x12': 'r',
    '\x13': 's',
    '\x14': 't',
    '\x15': 'u',
    '\x16': 'v',
    '\x17': 'w',
    '\x18': 'x',
    '\x19': 'y',
    '\x1a': 'z',
};

/**
 * Manages input events and routes them to appropriate listeners
 */
export class InputManager {
    private listeners: Map<string, InputListener[]>;
    private globalListeners: InputListener[];
    private listening: boolean;
    private inputBuffer: string;
    private inputHandler?: (data: Buffer) => void;
    private resizeHandler?: () => void;

    constructor() {
        this.listeners = new Map();
        this.globalListeners = [];
        this.listening = false;
        this.inputBuffer = '';
    }

    /**
     * Start listening for input events
     */
    startListening(): void {
        if (this.listening) {
            return;
        }

        this.listening = true;
        this.inputBuffer = '';

        // Create and store the input handler
        this.inputHandler = (data: Buffer) => {
            if (!this.listening) return;
            this.processInput(data);
        };

        // Create and store the resize handler
        this.resizeHandler = () => {
            if (!this.listening) return;
            this.processResize();
        };

        // Attach event listeners
        if (process.stdin.isRaw) {
            process.stdin.on('data', this.inputHandler);
            process.stdout.on('resize', this.resizeHandler);
        }
    }

    /**
     * Stop listening for input events
     */
    stopListening(): void {
        if (!this.listening) {
            return;
        }

        this.listening = false;

        // Remove event listeners
        if (this.inputHandler) {
            process.stdin.removeListener('data', this.inputHandler);
        }
        if (this.resizeHandler) {
            process.stdout.removeListener('resize', this.resizeHandler);
        }

        this.inputHandler = undefined;
        this.resizeHandler = undefined;
        this.inputBuffer = '';
    }

    /**
     * Add a listener for a specific key
     */
    addListener(key: string, listener: InputListener): void {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, []);
        }
        this.listeners.get(key)!.push(listener);
    }

    /**
     * Add a global listener that receives all input events
     */
    addGlobalListener(listener: InputListener): void {
        this.globalListeners.push(listener);
    }

    /**
     * Remove a specific key listener
     */
    removeListener(key: string, listener: InputListener): void {
        const keyListeners = this.listeners.get(key);
        if (keyListeners) {
            const index = keyListeners.indexOf(listener);
            if (index !== -1) {
                keyListeners.splice(index, 1);
            }
            if (keyListeners.length === 0) {
                this.listeners.delete(key);
            }
        }
    }

    /**
     * Remove a global listener
     */
    removeGlobalListener(listener: InputListener): void {
        const index = this.globalListeners.indexOf(listener);
        if (index !== -1) {
            this.globalListeners.splice(index, 1);
        }
    }

    /**
     * Clear all listeners
     */
    clearListeners(): void {
        this.listeners.clear();
        this.globalListeners = [];
    }

    /**
     * Process raw input data
     */
    private processInput(data: Buffer): void {
        const input = data.toString();
        this.inputBuffer += input;

        // Try to parse the input buffer
        const events = this.parseInput(this.inputBuffer);
        
        // Process each parsed event
        for (const event of events) {
            this.dispatchEvent(event);
        }

        // Clear the buffer if we've processed all input
        if (events.length > 0) {
            this.inputBuffer = '';
        }
    }

    /**
     * Parse input buffer into InputEvents
     */
    private parseInput(input: string): InputEvent[] {
        const events: InputEvent[] = [];

        // Check for mouse events first (they have specific escape sequences)
        if (input.startsWith('\x1b[M')) {
            const mouseEvent = this.parseMouseEvent(input);
            if (mouseEvent) {
                events.push(mouseEvent);
                return events;
            }
        }

        // Check for special key sequences
        for (const [sequence, key] of Object.entries(KEY_SEQUENCES)) {
            if (input === sequence) {
                events.push({
                    type: 'key',
                    key: key,
                    ctrl: false,
                    alt: false,
                    shift: false
                });
                return events;
            }
        }

        // Check for Alt+key combinations
        if (input.startsWith('\x1b') && input.length === 2) {
            const char = input[1];
            events.push({
                type: 'key',
                key: char.toLowerCase(),
                ctrl: false,
                alt: true,
                shift: char === char.toUpperCase() && char !== char.toLowerCase()
            });
            return events;
        }

        // Check for Ctrl+key combinations
        if (input.length === 1) {
            const charCode = input.charCodeAt(0);
            
            // Check if it's a control character
            if (charCode <= 26 && charCode > 0) {
                const key = CTRL_KEY_MAP[input];
                if (key) {
                    events.push({
                        type: 'key',
                        key: key,
                        ctrl: true,
                        alt: false,
                        shift: false
                    });
                    return events;
                }
            }
            
            // Regular character
            events.push({
                type: 'key',
                key: input,
                ctrl: false,
                alt: false,
                shift: input === input.toUpperCase() && input !== input.toLowerCase()
            });
        }

        return events;
    }

    /**
     * Parse mouse event from escape sequence
     */
    private parseMouseEvent(input: string): InputEvent | null {
        // Basic mouse event parsing (X10 mouse protocol)
        // Format: \x1b[M<button><x><y>
        if (input.length < 6) {
            return null;
        }

        const button = input.charCodeAt(3) - 32;
        const x = input.charCodeAt(4) - 33;
        const y = input.charCodeAt(5) - 33;

        let buttonType: 'left' | 'right' | 'middle' = 'left';
        let action: 'press' | 'release' | 'move' = 'press';

        // Decode button information
        if (button === 0) buttonType = 'left';
        else if (button === 1) buttonType = 'middle';
        else if (button === 2) buttonType = 'right';
        else if (button === 3) action = 'release';
        else if (button >= 32) action = 'move';

        const mouseEvent: MouseEvent = {
            x: x,
            y: y,
            button: buttonType,
            action: action
        };

        return {
            type: 'mouse',
            mouse: mouseEvent
        };
    }

    /**
     * Process terminal resize event
     */
    private processResize(): void {
        // Dispatch a special resize event
        const resizeEvent: InputEvent = {
            type: 'key',
            key: 'resize',
            ctrl: false,
            alt: false,
            shift: false
        };
        this.dispatchEvent(resizeEvent);
    }

    /**
     * Dispatch an input event to listeners
     */
    private dispatchEvent(event: InputEvent): void {
        // First, send to global listeners
        for (const listener of this.globalListeners) {
            const handled = listener(event);
            if (handled === true) {
                return; // Event was handled, stop propagation
            }
        }

        // Then, send to specific key listeners
        if (event.type === 'key' && event.key) {
            const keyListeners = this.listeners.get(event.key);
            if (keyListeners) {
                for (const listener of keyListeners) {
                    const handled = listener(event);
                    if (handled === true) {
                        return; // Event was handled, stop propagation
                    }
                }
            }
        }
    }

    /**
     * Check if currently listening for input
     */
    isListening(): boolean {
        return this.listening;
    }

    /**
     * Get the number of registered listeners
     */
    getListenerCount(): number {
        let count = this.globalListeners.length;
        for (const listeners of this.listeners.values()) {
            count += listeners.length;
        }
        return count;
    }
}
