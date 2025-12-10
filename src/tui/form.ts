import { BaseComponent } from './base-component';
import { InputEvent, Position, Size, ValidationState } from './types';
import { AnsiUtils } from './ansi-utils';

/**
 * Form field types
 */
export type FieldType = 'text' | 'number' | 'password' | 'email' | 'select' | 'checkbox';

/**
 * Form field validation rule
 */
export interface ValidationRule {
    validate: (value: any) => boolean;
    message: string;
}

/**
 * Base form field interface
 */
export interface FormField {
    name: string;
    label: string;
    type: FieldType;
    value: any;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    validation?: ValidationRule[];
    error?: string;
    focused?: boolean;
    
    // Methods
    setValue(value: any): void;
    getValue(): any;
    validate(): ValidationState;
    handleInput(input: InputEvent): boolean;
    render(width: number, focused: boolean): string;
    focus(): void;
    blur(): void;
}

/**
 * Form configuration options
 */
export interface FormOptions {
    title?: string;
    showBorder?: boolean;
    showLabels?: boolean;
    labelPosition?: 'left' | 'top';
    submitText?: string;
    cancelText?: string;
    borderStyle?: 'single' | 'double' | 'rounded' | 'thick';
}

/**
 * Form data structure
 */
export type FormData = Record<string, any>;

/**
 * Border characters for different styles
 */
const BORDER_CHARS = {
    single: {
        topLeft: '┌',
        topRight: '┐',
        bottomLeft: '└',
        bottomRight: '┘',
        horizontal: '─',
        vertical: '│'
    },
    double: {
        topLeft: '╔',
        topRight: '╗',
        bottomLeft: '╚',
        bottomRight: '╝',
        horizontal: '═',
        vertical: '║'
    },
    rounded: {
        topLeft: '╭',
        topRight: '╮',
        bottomLeft: '╰',
        bottomRight: '╯',
        horizontal: '─',
        vertical: '│'
    },
    thick: {
        topLeft: '┏',
        topRight: '┓',
        bottomLeft: '┗',
        bottomRight: '┛',
        horizontal: '━',
        vertical: '┃'
    }
};

/**
 * Base implementation for form fields
 */
export abstract class BaseFormField implements FormField {
    name: string;
    label: string;
    type: FieldType;
    value: any;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    validation?: ValidationRule[];
    error?: string;
    focused?: boolean;

    constructor(
        name: string,
        label: string,
        type: FieldType,
        defaultValue: any = '',
        options: Partial<FormField> = {}
    ) {
        this.name = name;
        this.label = label;
        this.type = type;
        this.value = defaultValue;
        this.placeholder = options.placeholder;
        this.required = options.required || false;
        this.disabled = options.disabled || false;
        this.validation = options.validation || [];
        this.focused = false;
    }

    setValue(value: any): void {
        if (!this.disabled) {
            this.value = value;
            this.error = undefined;
        }
    }

    getValue(): any {
        return this.value;
    }

    validate(): ValidationState {
        const errors: string[] = [];
        
        // Check required
        if (this.required && !this.value) {
            errors.push(`${this.label} is required`);
        }
        
        // Run custom validation rules
        if (this.validation && this.value) {
            for (const rule of this.validation) {
                if (!rule.validate(this.value)) {
                    errors.push(rule.message);
                }
            }
        }
        
        this.error = errors.length > 0 ? errors[0] : undefined;
        
        return {
            valid: errors.length === 0,
            errors: errors,
            warnings: []
        };
    }

    focus(): void {
        this.focused = true;
    }

    blur(): void {
        this.focused = false;
        this.validate();
    }

    abstract handleInput(input: InputEvent): boolean;
    abstract render(width: number, focused: boolean): string;
}

/**
 * Text input field
 */
export class TextInput extends BaseFormField {
    maxLength?: number;
    minLength?: number;
    cursorPosition: number;
    selectionStart?: number;
    selectionEnd?: number;

    constructor(
        name: string,
        label: string,
        defaultValue: string = '',
        options: Partial<TextInput> = {}
    ) {
        super(name, label, 'text', defaultValue, options);
        this.maxLength = options.maxLength;
        this.minLength = options.minLength;
        this.cursorPosition = defaultValue.length;
    }

