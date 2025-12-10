import { Modal, ModalOptions } from './modal';
import { Position, Size, InputEvent } from './types';
import { Flex } from './flex';
import { Box } from './box';
import { BaseComponent } from './base-component';
import { AnsiUtils } from './ansi-utils';

/**
 * Dialog button configuration
 */
export interface DialogButton {
    id: string;
    label: string;
    value?: any;
    isDefault?: boolean;
    isCancel?: boolean;
    style?: 'primary' | 'secondary' | 'danger' | 'success';
    shortcut?: string;
    callback?: () => void;
}

/**
 * Predefined dialog types
 */
export type DialogType = 'alert' | 'confirm' | 'prompt' | 'custom';

/**
 * Predefined button sets
 */
export type DialogButtons = 'ok' | 'ok-cancel' | 'yes-no' | 'yes-no-cancel' | 'retry-cancel' | 'custom';

/**
 * Dialog result
 */
export interface DialogResult {
    buttonId: string;
    value?: any;
    inputValue?: string;
}

/**
 * Dialog options
 */
export interface DialogOptions extends Omit<ModalOptions, 'title'> {
    type?: DialogType;
    title?: string;
    message: string;
    buttons?: DialogButtons | DialogButton[];
    defaultButton?: string;
    cancelButton?: string;
    inputPlaceholder?: string;
    inputDefaultValue?: string;
    inputValidation?: (value: string) => boolean | string;
    icon?: string;
    iconStyle?: 'info' | 'warning' | 'error' | 'success' | 'question';
    onResult?: (result: DialogResult) => void;
}

/**
 * Dialog component - a modal with predefined content and buttons
 */
export class Dialog extends Modal {
    protected dialogOptions: DialogOptions;
    private dialogButtons: DialogButton[];
    private selectedButtonIndex: number;
    private inputValue: string;
    private contentBox: Box;
    private buttonFlex: Flex;
    private messageComponent: DialogMessage;
    private inputComponent: DialogInput | null;

    constructor(
        id: string,
        options: DialogOptions,
        size?: Size
    ) {
        // Set up modal options
        const modalOptions: ModalOptions = {
            ...options,
            title: options.title || Dialog.getDefaultTitle(options.type),
            closable: false, // Use dialog buttons instead
            escapeToClose: false // Will be handled by dialog
        };
        
        // Calculate appropriate size based on content
        const dialogSize = size || Dialog.calculateDialogSize(options);
        
        super(id, modalOptions, dialogSize);
        
        this.dialogOptions = {
            type: 'alert',
            buttons: 'ok',
            ...options
        };
        
        this.dialogButtons = this.createButtons();
        this.selectedButtonIndex = this.findDefaultButtonIndex();
        this.inputValue = options.inputDefaultValue || '';
        
        // Create content components
        this.contentBox = new Box(`${id}-content`, {
            padding: 1,
            border: false
        });
        
        this.messageComponent = new DialogMessage(
            `${id}-message`,
            options.message,
            options.icon,
            options.iconStyle
        );
        
        this.inputComponent = null;
        if (options.type === 'prompt') {
            this.inputComponent = new DialogInput(
                `${id}-input`,
                this.inputValue,
                options.inputPlaceholder
            );
        }
        
        this.buttonFlex = new Flex(`${id}-buttons`, {
            direction: 'row',
            justifyContent: 'center',
            gap: 2,
            padding: [1, 0]
        });
        
        this.setupLayout();
    }

    /**
     * Get default title based on dialog type
     */
    private static getDefaultTitle(type?: DialogType): string {
        switch (type) {
            case 'alert':
                return 'Alert';
            case 'confirm':
                return 'Confirm';
            case 'prompt':
                return 'Input';
            default:
                return 'Dialog';
        }
    }

