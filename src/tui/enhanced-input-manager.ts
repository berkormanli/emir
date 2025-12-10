import type { InputEvent, MouseEvent } from './types';
import type {
    Keymap,
    KeyBinding,
    Macro,
    InputContext,
    KeySequence,
    InputMetrics,
    InputLogger,
    InputLogEntry,
    NormalizedInputEvent,
    InputMode
} from './input-types';

/**
 * Enhanced Input Manager with keymaps, macros, and normalized event handling
 */
export class EnhancedInputManager {
    private listeners: Map<string, Map<string, Function[]>>;
    private globalListeners: Function[];
    private listening: boolean;
    private inputBuffer: string;
    private inputHandler?: (data: Buffer) => void;
    private resizeHandler?: () => void;

    // Keymap system
    private keymaps: Map<string, Keymap>;
    private activeKeymap: Keymap;
    private keymapStack: Keymap[];
    private currentSequence: string[];
    private sequenceTimeout: any;

    // Macro system
    private macros: Map<string, Macro>;
    private recordingMacro: Macro | null;
    private macroPlayback: boolean;

    // Mode system
    private modes: Map<string, InputMode>;
    private activeMode: InputMode;

    // Context
    private context: InputContext;

    // Metrics and logging
    private metrics: InputMetrics;
    private logger: InputLogger;
    private eventQueue: NormalizedInputEvent[];
    private processingEvents: boolean;

    // Configuration
    private config: {
        sequenceTimeout: number;
        maxMacroLength: number;
        enableLogging: boolean;
        enableMetrics: boolean;
    };

    constructor(config = {}) {
        this.config = {
            sequenceTimeout: 1000,
            maxMacroLength: 1000,
            enableLogging: false,
            enableMetrics: false,
            ...config
        };

        this.listeners = new Map();
        this.globalListeners = [];
        this.listening = false;
        this.inputBuffer = '';
        this.currentSequence = [];
        this.keymapStack = [];
        this.macros = new Map();
        this.recordingMacro = null;
        this.macroPlayback = false;
        this.modes = new Map();
        this.eventQueue = [];
        this.processingEvents = false;

        // Initialize context
        this.context = {};

        // Initialize metrics
        this.metrics = {
            totalEvents: 0,
            keyEvents: 0,
            mouseEvents: 0,
            commandCount: new Map(),
            averageLatency: 0,
            errorCount: 0
        };

        // Initialize logger
        this.logger = {
            enabled: this.config.enableLogging,
            maxEntries: 1000,
            entries: []
        };

        // Initialize default keymap
        this.activeKeymap = this.createDefaultKeymap();
        this.keymaps.set('default', this.activeKeymap);

        // Initialize default mode
        this.activeMode = {
            name: 'normal',
            keymap: this.activeKeymap
        };
        this.modes.set('normal', this.activeMode);
    }

    /**
     * Start listening for input events
     */
    startListening(): void {
        if (this.listening) return;

        this.listening = true;
        this.inputBuffer = '';

        this.inputHandler = (data: Buffer) => {
            if (!this.listening) return;
            this.processInput(data);
        };

        this.resizeHandler = () => {
            if (!this.listening) return;
            this.processResize();
        };

        if (process.stdin.isRaw) {
            process.stdin.on('data', this.inputHandler);
            process.stdout.on('resize', this.resizeHandler);
        }
    }

    /**
     * Stop listening for input events
     */
    stopListening(): void {
        if (!this.listening) return;

        this.listening = false;

        if (this.inputHandler) {
            process.stdin.removeListener('data', this.inputHandler);
        }
        if (this.resizeHandler) {
            process.stdout.removeListener('resize', this.resizeHandler);
        }

        this.inputHandler = undefined;
        this.resizeHandler = undefined;
        this.inputBuffer = '';
        this.clearSequenceTimeout();
    }

    /**
     * Register a new keymap
     */
    registerKeymap(name: string, keymap: Keymap): void {
        this.keymaps.set(name, keymap);
    }