    handleInput(input: InputEvent): boolean {
        if (input.type !== 'key' || this.disabled) {
            return false;
        }

        const currentValue = String(this.value);

        switch (input.key) {
            case 'left':
                if (this.cursorPosition > 0) {
                    this.cursorPosition--;
                }
                return true;

            case 'right':
                if (this.cursorPosition < currentValue.length) {
                    this.cursorPosition++;
                }
                return true;

            case 'home':
                this.cursorPosition = 0;
                return true;

            case 'end':
                this.cursorPosition = currentValue.length;
                return true;

            case 'backspace':
                if (this.cursorPosition > 0) {
                    const newValue = 
                        currentValue.slice(0, this.cursorPosition - 1) +
                        currentValue.slice(this.cursorPosition);
                    this.value = newValue;
                    this.cursorPosition--;
                }
                return true;

            case 'delete':
                if (this.cursorPosition < currentValue.length) {
                    const newValue = 
                        currentValue.slice(0, this.cursorPosition) +
                        currentValue.slice(this.cursorPosition + 1);
                    this.value = newValue;
                }
                return true;

            default:
                // Handle regular character input
                if (input.key && input.key.length === 1 && !input.ctrl && !input.alt) {
                    if (!this.maxLength || currentValue.length < this.maxLength) {
                        const newValue = 
                            currentValue.slice(0, this.cursorPosition) +
                            input.key +
                            currentValue.slice(this.cursorPosition);
                        this.value = newValue;
                        this.cursorPosition++;
                    }
                    return true;
                }
                return false;
        }
    }

    render(width: number, focused: boolean): string {
        const lines: string[] = [];
        
        // Render label
        if (this.label) {
            lines.push(AnsiUtils.colorText(this.label + ':', 7));
        }
        
        // Calculate field width
        const fieldWidth = width - 2; // Account for borders/padding
        
        // Prepare field value
        let displayValue = String(this.value || '');
        if (!displayValue && this.placeholder && !focused) {
            displayValue = this.placeholder;
        }
        
        // Truncate if too long
        if (displayValue.length > fieldWidth) {
            displayValue = displayValue.substring(0, fieldWidth - 3) + '...';
        }
        
        // Add cursor if focused
        if (focused && this.focused) {
            const beforeCursor = displayValue.slice(0, this.cursorPosition);
            const atCursor = displayValue[this.cursorPosition] || ' ';
            const afterCursor = displayValue.slice(this.cursorPosition + 1);
            
            displayValue = beforeCursor + 
                          AnsiUtils.colorText(atCursor, 0, 7) + // Inverted colors for cursor
                          afterCursor;
        }
        
        // Pad to width
        const paddedValue = displayValue + ' '.repeat(Math.max(0, fieldWidth - displayValue.length));
        
        // Apply styling
        let fieldLine = '';
        if (this.disabled) {
            fieldLine = AnsiUtils.colorText('[' + paddedValue + ']', 8);
        } else if (focused && this.focused) {
            fieldLine = '[' + AnsiUtils.colorText(paddedValue, 15) + ']';
        } else if (this.error) {
            fieldLine = '[' + AnsiUtils.colorText(paddedValue, 1) + ']';
        } else {
            fieldLine = '[' + paddedValue + ']';
        }
        
        lines.push(fieldLine);
        
        // Render error message
        if (this.error) {
            lines.push(AnsiUtils.colorText('  ' + this.error, 1));
        }
        
        return lines.join('\n');
    }

    validate(): ValidationState {
        const state = super.validate();
        
        // Additional text-specific validation
        if (this.minLength && this.value && this.value.length < this.minLength) {
            state.errors.push(`${this.label} must be at least ${this.minLength} characters`);
            state.valid = false;
        }
        
        if (this.maxLength && this.value && this.value.length > this.maxLength) {
            state.errors.push(`${this.label} must be no more than ${this.maxLength} characters`);
            state.valid = false;
        }
        
        this.error = state.errors.length > 0 ? state.errors[0] : undefined;
        
        return state;
    }
}

/**
 * Number input field
 */
export class NumberInput extends BaseFormField {
    min?: number;
    max?: number;
    step?: number;
    decimals?: number;
    cursorPosition: number;

