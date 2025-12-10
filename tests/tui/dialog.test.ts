import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Dialog, DialogOptions, DialogButton, DialogResult } from '../../src/tui/dialog';
import { InputEvent } from '../../src/tui/types';

describe('Dialog', () => {
    let dialog: Dialog;
    const defaultOptions: DialogOptions = {
        message: 'Test message',
        type: 'alert',
        buttons: 'ok'
    };

    beforeEach(() => {
        dialog = new Dialog('test-dialog', defaultOptions);
    });

    describe('Constructor and Initial State', () => {
        it('should create dialog with default options', () => {
            const d = new Dialog('d1', { message: 'Hello' });
            expect(d.getId()).toBe('d1');
            expect(d.getTitle()).toBe('Alert');
        });

        it('should set title based on type', () => {
            const alert = new Dialog('d1', { message: 'msg', type: 'alert' });
            expect(alert.getTitle()).toBe('Alert');
            
            const confirm = new Dialog('d2', { message: 'msg', type: 'confirm' });
            expect(confirm.getTitle()).toBe('Confirm');
            
            const prompt = new Dialog('d3', { message: 'msg', type: 'prompt' });
            expect(prompt.getTitle()).toBe('Input');
        });

        it('should accept custom title', () => {
            const d = new Dialog('d1', { 
                message: 'msg',
                title: 'Custom Title'
            });
            expect(d.getTitle()).toBe('Custom Title');
        });

        it('should auto-size based on content', () => {
            const shortMsg = new Dialog('d1', { message: 'Short' });
            const longMsg = new Dialog('d2', { 
                message: 'This is a much longer message that should result in a wider dialog'
            });
            
            const shortSize = shortMsg.getSize();
            const longSize = longMsg.getSize();
            
            expect(longSize.width).toBeGreaterThan(shortSize.width);
        });
    });

    describe('Button Configuration', () => {
        it('should create OK button for ok preset', () => {
            const d = new Dialog('d1', { message: 'msg', buttons: 'ok' });
            d.show();
            const rendered = d.render();
            expect(rendered).toContain('OK');
        });

        it('should create OK and Cancel buttons for ok-cancel preset', () => {
            const d = new Dialog('d1', { message: 'msg', buttons: 'ok-cancel' });
            d.show();
            const rendered = d.render();
            expect(rendered).toContain('OK');
            expect(rendered).toContain('Cancel');
        });

        it('should create Yes and No buttons for yes-no preset', () => {
            const d = new Dialog('d1', { message: 'msg', buttons: 'yes-no' });
            d.show();
            const rendered = d.render();
            expect(rendered).toContain('Yes');
            expect(rendered).toContain('No');
        });

        it('should create Yes, No and Cancel buttons for yes-no-cancel preset', () => {
            const d = new Dialog('d1', { message: 'msg', buttons: 'yes-no-cancel' });
            d.show();
            const rendered = d.render();
            expect(rendered).toContain('Yes');
            expect(rendered).toContain('No');
            expect(rendered).toContain('Cancel');
        });

        it('should create Retry and Cancel buttons for retry-cancel preset', () => {
            const d = new Dialog('d1', { message: 'msg', buttons: 'retry-cancel' });
            d.show();
            const rendered = d.render();
            expect(rendered).toContain('Retry');
            expect(rendered).toContain('Cancel');
        });

        it('should accept custom buttons', () => {
            const customButtons: DialogButton[] = [
                { id: 'save', label: 'Save', style: 'primary' },
                { id: 'discard', label: 'Discard', style: 'danger' },
                { id: 'cancel', label: 'Cancel', isCancel: true }
            ];
            
            const d = new Dialog('d1', { 
                message: 'msg',
                buttons: customButtons
            });
            d.show();
            const rendered = d.render();
            
            expect(rendered).toContain('Save');
            expect(rendered).toContain('Discard');
            expect(rendered).toContain('Cancel');
        });

        it('should set default button', () => {
            const d = new Dialog('d1', { 
                message: 'msg',
                buttons: 'yes-no-cancel',
                defaultButton: 'no'
            });
            d.show();
            const rendered = d.render();
            // Default button should be selected/highlighted
            expect(rendered).toBeTruthy();
        });
    });

    describe('Keyboard Navigation', () => {
        beforeEach(() => {
            dialog = new Dialog('d1', { 
                message: 'msg',
                buttons: 'yes-no-cancel'
            });
            dialog.show();
        });

        it('should navigate buttons with Tab', () => {
            const input: InputEvent = {
                type: 'key',
                key: 'tab'
            };
            
            const result = dialog.handleInput(input);
            expect(result).toBe(true);
        });

        it('should navigate buttons with arrow keys', () => {
            const leftInput: InputEvent = {
                type: 'key',
                key: 'left'
            };
            
            const rightInput: InputEvent = {
                type: 'key',
                key: 'right'
            };
            
            expect(dialog.handleInput(leftInput)).toBe(true);
            expect(dialog.handleInput(rightInput)).toBe(true);
        });

        it('should activate button with Enter', () => {
            const onResult = vi.fn();
            dialog = new Dialog('d1', { 
                message: 'msg',
                buttons: 'ok',
                onResult
            });
            dialog.show();
            
            const input: InputEvent = {
                type: 'key',
                key: 'enter'
            };
            
            dialog.handleInput(input);
            expect(onResult).toHaveBeenCalledWith(
                expect.objectContaining({
                    buttonId: 'ok'
                })
            );
        });

        it('should activate button with Space', () => {
            const onResult = vi.fn();
            dialog = new Dialog('d1', { 
                message: 'msg',
                buttons: 'ok',
                onResult
            });
            dialog.show();
            
            const input: InputEvent = {
                type: 'key',
                key: 'space'
            };
            
            dialog.handleInput(input);
            expect(onResult).toHaveBeenCalledWith(
                expect.objectContaining({
                    buttonId: 'ok'
                })
            );
        });

        it('should close with Escape for cancel button', () => {
            const onResult = vi.fn();
            dialog = new Dialog('d1', { 
                message: 'msg',
                buttons: 'ok-cancel',
                onResult
            });
            dialog.show();
            
            const input: InputEvent = {
                type: 'key',
                key: 'escape'
            };
            
            dialog.handleInput(input);
            expect(onResult).toHaveBeenCalledWith(
                expect.objectContaining({
                    buttonId: 'cancel'
                })
            );
        });

        it('should activate button with shortcut key', () => {
            const onResult = vi.fn();
            dialog = new Dialog('d1', { 
                message: 'msg',
                buttons: 'yes-no',
                onResult
            });
            dialog.show();
            
            const input: InputEvent = {
                type: 'key',
                key: 'y'
            };
            
            dialog.handleInput(input);
            expect(onResult).toHaveBeenCalledWith(
                expect.objectContaining({
                    buttonId: 'yes'
                })
            );
        });
    });

    describe('Prompt Dialog', () => {
        let promptDialog: Dialog;

        beforeEach(() => {
            promptDialog = new Dialog('prompt', {
                message: 'Enter your name:',
                type: 'prompt',
                buttons: 'ok-cancel',
                inputDefaultValue: 'John',
                inputPlaceholder: 'Name...'
            });
            promptDialog.show();
        });

        it('should render input field', () => {
            const rendered = promptDialog.render();
            expect(rendered).toContain('['); // Input field brackets
            expect(rendered).toContain('John'); // Default value
        });

        it('should handle text input', () => {
            const input: InputEvent = {
                type: 'key',
                key: 'a'
            };
            
            promptDialog.handleInput(input);
            const rendered = promptDialog.render();
            expect(rendered).toContain('Johna');
        });

        it('should handle backspace', () => {
            const input: InputEvent = {
                type: 'key',
                key: 'backspace'
            };
            
            promptDialog.handleInput(input);
            const rendered = promptDialog.render();
            expect(rendered).toContain('Joh');
        });

        it('should validate input', () => {
            const d = new Dialog('d1', {
                message: 'Enter number:',
                type: 'prompt',
                buttons: 'ok-cancel',
                inputValidation: (value) => {
                    if (!/^\d+$/.test(value)) {
                        return 'Please enter a valid number';
                    }
                    return true;
                }
            });
            d.show();
            
            // Enter invalid input
            d.handleInput({ type: 'key', key: 'a' });
            
            // Try to submit
            const onResult = vi.fn();
            d['dialogOptions'].onResult = onResult;
            d.handleInput({ type: 'key', key: 'enter' });
            
            // Should show error and not close
            const rendered = d.render();
            expect(rendered).toContain('Please enter a valid number');
            expect(onResult).not.toHaveBeenCalled();
        });

        it('should return input value in result', () => {
            const onResult = vi.fn();
            promptDialog['dialogOptions'].onResult = onResult;
            
            // Add some text
            promptDialog.handleInput({ type: 'key', key: ' ' });
            promptDialog.handleInput({ type: 'key', key: 'D' });
            promptDialog.handleInput({ type: 'key', key: 'o' });
            promptDialog.handleInput({ type: 'key', key: 'e' });
            
            // Submit
            promptDialog.handleInput({ type: 'key', key: 'enter' });
            
            expect(onResult).toHaveBeenCalledWith(
                expect.objectContaining({
                    buttonId: 'ok',
                    inputValue: 'John Doe'
                })
            );
        });
    });

    describe('Icons and Styling', () => {
        it('should render icon', () => {
            const d = new Dialog('d1', {
                message: 'Warning message',
                icon: '⚠',
                iconStyle: 'warning'
            });
            d.show();
            
            const rendered = d.render();
            expect(rendered).toContain('⚠');
        });

        it('should use default icon for style', () => {
            const infoDialog = new Dialog('d1', {
                message: 'Info',
                iconStyle: 'info'
            });
            infoDialog.show();
            expect(infoDialog.render()).toContain('ℹ');
            
            const errorDialog = new Dialog('d2', {
                message: 'Error',
                iconStyle: 'error'
            });
            errorDialog.show();
            expect(errorDialog.render()).toContain('✗');
            
            const successDialog = new Dialog('d3', {
                message: 'Success',
                iconStyle: 'success'
            });
            successDialog.show();
            expect(successDialog.render()).toContain('✓');
        });
    });

    describe('Async API', () => {
        it('should return promise with result', async () => {
            const d = new Dialog('d1', {
                message: 'Confirm?',
                buttons: 'yes-no'
            });
            
            const promise = d.showAsync();
            
            // Simulate user clicking Yes
            d.handleInput({ type: 'key', key: 'y' });
            
            const result = await promise;
            expect(result.buttonId).toBe('yes');
        });

        it('should resolve promise with input value for prompt', async () => {
            const d = new Dialog('d1', {
                message: 'Enter name:',
                type: 'prompt',
                inputDefaultValue: 'Test'
            });
            
            const promise = d.showAsync();
            
            // Submit with default value
            d.handleInput({ type: 'key', key: 'enter' });
            
            const result = await promise;
            expect(result.inputValue).toBe('Test');
        });
    });

    describe('Callbacks', () => {
        it('should call button callback', () => {
            const buttonCallback = vi.fn();
            const buttons: DialogButton[] = [
                { 
                    id: 'test',
                    label: 'Test',
                    callback: buttonCallback
                }
            ];
            
            const d = new Dialog('d1', {
                message: 'msg',
                buttons
            });
            d.show();
            
            d.handleInput({ type: 'key', key: 'enter' });
            expect(buttonCallback).toHaveBeenCalled();
        });

        it('should call onResult callback', () => {
            const onResult = vi.fn();
            const d = new Dialog('d1', {
                message: 'msg',
                buttons: 'ok',
                onResult
            });
            d.show();
            
            d.handleInput({ type: 'key', key: 'enter' });
            expect(onResult).toHaveBeenCalledWith(
                expect.objectContaining({
                    buttonId: 'ok'
                })
            );
        });

        it('should include button value in result', () => {
            const onResult = vi.fn();
            const buttons: DialogButton[] = [
                { 
                    id: 'option1',
                    label: 'Option 1',
                    value: { data: 'value1' }
                }
            ];
            
            const d = new Dialog('d1', {
                message: 'msg',
                buttons,
                onResult
            });
            d.show();
            
            d.handleInput({ type: 'key', key: 'enter' });
            expect(onResult).toHaveBeenCalledWith(
                expect.objectContaining({
                    buttonId: 'option1',
                    value: { data: 'value1' }
                })
            );
        });
    });

    describe('Multi-line Messages', () => {
        it('should handle multi-line messages', () => {
            const d = new Dialog('d1', {
                message: 'Line 1\nLine 2\nLine 3',
                buttons: 'ok'
            });
            d.show();
            
            const rendered = d.render();
            expect(rendered).toContain('Line 1');
            expect(rendered).toContain('Line 2');
            expect(rendered).toContain('Line 3');
        });

        it('should calculate size for multi-line messages', () => {
            const singleLine = new Dialog('d1', {
                message: 'Single line',
                buttons: 'ok'
            });
            
            const multiLine = new Dialog('d2', {
                message: 'Line 1\nLine 2\nLine 3',
                buttons: 'ok'
            });
            
            const singleSize = singleLine.getSize();
            const multiSize = multiLine.getSize();
            
            expect(multiSize.height).toBeGreaterThan(singleSize.height);
        });
    });
});