    /**
     * Set the active keymap
     */
    setActiveKeymap(name: string): void {
        const keymap = this.keymaps.get(name);
        if (!keymap) throw new Error(`Keymap '${name}' not found`);

        this.keymapStack.push(this.activeKeymap);
        this.activeKeymap = keymap;
    }

    /**
     * Pop back to previous keymap
     */
    popKeymap(): void {
        if (this.keymapStack.length > 0) {
            this.activeKeymap = this.keymapStack.pop()!;
        }
    }

    /**
     * Register a new mode
     */
    registerMode(mode: InputMode): void {
        this.modes.set(mode.name, mode);
    }

    /**
     * Set the active mode
     */
    setActiveMode(name: string): void {
        const mode = this.modes.get(name);
        if (!mode) throw new Error(`Mode '${name}' not found`);

        // Call exit hook for current mode
        if (this.activeMode?.hooks?.onExit) {
            this.activeMode.hooks.onExit();
        }

        this.activeMode = mode;
        this.setActiveKeymap(mode.keymap.name);
        this.context.mode = mode.name;

        // Call enter hook for new mode
        if (mode.hooks?.onEnter) {
            mode.hooks.onEnter();
        }
    }

    /**
     * Start recording a macro
     */
    startRecordingMacro(name: string): void {
        if (this.recordingMacro) {
            throw new Error('Already recording a macro');
        }

        this.recordingMacro = {
            name,
            sequence: [],
            recording: true,
            timestamp: Date.now()
        };
    }

    /**
     * Stop recording and save the macro
     */
    stopRecordingMacro(): void {
        if (!this.recordingMacro) {
            throw new Error('No macro being recorded');
        }

        this.recordingMacro.recording = false;
        this.macros.set(this.recordingMacro.name, this.recordingMacro);
        this.recordingMacro = null;
    }

    /**
     * Play back a macro
     */
    async playMacro(name: string): Promise<void> {
        const macro = this.macros.get(name);
        if (!macro) throw new Error(`Macro '${name}' not found`);

        this.macroPlayback = true;

        for (const event of macro.sequence) {
            if (!this.macroPlayback) break;

            // Create a normalized event for the macro
            const normalizedEvent = this.normalizeEvent(event);
            await this.processEvent(normalizedEvent);

            // Small delay between events for realistic playback
            await new Promise(resolve => setTimeout(resolve, 10));
        }

        this.macroPlayback = false;
    }

    /**
     * Stop macro playback
     */
    stopMacroPlayback(): void {
        this.macroPlayback = false;
    }

    /**
     * Delete a macro
     */
    deleteMacro(name: string): void {
        this.macros.delete(name);
    }

    /**
     * Get all macros
     */
    getMacros(): Macro[] {
        return Array.from(this.macros.values());
    }

    /**
     * Set input context
     */
    setContext(context: Partial<InputContext>): void {
        this.context = { ...this.context, ...context };
    }

    /**
     * Get current input context
     */
    getContext(): InputContext {
        return { ...this.context };
    }

    /**
     * Add a listener for a specific command
     */
    addCommandListener(command: string, component: string, listener: Function): void {
        if (!this.listeners.has(command)) {
            this.listeners.set(command, new Map());
        }
        const commandMap = this.listeners.get(command)!;

        if (!commandMap.has(component)) {
            commandMap.set(component, []);
        }
        commandMap.get(component)!.push(listener);
    }

    /**
     * Add a global listener
     */
    addGlobalListener(listener: Function): void {
        this.globalListeners.push(listener);
    }

    /**
     * Remove a listener
     */
    removeListener(command: string, component: string, listener: Function): void {
        const commandMap = this.listeners.get(command);
        if (commandMap) {
            const componentListeners = commandMap.get(component);
            if (componentListeners) {
                const index = componentListeners.indexOf(listener);
                if (index !== -1) {
                    componentListeners.splice(index, 1);
                }
                if (componentListeners.length === 0) {
                    commandMap.delete(component);
                }
            }
            if (commandMap.size === 0) {
                this.listeners.delete(command);
            }
        }
    }