    constructor(
        name: string,
        label: string,
        defaultValue: number = 0,
        options: Partial<NumberInput> = {}
    ) {
        super(name, label, 'number', defaultValue, options);
        this.min = options.min;
        this.max = options.max;
        this.step = options.step || 1;
        this.decimals = options.decimals || 0;
        this.cursorPosition = String(defaultValue).length;
    }

    handleInput(input: InputEvent): boolean {
        if (input.type !== 'key' || this.disabled) {
            return false;
        }

        const currentValue = String(this.value);

        switch (input.key) {
            case 'up':
                const upValue = Number(this.value) + this.step!;
                if (!this.max || upValue <= this.max) {
                    this.value = this.decimals ? 
                        Number(upValue.toFixed(this.decimals)) : 
                        Math.floor(upValue);
                    this.cursorPosition = String(this.value).length;
                }
                return true;

            case 'down':
                const downValue = Number(this.value) - this.step!;
                if (this.min === undefined || downValue >= this.min) {
                    this.value = this.decimals ? 
                        Number(downValue.toFixed(this.decimals)) : 
                        Math.floor(downValue);
                    this.cursorPosition = String(this.value).length;
                }
                return true;

            case 'left':
                if (this.cursorPosition > 0) {
                    this.cursorPosition--;
                }
                return true;

            case 'right':
                if (this.cursorPosition < currentValue.length) {
                    this.cursorPosition++;
                }
                return true;

            case 'home':
                this.cursorPosition = 0;
                return true;

            case 'end':
                this.cursorPosition = currentValue.length;
                return true;

            case 'backspace':
                if (this.cursorPosition > 0) {
                    const newValue = 
                        currentValue.slice(0, this.cursorPosition - 1) +
                        currentValue.slice(this.cursorPosition);
                    const numValue = Number(newValue);
                    if (!isNaN(numValue)) {
                        this.value = numValue;
                        this.cursorPosition--;
                    }
                }
                return true;

            case 'delete':
                if (this.cursorPosition < currentValue.length) {
                    const newValue = 
                        currentValue.slice(0, this.cursorPosition) +
                        currentValue.slice(this.cursorPosition + 1);
                    const numValue = Number(newValue);
                    if (!isNaN(numValue)) {
                        this.value = numValue;
                    }
                }
                return true;

            default:
                // Handle numeric input and decimal point
                const isNumeric = /[0-9]/.test(input.key || '');
                const isDecimalPoint = input.key === '.' && this.decimals && this.decimals > 0;
                const isMinus = input.key === '-' && this.cursorPosition === 0;
                
                if (input.key && input.key.length === 1 && !input.ctrl && !input.alt) {
                    if (isNumeric || isDecimalPoint || isMinus) {
                        const newValue = 
                            currentValue.slice(0, this.cursorPosition) +
                            input.key +
                            currentValue.slice(this.cursorPosition);
                        
                        // For decimal points, don't convert to number yet if it ends with '.'
                        if (isDecimalPoint && !currentValue.includes('.')) {
                            this.value = newValue; // Keep as string temporarily
                            this.cursorPosition++;
                            return true;
                        }
                        
                        const numValue = Number(newValue);
                        
                        if (!isNaN(numValue)) {
                            // Check constraints
                            if ((this.min === undefined || numValue >= this.min) && 
                                (this.max === undefined || numValue <= this.max)) {
                                this.value = numValue;
                                this.cursorPosition++;
                            }
                        }
                        return true;
                    }
                }
                return false;
        }
    }

