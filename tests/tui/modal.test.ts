import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Modal, ModalOptions } from '../../src/tui/modal';
import { InputEvent } from '../../src/tui/types';

describe('Modal', () => {
    let modal: Modal;
    const defaultOptions: ModalOptions = {
        title: 'Test Modal',
        closable: true,
        escapeToClose: true,
        clickOutsideToClose: true,
        overlayOpacity: 0.5
    };

    beforeEach(() => {
        modal = new Modal('test-modal', defaultOptions);
    });

    describe('Constructor and Initial State', () => {
        it('should create modal with default options', () => {
            const m = new Modal('m1', {});
            expect(m.getId()).toBe('m1');
            expect(m.getTitle()).toBe('');
            expect(m.isShown()).toBe(false);
        });

        it('should create modal with custom options', () => {
            expect(modal.getTitle()).toBe('Test Modal');
            expect(modal.isShown()).toBe(false);
        });

        it('should set default size', () => {
            expect(modal.getSize()).toEqual({ width: 40, height: 10 });
        });

        it('should accept custom size', () => {
            const m = new Modal('m1', {}, { width: 50, height: 20 });
            expect(m.getSize()).toEqual({ width: 50, height: 20 });
        });

        it('should not be movable or resizable', () => {
            const m = new Modal('m1', {});
            // These options should be forced to false
            const rendered = m.render();
            
            // Try to drag - should not work
            m.handleInput({
                type: 'mouse',
                button: 0,
                position: { x: 20, y: 0 } // Title bar
            });
            
            const pos1 = m.getPosition();
            
            m.handleInput({
                type: 'mouse',
                position: { x: 30, y: 10 }
            });
            
            const pos2 = m.getPosition();
            expect(pos1).toEqual(pos2); // Should not have moved
        });
    });

    describe('Show/Hide', () => {
        it('should show modal', () => {
            modal.show();
            expect(modal.isShown()).toBe(true);
        });

        it('should hide modal', () => {
            modal.show();
            modal.hide();
            expect(modal.isShown()).toBe(false);
        });

        it('should trigger onShow callback', () => {
            const onShow = vi.fn();
            const m = new Modal('m1', { ...defaultOptions, onShow });
            m.show();
            expect(onShow).toHaveBeenCalled();
        });

        it('should trigger onHide callback', () => {
            const onHide = vi.fn();
            const m = new Modal('m1', { ...defaultOptions, onHide });
            m.show();
            m.hide();
            expect(onHide).toHaveBeenCalled();
        });
    });

    describe('Keyboard Input', () => {
        beforeEach(() => {
            modal.show();
        });

        it('should close with Escape if escapeToClose is true', () => {
            const input: InputEvent = {
                type: 'key',
                key: 'escape'
            };
            
            modal.handleInput(input);
            expect(modal.isShown()).toBe(false);
        });

        it('should not close with Escape if escapeToClose is false', () => {
            const m = new Modal('m1', { ...defaultOptions, escapeToClose: false });
            m.show();
            
            const input: InputEvent = {
                type: 'key',
                key: 'escape'
            };
            
            m.handleInput(input);
            expect(m.isShown()).toBe(true);
        });

        it('should close with Alt+F4 if closable', () => {
            const input: InputEvent = {
                type: 'key',
                key: 'f4',
                alt: true
            };
            
            modal.handleInput(input);
            expect(modal.isShown()).toBe(false);
        });

        it('should not close with Alt+F4 if not closable', () => {
            const m = new Modal('m1', { ...defaultOptions, closable: false });
            m.show();
            
            const input: InputEvent = {
                type: 'key',
                key: 'f4',
                alt: true
            };
            
            m.handleInput(input);
            expect(m.isShown()).toBe(true);
        });
    });

    describe('Mouse Input', () => {
        beforeEach(() => {
            modal.show();
            modal.setPosition({ x: 20, y: 7 }); // Center position for 80x24 screen
        });

        it('should close when clicking outside if clickOutsideToClose is true', () => {
            const input: InputEvent = {
                type: 'mouse',
                button: 0,
                position: { x: 5, y: 5 } // Outside modal
            };
            
            modal.handleInput(input);
            expect(modal.isShown()).toBe(false);
        });

        it('should not close when clicking inside', () => {
            const input: InputEvent = {
                type: 'mouse',
                button: 0,
                position: { x: 25, y: 10 } // Inside modal
            };
            
            modal.handleInput(input);
            expect(modal.isShown()).toBe(true);
        });

        it('should not close when clicking outside if clickOutsideToClose is false', () => {
            const m = new Modal('m1', { ...defaultOptions, clickOutsideToClose: false });
            m.show();
            m.setPosition({ x: 20, y: 7 });
            
            const input: InputEvent = {
                type: 'mouse',
                button: 0,
                position: { x: 5, y: 5 } // Outside modal
            };
            
            m.handleInput(input);
            expect(m.isShown()).toBe(true);
        });

        it('should handle close button click', () => {
            modal.setPosition({ x: 20, y: 7 });
            const input: InputEvent = {
                type: 'mouse',
                button: 0,
                position: { x: 57, y: 7 } // Close button position
            };
            
            modal.handleInput(input);
            expect(modal.isShown()).toBe(false);
        });
    });

    describe('Centering', () => {
        it('should center modal on screen', () => {
            modal.show();
            // Assuming 80x24 screen size
            const position = modal.getPosition();
            expect(position.x).toBe(20); // (80 - 40) / 2
            expect(position.y).toBe(7);  // (24 - 10) / 2
        });

        it('should recenter when screen size changes', () => {
            modal.show();
            const pos1 = modal.getPosition();
            
            // Simulate parent size change
            if (modal.getParent()) {
                modal.getParent()!.setSize({ width: 100, height: 30 });
            }
            
            modal.center();
            const pos2 = modal.getPosition();
            
            expect(pos2.x).toBe(30); // (100 - 40) / 2
            expect(pos2.y).toBe(10); // (30 - 10) / 2
        });
    });

    describe('Overlay Rendering', () => {
        it('should render overlay when shown', () => {
            modal.show();
            const rendered = modal.render();
            
            // Check for overlay characters
            const lines = rendered.split('\n');
            expect(lines.length).toBeGreaterThan(0);
            
            // Overlay should cover the screen with semi-transparent background
            expect(rendered).toContain('░'); // Default overlay character
        });

        it('should use custom overlay opacity', () => {
            const m = new Modal('m1', { ...defaultOptions, overlayOpacity: 0.8 });
            m.show();
            const rendered = m.render();
            
            // Higher opacity should use denser character
            expect(rendered).toContain('▓');
        });

        it('should not render overlay when hidden', () => {
            const rendered = modal.render();
            expect(rendered).toBe('');
        });
    });

    describe('Window State Management', () => {
        it('should not allow minimizing', () => {
            modal.minimize();
            expect(modal.getState()).toBe('normal');
        });

        it('should not allow maximizing', () => {
            modal.maximize();
            expect(modal.getState()).toBe('normal');
        });

        it('should handle closing', () => {
            modal.show();
            modal.close();
            expect(modal.isShown()).toBe(false);
            expect(modal.getState()).toBe('closed');
        });
    });

    describe('Content Management', () => {
        it('should add and render child components', () => {
            const child = {
                getId: () => 'child',
                render: () => 'Modal Content',
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
            
            modal.addChild(child);
            modal.show();
            const rendered = modal.render();
            expect(rendered).toContain('Modal Content');
        });
    });

    describe('Z-Index', () => {
        it('should always be on top', () => {
            // Modal should have high z-index to appear above other windows
            modal.show();
            const rendered = modal.render();
            
            // Modal content should be rendered after overlay
            expect(rendered).toBeTruthy();
        });
    });

    describe('Focus Management', () => {
        it('should gain focus when shown', () => {
            modal.show();
            expect(modal.isFocused()).toBe(true);
        });

        it('should lose focus when hidden', () => {
            modal.show();
            modal.hide();
            expect(modal.isFocused()).toBe(false);
        });
    });
});
