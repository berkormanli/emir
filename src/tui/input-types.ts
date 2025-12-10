// Enhanced input system types

export interface Keymap {
    name: string;
    bindings: Map<string, KeyBinding>;
    parent?: Keymap;
}

export interface KeyBinding {
    command?: string;
    sequence?: string[];
    macro?: string[];
    repeat?: boolean;
    condition?: (context: InputContext) => boolean;
}

export interface Macro {
    name: string;
    sequence: InputEvent[];
    recording: boolean;
    timestamp: number;
}

export interface InputContext {
    mode?: string;
    component?: string;
    state?: Record<string, any>;
}

export interface KeySequence {
    keys: string[];
    modifiers: {
        ctrl?: boolean;
        alt?: boolean;
        shift?: boolean;
    };
}

export interface InputMetrics {
    totalEvents: number;
    keyEvents: number;
    mouseEvents: number;
    commandCount: Map<string, number>;
    averageLatency: number;
    errorCount: number;
}

export interface InputLogger {
    enabled: boolean;
    maxEntries: number;
    entries: InputLogEntry[];
}

export interface InputLogEntry {
    timestamp: number;
    event: InputEvent;
    handled: boolean;
    handler?: string;
    latency?: number;
}

export interface NormalizedInputEvent extends InputEvent {
    id: string;
    timestamp: number;
    sequence?: string[];
    repeat?: number;
    context?: InputContext;
}

export interface InputMode {
    name: string;
    keymap: Keymap;
    overrides?: Map<string, KeyBinding>;
    hooks?: {
        onEnter?: () => void;
        onExit?: () => void;
        onInput?: (event: NormalizedInputEvent) => boolean;
    };
}