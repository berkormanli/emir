import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Form, TextInput, NumberInput, FormField, FormData, ValidationRule } from '../form';
import { InputEvent } from '../types';

describe('TextInput', () => {
    let textInput: TextInput;

    beforeEach(() => {
        textInput = new TextInput('username', 'Username', 'testuser');
    });

    describe('constructor', () => {
        it('should initialize with default values', () => {
            const input = new TextInput('test', 'Test Field');
            
            expect(input.name).toBe('test');
            expect(input.label).toBe('Test Field');
            expect(input.type).toBe('text');
            expect(input.value).toBe('');
            expect(input.cursorPosition).toBe(0);
        });

        it('should initialize with provided value', () => {
            expect(textInput.value).toBe('testuser');
            expect(textInput.cursorPosition).toBe(8);
        });

        it('should apply options', () => {
            const input = new TextInput('test', 'Test', '', {
                maxLength: 10,
                minLength: 3,
                required: true,
                placeholder: 'Enter text'
            });
            
            expect(input.maxLength).toBe(10);
            expect(input.minLength).toBe(3);
            expect(input.required).toBe(true);
            expect(input.placeholder).toBe('Enter text');
        });
    });

    describe('input handling', () => {
        it('should handle character input', () => {
            textInput.cursorPosition = 0;
            const event: InputEvent = {
                type: 'key',
                key: 'a',
                ctrl: false,
                alt: false,
                shift: false
            };
            
            const handled = textInput.handleInput(event);
            
            expect(handled).toBe(true);
            expect(textInput.value).toBe('atestuser');
            expect(textInput.cursorPosition).toBe(1);
        });

        it('should handle backspace', () => {
            textInput.cursorPosition = 4;
            const event: InputEvent = {
                type: 'key',
                key: 'backspace',
                ctrl: false,
                alt: false,
                shift: false
            };
            
            const handled = textInput.handleInput(event);
            
            expect(handled).toBe(true);
            expect(textInput.value).toBe('tesuser');
            expect(textInput.cursorPosition).toBe(3);
        });

        it('should handle delete', () => {
            textInput.cursorPosition = 4;
            const event: InputEvent = {
                type: 'key',
                key: 'delete',
                ctrl: false,
                alt: false,
                shift: false
            };
            
            const handled = textInput.handleInput(event);
            
            expect(handled).toBe(true);
            expect(textInput.value).toBe('testser');
            expect(textInput.cursorPosition).toBe(4);
        });

        it('should handle cursor movement', () => {
            textInput.cursorPosition = 4;
            
            // Left arrow
            textInput.handleInput({
                type: 'key',
                key: 'left',
                ctrl: false,
                alt: false,
                shift: false
            });
            expect(textInput.cursorPosition).toBe(3);
            
            // Right arrow
            textInput.handleInput({
                type: 'key',
                key: 'right',
                ctrl: false,
                alt: false,
                shift: false
            });
            expect(textInput.cursorPosition).toBe(4);
            
            // Home
            textInput.handleInput({
                type: 'key',
                key: 'home',
                ctrl: false,
                alt: false,
                shift: false
            });
            expect(textInput.cursorPosition).toBe(0);
            
            // End
            textInput.handleInput({
                type: 'key',
                key: 'end',
                ctrl: false,
                alt: false,
                shift: false
            });
            expect(textInput.cursorPosition).toBe(8);
        });

        it('should respect maxLength', () => {
            textInput = new TextInput('test', 'Test', 'abc', { maxLength: 5 });
            textInput.cursorPosition = 3;
            
            textInput.handleInput({
                type: 'key',
                key: 'd',
                ctrl: false,
                alt: false,
                shift: false
            });
            
            textInput.handleInput({
                type: 'key',
                key: 'e',
                ctrl: false,
                alt: false,
                shift: false
            });
            
            textInput.handleInput({
                type: 'key',
                key: 'f', // Should not be added
                ctrl: false,
                alt: false,
                shift: false
            });
            
            expect(textInput.value).toBe('abcde');
        });

        it('should not handle input when disabled', () => {
            textInput.disabled = true;
            const originalValue = textInput.value;
            
            const handled = textInput.handleInput({
                type: 'key',
                key: 'a',
                ctrl: false,
                alt: false,
                shift: false
            });
            
            expect(handled).toBe(false);
            expect(textInput.value).toBe(originalValue);
        });
    });

    describe('validation', () => {
        it('should validate required field', () => {
            textInput = new TextInput('test', 'Test', '', { required: true });
            
            let state = textInput.validate();
            expect(state.valid).toBe(false);
            expect(state.errors).toContain('Test is required');
            
            textInput.setValue('value');
            state = textInput.validate();
            expect(state.valid).toBe(true);
        });

        it('should validate minLength', () => {
            textInput = new TextInput('test', 'Test', 'ab', { minLength: 3 });
            
            let state = textInput.validate();
            expect(state.valid).toBe(false);
            expect(state.errors[0]).toContain('at least 3 characters');
            
            textInput.setValue('abc');
            state = textInput.validate();
            expect(state.valid).toBe(true);
        });

        it('should validate maxLength', () => {
            textInput = new TextInput('test', 'Test', 'abcdef', { maxLength: 5 });
            
            const state = textInput.validate();
            expect(state.valid).toBe(false);
            expect(state.errors[0]).toContain('no more than 5 characters');
        });

        it('should run custom validation rules', () => {
            const rule: ValidationRule = {
                validate: (value) => value.includes('@'),
                message: 'Must contain @'
            };
            
            textInput = new TextInput('email', 'Email', 'test', {
                validation: [rule]
            });
            
            let state = textInput.validate();
            expect(state.valid).toBe(false);
            expect(state.errors).toContain('Must contain @');
            
            textInput.setValue('test@example.com');
            state = textInput.validate();
            expect(state.valid).toBe(true);
        });
    });

    describe('rendering', () => {
        it('should render basic field', () => {
            const rendered = textInput.render(40, false);
            
            expect(rendered).toContain('Username:');
            expect(rendered).toContain('[testuser');
        });

        it('should show cursor when focused', () => {
            textInput.focus();
            textInput.cursorPosition = 4;
            const rendered = textInput.render(40, true);
            
            // Should have inverted colors at cursor position
            expect(rendered).toContain('\x1b[');
        });

        it('should show placeholder when empty', () => {
            textInput = new TextInput('test', 'Test', '', {
                placeholder: 'Enter value'
            });
            
            const rendered = textInput.render(40, false);
            expect(rendered).toContain('Enter value');
        });

        it('should show error message', () => {
            textInput.error = 'Field is invalid';
            const rendered = textInput.render(40, false);
            
            expect(rendered).toContain('Field is invalid');
        });
    });
});