    render(width: number, focused: boolean): string {
        const lines: string[] = [];
        
        // Render label
        if (this.label) {
            lines.push(AnsiUtils.colorText(this.label + ':', 7));
        }
        
        // Calculate field width
        const fieldWidth = width - 2;
        
        // Format value
        let displayValue = this.decimals ? 
            Number(this.value).toFixed(this.decimals) : 
            String(this.value);
        
        // Add cursor if focused
        if (focused && this.focused) {
            const beforeCursor = displayValue.slice(0, this.cursorPosition);
            const atCursor = displayValue[this.cursorPosition] || ' ';
            const afterCursor = displayValue.slice(this.cursorPosition + 1);
            
            displayValue = beforeCursor + 
                          AnsiUtils.colorText(atCursor, 0, 7) +
                          afterCursor;
        }
        
        // Pad to width
        const paddedValue = displayValue + ' '.repeat(Math.max(0, fieldWidth - displayValue.length));
        
        // Apply styling
        let fieldLine = '';
        if (this.disabled) {
            fieldLine = AnsiUtils.colorText('[' + paddedValue + ']', 8);
        } else if (focused && this.focused) {
            fieldLine = '[' + AnsiUtils.colorText(paddedValue, 15) + ']';
        } else if (this.error) {
            fieldLine = '[' + AnsiUtils.colorText(paddedValue, 1) + ']';
        } else {
            fieldLine = '[' + paddedValue + ']';
        }
        
        lines.push(fieldLine);
        
        // Render error message
        if (this.error) {
            lines.push(AnsiUtils.colorText('  ' + this.error, 1));
        }
        
        return lines.join('\n');
    }

    validate(): ValidationState {
        const state = super.validate();
        
        // Number-specific validation
        if (this.min !== undefined && this.value < this.min) {
            state.errors.push(`${this.label} must be at least ${this.min}`);
            state.valid = false;
        }
        
        if (this.max !== undefined && this.value > this.max) {
            state.errors.push(`${this.label} must be no more than ${this.max}`);
            state.valid = false;
        }
        
        this.error = state.errors.length > 0 ? state.errors[0] : undefined;
        
        return state;
    }
}

/**
 * Interactive form component
 */
export class Form extends BaseComponent {
    private fields: FormField[];
    private currentFieldIndex: number;
    private options: FormOptions;
    private onSubmit?: (data: FormData) => void;
    private onCancel?: () => void;

    constructor(
        id: string,
        fields: FormField[] = [],
        options: FormOptions = {},
        position?: Position,
        size?: Size
    ) {
        const calculatedSize = size || Form.calculateSize(fields, options);
        super(id, position, calculatedSize);
        
        this.fields = fields;
        this.currentFieldIndex = 0;
        this.options = {
            showBorder: true,
            showLabels: true,
            labelPosition: 'top',
            submitText: 'Submit',
            cancelText: 'Cancel',
            borderStyle: 'single',
            ...options
        };
        
        // Focus first field
        if (this.fields.length > 0) {
            this.fields[0].focus();
        }
    }

    /**
     * Calculate form size based on fields
     */
    private static calculateSize(fields: FormField[], options: FormOptions): Size {
        const hasTitle = !!options.title;
        const hasBorder = options.showBorder !== false;
        
        // Calculate width (minimum 40)
        let maxWidth = 40;
        if (hasTitle) {
            maxWidth = Math.max(maxWidth, options.title.length + 4);
        }
        
        for (const field of fields) {
            maxWidth = Math.max(maxWidth, field.label.length + 10);
        }
        
        const width = maxWidth + (hasBorder ? 2 : 0);
        
        // Calculate height
        let height = 0;
        
        // Title
        if (hasTitle) height += 2;
        
        // Fields (label + input + potential error + spacing)
        height += fields.length * 4;
        
        // Submit/Cancel buttons
        height += 3;
        
        // Borders
        if (hasBorder) height += 2;
        
        return { width, height };
    }

    /**
     * Add a field to the form
     */
    addField(field: FormField): void {
        this.fields.push(field);
        if (this.fields.length === 1) {
            field.focus();
            this.currentFieldIndex = 0;
        }
        this.size = Form.calculateSize(this.fields, this.options);
        this.markDirty();
    }

    /**
     * Remove a field from the form
     */
    removeField(name: string): boolean {
        const index = this.fields.findIndex(f => f.name === name);
        if (index !== -1) {
            this.fields.splice(index, 1);
            if (this.currentFieldIndex >= this.fields.length) {
                this.currentFieldIndex = Math.max(0, this.fields.length - 1);
            }
            if (this.fields.length > 0 && this.currentFieldIndex >= 0) {
                this.fields[this.currentFieldIndex].focus();
            }
            this.markDirty();
            return true;
        }
        return false;
    }

    /**
     * Get field by name
     */
    getField(name: string): FormField | undefined {
        return this.fields.find(f => f.name === name);
    }