    /**
     * Calculate appropriate dialog size
     */
    private static calculateDialogSize(options: DialogOptions): Size {
        const minWidth = 30;
        const maxWidth = 60;
        const minHeight = 8;
        
        // Calculate width based on message length
        const messageLines = options.message.split('\n');
        const maxMessageWidth = Math.max(...messageLines.map(line => line.length));
        const width = Math.min(maxWidth, Math.max(minWidth, maxMessageWidth + 10));
        
        // Calculate height based on content
        let height = minHeight;
        height += messageLines.length;
        if (options.type === 'prompt') {
            height += 3; // Input field
        }
        height += 2; // Buttons
        
        return { width, height };
    }

    /**
     * Create buttons based on configuration
     */
    private createButtons(): DialogButton[] {
        const { buttons } = this.dialogOptions;
        
        if (Array.isArray(buttons)) {
            return buttons;
        }
        
        switch (buttons) {
            case 'ok':
                return [
                    { id: 'ok', label: 'OK', isDefault: true, style: 'primary', shortcut: 'Enter' }
                ];
            case 'ok-cancel':
                return [
                    { id: 'ok', label: 'OK', isDefault: true, style: 'primary', shortcut: 'Enter' },
                    { id: 'cancel', label: 'Cancel', isCancel: true, style: 'secondary', shortcut: 'Esc' }
                ];
            case 'yes-no':
                return [
                    { id: 'yes', label: 'Yes', isDefault: true, style: 'primary', shortcut: 'Y' },
                    { id: 'no', label: 'No', isCancel: true, style: 'secondary', shortcut: 'N' }
                ];
            case 'yes-no-cancel':
                return [
                    { id: 'yes', label: 'Yes', isDefault: true, style: 'primary', shortcut: 'Y' },
                    { id: 'no', label: 'No', style: 'secondary', shortcut: 'N' },
                    { id: 'cancel', label: 'Cancel', isCancel: true, style: 'secondary', shortcut: 'Esc' }
                ];
            case 'retry-cancel':
                return [
                    { id: 'retry', label: 'Retry', isDefault: true, style: 'primary', shortcut: 'R' },
                    { id: 'cancel', label: 'Cancel', isCancel: true, style: 'secondary', shortcut: 'Esc' }
                ];
            default:
                return [
                    { id: 'ok', label: 'OK', isDefault: true, style: 'primary', shortcut: 'Enter' }
                ];
        }
    }

    /**
     * Find default button index
     */
    private findDefaultButtonIndex(): number {
        const defaultButton = this.dialogOptions.defaultButton;
        if (defaultButton) {
            const index = this.dialogButtons.findIndex(btn => btn.id === defaultButton);
            if (index >= 0) return index;
        }
        
        const defaultIndex = this.dialogButtons.findIndex(btn => btn.isDefault);
        return defaultIndex >= 0 ? defaultIndex : 0;
    }

    /**
     * Setup dialog layout
     */
    private setupLayout(): void {
        // Add message to content
        this.contentBox.addChild(this.messageComponent);
        
        // Add input if prompt
        if (this.inputComponent) {
            this.contentBox.addChild(this.inputComponent);
        }
        
        // Add buttons
        this.dialogButtons.forEach((button, index) => {
            const buttonComponent = new DialogButtonComponent(
                `${this.id}-btn-${button.id}`,
                button,
                index === this.selectedButtonIndex
            );
            
            this.buttonFlex.addFlexItem({
                component: buttonComponent,
                flexGrow: 0
            });
        });
        
        // Add components to dialog
        this.addChild(this.contentBox);
        this.addChild(this.buttonFlex);
    }

