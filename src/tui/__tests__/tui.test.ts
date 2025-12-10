import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TUI } from '../tui.js';
import type { Component } from '../types.js';

// Mock TerminalController
const mockTerminalController = {
    isTUISupported: vi.fn(() => true),
    enableRawMode: vi.fn(),
    disableRawMode: vi.fn(),
    enterAlternateScreen: vi.fn(),
    exitAlternateScreen: vi.fn(),
    hideCursor: vi.fn(),
    showCursor: vi.fn(),
    clearScreen: vi.fn(),
    writeAt: vi.fn(),
    getTerminalSize: vi.fn(() => ({ width: 80, height: 24 })),
    detectCapabilities: vi.fn(() => ({
        colors: 256,
        unicode: true,
        mouse: true,
        alternateScreen: true
    })),
    restore: vi.fn()
};

vi.mock('../terminal-controller.js', () => ({
    TerminalController: vi.fn(() => mockTerminalController)
}));

// Mock process.stdout and process.stdin for events
const mockStdout = {
    on: vi.fn()
};

const mockStdin = {
    on: vi.fn()
};

const mockProcess = {
    stdout: mockStdout,
    stdin: mockStdin,
    exit: vi.fn()
};

vi.stubGlobal('process', mockProcess);

// Mock component for testing
class MockComponent implements Component {
    id: string;
    position = { x: 0, y: 0 };
    size = { width: 10, height: 1 };
    visible = true;

    renderCalled = false;
    handleInputCalled = false;
    focusCalled = false;
    blurCalled = false;
    updateCalled = false;
    updateData: any = null;

    constructor(id: string) {
        this.id = id;
    }

    render(): string {
        this.renderCalled = true;
        return `Component ${this.id}`;
    }

    handleInput(_input: any): boolean {
        this.handleInputCalled = true;
        return true;
    }

    focus(): void {
        this.focusCalled = true;
    }

    blur(): void {
        this.blurCalled = true;
    }

    update(data?: any): void {
        this.updateCalled = true;
        this.updateData = data;
    }
}

