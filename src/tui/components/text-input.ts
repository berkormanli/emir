import { BaseComponent } from '../base-component';
import { InputEvent, Position, Size, ValidationState } from '../types';
import { ThemeManager } from '../theme';

export interface TextInputOptions {
    placeholder?: string;
    defaultValue?: string;
    maxLength?: number;
    password?: boolean;
    multiline?: boolean;
    readonly?: boolean;
    disabled?: boolean;
    validator?: (value: string) => ValidationState;
}

export class TextInput extends BaseComponent {
    private options: Required<TextInputOptions>;
    private value: string;
    private cursorPosition: number = 0;
    private scrollOffset: number = 0;
    private selection: { start: number; end: number } | null = null;

    constructor(id: string, options: TextInputOptions = {}) {
        super(id);

        this.options = {
            placeholder: options.placeholder || '',
            defaultValue: options.defaultValue || '',
            maxLength: options.maxLength || Number.MAX_SAFE_INTEGER,
            password: options.password || false,
            multiline: options.multiline || false,
            readonly: options.readonly || false,
            disabled: options.disabled || false,
            validator: options.validator || (() => ({ valid: true }))
        };

        this.value = this.options.defaultValue;
    }

    getValue(): string {
        return this.value;
    }

    setValue(value: string): void {
        if (this.options.readonly || this.options.disabled) return;

        this.value = value.substring(0, this.options.maxLength);
        this.cursorPosition = Math.min(this.cursorPosition, this.value.length);
        this.markDirty();
    }

    getCursorPosition(): number {
        return this.cursorPosition;
    }

    insertText(text: string): void {
        if (this.options.readonly || this.options.disabled) return;

        const start = this.selection?.start ?? this.cursorPosition;
        const end = this.selection?.end ?? this.cursorPosition;

        this.value = this.value.substring(0, start) + text + this.value.substring(end);
        this.cursorPosition = start + text.length;
        this.clearSelection();
        this.markDirty();
    }

    deleteText(direction: 'backward' | 'forward' = 'backward'): void {
        if (this.options.readonly || this.options.disabled) return;

        if (this.selection) {
            const { start, end } = this.selection;
            this.value = this.value.substring(0, start) + this.value.substring(end);
            this.cursorPosition = start;
            this.clearSelection();
        } else {
            if (direction === 'backward' && this.cursorPosition > 0) {
                this.value = this.value.substring(0, this.cursorPosition - 1) +
                           this.value.substring(this.cursorPosition);
                this.cursorPosition--;
            } else if (direction === 'forward' && this.cursorPosition < this.value.length) {
                this.value = this.value.substring(0, this.cursorPosition) +
                           this.value.substring(this.cursorPosition + 1);
            }
        }
        this.markDirty();
    }

    moveCursor(delta: number): void {
        this.cursorPosition = Math.max(0, Math.min(this.value.length, this.cursorPosition + delta));
        this.clearSelection();
        this.markDirty();
    }

    setSelection(start: number, end: number): void {
        this.selection = { start: Math.min(start, end), end: Math.max(start, end) };
        this.markDirty();
    }

    clearSelection(): void {
        this.selection = null;
    }

    selectAll(): void {
        this.setSelection(0, this.value.length);
    }

    protected override onRender(): string {
        const theme = ThemeManager.getCurrentTheme();
        const displayValue = this.options.password ? '•'.repeat(this.value.length) : this.value;

        let content: string;
        if (this.value.length === 0) {
            content = this.ansi.dim(this.options.placeholder);
        } else {
            const validation = this.options.validator(this.value);
            content = displayValue;

            if (!validation.valid) {
                content = this.ansi.color(content, theme.colors.error);
            }
        }

        // Handle selection
        if (this.selection) {
            const { start, end } = this.selection;
            const before = content.substring(0, start);
            const selected = this.ansi.bgColor(content.substring(start, end), theme.colors.selection);
            const after = content.substring(end);
            content = before + selected + after;
        }

        // Handle cursor
        if (!this.selection && this.hasFocus) {
            const before = content.substring(0, this.cursorPosition);
            const cursor = content[this.cursorPosition] || ' ';
            const after = content.substring(this.cursorPosition + 1);
            content = before + this.ansi.bgColor(cursor, theme.colors.focus) + after;
        }

        // Apply disabled/readonly styling
        if (this.options.disabled) {
            content = this.ansi.dim(content);
        } else if (this.options.readonly) {
            content = this.ansi.italic(content);
        }

        // Add border if focused
        if (this.hasFocus) {
            content = theme.borders.single.chars ?
                `${theme.borders.single.chars.horizontal}${content}${theme.borders.single.chars.horizontal}` :
                `[${content}]`;
        }

        return content;
    }

    protected override getDefaultSize(): Size {
        return {
            width: Math.max(20, this.options.placeholder.length + 2),
            height: this.options.multiline ? 5 : 1
        };
    }

    protected override processInput(event: InputEvent): boolean {
        if (this.options.readonly || this.options.disabled) {
            return false;
        }

        switch (event.type) {
            case 'keydown':
                switch (event.key) {
                    case 'backspace':
                        this.deleteText('backward');
                        return true;
                    case 'delete':
                        this.deleteText('forward');
                        return true;
                    case 'left':
                        this.moveCursor(-1);
                        return true;
                    case 'right':
                        this.moveCursor(1);
                        return true;
                    case 'home':
                        this.cursorPosition = 0;
                        this.clearSelection();
                        this.markDirty();
                        return true;
                    case 'end':
                        this.cursorPosition = this.value.length;
                        this.clearSelection();
                        this.markDirty();
                        return true;
                    case 'a':
                        if (event.ctrl) {
                            this.selectAll();
                            return true;
                        }
                        break;
                    case 'c':
                        if (event.ctrl && this.selection) {
                            // Copy to clipboard (implementation dependent)
                            return true;
                        }
                        break;
                    case 'v':
                        if (event.ctrl) {
                            // Paste from clipboard (implementation dependent)
                            return true;
                        }
                        break;
                }
                break;

            case 'keypress':
                if (event.char && this.value.length < this.options.maxLength) {
                    this.insertText(event.char);
                    return true;
                }
                break;
        }

        return false;
    }
}