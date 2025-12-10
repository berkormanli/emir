import { BaseComponent } from '../base-component';
import { InputEvent, Position, Size, ValidationState } from '../types';
import { ThemeManager } from '../theme';

export interface NumberInputOptions {
    min?: number;
    max?: number;
    step?: number;
    defaultValue?: number;
    precision?: number;
    format?: (value: number) => string;
    parse?: (text: string) => number;
    validator?: (value: number) => ValidationState;
    disabled?: boolean;
    readonly?: boolean;
}

export class NumberInput extends BaseComponent {
    private options: Required<NumberInputOptions>;
    private value: number;
    private text: string;

    constructor(id: string, options: NumberInputOptions = {}) {
        super(id);

        this.options = {
            min: options.min ?? Number.NEGATIVE_INFINITY,
            max: options.max ?? Number.POSITIVE_INFINITY,
            step: options.step ?? 1,
            defaultValue: options.defaultValue ?? 0,
            precision: options.precision ?? 0,
            format: options.format ?? ((v) => v.toFixed(this.options.precision)),
            parse: options.parse ?? ((t) => {
                const parsed = parseFloat(t);
                return isNaN(parsed) ? this.value : parsed;
            }),
            validator: options.validator ?? (() => ({ valid: true })),
            disabled: options.disabled ?? false,
            readonly: options.readonly ?? false
        };

        this.value = this.clampValue(this.options.defaultValue);
        this.text = this.options.format(this.value);
    }

    getValue(): number {
        return this.value;
    }

    setValue(value: number): void {
        if (this.options.readonly || this.options.disabled) return;

        this.value = this.clampValue(value);
        this.text = this.options.format(this.value);
        this.markDirty();
    }

    getText(): string {
        return this.text;
    }

    setText(text: string): void {
        if (this.options.readonly || this.options.disabled) return;

        this.text = text;
        const parsedValue = this.options.parse(text);
        if (!isNaN(parsedValue)) {
            this.value = this.clampValue(parsedValue);
        }
        this.markDirty();
    }

    increase(amount?: number): void {
        this.setValue(this.value + (amount ?? this.options.step));
    }

    decrease(amount?: number): void {
        this.setValue(this.value - (amount ?? this.options.step));
    }

    private clampValue(value: number): number {
        return Math.max(this.options.min, Math.min(this.options.max, value));
    }

    protected override onRender(): string {
        const theme = ThemeManager.getCurrentTheme();

        let content = this.text;

        // Apply validation styling
        const validation = this.options.validator(this.value);
        if (!validation.valid) {
            content = this.ansi.color(content, theme.colors.error);
            if (validation.message) {
                content += ` ${this.ansi.dim(`(${validation.message})`)}`;
            }
        }

        // Show placeholder for empty text
        if (!content && this.value === 0) {
            content = this.ansi.dim(this.options.format(0));
        }

        // Apply disabled/readonly styling
        if (this.options.disabled) {
            content = this.ansi.dim(content);
        } else if (this.options.readonly) {
            content = this.ansi.italic(content);
        }

        // Add focus indicator
        if (this.hasFocus) {
            content = `[${content}]`;
        }

        return content;
    }

    protected override getDefaultSize(): Size {
        const sampleText = this.options.format(Math.max(
            Math.abs(this.options.min),
            Math.abs(this.options.max),
            this.options.defaultValue
        ));
        return {
            width: Math.max(10, sampleText.length + 2),
            height: 1
        };
    }

    protected override processInput(event: InputEvent): boolean {
        if (this.options.readonly || this.options.disabled) {
            return false;
        }

        switch (event.type) {
            case 'keydown':
                switch (event.key) {
                    case 'up':
                    case 'pageup':
                        this.increase(event.shift ? this.options.step * 10 : this.options.step);
                        return true;
                    case 'down':
                    case 'pagedown':
                        this.decrease(event.shift ? this.options.step * 10 : this.options.step);
                        return true;
                    case 'home':
                        this.setValue(this.options.min);
                        return true;
                    case 'end':
                        this.setValue(this.options.max);
                        return true;
                    case 'backspace':
                    case 'delete':
                        // Clear the value
                        this.setValue(0);
                        this.text = '';
                        return true;
                }
                break;

            case 'keypress':
                if (event.char) {
                    // Allow numbers, decimal point, minus sign
                    if (/[\d.\-]/.test(event.char)) {
                        const newText = this.text + event.char;
                        if (/^-?\d*\.?\d*$/.test(newText)) {
                            this.setText(newText);
                            return true;
                        }
                    }
                }
                break;
        }

        return false;
    }
}