    /**
     * Enable/disable input logging
     */
    setLogging(enabled: boolean): void {
        this.logger.enabled = enabled;
    }

    /**
     * Get input metrics
     */
    getMetrics(): InputMetrics {
        return { ...this.metrics };
    }

    /**
     * Reset metrics
     */
    resetMetrics(): void {
        this.metrics = {
            totalEvents: 0,
            keyEvents: 0,
            mouseEvents: 0,
            commandCount: new Map(),
            averageLatency: 0,
            errorCount: 0
        };
    }

    /**
     * Get input log
     */
    getInputLog(): InputLogEntry[] {
        return [...this.logger.entries];
    }

    /**
     * Clear input log
     */
    clearInputLog(): void {
        this.logger.entries = [];
    }

    /**
     * Process raw input data
     */
    private async processInput(data: Buffer): Promise<void> {
        const startTime = Date.now();
        const input = data.toString();
        this.inputBuffer += input;

        const events = this.parseInput(this.inputBuffer);

        if (events.length > 0) {
            this.inputBuffer = '';

            for (const event of events) {
                const normalizedEvent = this.normalizeEvent(event);

                // Record macro if recording
                if (this.recordingMacro && this.recordingMacro.recording) {
                    this.recordingMacro.sequence.push(event);

                    if (this.recordingMacro.sequence.length >= this.config.maxMacroLength) {
                        this.stopRecordingMacro();
                    }
                }

                // Queue event for processing
                this.eventQueue.push(normalizedEvent);

                // Update metrics
                this.updateMetrics(event, Date.now() - startTime);

                // Log event if enabled
                this.logEvent(normalizedEvent, false);
            }

            // Process event queue
            if (!this.processingEvents) {
                this.processEventQueue();
            }
        }
    }

    /**
     * Process event queue
     */
    private async processEventQueue(): Promise<void> {
        this.processingEvents = true;

        while (this.eventQueue.length > 0) {
            const event = this.eventQueue.shift()!;
            await this.processEvent(event);
        }

        this.processingEvents = false;
    }

    /**
     * Process a single normalized event
     */
    private async processEvent(event: NormalizedInputEvent): Promise<void> {
        try {
            // Check mode hook first
            if (this.activeMode?.hooks?.onInput) {
                const handled = this.activeMode.hooks.onInput(event);
                if (handled) {
                    this.logEvent(event, true, 'mode-hook');
                    return;
                }
            }

            // Check for key sequences
            if (event.type === 'key' && event.key) {
                this.currentSequence.push(event.key);
                this.clearSequenceTimeout();

                // Check if current sequence matches any binding
                const binding = this.findKeyBinding(this.currentSequence);

                if (binding) {
                    if (binding.sequence) {
                        // Check if it's a prefix of a longer sequence
                        if (this.isSequencePrefix(this.currentSequence, binding.sequence)) {
                            this.setSequenceTimeout();
                            return;
                        }
                    }

                    // Execute binding
                    await this.executeBinding(binding, event);
                    this.currentSequence = [];
                    return;
                }

                // No match found, clear sequence
                this.currentSequence = [];
            }

            // Dispatch to global listeners
            for (const listener of this.globalListeners) {
                try {
                    const result = await listener(event);
                    if (result === true) {
                        this.logEvent(event, true, 'global-listener');
                        return;
                    }
                } catch (error) {
                    this.metrics.errorCount++;
                    console.error('Global listener error:', error);
                }
            }

            // No handler found
            this.logEvent(event, false);
        } catch (error) {
            this.metrics.errorCount++;
            console.error('Event processing error:', error);
        }
    }

    /**
     * Find key binding for sequence
     */
    private findKeyBinding(sequence: string[]): KeyBinding | null {
        let keymap = this.activeKeymap;

        // Traverse keymap hierarchy
        while (keymap) {
            // Check current keymap
            const binding = keymap.bindings.get(sequence.join(' '));
            if (binding) {
                // Check condition if present
                if (!binding.condition || binding.condition(this.context)) {
                    return binding;
                }
            }

            // Check parent keymap
            keymap = keymap.parent || undefined;
        }

        return null;
    }

