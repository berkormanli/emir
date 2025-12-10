import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WindowManager, WindowManagerOptions } from '../../src/tui/window-manager';
import { Window } from '../../src/tui/window';
import { Modal } from '../../src/tui/modal';
import { Dialog } from '../../src/tui/dialog';
import { InputEvent } from '../../src/tui/types';

describe('WindowManager', () => {
    let manager: WindowManager;
    const defaultOptions: WindowManagerOptions = {
        maxWindows: 10,
        cascadeOffset: { x: 2, y: 1 },
        defaultWindowSize: { width: 30, height: 15 },
        defaultWindowPosition: { x: 5, y: 2 },
        taskbarHeight: 1
    };

    beforeEach(() => {
        manager = new WindowManager('test-manager', defaultOptions, { width: 80, height: 24 });
    });

    describe('Constructor and Initial State', () => {
        it('should create manager with default options', () => {
            const m = new WindowManager('m1');
            expect(m.getId()).toBe('m1');
            expect(m.getWindows()).toHaveLength(0);
        });

        it('should create manager with custom options', () => {
            expect(manager.getId()).toBe('test-manager');
            expect(manager.getSize()).toEqual({ width: 80, height: 24 });
        });

        it('should create taskbar if taskbarHeight > 0', () => {
            const children = manager.getChildren();
            expect(children.length).toBeGreaterThan(0); // Should have taskbar
        });

        it('should not create taskbar if taskbarHeight is 0', () => {
            const m = new WindowManager('m1', { taskbarHeight: 0 });
            const children = m.getChildren();
            expect(children.filter(c => c.getId().includes('taskbar'))).toHaveLength(0);
        });
    });

    describe('Window Management', () => {
        it('should add window', () => {
            const window = new Window('w1', { title: 'Test' });
            manager.addWindow(window);
            
            expect(manager.getWindows()).toContain(window);
            expect(manager.getFocusedWindow()).toBe(window);
        });

        it('should set window position and size when adding', () => {
            const window = new Window('w1', { title: 'Test' });
            manager.addWindow(window, { x: 10, y: 5 }, { width: 40, height: 20 });
            
            expect(window.getPosition()).toEqual({ x: 10, y: 5 });
            expect(window.getSize()).toEqual({ width: 40, height: 20 });
        });

        it('should use default position and size if not specified', () => {
            const window = new Window('w1', { title: 'Test' });
            manager.addWindow(window);
            
            expect(window.getPosition()).toEqual(defaultOptions.defaultWindowPosition);
            expect(window.getSize()).toEqual(defaultOptions.defaultWindowSize);
        });

        it('should cascade windows', () => {
            const w1 = new Window('w1', { title: 'Window 1' });
            const w2 = new Window('w2', { title: 'Window 2' });
            const w3 = new Window('w3', { title: 'Window 3' });
            
            manager.addWindow(w1);
            manager.addWindow(w2);
            manager.addWindow(w3);
            
            const pos1 = w1.getPosition();
            const pos2 = w2.getPosition();
            const pos3 = w3.getPosition();
            
            expect(pos2.x).toBe(pos1.x + defaultOptions.cascadeOffset!.x);
            expect(pos2.y).toBe(pos1.y + defaultOptions.cascadeOffset!.y);
            expect(pos3.x).toBe(pos2.x + defaultOptions.cascadeOffset!.x);
            expect(pos3.y).toBe(pos2.y + defaultOptions.cascadeOffset!.y);
        });

        it('should remove window', () => {
            const window = new Window('w1', { title: 'Test' });
            manager.addWindow(window);
            manager.removeWindow('w1');
            
            expect(manager.getWindows()).not.toContain(window);
        });

        it('should handle maximum windows limit', () => {
            const m = new WindowManager('m1', { maxWindows: 2 });
            
            m.addWindow(new Window('w1', {}));
            m.addWindow(new Window('w2', {}));
            
            expect(() => {
                m.addWindow(new Window('w3', {}));
            }).toThrow('Maximum number of windows');
        });

        it('should close all windows', () => {
            manager.addWindow(new Window('w1', {}));
            manager.addWindow(new Window('w2', {}));
            manager.addWindow(new Window('w3', {}));
            
            manager.closeAllWindows();
            expect(manager.getWindows()).toHaveLength(0);
        });
    });

    describe('Focus Management', () => {
        it('should focus window', () => {
            const w1 = new Window('w1', {});
            const w2 = new Window('w2', {});
            
            manager.addWindow(w1);
            manager.addWindow(w2);
            
            manager.focusWindow('w1');
            expect(manager.getFocusedWindow()).toBe(w1);
            expect(w1.isFocused()).toBe(true);
            expect(w2.isFocused()).toBe(false);
        });

        it('should bring focused window to front', () => {
            const w1 = new Window('w1', {});
            const w2 = new Window('w2', {});
            const w3 = new Window('w3', {});
            
            manager.addWindow(w1);
            manager.addWindow(w2);
            manager.addWindow(w3);
            
            manager.focusWindow('w1');
            
            // w1 should now be on top
            const windows = manager.getWindows();
            expect(manager.getFocusedWindow()).toBe(w1);
        });

        it('should focus next window when current is removed', () => {
            const w1 = new Window('w1', {});
            const w2 = new Window('w2', {});
            
            manager.addWindow(w1);
            manager.addWindow(w2);
            manager.focusWindow('w2');
            
            manager.removeWindow('w2');
            expect(manager.getFocusedWindow()).toBe(w1);
        });

        it('should cycle through windows with Alt+Tab', () => {
            const w1 = new Window('w1', {});
            const w2 = new Window('w2', {});
            const w3 = new Window('w3', {});
            
            manager.addWindow(w1);
            manager.addWindow(w2);
            manager.addWindow(w3);
            
            const input: InputEvent = {
                type: 'key',
                key: 'tab',
                alt: true
            };
            
            manager.focusWindow('w1');
            manager.handleInput(input);
            expect(manager.getFocusedWindow()).toBe(w2);
            
            manager.handleInput(input);
            expect(manager.getFocusedWindow()).toBe(w3);
            
            manager.handleInput(input);
            expect(manager.getFocusedWindow()).toBe(w1);
        });
    });

    describe('Window State Management', () => {
        let window: Window;

        beforeEach(() => {
            window = new Window('w1', { 
                title: 'Test',
                minimizable: true,
                maximizable: true
            });
            manager.addWindow(window);
        });

        it('should minimize window', () => {
            manager.minimizeWindow('w1');
            expect(window.getState()).toBe('minimized');
        });

        it('should restore minimized window', () => {
            manager.minimizeWindow('w1');
            manager.restoreWindow('w1');
            expect(window.getState()).toBe('normal');
        });

        it('should maximize window', () => {
            manager.maximizeWindow('w1');
            expect(window.getState()).toBe('maximized');
            expect(window.getSize()).toEqual({
                width: 80,
                height: 23 // 24 - 1 for taskbar
            });
        });

        it('should toggle maximize state', () => {
            manager.toggleMaximize('w1');
            expect(window.getState()).toBe('maximized');
            
            manager.toggleMaximize('w1');
            expect(window.getState()).toBe('normal');
        });

        it('should restore window position/size after minimize', () => {
            window.setPosition({ x: 10, y: 5 });
            window.setSize({ width: 40, height: 20 });
            
            manager.minimizeWindow('w1');
            manager.restoreWindow('w1');
            
            expect(window.getPosition()).toEqual({ x: 10, y: 5 });
            expect(window.getSize()).toEqual({ width: 40, height: 20 });
        });

        it('should restore window from clicking minimized in taskbar', () => {
            manager.minimizeWindow('w1');
            manager.focusWindow('w1'); // Should restore
            expect(window.getState()).toBe('normal');
        });
    });

    describe('Modal Management', () => {
        it('should allow single modal by default', () => {
            const modal1 = new Modal('m1', { title: 'Modal 1' });
            const modal2 = new Modal('m2', { title: 'Modal 2' });
            
            manager.addWindow(modal1);
            
            expect(() => {
                manager.addWindow(modal2);
            }).toThrow('A modal window is already open');
        });

        it('should allow multiple modals if configured', () => {
            const m = new WindowManager('m1', { allowMultipleModals: true });
            const modal1 = new Modal('m1', { title: 'Modal 1' });
            const modal2 = new Modal('m2', { title: 'Modal 2' });
            
            m.addWindow(modal1);
            m.addWindow(modal2);
            
            expect(m.getWindows()).toContain(modal1);
            expect(m.getWindows()).toContain(modal2);
        });

        it('should prevent sending modal to back', () => {
            const modal = new Modal('m1', { title: 'Modal' });
            const window = new Window('w1', { title: 'Window' });
            
            manager.addWindow(window);
            manager.addWindow(modal);
            
            manager.sendToBack('m1');
            
            // Modal should still be on top
            expect(manager.getFocusedWindow()).toBe(modal);
        });

        it('should not minimize modal', () => {
            const modal = new Modal('m1', { title: 'Modal' });
            manager.addWindow(modal);
            
            manager.minimizeWindow('m1');
            expect(modal.getState()).toBe('normal');
        });

        it('should not maximize modal', () => {
            const modal = new Modal('m1', { title: 'Modal' });
            manager.addWindow(modal);
            
            manager.maximizeWindow('m1');
            expect(modal.getState()).toBe('normal');
        });
    });

    describe('Window Arrangement', () => {
        let w1: Window, w2: Window, w3: Window;

        beforeEach(() => {
            w1 = new Window('w1', { title: 'Window 1' });
            w2 = new Window('w2', { title: 'Window 2' });
            w3 = new Window('w3', { title: 'Window 3' });
            
            manager.addWindow(w1);
            manager.addWindow(w2);
            manager.addWindow(w3);
        });

        it('should arrange windows in cascade', () => {
            manager.arrangeWindows('cascade');
            
            const pos1 = w1.getPosition();
            const pos2 = w2.getPosition();
            const pos3 = w3.getPosition();
            
            expect(pos2.x).toBe(pos1.x + defaultOptions.cascadeOffset!.x);
            expect(pos2.y).toBe(pos1.y + defaultOptions.cascadeOffset!.y);
            expect(pos3.x).toBe(pos2.x + defaultOptions.cascadeOffset!.x);
            expect(pos3.y).toBe(pos2.y + defaultOptions.cascadeOffset!.y);
        });

        it('should arrange windows in horizontal tiles', () => {
            manager.arrangeWindows('tile-horizontal');
            
            const size1 = w1.getSize();
            const size2 = w2.getSize();
            const size3 = w3.getSize();
            
            // Each window should take 1/3 of width
            expect(size1.width).toBe(Math.floor(80 / 3));
            expect(size2.width).toBe(Math.floor(80 / 3));
            expect(size3.width).toBe(Math.floor(80 / 3));
            
            // All should have full height minus taskbar
            expect(size1.height).toBe(23);
            expect(size2.height).toBe(23);
            expect(size3.height).toBe(23);
            
            // Positions should be side by side
            expect(w1.getPosition().x).toBe(0);
            expect(w2.getPosition().x).toBe(Math.floor(80 / 3));
            expect(w3.getPosition().x).toBe(Math.floor(80 / 3) * 2);
        });

        it('should arrange windows in vertical tiles', () => {
            manager.arrangeWindows('tile-vertical');
            
            const size1 = w1.getSize();
            const size2 = w2.getSize();
            const size3 = w3.getSize();
            
            // All should have full width
            expect(size1.width).toBe(80);
            expect(size2.width).toBe(80);
            expect(size3.width).toBe(80);
            
            // Each should take 1/3 of height
            const height = Math.floor(23 / 3);
            expect(size1.height).toBe(height);
            expect(size2.height).toBe(height);
            expect(size3.height).toBe(height);
            
            // Positions should be stacked
            expect(w1.getPosition().y).toBe(0);
            expect(w2.getPosition().y).toBe(height);
            expect(w3.getPosition().y).toBe(height * 2);
        });

        it('should not arrange minimized windows', () => {
            manager.minimizeWindow('w2');
            manager.arrangeWindows('cascade');
            
            // w2 should still be minimized
            expect(w2.getState()).toBe('minimized');
        });
    });

    describe('Mouse Input', () => {
        it('should focus window on click', () => {
            const w1 = new Window('w1', {});
            const w2 = new Window('w2', {});
            
            manager.addWindow(w1);
            manager.addWindow(w2);
            
            w1.setPosition({ x: 0, y: 0 });
            w1.setSize({ width: 30, height: 15 });
            
            const input: InputEvent = {
                type: 'mouse',
                button: 0,
                position: { x: 15, y: 7 }
            };
            
            manager.focusWindow('w2');
            manager.handleInput(input);
            
            expect(manager.getFocusedWindow()).toBe(w1);
        });

        it('should not focus window if click is outside', () => {
            const w1 = new Window('w1', {});
            manager.addWindow(w1);
            
            w1.setPosition({ x: 10, y: 10 });
            w1.setSize({ width: 20, height: 10 });
            
            const input: InputEvent = {
                type: 'mouse',
                button: 0,
                position: { x: 5, y: 5 }
            };
            
            const focused = manager.getFocusedWindow();
            manager.handleInput(input);
            
            expect(manager.getFocusedWindow()).toBe(focused);
        });
    });

    describe('Keyboard Shortcuts', () => {
        it('should close focused window with Alt+F4', () => {
            const window = new Window('w1', { closable: true });
            manager.addWindow(window);
            
            const input: InputEvent = {
                type: 'key',
                key: 'f4',
                alt: true
            };
            
            manager.handleInput(input);
            expect(manager.getWindows()).not.toContain(window);
        });

        it('should pass input to focused window', () => {
            const window = new Window('w1', {});
            const handleInput = vi.spyOn(window, 'handleInput');
            
            manager.addWindow(window);
            
            const input: InputEvent = {
                type: 'key',
                key: 'a'
            };
            
            manager.handleInput(input);
            expect(handleInput).toHaveBeenCalledWith(input);
        });
    });

    describe('Grid Snapping', () => {
        it('should snap position to grid if enabled', () => {
            const m = new WindowManager('m1', {
                snapToGrid: true,
                gridSize: 5
            });
            
            const window = new Window('w1', {});
            m.addWindow(window, { x: 12, y: 8 });
            
            expect(window.getPosition()).toEqual({ x: 10, y: 10 });
        });

        it('should not snap if disabled', () => {
            const m = new WindowManager('m1', {
                snapToGrid: false
            });
            
            const window = new Window('w1', {});
            m.addWindow(window, { x: 12, y: 8 });
            
            expect(window.getPosition()).toEqual({ x: 12, y: 8 });
        });
    });

    describe('Z-Index Management', () => {
        it('should maintain z-index order', () => {
            const w1 = new Window('w1', {});
            const w2 = new Window('w2', {});
            const w3 = new Window('w3', {});
            
            manager.addWindow(w1);
            manager.addWindow(w2);
            manager.addWindow(w3);
            
            // w3 should be on top (last added)
            expect(manager.getFocusedWindow()).toBe(w3);
            
            // Focus w1, should bring to top
            manager.focusWindow('w1');
            expect(manager.getFocusedWindow()).toBe(w1);
        });

        it('should send window to back', () => {
            const w1 = new Window('w1', {});
            const w2 = new Window('w2', {});
            const w3 = new Window('w3', {});
            
            manager.addWindow(w1);
            manager.addWindow(w2);
            manager.addWindow(w3);
            
            manager.sendToBack('w3');
            
            // w3 should now be at bottom of stack
            manager.focusWindow('w2');
            expect(manager.getFocusedWindow()).toBe(w2);
        });
    });
});
