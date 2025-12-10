import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Window, WindowOptions, WindowState } from '../../src/tui/window';
import { InputEvent } from '../../src/tui/types';

describe('Window', () => {
    let window: Window;
    const defaultOptions: WindowOptions = {
        title: 'Test Window',
        closable: true,
        minimizable: true,
        maximizable: true,
        movable: true,
        resizable: true
    };

    beforeEach(() => {
        window = new Window('test-window', defaultOptions, { width: 40, height: 20 });
    });

    describe('Constructor and Initial State', () => {
        it('should create window with default options', () => {
            const w = new Window('w1', {});
            expect(w.getId()).toBe('w1');
            expect(w.getTitle()).toBe('');
            expect(w.getState()).toBe('normal');
        });

        it('should create window with custom options', () => {
            expect(window.getTitle()).toBe('Test Window');
            expect(window.getState()).toBe('normal');
            expect(window.getSize()).toEqual({ width: 40, height: 20 });
        });

        it('should set initial position', () => {
            window.setPosition({ x: 10, y: 5 });
            expect(window.getPosition()).toEqual({ x: 10, y: 5 });
        });
    });

    describe('Window State Management', () => {
        it('should minimize window', () => {
            const onMinimize = vi.fn();
            window = new Window('w1', { ...defaultOptions, onMinimize });
            
            window.minimize();
            expect(window.getState()).toBe('minimized');
            expect(onMinimize).toHaveBeenCalled();
        });

        it('should maximize window', () => {
            const onMaximize = vi.fn();
            window = new Window('w1', { ...defaultOptions, onMaximize });
            
            window.maximize();
            expect(window.getState()).toBe('maximized');
            expect(onMaximize).toHaveBeenCalled();
        });

        it('should restore window from minimized', () => {
            const onRestore = vi.fn();
            window = new Window('w1', { ...defaultOptions, onRestore });
            
            window.minimize();
            window.restore();
            expect(window.getState()).toBe('normal');
            expect(onRestore).toHaveBeenCalled();
        });

        it('should restore window from maximized', () => {
            window.maximize();
            window.restore();
            expect(window.getState()).toBe('normal');
        });

        it('should close window', () => {
            const onClose = vi.fn();
            window = new Window('w1', { ...defaultOptions, onClose });
            
            window.close();
            expect(window.getState()).toBe('closed');
            expect(onClose).toHaveBeenCalled();
        });

        it('should not minimize if not minimizable', () => {
            window = new Window('w1', { ...defaultOptions, minimizable: false });
            window.minimize();
            expect(window.getState()).toBe('normal');
        });

        it('should not maximize if not maximizable', () => {
            window = new Window('w1', { ...defaultOptions, maximizable: false });
            window.maximize();
            expect(window.getState()).toBe('normal');
        });

        it('should not close if not closable', () => {
            window = new Window('w1', { ...defaultOptions, closable: false });
            window.close();
            expect(window.getState()).toBe('normal');
        });
    });

    describe('Focus Management', () => {
        it('should handle focus', () => {
            const onFocus = vi.fn();
            window = new Window('w1', { ...defaultOptions, onFocus });
            
            window.setFocused(true);
            expect(window.isFocused()).toBe(true);
            expect(onFocus).toHaveBeenCalled();
        });

        it('should handle blur', () => {
            const onBlur = vi.fn();
            window = new Window('w1', { ...defaultOptions, onBlur });
            
            window.setFocused(true);
            window.setFocused(false);
            expect(window.isFocused()).toBe(false);
            expect(onBlur).toHaveBeenCalled();
        });
    });

    describe('Keyboard Input', () => {
        it('should close window with Alt+F4', () => {
            const input: InputEvent = {
                type: 'key',
                key: 'f4',
                alt: true
            };
            
            window.handleInput(input);
            expect(window.getState()).toBe('closed');
        });

        it('should minimize window with Alt+F9', () => {
            const input: InputEvent = {
                type: 'key',
                key: 'f9',
                alt: true
            };
            
            window.handleInput(input);
            expect(window.getState()).toBe('minimized');
        });

        it('should maximize window with Alt+F10', () => {
            const input: InputEvent = {
                type: 'key',
                key: 'f10',
                alt: true
            };
            
            window.handleInput(input);
            expect(window.getState()).toBe('maximized');
        });

        it('should restore maximized window with Alt+F10', () => {
            window.maximize();
            
            const input: InputEvent = {
                type: 'key',
                key: 'f10',
                alt: true
            };
            
            window.handleInput(input);
            expect(window.getState()).toBe('normal');
        });
    });

    describe('Mouse Input - Title Bar', () => {
        it('should start dragging on title bar mousedown', () => {
            const input: InputEvent = {
                type: 'mouse',
                button: 0,
                position: { x: 15, y: 0 }
            };
            
            const handled = window.handleInput(input);
            expect(handled).toBe(true);
        });

        it('should handle close button click', () => {
            window.setPosition({ x: 0, y: 0 });
            const input: InputEvent = {
                type: 'mouse',
                button: 0,
                position: { x: 37, y: 0 } // Close button position
            };
            
            window.handleInput(input);
            expect(window.getState()).toBe('closed');
        });

        it('should handle minimize button click', () => {
            window.setPosition({ x: 0, y: 0 });
            const input: InputEvent = {
                type: 'mouse',
                button: 0,
                position: { x: 33, y: 0 } // Minimize button position
            };
            
            window.handleInput(input);
            expect(window.getState()).toBe('minimized');
        });

        it('should handle maximize button click', () => {
            window.setPosition({ x: 0, y: 0 });
            const input: InputEvent = {
                type: 'mouse',
                button: 0,
                position: { x: 35, y: 0 } // Maximize button position
            };
            
            window.handleInput(input);
            expect(window.getState()).toBe('maximized');
        });
    });

    describe('Mouse Input - Dragging', () => {
        it('should move window when dragging', () => {
            window.setPosition({ x: 10, y: 10 });
            
            // Start drag
            window.handleInput({
                type: 'mouse',
                button: 0,
                position: { x: 15, y: 10 }
            });
            
            // Move
            window.handleInput({
                type: 'mouse',
                position: { x: 20, y: 15 }
            });
            
            // Release
            window.handleInput({
                type: 'mouse',
                button: 0,
                position: { x: 20, y: 15 }
            });
            
            expect(window.getPosition()).toEqual({ x: 15, y: 15 });
        });

        it('should not move if not movable', () => {
            window = new Window('w1', { ...defaultOptions, movable: false });
            window.setPosition({ x: 10, y: 10 });
            
            // Try to drag
            window.handleInput({
                type: 'mouse',
                button: 0,
                position: { x: 15, y: 10 }
            });
            
            window.handleInput({
                type: 'mouse',
                position: { x: 20, y: 15 }
            });
            
            expect(window.getPosition()).toEqual({ x: 10, y: 10 });
        });
    });

    describe('Mouse Input - Resizing', () => {
        it('should resize from bottom-right corner', () => {
            window.setPosition({ x: 0, y: 0 });
            window.setSize({ width: 40, height: 20 });
            
            // Start resize from corner
            window.handleInput({
                type: 'mouse',
                button: 0,
                position: { x: 39, y: 19 }
            });
            
            // Resize
            window.handleInput({
                type: 'mouse',
                position: { x: 44, y: 24 }
            });
            
            // Release
            window.handleInput({
                type: 'mouse',
                button: 0,
                position: { x: 44, y: 24 }
            });
            
            expect(window.getSize()).toEqual({ width: 45, height: 25 });
        });

        it('should respect minimum size when resizing', () => {
            window.setPosition({ x: 0, y: 0 });
            window.setSize({ width: 40, height: 20 });
            
            // Start resize
            window.handleInput({
                type: 'mouse',
                button: 0,
                position: { x: 39, y: 19 }
            });
            
            // Try to resize below minimum
            window.handleInput({
                type: 'mouse',
                position: { x: 5, y: 2 }
            });
            
            const size = window.getSize();
            expect(size.width).toBeGreaterThanOrEqual(10);
            expect(size.height).toBeGreaterThanOrEqual(5);
        });

        it('should not resize if not resizable', () => {
            window = new Window('w1', { ...defaultOptions, resizable: false });
            window.setSize({ width: 40, height: 20 });
            
            // Try to resize
            window.handleInput({
                type: 'mouse',
                button: 0,
                position: { x: 39, y: 19 }
            });
            
            window.handleInput({
                type: 'mouse',
                position: { x: 50, y: 30 }
            });
            
            expect(window.getSize()).toEqual({ width: 40, height: 20 });
        });
    });

    describe('Rendering', () => {
        it('should render title bar with title', () => {
            const rendered = window.render();
            expect(rendered).toContain('Test Window');
        });

        it('should render window controls', () => {
            const rendered = window.render();
            expect(rendered).toContain('_'); // Minimize
            expect(rendered).toContain('□'); // Maximize
            expect(rendered).toContain('×'); // Close
        });

        it('should not render controls if disabled', () => {
            window = new Window('w1', {
                title: 'Test',
                closable: false,
                minimizable: false,
                maximizable: false
            });
            
            const rendered = window.render();
            expect(rendered).not.toContain('_');
            expect(rendered).not.toContain('□');
            expect(rendered).not.toContain('×');
        });

        it('should render maximize button as restore when maximized', () => {
            window.maximize();
            const rendered = window.render();
            expect(rendered).toContain('◫'); // Restore icon
        });

        it('should not render when minimized', () => {
            window.minimize();
            const rendered = window.render();
            expect(rendered).toBe('');
        });

        it('should not render when closed', () => {
            window.close();
            const rendered = window.render();
            expect(rendered).toBe('');
        });
    });

    describe('Content Management', () => {
        it('should add and render child components', () => {
            const child = {
                getId: () => 'child',
                render: () => 'Child Content',
                getPosition: () => ({ x: 0, y: 0 }),
                setPosition: vi.fn(),
                getSize: () => ({ width: 10, height: 1 }),
                setSize: vi.fn(),
                handleInput: vi.fn(),
                markDirty: vi.fn(),
                isDirty: () => false,
                clearDirty: vi.fn(),
                getParent: () => null,
                setParent: vi.fn(),
                getChildren: () => [],
                addChild: vi.fn(),
                removeChild: vi.fn(),
                isVisible: () => true,
                setVisible: vi.fn(),
                getState: () => ({}),
                setState: vi.fn()
            };
            
            window.addChild(child);
            const rendered = window.render();
            expect(rendered).toContain('Child Content');
        });
    });

    describe('State Persistence', () => {
        it('should maintain position after state changes', () => {
            window.setPosition({ x: 10, y: 5 });
            window.minimize();
            window.restore();
            expect(window.getPosition()).toEqual({ x: 10, y: 5 });
        });

        it('should maintain size after state changes', () => {
            window.setSize({ width: 50, height: 25 });
            window.minimize();
            window.restore();
            expect(window.getSize()).toEqual({ width: 50, height: 25 });
        });
    });
});