    /**
     * Handle input events
     */
    handleInput(input: InputEvent): boolean {
        if (input.type === 'key') {
            switch (input.key) {
                case 'tab':
                    // Move to next button
                    this.selectNextButton();
                    return true;
                    
                case 'left':
                    // Previous button
                    this.selectPreviousButton();
                    return true;
                    
                case 'right':
                    // Next button
                    this.selectNextButton();
                    return true;
                    
                case 'enter':
                case 'space':
                    // Activate selected button
                    this.activateButton(this.selectedButtonIndex);
                    return true;
                    
                case 'escape':
                    // Find cancel button
                    const cancelIndex = this.dialogButtons.findIndex(btn => btn.isCancel);
                    if (cancelIndex >= 0) {
                        this.activateButton(cancelIndex);
                        return true;
                    }
                    break;
                    
                default:
                    // Check for button shortcuts
                    if (input.key && input.key.length === 1) {
                        const key = input.key.toUpperCase();
                        const buttonIndex = this.dialogButtons.findIndex(btn => 
                            btn.shortcut && btn.shortcut.toUpperCase().startsWith(key)
                        );
                        if (buttonIndex >= 0) {
                            this.activateButton(buttonIndex);
                            return true;
                        }
                    }
                    
                    // Pass input to input component if present
                    if (this.inputComponent) {
                        return this.inputComponent.handleInput(input);
                    }
            }
        }
        
        return super.handleInput(input);
    }

    /**
     * Select next button
     */
    private selectNextButton(): void {
        this.selectedButtonIndex = (this.selectedButtonIndex + 1) % this.dialogButtons.length;
        this.updateButtonSelection();
    }

    /**
     * Select previous button
     */
    private selectPreviousButton(): void {
        this.selectedButtonIndex = this.selectedButtonIndex === 0 
            ? this.dialogButtons.length - 1 
            : this.selectedButtonIndex - 1;
        this.updateButtonSelection();
    }

    /**
     * Update button selection visuals
     */
    private updateButtonSelection(): void {
        const buttons = this.buttonFlex.getChildren();
        buttons.forEach((button, index) => {
            if (button instanceof DialogButtonComponent) {
                button.setSelected(index === this.selectedButtonIndex);
            }
        });
        this.markDirty();
    }

    /**
     * Activate a button
     */
    private activateButton(index: number): void {
        if (index < 0 || index >= this.dialogButtons.length) return;
        
        const button = this.dialogButtons[index];
        
        // Validate input if prompt
        if (this.dialogOptions.type === 'prompt' && this.inputComponent) {
            const validation = this.dialogOptions.inputValidation;
            if (validation) {
                const result = validation(this.inputValue);
                if (result !== true) {
                    // Show validation error
                    this.inputComponent.setError(typeof result === 'string' ? result : 'Invalid input');
                    return;
                }
            }
        }
        
        // Create result
        const result: DialogResult = {
            buttonId: button.id,
            value: button.value,
            inputValue: this.inputComponent ? this.inputValue : undefined
        };
        
        // Call button callback
        if (button.callback) {
            button.callback();
        }
        
        // Call dialog callback
        if (this.dialogOptions.onResult) {
            this.dialogOptions.onResult(result);
        }
        
        // Close dialog
        this.hide();
    }

    /**
     * Show dialog and return promise for result
     */
    showAsync(): Promise<DialogResult> {
        return new Promise((resolve) => {
            const originalCallback = this.dialogOptions.onResult;
            
            this.dialogOptions.onResult = (result) => {
                if (originalCallback) {
                    originalCallback(result);
                }
                resolve(result);
            };
            
            this.show();
        });
    }
}

/**
 * Dialog message component
 */
class DialogMessage extends BaseComponent {
    private message: string;
    private icon?: string;
    private iconStyle?: string;

    constructor(id: string, message: string, icon?: string, iconStyle?: string) {
        super(id);
        this.message = message;
        this.icon = icon;
        this.iconStyle = iconStyle;
    }

    render(): string {
        const lines = this.message.split('\n');
        
        if (this.icon) {
            // Add icon to first line
            const iconChar = this.getIconChar();
            lines[0] = `${iconChar}  ${lines[0]}`;
        }
        
        return lines.join('\n');
    }

    private getIconChar(): string {
        if (this.icon) return this.icon;
        
        switch (this.iconStyle) {
            case 'info':
                return 'ℹ';
            case 'warning':
                return '⚠';
            case 'error':
                return '✗';
            case 'success':
                return '✓';
            case 'question':
                return '?';
            default:
                return 'ℹ';
        }
    }
}

