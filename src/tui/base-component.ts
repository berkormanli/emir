import { Component, Position, Size, ComponentState, InputEvent, ValidationState } from './types';

/**
 * Abstract base class for all TUI components
 * Provides common functionality and lifecycle management
 */
export abstract class BaseComponent implements Component {
    public readonly id: string;
    public position: Position;
    public size: Size;
    public visible: boolean;
    public state: ComponentState;

    constructor(
        id: string,
        position: Position = { x: 0, y: 0 },
        size: Size = { width: 10, height: 1 }
    ) {
        this.id = id;
        this.position = position;
        this.size = size;
        this.visible = true;
        this.state = {
            focused: false,
            dirty: true,
            data: null,
            validation: {
                valid: true,
                errors: [],
                warnings: []
            }
        };
    }

    /**
     * Abstract method to render the component
     * Must be implemented by concrete components
     */
    abstract render(): string;

    /**
     * Handle input events
     * Default implementation returns false (not handled)
     * Override in concrete components to handle specific input
     */
    handleInput(input: InputEvent): boolean {
        return false;
    }

    /**
     * Focus the component
     * Sets focused state and marks as dirty for re-render
     */
    focus(): void {
        if (!this.state.focused) {
            this.state.focused = true;
            this.markDirty();
            this.onFocus();
        }
    }

    /**
     * Remove focus from the component
     * Clears focused state and marks as dirty for re-render
     */
    blur(): void {
        if (this.state.focused) {
            this.state.focused = false;
            this.markDirty();
            this.onBlur();
        }
    }

    /**
     * Update component data
     * Marks component as dirty and triggers validation
     */
    update(data?: any): void {
        if (data !== undefined) {
            this.state.data = data;
        }
        this.markDirty();
        this.validate();
        this.onUpdate(data);
    }

    /**
     * Clean up component resources
     * Override in concrete components for specific cleanup
     */
    destroy(): void {
        this.blur();
        this.onDestroy();
    }

    /**
     * Mark component as needing re-render
     */
    protected markDirty(): void {
        this.state.dirty = true;
    }

    /**
     * Clear dirty flag after rendering
     */
    protected markClean(): void {
        this.state.dirty = false;
    }

    /**
     * Check if component needs re-rendering
     */
    public isDirty(): boolean {
        return this.state.dirty;
    }

    /**
     * Validate component state
     * Override in concrete components for specific validation
     */
    protected validate(): void {
        this.state.validation = {
            valid: true,
            errors: [],
            warnings: []
        };
    }

    /**
     * Set component position
     */
    public setPosition(position: Position): void {
        this.position = position;
        this.markDirty();
    }

    /**
     * Set component size
     */
    public setSize(size: Size): void {
        this.size = size;
        this.markDirty();
    }

    /**
     * Set component visibility
     */
    public setVisible(visible: boolean): void {
        if (this.visible !== visible) {
            this.visible = visible;
            this.markDirty();
        }
    }

    /**
     * Get component ID
     */
    public getId(): string {
        return this.id;
    }

    /**
     * Get component position
     */
    public getPosition(): Position {
        return this.position;
    }

    /**
     * Get component size
     */
    public getSize(): Size {
        return this.size;
    }

    /**
     * Check if component is visible
     */
    public isVisible(): boolean {
        return this.visible;
    }

    /**
     * Check if component is focused
     */
    public isFocused(): boolean {
        return this.state.focused;
    }

    /**
     * Get component bounds
     */
    public getBounds(): { x: number; y: number; width: number; height: number } {
        return {
            x: this.position.x,
            y: this.position.y,
            width: this.size.width,
            height: this.size.height
        };
    }

    /**
     * Check if a point is within component bounds
     */
    public containsPoint(x: number, y: number): boolean {
        const bounds = this.getBounds();
        return x >= bounds.x && 
               x < bounds.x + bounds.width && 
               y >= bounds.y && 
               y < bounds.y + bounds.height;
    }

    // Lifecycle hooks - override in concrete components
    protected onFocus(): void {}
    protected onBlur(): void {}
    protected onUpdate(data?: any): void {}
    protected onDestroy(): void {}
}