describe('NumberInput', () => {
    let numberInput: NumberInput;

    beforeEach(() => {
        numberInput = new NumberInput('age', 'Age', 25);
    });

    describe('constructor', () => {
        it('should initialize with default values', () => {
            const input = new NumberInput('test', 'Test Field');
            
            expect(input.name).toBe('test');
            expect(input.label).toBe('Test Field');
            expect(input.type).toBe('number');
            expect(input.value).toBe(0);
            expect(input.step).toBe(1);
            expect(input.decimals).toBe(0);
        });

        it('should apply options', () => {
            const input = new NumberInput('test', 'Test', 10, {
                min: 0,
                max: 100,
                step: 5,
                decimals: 2
            });
            
            expect(input.min).toBe(0);
            expect(input.max).toBe(100);
            expect(input.step).toBe(5);
            expect(input.decimals).toBe(2);
        });
    });

    describe('input handling', () => {
        it('should handle numeric input', () => {
            numberInput.value = 2;
            numberInput.cursorPosition = 1;
            
            const handled = numberInput.handleInput({
                type: 'key',
                key: '5',
                ctrl: false,
                alt: false,
                shift: false
            });
            
            expect(handled).toBe(true);
            expect(numberInput.value).toBe(25);
        });

        it('should handle arrow keys for increment/decrement', () => {
            numberInput.value = 10;
            
            // Up arrow
            numberInput.handleInput({
                type: 'key',
                key: 'up',
                ctrl: false,
                alt: false,
                shift: false
            });
            expect(numberInput.value).toBe(11);
            
            // Down arrow
            numberInput.handleInput({
                type: 'key',
                key: 'down',
                ctrl: false,
                alt: false,
                shift: false
            });
            expect(numberInput.value).toBe(10);
        });

        it('should respect min/max constraints', () => {
            numberInput = new NumberInput('test', 'Test', 5, {
                min: 0,
                max: 10
            });
            
            // Try to go above max
            numberInput.value = 10;
            numberInput.handleInput({
                type: 'key',
                key: 'up',
                ctrl: false,
                alt: false,
                shift: false
            });
            expect(numberInput.value).toBe(10);
            
            // Try to go below min
            numberInput.value = 0;
            numberInput.handleInput({
                type: 'key',
                key: 'down',
                ctrl: false,
                alt: false,
                shift: false
            });
            expect(numberInput.value).toBe(0);
        });

        it('should handle decimal input', () => {
            numberInput = new NumberInput('test', 'Test', 0, {
                decimals: 2
            });
            
            numberInput.cursorPosition = 0;
            
            // Input "3.14"
            numberInput.handleInput({ type: 'key', key: '3', ctrl: false, alt: false, shift: false });
            numberInput.handleInput({ type: 'key', key: '.', ctrl: false, alt: false, shift: false });
            numberInput.handleInput({ type: 'key', key: '1', ctrl: false, alt: false, shift: false });
            numberInput.handleInput({ type: 'key', key: '4', ctrl: false, alt: false, shift: false });
            
            expect(numberInput.value).toBe(3.14);
        });

        it('should handle negative numbers', () => {
            numberInput.value = 5;
            numberInput.cursorPosition = 0;
            
            numberInput.handleInput({
                type: 'key',
                key: '-',
                ctrl: false,
                alt: false,
                shift: false
            });
            
            expect(numberInput.value).toBe(-5);
        });
    });

    describe('validation', () => {
        it('should validate min constraint', () => {
            numberInput = new NumberInput('test', 'Test', -5, { min: 0 });
            
            const state = numberInput.validate();
            expect(state.valid).toBe(false);
            expect(state.errors[0]).toContain('at least 0');
        });

        it('should validate max constraint', () => {
            numberInput = new NumberInput('test', 'Test', 150, { max: 100 });
            
            const state = numberInput.validate();
            expect(state.valid).toBe(false);
            expect(state.errors[0]).toContain('no more than 100');
        });
    });
});