    /**
     * Check if sequence is a prefix of another sequence
     */
    private isSequencePrefix(current: string[], target: string[]): boolean {
        if (current.length >= target.length) return false;

        for (let i = 0; i < current.length; i++) {
            if (current[i] !== target[i]) return false;
        }

        return true;
    }

    /**
     * Execute a key binding
     */
    private async executeBinding(binding: KeyBinding, event: NormalizedInputEvent): Promise<void> {
        if (binding.command) {
            // Dispatch to command listeners
            const commandMap = this.listeners.get(binding.command);
            if (commandMap) {
                // Try component-specific listeners first
                if (this.context.component) {
                    const componentListeners = commandMap.get(this.context.component);
                    if (componentListeners) {
                        for (const listener of componentListeners) {
                            const result = await listener(event);
                            if (result === true) {
                                this.logEvent(event, true, `${binding.command}:${this.context.component}`);
                                this.metrics.commandCount.set(binding.command,
                                    (this.metrics.commandCount.get(binding.command) || 0) + 1);
                                return;
                            }
                        }
                    }
                }

                // Try all component listeners
                for (const [component, listeners] of commandMap) {
                    for (const listener of listeners) {
                        const result = await listener(event);
                        if (result === true) {
                            this.logEvent(event, true, `${binding.command}:${component}`);
                            this.metrics.commandCount.set(binding.command,
                                (this.metrics.commandCount.get(binding.command) || 0) + 1);
                            return;
                        }
                    }
                }
            }
        }

        if (binding.macro) {
            // Execute macro sequence
            for (const macroKey of binding.macro) {
                const macroEvent: NormalizedInputEvent = {
                    ...event,
                    id: this.generateEventId(),
                    timestamp: Date.now()
                };
                await this.processEvent(macroEvent);
            }
        }
    }

    /**
     * Normalize input event
     */
    private normalizeEvent(event: InputEvent): NormalizedInputEvent {
        return {
            ...event,
            id: this.generateEventId(),
            timestamp: Date.now(),
            context: { ...this.context }
        };
    }