/**
 * Dialog input component
 */
class DialogInput extends BaseComponent {
    private value: string;
    private placeholder?: string;
    private error?: string;
    private cursorPosition: number;

    constructor(id: string, value: string = '', placeholder?: string) {
        super(id);
        this.value = value;
        this.placeholder = placeholder;
        this.cursorPosition = value.length;
    }

    setError(error?: string): void {
        this.error = error;
        this.markDirty();
    }

    getValue(): string {
        return this.value;
    }

    handleInput(input: InputEvent): boolean {
        if (input.type === 'key') {
            switch (input.key) {
                case 'backspace':
                    if (this.cursorPosition > 0) {
                        this.value = this.value.slice(0, this.cursorPosition - 1) + 
                                   this.value.slice(this.cursorPosition);
                        this.cursorPosition--;
                        this.error = undefined;
                        this.markDirty();
                    }
                    return true;
                    
                case 'delete':
                    if (this.cursorPosition < this.value.length) {
                        this.value = this.value.slice(0, this.cursorPosition) + 
                                   this.value.slice(this.cursorPosition + 1);
                        this.error = undefined;
                        this.markDirty();
                    }
                    return true;
                    
                case 'left':
                    if (this.cursorPosition > 0) {
                        this.cursorPosition--;
                        this.markDirty();
                    }
                    return true;
                    
                case 'right':
                    if (this.cursorPosition < this.value.length) {
                        this.cursorPosition++;
                        this.markDirty();
                    }
                    return true;
                    
                case 'home':
                    this.cursorPosition = 0;
                    this.markDirty();
                    return true;
                    
                case 'end':
                    this.cursorPosition = this.value.length;
                    this.markDirty();
                    return true;
                    
                default:
                    if (input.key && input.key.length === 1 && !input.ctrl && !input.alt) {
                        this.value = this.value.slice(0, this.cursorPosition) + 
                                   input.key + 
                                   this.value.slice(this.cursorPosition);
                        this.cursorPosition++;
                        this.error = undefined;
                        this.markDirty();
                        return true;
                    }
            }
        }
        return false;
    }

    render(): string {
        const lines: string[] = [];
        
        // Render input field
        let displayValue = this.value || this.placeholder || '';
        
        // Add cursor
        if (this.state.focused) {
            const before = displayValue.slice(0, this.cursorPosition);
            const at = displayValue[this.cursorPosition] || ' ';
            const after = displayValue.slice(this.cursorPosition + 1);
            displayValue = before + AnsiUtils.reverse() + at + AnsiUtils.reset() + after;
        }
        
        lines.push(`[${displayValue}]`);
        
        // Render error if present
        if (this.error) {
            lines.push(AnsiUtils.setForegroundColor(1) + this.error + AnsiUtils.reset());
        }
        
        return lines.join('\n');
    }
}

/**
 * Dialog button component
 */
class DialogButtonComponent extends BaseComponent {
    private button: DialogButton;
    private selected: boolean;

    constructor(id: string, button: DialogButton, selected: boolean = false) {
        super(id);
        this.button = button;
        this.selected = selected;
        this.size = { 
            width: button.label.length + 4, 
            height: 1 
        };
    }

    setSelected(selected: boolean): void {
        this.selected = selected;
        this.markDirty();
    }

    render(): string {
        let label = ` ${this.button.label} `;
        
        if (this.selected) {
            // Highlight selected button
            label = AnsiUtils.reverse() + label + AnsiUtils.reset();
        }
        
        // Apply style
        switch (this.button.style) {
            case 'primary':
                label = AnsiUtils.setForegroundColor(4) + label + AnsiUtils.reset();
                break;
            case 'danger':
                label = AnsiUtils.setForegroundColor(1) + label + AnsiUtils.reset();
                break;
            case 'success':
                label = AnsiUtils.setForegroundColor(2) + label + AnsiUtils.reset();
                break;
        }
        
        return `[${label}]`;
    }
}