    /**
     * Get all fields
     */
    getFields(): FormField[] {
        return this.fields;
    }

    /**
     * Get form data
     */
    getData(): FormData {
        const data: FormData = {};
        for (const field of this.fields) {
            data[field.name] = field.getValue();
        }
        return data;
    }

    /**
     * Set form data
     */
    setData(data: FormData): void {
        for (const field of this.fields) {
            if (data.hasOwnProperty(field.name)) {
                field.setValue(data[field.name]);
            }
        }
        this.markDirty();
    }

    /**
     * Validate all fields
     */
    validateForm(): ValidationState {
        const errors: string[] = [];
        let valid = true;
        
        for (const field of this.fields) {
            const fieldState = field.validate();
            if (!fieldState.valid) {
                valid = false;
                errors.push(...fieldState.errors);
            }
        }
        
        return {
            valid,
            errors,
            warnings: []
        };
    }

    /**
     * Submit the form
     */
    private submitForm(): void {
        const validationState = this.validateForm();
        if (validationState.valid && this.onSubmit) {
            this.onSubmit(this.getData());
        }
        this.markDirty();
    }

    /**
     * Cancel the form
     */
    private cancelForm(): void {
        if (this.onCancel) {
            this.onCancel();
        }
    }

    /**
     * Set submit callback
     */
    setOnSubmit(callback: (data: FormData) => void): void {
        this.onSubmit = callback;
    }

    /**
     * Set cancel callback
     */
    setOnCancel(callback: () => void): void {
        this.onCancel = callback;
    }

    /**
     * Move to next field
     */
    private nextField(): void {
        if (this.fields.length === 0) return;
        
        // Blur current field
        if (this.currentFieldIndex >= 0 && this.currentFieldIndex < this.fields.length) {
            this.fields[this.currentFieldIndex].blur();
        }
        
        // Find next non-disabled field
        let nextIndex = this.currentFieldIndex + 1;
        while (nextIndex < this.fields.length && this.fields[nextIndex].disabled) {
            nextIndex++;
        }
        
        if (nextIndex < this.fields.length) {
            this.currentFieldIndex = nextIndex;
            this.fields[this.currentFieldIndex].focus();
        } else {
            // Wrap to first field or stay at last
            this.currentFieldIndex = 0;
            while (this.currentFieldIndex < this.fields.length && 
                   this.fields[this.currentFieldIndex].disabled) {
                this.currentFieldIndex++;
            }
            if (this.currentFieldIndex < this.fields.length) {
                this.fields[this.currentFieldIndex].focus();
            }
        }
        
        this.markDirty();
    }

    /**
     * Move to previous field
     */
    private previousField(): void {
        if (this.fields.length === 0) return;
        
        // Blur current field
        if (this.currentFieldIndex >= 0 && this.currentFieldIndex < this.fields.length) {
            this.fields[this.currentFieldIndex].blur();
        }
        
        // Find previous non-disabled field
        let prevIndex = this.currentFieldIndex - 1;
        while (prevIndex >= 0 && this.fields[prevIndex].disabled) {
            prevIndex--;
        }
        
        if (prevIndex >= 0) {
            this.currentFieldIndex = prevIndex;
            this.fields[this.currentFieldIndex].focus();
        } else {
            // Wrap to last field
            this.currentFieldIndex = this.fields.length - 1;
            while (this.currentFieldIndex >= 0 && 
                   this.fields[this.currentFieldIndex].disabled) {
                this.currentFieldIndex--;
            }
            if (this.currentFieldIndex >= 0) {
                this.fields[this.currentFieldIndex].focus();
            }
        }
        
        this.markDirty();
    }

    /**
     * Handle input events
     */
    handleInput(input: InputEvent): boolean {
        if (input.type !== 'key' || !this.state.focused) {
            return false;
        }

        // Check for form navigation
        switch (input.key) {
            case 'tab':
                if (input.shift) {
                    this.previousField();
                } else {
                    this.nextField();
                }
                return true;

            case 'enter':
                // If on last field or ctrl+enter, submit form
                if (input.ctrl || this.currentFieldIndex === this.fields.length - 1) {
                    this.submitForm();
                } else {
                    this.nextField();
                }
                return true;

            case 'escape':
                this.cancelForm();
                return true;

            default:
                // Pass input to current field
                if (this.currentFieldIndex >= 0 && 
                    this.currentFieldIndex < this.fields.length) {
                    return this.fields[this.currentFieldIndex].handleInput(input);
                }
                return false;
        }
    }