    /**
     * Parse input buffer into InputEvents
     */
    private parseInput(input: string): InputEvent[] {
        const events: InputEvent[] = [];

        // Mouse events
        if (input.startsWith('\x1b[M')) {
            const mouseEvent = this.parseMouseEvent(input);
            if (mouseEvent) {
                events.push(mouseEvent);
                return events;
            }
        }

        // Special key sequences
        const keySequences = this.getKeySequences();
        for (const [sequence, key] of Object.entries(keySequences)) {
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

        // Alt+key combinations
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

        // Ctrl+key combinations
        if (input.length === 1) {
            const charCode = input.charCodeAt(0);

            if (charCode <= 26 && charCode > 0) {
                const ctrlKeyMap = this.getCtrlKeyMap();
                const key = ctrlKeyMap[input];
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
     * Parse mouse event
     */
    private parseMouseEvent(input: string): InputEvent | null {
        if (input.length < 6) return null;

        const button = input.charCodeAt(3) - 32;
        const x = input.charCodeAt(4) - 33;
        const y = input.charCodeAt(5) - 33;

        let buttonType: 'left' | 'right' | 'middle' = 'left';
        let action: 'press' | 'release' | 'move' = 'press';

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
     * Process terminal resize
     */
    private processResize(): void {
        const resizeEvent: NormalizedInputEvent = {
            id: this.generateEventId(),
            timestamp: Date.now(),
            type: 'key',
            key: 'resize',
            ctrl: false,
            alt: false,
            shift: false,
            context: { ...this.context }
        };

        this.eventQueue.push(resizeEvent);
        if (!this.processingEvents) {
            this.processEventQueue();
        }
    }

    /**
     * Update metrics
     */
    private updateMetrics(event: InputEvent, latency: number): void {
        if (!this.config.enableMetrics) return;

        this.metrics.totalEvents++;

        if (event.type === 'key') {
            this.metrics.keyEvents++;
        } else if (event.type === 'mouse') {
            this.metrics.mouseEvents++;
        }

        // Update average latency
        this.metrics.averageLatency =
            (this.metrics.averageLatency * (this.metrics.totalEvents - 1) + latency) /
            this.metrics.totalEvents;
    }

    /**
     * Log event
     */
    private logEvent(event: NormalizedInputEvent, handled: boolean, handler?: string): void {
        if (!this.logger.enabled) return;

        const entry: InputLogEntry = {
            timestamp: event.timestamp,
            event: event,
            handled: handled,
            handler: handler
        };

        this.logger.entries.push(entry);

        // Maintain max entries
        if (this.logger.entries.length > this.logger.maxEntries) {
            this.logger.entries.shift();
        }
    }

    /**
     * Set sequence timeout
     */
    private setSequenceTimeout(): void {
        this.sequenceTimeout = setTimeout(() => {
            // Timeout reached, process the partial sequence
            if (this.currentSequence.length > 0) {
                const lastKey = this.currentSequence[this.currentSequence.length - 1];
                const event: NormalizedInputEvent = {
                    id: this.generateEventId(),
                    timestamp: Date.now(),
                    type: 'key',
                    key: lastKey,
                    ctrl: false,
                    alt: false,
                    shift: false,
                    context: { ...this.context }
                };
                this.processEvent(event);
                this.currentSequence = [];
            }
        }, this.config.sequenceTimeout);
    }

    /**
     * Clear sequence timeout
     */
    private clearSequenceTimeout(): void {
        if (this.sequenceTimeout) {
            clearTimeout(this.sequenceTimeout);
            this.sequenceTimeout = undefined;
        }
    }

    /**
     * Generate unique event ID
     */
    private generateEventId(): string {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Create default keymap
     */
    private createDefaultKeymap(): Keymap {
        const bindings = new Map<string, KeyBinding>();

        // Common bindings
        bindings.set('q', { command: 'quit' });
        bindings.set('ctrl+c', { command: 'quit' });
        bindings.set('escape', { command: 'cancel' });
        bindings.set('enter', { command: 'confirm' });
        bindings.set('tab', { command: 'next' });
        bindings.set('shift+tab', { command: 'prev' });

        // Navigation
        bindings.set('up', { command: 'move-up' });
        bindings.set('down', { command: 'move-down' });
        bindings.set('left', { command: 'move-left' });
        bindings.set('right', { command: 'move-right' });
        bindings.set('home', { command: 'move-start' });
        bindings.set('end', { command: 'move-end' });
        bindings.set('pageup', { command: 'page-up' });
        bindings.set('pagedown', { command: 'page-down' });

        // Editing
        bindings.set('backspace', { command: 'delete-backward' });
        bindings.set('delete', { command: 'delete-forward' });
        bindings.set('ctrl+z', { command: 'undo' });
        bindings.set('ctrl+y', { command: 'redo' });

        return {
            name: 'default',
            bindings
        };
    }

    /**
     * Get key sequences map
     */
    private getKeySequences(): Record<string, string> {
        return {
            '\r': 'enter',
            '\n': 'enter',
            '\t': 'tab',
            '\x7f': 'backspace',
            '\x08': 'backspace',
            '\x1b': 'escape',
            ' ': 'space',
            '\x1b[A': 'up',
            '\x1b[B': 'down',
            '\x1b[C': 'right',
            '\x1b[D': 'left',
            '\x1bOA': 'up',
            '\x1bOB': 'down',
            '\x1bOC': 'right',
            '\x1bOD': 'left',
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
            '\x1b[H': 'home',
            '\x1b[F': 'end',
            '\x1b[1~': 'home',
            '\x1b[4~': 'end',
            '\x1bOH': 'home',
            '\x1bOF': 'end',
            '\x1b[5~': 'pageup',
            '\x1b[6~': 'pagedown',
            '\x1b[2~': 'insert',
            '\x1b[3~': 'delete'
        };
    }

    /**
     * Get Ctrl key map
     */
    private getCtrlKeyMap(): Record<string, string> {
        return {
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
            '\x1a': 'z'
        };
    }
}