describe('TUI', () => {
    let tui: TUI;

    beforeEach(() => {
        vi.clearAllMocks();
        // Reset mock return values and implementations
        mockTerminalController.isTUISupported.mockReturnValue(true);
        mockTerminalController.enableRawMode.mockImplementation(() => { });
        mockTerminalController.disableRawMode.mockImplementation(() => { });
        mockTerminalController.enterAlternateScreen.mockImplementation(() => { });
        mockTerminalController.exitAlternateScreen.mockImplementation(() => { });
        mockTerminalController.hideCursor.mockImplementation(() => { });
        mockTerminalController.showCursor.mockImplementation(() => { });
        mockTerminalController.clearScreen.mockImplementation(() => { });
        mockTerminalController.writeAt.mockImplementation(() => { });
        mockTerminalController.restore.mockImplementation(() => { });

        // Reset process mocks
        mockStdout.on.mockImplementation(() => { });
        mockStdin.on.mockImplementation(() => { });
        mockProcess.exit.mockImplementation(() => { });

        tui = new TUI('TestApp', '1.0.0', 'Test TUI Application');
    });

    afterEach(() => {
        if (tui.isRunning()) {
            tui.stop();
        }
    });

    describe('Construction', () => {
        it('should create TUI with correct properties', () => {
            expect(tui.name).toBe('TestApp');
            expect(tui.version).toBe('1.0.0');
            expect(tui.description).toBe('Test TUI Application');
            expect(tui.components).toEqual([]);
            expect(tui.isRunning()).toBe(false);
        });
    });

    describe('Component management', () => {
        it('should add components', () => {
            const component = new MockComponent('test1');
            tui.addComponent(component);

            expect(tui.components).toHaveLength(1);
            expect(tui.components[0]).toBe(component);
        });

        it('should remove components by ID', () => {
            const component1 = new MockComponent('test1');
            const component2 = new MockComponent('test2');

            tui.addComponent(component1);
            tui.addComponent(component2);

            const removed = tui.removeComponent('test1');

            expect(removed).toBe(true);
            expect(tui.components).toHaveLength(1);
            expect(tui.components[0]).toBe(component2);
        });

        it('should return false when removing non-existent component', () => {
            const removed = tui.removeComponent('nonexistent');
            expect(removed).toBe(false);
        });

        it('should get component by ID', () => {
            const component = new MockComponent('test1');
            tui.addComponent(component);

            const found = tui.getComponent('test1');
            expect(found).toBe(component);

            const notFound = tui.getComponent('nonexistent');
            expect(notFound).toBeUndefined();
        });
    });

    describe('TUI lifecycle', () => {
        it('should start TUI successfully', async () => {
            await tui.start();

            expect(mockTerminalController.isTUISupported).toHaveBeenCalled();
            expect(mockTerminalController.enableRawMode).toHaveBeenCalled();
            expect(mockTerminalController.enterAlternateScreen).toHaveBeenCalled();
            expect(mockTerminalController.hideCursor).toHaveBeenCalled();
            expect(mockTerminalController.clearScreen).toHaveBeenCalled();
            expect(mockTerminalController.detectCapabilities).toHaveBeenCalled();
            expect(tui.isRunning()).toBe(true);
        });

        it('should throw error if TUI is not supported', async () => {
            mockTerminalController.isTUISupported.mockReturnValue(false);

            await expect(tui.start()).rejects.toThrow('TUI is not supported in this terminal environment');
            expect(tui.isRunning()).toBe(false);
        });

        it('should throw error if already running', async () => {
            await tui.start();

            await expect(tui.start()).rejects.toThrow('TUI is already running');
        });

        it('should handle start errors and restore terminal', async () => {
            mockTerminalController.enableRawMode.mockImplementation(() => {
                throw new Error('Raw mode failed');
            });

            await expect(tui.start()).rejects.toThrow('Raw mode failed');
            expect(tui.isRunning()).toBe(false);
            expect(mockTerminalController.restore).toHaveBeenCalled();
        });

        it('should stop TUI', async () => {
            await tui.start();
            tui.stop();

            expect(tui.isRunning()).toBe(false);
            expect(mockTerminalController.restore).toHaveBeenCalled();
        });

        it('should handle stop when not running', () => {
            tui.stop(); // Should not throw
            expect(mockTerminalController.restore).not.toHaveBeenCalled();
        });
    });

    describe('Rendering', () => {
        it('should render visible components', async () => {
            const component1 = new MockComponent('test1');
            const component2 = new MockComponent('test2');
            component1.position = { x: 5, y: 10 };
            component2.visible = false;

            tui.addComponent(component1);
            tui.addComponent(component2);

            await tui.start();

            expect(mockTerminalController.clearScreen).toHaveBeenCalled();
            expect(component1.renderCalled).toBe(true);
            expect(component2.renderCalled).toBe(false);
            expect(mockTerminalController.writeAt).toHaveBeenCalledWith(6, 11, 'Component test1');
        });

        it('should not render when not running', () => {
            const component = new MockComponent('test1');
            tui.addComponent(component);

            tui.render();

            expect(component.renderCalled).toBe(false);
            expect(mockTerminalController.clearScreen).not.toHaveBeenCalled();
        });

        it('should skip components with empty render output', async () => {
            const component = new MockComponent('test1');
            component.render = () => '';
            tui.addComponent(component);

            await tui.start();

            expect(mockTerminalController.writeAt).not.toHaveBeenCalled();
        });
    });

    describe('Component updates', () => {
        it('should update component and re-render when running', async () => {
            const component = new MockComponent('test1');
            tui.addComponent(component);
            await tui.start();

            vi.clearAllMocks();
            tui.updateComponent('test1', { data: 'test' });

            expect(component.updateCalled).toBe(true);
            expect(component.updateData).toEqual({ data: 'test' });
            expect(mockTerminalController.clearScreen).toHaveBeenCalled();
        });

        it('should update component without re-rendering when not running', () => {
            const component = new MockComponent('test1');
            tui.addComponent(component);

            tui.updateComponent('test1', { data: 'test' });

            expect(component.updateCalled).toBe(true);
            expect(component.updateData).toEqual({ data: 'test' });
            expect(mockTerminalController.clearScreen).not.toHaveBeenCalled();
        });

        it('should handle update of non-existent component', () => {
            tui.updateComponent('nonexistent');
            // Should not throw
        });
    });

    describe('Terminal information', () => {
        it('should return terminal size', () => {
            const size = tui.getTerminalSize();
            expect(size).toEqual({ width: 80, height: 24 });
            expect(mockTerminalController.getTerminalSize).toHaveBeenCalled();
        });

        it('should return terminal capabilities', () => {
            const capabilities = tui.getCapabilities();
            expect(capabilities).toEqual({
                colors: 256,
                unicode: true,
                mouse: true,
                alternateScreen: true
            });
            expect(mockTerminalController.detectCapabilities).toHaveBeenCalled();
        });
    });

    describe('Resize handling', () => {
        it('should set up resize handler on start', async () => {
            await tui.start();
            expect(mockStdout.on).toHaveBeenCalledWith('resize', expect.any(Function));
        });

        it('should re-render on resize when running', async () => {
            const component = new MockComponent('test1');
            tui.addComponent(component);
            await tui.start();

            // Get the resize handler
            const resizeHandler = mockStdout.on.mock.calls.find(call => call[0] === 'resize')?.[1];
            expect(resizeHandler).toBeDefined();

            vi.clearAllMocks();
            resizeHandler();

            expect(mockTerminalController.clearScreen).toHaveBeenCalled();
            expect(component.renderCalled).toBe(true);
        });
    });

    describe('Input handling', () => {
        it('should set up input handler on start', async () => {
            await tui.start();
            expect(mockStdin.on).toHaveBeenCalledWith('data', expect.any(Function));
        });

        it('should handle Ctrl+C input', async () => {
            await tui.start();

            // Get the input handler
            const inputHandler = mockStdin.on.mock.calls.find(call => call[0] === 'data')?.[1];
            expect(inputHandler).toBeDefined();

            // Simulate Ctrl+C
            inputHandler(Buffer.from('\u0003'));

            expect(tui.isRunning()).toBe(false);
            expect(mockProcess.exit).toHaveBeenCalledWith(0);
        });

        it('should handle ESC key input', async () => {
            await tui.start();

            // Get the input handler
            const inputHandler = mockStdin.on.mock.calls.find(call => call[0] === 'data')?.[1];
            expect(inputHandler).toBeDefined();

            // Simulate ESC key
            inputHandler(Buffer.from('\u001b'));

            expect(tui.isRunning()).toBe(false);
            expect(mockProcess.exit).toHaveBeenCalledWith(0);
        });

        it('should route input to components', async () => {
            const component1 = new MockComponent('test1');
            const component2 = new MockComponent('test2');
            component1.handleInput = vi.fn(() => false);
            component2.handleInput = vi.fn(() => true);

            tui.addComponent(component1);
            tui.addComponent(component2);
            await tui.start();

            // Get the input handler
            const inputHandler = mockStdin.on.mock.calls.find(call => call[0] === 'data')?.[1];
            expect(inputHandler).toBeDefined();

            // Simulate regular input
            inputHandler(Buffer.from('a'));

            expect(component1.handleInput).toHaveBeenCalledWith('a');
            expect(component2.handleInput).toHaveBeenCalledWith('a');
        });

        it('should not handle input when not running', async () => {
            const component = new MockComponent('test1');
            component.handleInput = vi.fn(() => false);
            tui.addComponent(component);

            await tui.start();
            tui.stop();

            // Get the input handler
            const inputHandler = mockStdin.on.mock.calls.find(call => call[0] === 'data')?.[1];
            expect(inputHandler).toBeDefined();

            // Simulate input when stopped
            inputHandler(Buffer.from('a'));

            expect(component.handleInput).not.toHaveBeenCalled();
        });
    });
});