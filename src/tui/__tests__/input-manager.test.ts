import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InputManager, type InputListener } from '../input-manager';
import type { InputEvent } from '../types';

describe('InputManager', () => {
    let inputManager: InputManager;
    let mockStdin: any;
    let mockStdout: any;

    beforeEach(() => {
        inputManager = new InputManager();
        
        // Mock process.stdin and process.stdout
        mockStdin = {
            on: vi.fn(),
            removeListener: vi.fn(),
            setRawMode: vi.fn(() => true),
        };
        
        mockStdout = {
            on: vi.fn(),
            removeListener: vi.fn(),
        };
        
        // Replace process.stdin and process.stdout
        const originalStdin = process.stdin;
        const originalStdout = process.stdout;
        
        Object.defineProperty(process, 'stdin', {
            value: mockStdin,
            configurable: true
        });
        
        Object.defineProperty(process, 'stdout', {
            value: mockStdout,
            configurable: true
        });
        
        // Restore after each test
        return () => {
            Object.defineProperty(process, 'stdin', {
                value: originalStdin,
                configurable: true
            });
            Object.defineProperty(process, 'stdout', {
                value: originalStdout,
                configurable: true
            });
        };
    });

    describe('constructor', () => {
        it('should initialize with default values', () => {
            expect(inputManager.isListening()).toBe(false);
            expect(inputManager.getListenerCount()).toBe(0);
        });
    });

    describe('startListening and stopListening', () => {
        it('should start listening for input events', () => {
            inputManager.startListening();
            
            expect(inputManager.isListening()).toBe(true);
            expect(mockStdin.on).toHaveBeenCalledWith('data', expect.any(Function));
            expect(mockStdout.on).toHaveBeenCalledWith('resize', expect.any(Function));
        });

        it('should not start listening twice', () => {
            inputManager.startListening();
            mockStdin.on.mockClear();
            
            inputManager.startListening();
            
            expect(mockStdin.on).not.toHaveBeenCalled();
        });

        it('should stop listening for input events', () => {
            inputManager.startListening();
            inputManager.stopListening();
            
            expect(inputManager.isListening()).toBe(false);
            expect(mockStdin.removeListener).toHaveBeenCalledWith('data', expect.any(Function));
            expect(mockStdout.removeListener).toHaveBeenCalledWith('resize', expect.any(Function));
        });

        it('should not stop listening if not started', () => {
            inputManager.stopListening();
            
            expect(mockStdin.removeListener).not.toHaveBeenCalled();
            expect(mockStdout.removeListener).not.toHaveBeenCalled();
        });
    });

    describe('listener management', () => {
        it('should add a key listener', () => {
            const listener = vi.fn();
            
            inputManager.addListener('enter', listener);
            
            expect(inputManager.getListenerCount()).toBe(1);
        });

        it('should add multiple listeners for the same key', () => {
            const listener1 = vi.fn();
            const listener2 = vi.fn();
            
            inputManager.addListener('enter', listener1);
            inputManager.addListener('enter', listener2);
            
            expect(inputManager.getListenerCount()).toBe(2);
        });

        it('should add a global listener', () => {
            const listener = vi.fn();
            
            inputManager.addGlobalListener(listener);
            
            expect(inputManager.getListenerCount()).toBe(1);
        });

        it('should remove a key listener', () => {
            const listener1 = vi.fn();
            const listener2 = vi.fn();
            
            inputManager.addListener('enter', listener1);
            inputManager.addListener('enter', listener2);
            inputManager.removeListener('enter', listener1);
            
            expect(inputManager.getListenerCount()).toBe(1);
        });

        it('should remove a global listener', () => {
            const listener1 = vi.fn();
            const listener2 = vi.fn();
            
            inputManager.addGlobalListener(listener1);
            inputManager.addGlobalListener(listener2);
            inputManager.removeGlobalListener(listener1);
            
            expect(inputManager.getListenerCount()).toBe(1);
        });

        it('should clear all listeners', () => {
            const listener1 = vi.fn();
            const listener2 = vi.fn();
            
            inputManager.addListener('enter', listener1);
            inputManager.addGlobalListener(listener2);
            inputManager.clearListeners();
            
            expect(inputManager.getListenerCount()).toBe(0);
        });
    });

    describe('input event parsing', () => {
        let dataHandler: (data: Buffer) => void;
        
        beforeEach(() => {
            inputManager.startListening();
            dataHandler = mockStdin.on.mock.calls[0][1];
        });

        it('should parse regular character input', () => {
            const listener = vi.fn();
            inputManager.addGlobalListener(listener);
            
            dataHandler(Buffer.from('a'));
            
            expect(listener).toHaveBeenCalledWith({
                type: 'key',
                key: 'a',
                ctrl: false,
                alt: false,
                shift: false
            });
        });

        it('should parse uppercase character as shift', () => {
            const listener = vi.fn();
            inputManager.addGlobalListener(listener);
            
            dataHandler(Buffer.from('A'));
            
            expect(listener).toHaveBeenCalledWith({
                type: 'key',
                key: 'A',
                ctrl: false,
                alt: false,
                shift: true
            });
        });

        it('should parse enter key', () => {
            const listener = vi.fn();
            inputManager.addGlobalListener(listener);
            
            dataHandler(Buffer.from('\r'));
            
            expect(listener).toHaveBeenCalledWith({
                type: 'key',
                key: 'enter',
                ctrl: false,
                alt: false,
                shift: false
            });
        });

        it('should parse escape key', () => {
            const listener = vi.fn();
            inputManager.addGlobalListener(listener);
            
            dataHandler(Buffer.from('\x1b'));
            
            expect(listener).toHaveBeenCalledWith({
                type: 'key',
                key: 'escape',
                ctrl: false,
                alt: false,
                shift: false
            });
        });

        it('should parse arrow keys', () => {
            const listener = vi.fn();
            inputManager.addGlobalListener(listener);
            
            dataHandler(Buffer.from('\x1b[A'));
            expect(listener).toHaveBeenCalledWith({
                type: 'key',
                key: 'up',
                ctrl: false,
                alt: false,
                shift: false
            });
            
            listener.mockClear();
            dataHandler(Buffer.from('\x1b[B'));
            expect(listener).toHaveBeenCalledWith({
                type: 'key',
                key: 'down',
                ctrl: false,
                alt: false,
                shift: false
            });
            
            listener.mockClear();
            dataHandler(Buffer.from('\x1b[C'));
            expect(listener).toHaveBeenCalledWith({
                type: 'key',
                key: 'right',
                ctrl: false,
                alt: false,
                shift: false
            });
            
            listener.mockClear();
            dataHandler(Buffer.from('\x1b[D'));
            expect(listener).toHaveBeenCalledWith({
                type: 'key',
                key: 'left',
                ctrl: false,
                alt: false,
                shift: false
            });
        });

        it('should parse Ctrl+key combinations', () => {
            const listener = vi.fn();
            inputManager.addGlobalListener(listener);
            
            dataHandler(Buffer.from('\x03')); // Ctrl+C
            
            expect(listener).toHaveBeenCalledWith({
                type: 'key',
                key: 'c',
                ctrl: true,
                alt: false,
                shift: false
            });
        });

        it('should parse Alt+key combinations', () => {
            const listener = vi.fn();
            inputManager.addGlobalListener(listener);
            
            dataHandler(Buffer.from('\x1ba')); // Alt+a
            
            expect(listener).toHaveBeenCalledWith({
                type: 'key',
                key: 'a',
                ctrl: false,
                alt: true,
                shift: false
            });
        });

        it('should parse function keys', () => {
            const listener = vi.fn();
            inputManager.addGlobalListener(listener);
            
            dataHandler(Buffer.from('\x1bOP')); // F1
            
            expect(listener).toHaveBeenCalledWith({
                type: 'key',
                key: 'f1',
                ctrl: false,
                alt: false,
                shift: false
            });
        });

        it('should parse home and end keys', () => {
            const listener = vi.fn();
            inputManager.addGlobalListener(listener);
            
            dataHandler(Buffer.from('\x1b[H')); // Home
            expect(listener).toHaveBeenCalledWith({
                type: 'key',
                key: 'home',
                ctrl: false,
                alt: false,
                shift: false
            });
            
            listener.mockClear();
            dataHandler(Buffer.from('\x1b[F')); // End
            expect(listener).toHaveBeenCalledWith({
                type: 'key',
                key: 'end',
                ctrl: false,
                alt: false,
                shift: false
            });
        });
    });

    describe('event dispatching', () => {
        let dataHandler: (data: Buffer) => void;
        
        beforeEach(() => {
            inputManager.startListening();
            dataHandler = mockStdin.on.mock.calls[0][1];
        });

        it('should dispatch to global listeners first', () => {
            const globalListener = vi.fn(() => false);
            const keyListener = vi.fn();
            
            inputManager.addGlobalListener(globalListener);
            inputManager.addListener('a', keyListener);
            
            dataHandler(Buffer.from('a'));
            
            expect(globalListener).toHaveBeenCalled();
            expect(keyListener).toHaveBeenCalled();
        });

        it('should stop propagation if global listener returns true', () => {
            const globalListener = vi.fn(() => true);
            const keyListener = vi.fn();
            
            inputManager.addGlobalListener(globalListener);
            inputManager.addListener('a', keyListener);
            
            dataHandler(Buffer.from('a'));
            
            expect(globalListener).toHaveBeenCalled();
            expect(keyListener).not.toHaveBeenCalled();
        });

        it('should dispatch to specific key listeners', () => {
            const enterListener = vi.fn();
            const escapeListener = vi.fn();
            
            inputManager.addListener('enter', enterListener);
            inputManager.addListener('escape', escapeListener);
            
            dataHandler(Buffer.from('\r'));
            
            expect(enterListener).toHaveBeenCalled();
            expect(escapeListener).not.toHaveBeenCalled();
        });

        it('should call multiple listeners for the same key', () => {
            const listener1 = vi.fn(() => false);
            const listener2 = vi.fn();
            
            inputManager.addListener('enter', listener1);
            inputManager.addListener('enter', listener2);
            
            dataHandler(Buffer.from('\r'));
            
            expect(listener1).toHaveBeenCalled();
            expect(listener2).toHaveBeenCalled();
        });

        it('should stop calling listeners if one returns true', () => {
            const listener1 = vi.fn(() => true);
            const listener2 = vi.fn();
            
            inputManager.addListener('enter', listener1);
            inputManager.addListener('enter', listener2);
            
            dataHandler(Buffer.from('\r'));
            
            expect(listener1).toHaveBeenCalled();
            expect(listener2).not.toHaveBeenCalled();
        });
    });

    describe('resize event handling', () => {
        let resizeHandler: () => void;
        
        beforeEach(() => {
            inputManager.startListening();
            resizeHandler = mockStdout.on.mock.calls[0][1];
        });

        it('should dispatch resize event', () => {
            const listener = vi.fn();
            inputManager.addGlobalListener(listener);
            
            resizeHandler();
            
            expect(listener).toHaveBeenCalledWith({
                type: 'key',
                key: 'resize',
                ctrl: false,
                alt: false,
                shift: false
            });
        });
    });

    describe('mouse event parsing', () => {
        let dataHandler: (data: Buffer) => void;
        
        beforeEach(() => {
            inputManager.startListening();
            dataHandler = mockStdin.on.mock.calls[0][1];
        });

        it('should parse basic mouse events', () => {
            const listener = vi.fn();
            inputManager.addGlobalListener(listener);
            
            // Simulate a mouse click at position (10, 5)
            // Format: \x1b[M<button><x><y>
            const mouseData = Buffer.from([
                0x1b, 0x5b, 0x4d, // \x1b[M
                32,               // button (0 + 32 = left click)
                10 + 33,          // x position + 33
                5 + 33            // y position + 33
            ]);
            
            dataHandler(mouseData);
            
            expect(listener).toHaveBeenCalledWith({
                type: 'mouse',
                mouse: {
                    x: 10,
                    y: 5,
                    button: 'left',
                    action: 'press'
                }
            });
        });
    });
});