describe('Form', () => {
    let form: Form;
    let fields: FormField[];

    beforeEach(() => {
        fields = [
            new TextInput('username', 'Username', '', { required: true }),
            new TextInput('email', 'Email', '', { required: true }),
            new NumberInput('age', 'Age', 0, { min: 18, max: 120 })
        ];
        form = new Form('test-form', fields);
    });

    describe('constructor', () => {
        it('should initialize with fields', () => {
            expect(form.getFields()).toEqual(fields);
            expect(form.id).toBe('test-form');
        });

        it('should focus first field', () => {
            expect(fields[0].focused).toBe(true);
            expect(fields[1].focused).toBe(false);
            expect(fields[2].focused).toBe(false);
        });

        it('should calculate size automatically', () => {
            expect(form.size.width).toBeGreaterThan(0);
            expect(form.size.height).toBeGreaterThan(0);
        });

        it('should apply options', () => {
            form = new Form('test', fields, {
                title: 'User Form',
                submitText: 'Save',
                cancelText: 'Close',
                borderStyle: 'double'
            });
            
            const rendered = form.render();
            expect(rendered).toContain('User Form');
            expect(rendered).toContain('[Save]');
            expect(rendered).toContain('[Close]');
        });
    });

    describe('field management', () => {
        it('should add field', () => {
            const newField = new TextInput('phone', 'Phone');
            form.addField(newField);
            
            expect(form.getFields()).toContain(newField);
        });

        it('should remove field', () => {
            const removed = form.removeField('email');
            
            expect(removed).toBe(true);
            expect(form.getFields().length).toBe(2);
            expect(form.getField('email')).toBeUndefined();
        });

        it('should get field by name', () => {
            const field = form.getField('username');
            
            expect(field).toBeDefined();
            expect(field?.name).toBe('username');
        });
    });

    describe('navigation', () => {
        beforeEach(() => {
            form.focus();
        });

        it('should navigate to next field on tab', () => {
            const event: InputEvent = {
                type: 'key',
                key: 'tab',
                ctrl: false,
                alt: false,
                shift: false
            };
            
            form.handleInput(event);
            
            expect(fields[0].focused).toBe(false);
            expect(fields[1].focused).toBe(true);
        });

        it('should navigate to previous field on shift+tab', () => {
            // Move to second field first
            form.handleInput({ type: 'key', key: 'tab', ctrl: false, alt: false, shift: false });
            
            // Now go back
            const event: InputEvent = {
                type: 'key',
                key: 'tab',
                ctrl: false,
                alt: false,
                shift: true
            };
            
            form.handleInput(event);
            
            expect(fields[0].focused).toBe(true);
            expect(fields[1].focused).toBe(false);
        });

        it('should skip disabled fields', () => {
            fields[1].disabled = true;
            
            form.handleInput({
                type: 'key',
                key: 'tab',
                ctrl: false,
                alt: false,
                shift: false
            });
            
            expect(fields[0].focused).toBe(false);
            expect(fields[1].focused).toBe(false);
            expect(fields[2].focused).toBe(true);
        });

        it('should wrap around when navigating forward', () => {
            // Navigate to last field
            form.handleInput({ type: 'key', key: 'tab', ctrl: false, alt: false, shift: false });
            form.handleInput({ type: 'key', key: 'tab', ctrl: false, alt: false, shift: false });
            
            // Navigate past last field
            form.handleInput({ type: 'key', key: 'tab', ctrl: false, alt: false, shift: false });
            
            expect(fields[0].focused).toBe(true);
        });
    });

    describe('data management', () => {
        it('should get form data', () => {
            fields[0].setValue('john');
            fields[1].setValue('john@example.com');
            fields[2].setValue(25);
            
            const data = form.getData();
            
            expect(data).toEqual({
                username: 'john',
                email: 'john@example.com',
                age: 25
            });
        });

        it('should set form data', () => {
            const data: FormData = {
                username: 'jane',
                email: 'jane@example.com',
                age: 30
            };
            
            form.setData(data);
            
            expect(fields[0].getValue()).toBe('jane');
            expect(fields[1].getValue()).toBe('jane@example.com');
            expect(fields[2].getValue()).toBe(30);
        });
    });

    describe('validation', () => {
        it('should validate all fields', () => {
            const state = form.validateForm();
            
            expect(state.valid).toBe(false);
            expect(state.errors.length).toBeGreaterThan(0);
        });

        it('should pass validation with valid data', () => {
            fields[0].setValue('john');
            fields[1].setValue('john@example.com');
            fields[2].setValue(25);
            
            const state = form.validateForm();
            
            expect(state.valid).toBe(true);
            expect(state.errors.length).toBe(0);
        });
    });

    describe('submission', () => {
        it('should trigger onSubmit with valid data', () => {
            const onSubmitSpy = vi.fn();
            form.setOnSubmit(onSubmitSpy);
            form.focus();
            
            // Fill in valid data
            fields[0].setValue('john');
            fields[1].setValue('john@example.com');
            fields[2].setValue(25);
            
            // Submit with Ctrl+Enter
            form.handleInput({
                type: 'key',
                key: 'enter',
                ctrl: true,
                alt: false,
                shift: false
            });
            
            expect(onSubmitSpy).toHaveBeenCalledWith({
                username: 'john',
                email: 'john@example.com',
                age: 25
            });
        });

        it('should not submit with invalid data', () => {
            const onSubmitSpy = vi.fn();
            form.setOnSubmit(onSubmitSpy);
            form.focus();
            
            // Leave required fields empty
            form.handleInput({
                type: 'key',
                key: 'enter',
                ctrl: true,
                alt: false,
                shift: false
            });
            
            expect(onSubmitSpy).not.toHaveBeenCalled();
        });

        it('should trigger onCancel on escape', () => {
            const onCancelSpy = vi.fn();
            form.setOnCancel(onCancelSpy);
            form.focus();
            
            form.handleInput({
                type: 'key',
                key: 'escape',
                ctrl: false,
                alt: false,
                shift: false
            });
            
            expect(onCancelSpy).toHaveBeenCalled();
        });
    });

    describe('input delegation', () => {
        it('should pass input to current field', () => {
            form.focus();
            
            form.handleInput({
                type: 'key',
                key: 'a',
                ctrl: false,
                alt: false,
                shift: false
            });
            
            expect(fields[0].getValue()).toBe('a');
        });

        it('should not handle input when not focused', () => {
            form.blur();
            
            const handled = form.handleInput({
                type: 'key',
                key: 'a',
                ctrl: false,
                alt: false,
                shift: false
            });
            
            expect(handled).toBe(false);
        });
    });

    describe('rendering', () => {
        it('should render form with borders', () => {
            const rendered = form.render();
            
            expect(rendered).toContain('┌');
            expect(rendered).toContain('┐');
            expect(rendered).toContain('└');
            expect(rendered).toContain('┘');
            expect(rendered).toContain('Username:');
            expect(rendered).toContain('Email:');
            expect(rendered).toContain('Age:');
            expect(rendered).toContain('[Submit]');
            expect(rendered).toContain('[Cancel]');
        });

        it('should render without borders', () => {
            form = new Form('test', fields, { showBorder: false });
            const rendered = form.render();
            
            expect(rendered).not.toContain('┌');
            expect(rendered).toContain('Username:');
        });

        it('should render with title', () => {
            form = new Form('test', fields, { title: 'User Registration' });
            const rendered = form.render();
            
            expect(rendered).toContain('User Registration');
        });
    });
});
