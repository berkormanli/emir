// Core TUI types and interfaces

export interface Position {
    x: number;
    y: number;
}

export interface Size {
    width: number;
    height: number;
}

export interface TerminalSize {
    width: number;
    height: number;
}

export interface TerminalState {
    rawMode: boolean;
    cursorVisible: boolean;
    alternateScreen: boolean;
}

export interface TerminalCapabilities {
    colors: number; // 0, 16, 256, or 16777216 (24-bit)
    unicode: boolean;
    mouse: boolean;
    alternateScreen: boolean;
}

export interface ValidationState {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

export interface ComponentState {
    focused: boolean;
    dirty: boolean;
    data: any;
    validation: ValidationState;
}

export interface InputEvent {
    type: 'key' | 'mouse';
    key?: string;
    ctrl?: boolean;
    alt?: boolean;
    shift?: boolean;
    position?: Position;
    button?: number | 'left' | 'right' | 'middle';
    action?: 'press' | 'release' | 'move' | 'drag';
    mouse?: MouseEvent;
}

export interface MouseEvent {
    x: number;
    y: number;
    button: 'left' | 'right' | 'middle';
    action: 'press' | 'release' | 'move' | 'drag';
}

export interface Component {
    id: string;
    position: Position;
    size: Size;
    visible: boolean;
    state: ComponentState;
    
    render(): string;
    handleInput(input: InputEvent): boolean;
    focus(): void;
    blur(): void;
    update(data?: any): void;
    destroy(): void;
}
