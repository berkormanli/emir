import { describe, it, expect, beforeEach } from 'vitest';
import { BaseComponent } from '../base-component';
import { Position, Size, InputEvent } from '../types';

// Concrete implementation for testing
class TestComponent extends BaseComponent {
    private renderContent: string;

    constructor(id: string, position?: Position, size?: Size, renderContent = 'test') {
        super(id, position, size);
        this.renderContent = renderContent;
    }

    render(): string {
        this.markClean();
        return this.renderContent;
    }

    setRenderContent(content: string): void {
        this.renderContent = content;
        this.markDirty();
    }

    // Expose protected methods for testing
    public testMarkDirty(): void {
        this.markDirty();
    }

    public testMarkClean(): void {
        this.markClean();
    }

    public testValidate(): void {
        this.validate();
    }
}

describe('BaseComponent', () => {
    let component: TestComponent;

    beforeEach(() => {
        component = new TestComponent('test-1');
    });

    describe('constructor', () => {
        it('should initialize with default values', () => {
            expect(component.id).toBe('test-1');
            expect(component.position).toEqual({ x: 0, y: 0 });
            expect(component.size).toEqual({ width: 10, height: 1 });
            expect(component.visible).toBe(true);
            expect(component.state.focused).toBe(false);
            expect(component.state.dirty).toBe(true);
            expect(component.state.data).toBe(null);
            expect(component.state.validation.valid).toBe(true);
            expect(component.state.validation.errors).toEqual([]);
            expect(component.state.validation.warnings).toEqual([]);
        });

        it('should initialize with custom position and size', () => {
            const customComponent = new TestComponent(
                'test-2',
                { x: 5, y: 10 },
                { width: 20, height: 5 }
            );

            expect(customComponent.position).toEqual({ x: 5, y: 10 });
            expect(customComponent.size).toEqual({ width: 20, height: 5 });
        });
    });

    describe('render', () => {
        it('should render content and mark as clean', () => {
            expect(component.isDirty()).toBe(true);
            const result = component.render();
            expect(result).toBe('test');
            expect(component.isDirty()).toBe(false);
        });
    });

    describe('focus and blur', () => {
        it('should focus component and mark as dirty', () => {
            component.testMarkClean();
            expect(component.state.focused).toBe(false);
            expect(component.isDirty()).toBe(false);

            component.focus();

            expect(component.state.focused).toBe(true);
            expect(component.isDirty()).toBe(true);
        });

        it('should not mark dirty if already focused', () => {
            component.focus();
            component.testMarkClean();

            component.focus();

            expect(component.state.focused).toBe(true);
            expect(component.isDirty()).toBe(false);
        });

        it('should blur component and mark as dirty', () => {
            component.focus();
            component.testMarkClean();
            expect(component.state.focused).toBe(true);
            expect(component.isDirty()).toBe(false);

            component.blur();

            expect(component.state.focused).toBe(false);
            expect(component.isDirty()).toBe(true);
        });

        it('should not mark dirty if already blurred', () => {
            component.testMarkClean();

            component.blur();

            expect(component.state.focused).toBe(false);
            expect(component.isDirty()).toBe(false);
        });
    });

    describe('update', () => {
        it('should update data and mark as dirty', () => {
            component.testMarkClean();
            const testData = { value: 'test' };

            component.update(testData);

            expect(component.state.data).toBe(testData);
            expect(component.isDirty()).toBe(true);
        });

        it('should mark as dirty even without data', () => {
            component.testMarkClean();

            component.update();

            expect(component.isDirty()).toBe(true);
        });

        it('should trigger validation', () => {
            // Validation should reset to valid state
            component.state.validation.valid = false;
            component.state.validation.errors = ['test error'];

            component.update();

            expect(component.state.validation.valid).toBe(true);
            expect(component.state.validation.errors).toEqual([]);
        });
    });

    describe('handleInput', () => {
        it('should return false by default', () => {
            const inputEvent: InputEvent = {
                type: 'key',
                key: 'Enter'
            };

            const result = component.handleInput(inputEvent);

            expect(result).toBe(false);
        });
    });

    describe('destroy', () => {
        it('should blur component on destroy', () => {
            component.focus();
            expect(component.state.focused).toBe(true);

            component.destroy();

            expect(component.state.focused).toBe(false);
        });
    });

    describe('position and size management', () => {
        it('should set position and mark as dirty', () => {
            component.testMarkClean();
            const newPosition = { x: 15, y: 20 };

            component.setPosition(newPosition);

            expect(component.position).toEqual(newPosition);
            expect(component.isDirty()).toBe(true);
        });

        it('should set size and mark as dirty', () => {
            component.testMarkClean();
            const newSize = { width: 30, height: 10 };

            component.setSize(newSize);

            expect(component.size).toEqual(newSize);
            expect(component.isDirty()).toBe(true);
        });

        it('should set visibility and mark as dirty when changed', () => {
            component.testMarkClean();
            expect(component.visible).toBe(true);

            component.setVisible(false);

            expect(component.visible).toBe(false);
            expect(component.isDirty()).toBe(true);
        });

        it('should not mark dirty when visibility unchanged', () => {
            component.testMarkClean();

            component.setVisible(true);

            expect(component.visible).toBe(true);
            expect(component.isDirty()).toBe(false);
        });
    });

    describe('bounds and containment', () => {
        beforeEach(() => {
            component.setPosition({ x: 10, y: 5 });
            component.setSize({ width: 20, height: 10 });
        });

        it('should return correct bounds', () => {
            const bounds = component.getBounds();

            expect(bounds).toEqual({
                x: 10,
                y: 5,
                width: 20,
                height: 10
            });
        });

        it('should detect point within bounds', () => {
            expect(component.containsPoint(10, 5)).toBe(true);  // top-left corner
            expect(component.containsPoint(29, 14)).toBe(true); // bottom-right corner (exclusive)
            expect(component.containsPoint(15, 10)).toBe(true); // middle
        });

        it('should detect point outside bounds', () => {
            expect(component.containsPoint(9, 5)).toBe(false);   // left of bounds
            expect(component.containsPoint(30, 5)).toBe(false);  // right of bounds
            expect(component.containsPoint(10, 4)).toBe(false);  // above bounds
            expect(component.containsPoint(10, 15)).toBe(false); // below bounds
        });
    });

    describe('dirty state management', () => {
        it('should track dirty state correctly', () => {
            expect(component.isDirty()).toBe(true); // starts dirty

            component.testMarkClean();
            expect(component.isDirty()).toBe(false);

            component.testMarkDirty();
            expect(component.isDirty()).toBe(true);
        });
    });

    describe('validation', () => {
        it('should reset validation state', () => {
            // Set invalid state
            component.state.validation.valid = false;
            component.state.validation.errors = ['error1', 'error2'];
            component.state.validation.warnings = ['warning1'];

            component.testValidate();

            expect(component.state.validation.valid).toBe(true);
            expect(component.state.validation.errors).toEqual([]);
            expect(component.state.validation.warnings).toEqual([]);
        });
    });
});