    /**
     * Render the form
     */
    render(): string {
        const lines: string[] = [];
        const borderChars = BORDER_CHARS[this.options.borderStyle || 'single'];
        const hasBorder = this.options.showBorder;
        const hasTitle = !!this.options.title;
        const innerWidth = this.size.width - (hasBorder ? 2 : 0);
        
        // Top border
        if (hasBorder) {
            const topBorder = borderChars.topLeft + 
                             borderChars.horizontal.repeat(this.size.width - 2) + 
                             borderChars.topRight;
            lines.push(topBorder);
        }
        
        // Title
        if (hasTitle) {
            const title = this.options.title!;
            const centeredTitle = this.centerText(title, innerWidth);
            const titleLine = hasBorder ? 
                borderChars.vertical + AnsiUtils.colorText(centeredTitle, 7) + borderChars.vertical :
                AnsiUtils.colorText(centeredTitle, 7);
            lines.push(titleLine);
            
            // Separator
            const separator = hasBorder ?
                borderChars.vertical + borderChars.horizontal.repeat(innerWidth) + borderChars.vertical :
                borderChars.horizontal.repeat(innerWidth);
            lines.push(separator);
        }
        
        // Render fields
        for (let i = 0; i < this.fields.length; i++) {
            const field = this.fields[i];
            const isFocused = i === this.currentFieldIndex && this.state.focused;
            const fieldLines = field.render(innerWidth - 2, isFocused).split('\n');
            
            for (const fieldLine of fieldLines) {
                const paddedLine = ' ' + fieldLine + ' '.repeat(Math.max(0, innerWidth - fieldLine.length - 1));
                const line = hasBorder ?
                    borderChars.vertical + paddedLine + borderChars.vertical :
                    paddedLine;
                lines.push(line);
            }
            
            // Add spacing between fields
            if (i < this.fields.length - 1) {
                const spacer = ' '.repeat(innerWidth);
                const spacerLine = hasBorder ?
                    borderChars.vertical + spacer + borderChars.vertical :
                    spacer;
                lines.push(spacerLine);
            }
        }
        
        // Separator before buttons
        const buttonSeparator = ' '.repeat(innerWidth);
        const buttonSeparatorLine = hasBorder ?
            borderChars.vertical + buttonSeparator + borderChars.vertical :
            buttonSeparator;
        lines.push(buttonSeparatorLine);
        
        // Render buttons
        const submitButton = `[${this.options.submitText}]`;
        const cancelButton = `[${this.options.cancelText}]`;
        const buttons = `  ${submitButton}  ${cancelButton}`;
        const centeredButtons = this.centerText(buttons, innerWidth);
        const buttonLine = hasBorder ?
            borderChars.vertical + centeredButtons + borderChars.vertical :
            centeredButtons;
        lines.push(buttonLine);
        
        // Bottom border
        if (hasBorder) {
            const bottomBorder = borderChars.bottomLeft + 
                               borderChars.horizontal.repeat(this.size.width - 2) + 
                               borderChars.bottomRight;
            lines.push(bottomBorder);
        }
        
        // Mark as clean
        this.markClean();
        
        return lines.join('\n');
    }

    /**
     * Center text within width
     */
    private centerText(text: string, width: number): string {
        if (text.length >= width) {
            return text.substring(0, width);
        }
        const padding = Math.floor((width - text.length) / 2);
        return ' '.repeat(padding) + text + ' '.repeat(width - text.length - padding);
    }

    /**
     * Focus the form
     */
    focus(): void {
        super.focus();
        if (this.fields.length > 0 && this.currentFieldIndex >= 0) {
            this.fields[this.currentFieldIndex].focus();
        }
    }

    /**
     * Blur the form
     */
    blur(): void {
        super.blur();
        if (this.fields.length > 0 && this.currentFieldIndex >= 0) {
            this.fields[this.currentFieldIndex].blur();
        }
    }
}
