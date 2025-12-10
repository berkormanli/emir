import { Window } from './window';
import { Modal } from './modal';
import { Dialog } from './dialog';
import { BaseComponent } from './base-component';
import type { Position, Size, InputEvent } from './types';
import { Flex } from './flex';
import { Box } from './box';

/**
 * Window info for tracking
 */
interface ManagedWindow {
    window: Window;
    zIndex: number;
    isModal: boolean;
    isVisible: boolean;
    originalPosition?: Position;
    originalSize?: Size;
}

/**
 * Window manager options
 */
export interface WindowManagerOptions {
    maxWindows?: number;
    cascadeOffset?: Position;
    defaultWindowSize?: Size;
    defaultWindowPosition?: Position;
    allowMultipleModals?: boolean;
    taskbarHeight?: number;
    snapToGrid?: boolean;
    gridSize?: number;
}

/**
 * Window manager - manages window z-index, focus, and stacking
 */
export class WindowManager extends Box {
    private windows: Map<string, ManagedWindow>;
    private windowStack: string[];
    private focusedWindowId: string | null;
    private options: Required<WindowManagerOptions>;
    private nextZIndex: number;
    private cascadeCount: number;
    private minimizedWindows: Set<string>;
    private taskbar: WindowTaskbar | null;

    constructor(
        id: string,
        options: WindowManagerOptions = {},
        size: Size = { width: 80, height: 24 }
    ) {
        super(id, {
            border: false,
            overflow: 'hidden'
        });
        
        this.size = size;
        this.windows = new Map();
        this.windowStack = [];
        this.focusedWindowId = null;
        this.nextZIndex = 1000;
        this.cascadeCount = 0;
        this.minimizedWindows = new Set();
        
        this.options = {
            maxWindows: 50,
            cascadeOffset: { x: 2, y: 1 },
            defaultWindowSize: { width: 40, height: 15 },
            defaultWindowPosition: { x: 10, y: 3 },
            allowMultipleModals: false,
            taskbarHeight: 1,
            snapToGrid: false,
            gridSize: 1,
            ...options
        };
        
        // Create taskbar if specified
        this.taskbar = null;
        if (this.options.taskbarHeight > 0) {
            this.taskbar = new WindowTaskbar(
                `${id}-taskbar`,
                this,
                this.options.taskbarHeight
            );
            this.addChild(this.taskbar);
        }
    }

    /**
     * Add a window to the manager
     */
    addWindow(window: Window, position?: Position, size?: Size): void {
        const windowId = window.getId();
        
        // Check if already managed
        if (this.windows.has(windowId)) {
            this.focusWindow(windowId);
            return;
        }
        
        // Check max windows
        if (this.windows.size >= this.options.maxWindows) {
            throw new Error(`Maximum number of windows (${this.options.maxWindows}) reached`);
        }
        
        // Check for modal conflicts
        const isModal = window instanceof Modal || window instanceof Dialog;
        if (isModal && !this.options.allowMultipleModals) {
            const hasModal = Array.from(this.windows.values()).some(w => w.isModal);
            if (hasModal) {
                throw new Error('A modal window is already open');
            }
        }
        
        // Set position and size
        const windowPosition = position || this.getNextWindowPosition();
        const windowSize = size || window.getSize() || this.options.defaultWindowSize;
        
        window.setPosition(this.snapToGrid(windowPosition));
        window.setSize(windowSize);
        
        // Create managed window info
        const managedWindow: ManagedWindow = {
            window,
            zIndex: this.nextZIndex++,
            isModal,
            isVisible: true,
            originalPosition: windowPosition,
            originalSize: windowSize
        };
        
        // Add to manager
        this.windows.set(windowId, managedWindow);
        this.windowStack.push(windowId);
        this.addChild(window);
        
        // Set z-index
        this.updateWindowZIndex(windowId);
        
        // Focus the new window
        this.focusWindow(windowId);
        
        // Update taskbar
        if (this.taskbar) {
            this.taskbar.addWindow(window);
        }
        
        // Set up window event handlers
        this.setupWindowHandlers(window);
    }

    /**
     * Remove a window from the manager
     */
    removeWindow(windowId: string): void {
        const managedWindow = this.windows.get(windowId);
        if (!managedWindow) return;
        
        // Remove from collections
        this.windows.delete(windowId);
        this.windowStack = this.windowStack.filter(id => id !== windowId);
        this.minimizedWindows.delete(windowId);
        
        // Remove from component tree
        this.removeChild(managedWindow.window);
        
        // Update taskbar
        if (this.taskbar) {
            this.taskbar.removeWindow(managedWindow.window);
        }
        
        // Focus next window if this was focused
        if (this.focusedWindowId === windowId) {
            this.focusNextWindow();
        }
    }

    /**
     * Focus a window
     */
    focusWindow(windowId: string): void {
        const managedWindow = this.windows.get(windowId);
        if (!managedWindow) return;
        
        // Can't focus minimized windows
        if (this.minimizedWindows.has(windowId)) {
            this.restoreWindow(windowId);
            return;
        }
        
        // Blur current focused window
        if (this.focusedWindowId && this.focusedWindowId !== windowId) {
            const currentWindow = this.windows.get(this.focusedWindowId);
            if (currentWindow) {
                currentWindow.window.setFocused(false);
            }
        }
        
        // Focus new window
        managedWindow.window.setFocused(true);
        this.focusedWindowId = windowId;
        
        // Bring to front
        this.bringToFront(windowId);
        
        // Update taskbar
        if (this.taskbar) {
            this.taskbar.setActiveWindow(managedWindow.window);
        }
    }

    /**
     * Bring window to front
     */
    private bringToFront(windowId: string): void {
        const managedWindow = this.windows.get(windowId);
        if (!managedWindow) return;
        
        // Remove from stack and add to end
        this.windowStack = this.windowStack.filter(id => id !== windowId);
        this.windowStack.push(windowId);
        
        // Update z-indices
        this.updateAllWindowZIndices();
    }

    /**
     * Send window to back
     */
    sendToBack(windowId: string): void {
        const managedWindow = this.windows.get(windowId);
        if (!managedWindow || managedWindow.isModal) return;
        
        // Remove from stack and add to beginning
        this.windowStack = this.windowStack.filter(id => id !== windowId);
        this.windowStack.unshift(windowId);
        
        // Update z-indices
        this.updateAllWindowZIndices();
    }

    /**
     * Minimize a window
     */
    minimizeWindow(windowId: string): void {
        const managedWindow = this.windows.get(windowId);
        if (!managedWindow || managedWindow.isModal) return;
        
        // Store original position/size
        managedWindow.originalPosition = managedWindow.window.getPosition();
        managedWindow.originalSize = managedWindow.window.getSize();
        
        // Hide window
        managedWindow.isVisible = false;
        managedWindow.window.setState('minimized');
        this.minimizedWindows.add(windowId);
        
        // Focus next window
        if (this.focusedWindowId === windowId) {
            this.focusNextWindow();
        }
        
        this.markDirty();
    }

    /**
     * Restore a minimized window
     */
    restoreWindow(windowId: string): void {
        const managedWindow = this.windows.get(windowId);
        if (!managedWindow || !this.minimizedWindows.has(windowId)) return;
        
        // Restore position/size
        if (managedWindow.originalPosition) {
            managedWindow.window.setPosition(managedWindow.originalPosition);
        }
        if (managedWindow.originalSize) {
            managedWindow.window.setSize(managedWindow.originalSize);
        }
        
        // Show window
        managedWindow.isVisible = true;
        managedWindow.window.setState('normal');
        this.minimizedWindows.delete(windowId);
        
        // Focus window
        this.focusWindow(windowId);
        
        this.markDirty();
    }

    /**
     * Maximize a window
     */
    maximizeWindow(windowId: string): void {
        const managedWindow = this.windows.get(windowId);
        if (!managedWindow || managedWindow.isModal) return;
        
        const window = managedWindow.window;
        
        // Store original position/size if not maximized
        if (window.getState() !== 'maximized') {
            managedWindow.originalPosition = window.getPosition();
            managedWindow.originalSize = window.getSize();
        }
        
        // Set to full screen minus taskbar
        const maxHeight = this.size.height - this.options.taskbarHeight;
        window.setPosition({ x: 0, y: 0 });
        window.setSize({ width: this.size.width, height: maxHeight });
        window.setState('maximized');
        
        this.markDirty();
    }

    /**
     * Toggle window maximized state
     */
    toggleMaximize(windowId: string): void {
        const managedWindow = this.windows.get(windowId);
        if (!managedWindow) return;
        
        if (managedWindow.window.getState() === 'maximized') {
            // Restore
            if (managedWindow.originalPosition) {
                managedWindow.window.setPosition(managedWindow.originalPosition);
            }
            if (managedWindow.originalSize) {
                managedWindow.window.setSize(managedWindow.originalSize);
            }
            managedWindow.window.setState('normal');
        } else {
            this.maximizeWindow(windowId);
        }
    }

    /**
     * Close a window
     */
    closeWindow(windowId: string): void {
        const managedWindow = this.windows.get(windowId);
        if (!managedWindow) return;
        
        managedWindow.window.close();
        this.removeWindow(windowId);
    }

    /**
     * Close all windows
     */
    closeAllWindows(): void {
        const windowIds = Array.from(this.windows.keys());
        windowIds.forEach(id => this.closeWindow(id));
    }

    /**
     * Get next window position (cascading)
     */
    private getNextWindowPosition(): Position {
        const basePosition = this.options.defaultWindowPosition;
        const offset = this.options.cascadeOffset;
        
        const position = {
            x: basePosition.x + (offset.x * this.cascadeCount),
            y: basePosition.y + (offset.y * this.cascadeCount)
        };
        
        // Reset cascade if position would be off screen
        const maxX = this.size.width - this.options.defaultWindowSize.width;
        const maxY = this.size.height - this.options.defaultWindowSize.height - this.options.taskbarHeight;
        
        if (position.x > maxX || position.y > maxY) {
            this.cascadeCount = 0;
            return basePosition;
        }
        
        this.cascadeCount++;
        return position;
    }

    /**
     * Snap position to grid
     */
    private snapToGrid(position: Position): Position {
        if (!this.options.snapToGrid) return position;
        
        const gridSize = this.options.gridSize;
        return {
            x: Math.round(position.x / gridSize) * gridSize,
            y: Math.round(position.y / gridSize) * gridSize
        };
    }

    /**
     * Update window z-index
     */
    private updateWindowZIndex(windowId: string): void {
        const managedWindow = this.windows.get(windowId);
        if (!managedWindow) return;
        
        const index = this.windowStack.indexOf(windowId);
        if (index >= 0) {
            managedWindow.zIndex = this.nextZIndex + index;
        }
    }

    /**
     * Update all window z-indices
     */
    private updateAllWindowZIndices(): void {
        this.windowStack.forEach((windowId, index) => {
            const managedWindow = this.windows.get(windowId);
            if (managedWindow) {
                managedWindow.zIndex = this.nextZIndex + index;
            }
        });
        
        // Sort children by z-index
        this.sortChildrenByZIndex();
    }

    /**
     * Sort children by z-index
     */
    private sortChildrenByZIndex(): void {
        const children = this.getChildren();
        children.sort((a, b) => {
            const aWindow = Array.from(this.windows.values()).find(w => w.window === a);
            const bWindow = Array.from(this.windows.values()).find(w => w.window === b);
            
            const aZIndex = aWindow?.zIndex || 0;
            const bZIndex = bWindow?.zIndex || 0;
            
            return aZIndex - bZIndex;
        });
        
        // Reorder children
        this.children = children;
        this.markDirty();
    }

    /**
     * Focus next window in stack
     */
    private focusNextWindow(): void {
        const visibleWindows = this.windowStack.filter(id => 
            !this.minimizedWindows.has(id) && this.windows.has(id)
        );
        
        if (visibleWindows.length > 0) {
            this.focusWindow(visibleWindows[visibleWindows.length - 1]);
        } else {
            this.focusedWindowId = null;
        }
    }

    /**
     * Setup window event handlers
     */
    private setupWindowHandlers(window: Window): void {
        const originalClose = window.close.bind(window);
        window.close = () => {
            originalClose();
            this.removeWindow(window.getId());
        };
    }

    /**
     * Handle input events
     */
    handleInput(input: InputEvent): boolean {
        // Pass to focused window first
        if (this.focusedWindowId) {
            const managedWindow = this.windows.get(this.focusedWindowId);
            if (managedWindow && managedWindow.window.handleInput(input)) {
                return true;
            }
        }
        
        // Handle window manager shortcuts
        if (input.type === 'key' && input.alt) {
            switch (input.key) {
                case 'tab':
                    // Cycle through windows
                    this.cycleWindows();
                    return true;
                    
                case 'f4':
                    // Close focused window
                    if (this.focusedWindowId) {
                        this.closeWindow(this.focusedWindowId);
                        return true;
                    }
                    break;
            }
        }
        
        // Handle mouse input for window selection
        if (input.type === 'mouse' && input.button === 0) {
            const clickedWindow = this.getWindowAtPosition(input.position!);
            if (clickedWindow) {
                this.focusWindow(clickedWindow);
                return true;
            }
        }
        
        return super.handleInput(input);
    }

    /**
     * Cycle through windows
     */
    private cycleWindows(): void {
        const visibleWindows = this.windowStack.filter(id => 
            !this.minimizedWindows.has(id) && this.windows.has(id)
        );
        
        if (visibleWindows.length === 0) return;
        
        const currentIndex = this.focusedWindowId 
            ? visibleWindows.indexOf(this.focusedWindowId) 
            : -1;
        
        const nextIndex = (currentIndex + 1) % visibleWindows.length;
        this.focusWindow(visibleWindows[nextIndex]);
    }

    /**
     * Get window at position
     */
    private getWindowAtPosition(position: Position): string | null {
        // Check windows from top to bottom
        for (let i = this.windowStack.length - 1; i >= 0; i--) {
            const windowId = this.windowStack[i];
            const managedWindow = this.windows.get(windowId);
            
            if (!managedWindow || !managedWindow.isVisible) continue;
            
            const window = managedWindow.window;
            const windowPos = window.getPosition();
            const windowSize = window.getSize();
            
            if (position.x >= windowPos.x && 
                position.x < windowPos.x + windowSize.width &&
                position.y >= windowPos.y && 
                position.y < windowPos.y + windowSize.height) {
                return windowId;
            }
        }
        
        return null;
    }

    /**
     * Arrange windows
     */
    arrangeWindows(arrangement: 'cascade' | 'tile-horizontal' | 'tile-vertical'): void {
        const visibleWindows = this.windowStack
            .filter(id => !this.minimizedWindows.has(id) && this.windows.has(id))
            .map(id => this.windows.get(id)!);
        
        if (visibleWindows.length === 0) return;
        
        switch (arrangement) {
            case 'cascade':
                this.arrangeCascade(visibleWindows);
                break;
            case 'tile-horizontal':
                this.arrangeTileHorizontal(visibleWindows);
                break;
            case 'tile-vertical':
                this.arrangeTileVertical(visibleWindows);
                break;
        }
        
        this.markDirty();
    }

    /**
     * Arrange windows in cascade
     */
    private arrangeCascade(windows: ManagedWindow[]): void {
        const offset = this.options.cascadeOffset;
        const basePosition = this.options.defaultWindowPosition;
        
        windows.forEach((managedWindow, index) => {
            const position = {
                x: basePosition.x + (offset.x * index),
                y: basePosition.y + (offset.y * index)
            };
            
            managedWindow.window.setPosition(this.snapToGrid(position));
            managedWindow.window.setSize(this.options.defaultWindowSize);
            managedWindow.window.setState('normal');
        });
    }

    /**
     * Arrange windows in horizontal tiles
     */
    private arrangeTileHorizontal(windows: ManagedWindow[]): void {
        const count = windows.length;
        const width = Math.floor(this.size.width / count);
        const height = this.size.height - this.options.taskbarHeight;
        
        windows.forEach((managedWindow, index) => {
            managedWindow.window.setPosition({ x: index * width, y: 0 });
            managedWindow.window.setSize({ width, height });
            managedWindow.window.setState('normal');
        });
    }

    /**
     * Arrange windows in vertical tiles
     */
    private arrangeTileVertical(windows: ManagedWindow[]): void {
        const count = windows.length;
        const width = this.size.width;
        const totalHeight = this.size.height - this.options.taskbarHeight;
        const height = Math.floor(totalHeight / count);
        
        windows.forEach((managedWindow, index) => {
            managedWindow.window.setPosition({ x: 0, y: index * height });
            managedWindow.window.setSize({ width, height });
            managedWindow.window.setState('normal');
        });
    }

    /**
     * Get active windows
     */
    getWindows(): Window[] {
        return Array.from(this.windows.values()).map(w => w.window);
    }

    /**
     * Get focused window
     */
    getFocusedWindow(): Window | null {
        if (!this.focusedWindowId) return null;
        const managedWindow = this.windows.get(this.focusedWindowId);
        return managedWindow?.window || null;
    }
}

/**
 * Window taskbar component
 */
class WindowTaskbar extends Flex {
    private manager: WindowManager;
    private windowButtons: Map<string, TaskbarButton>;

    constructor(id: string, manager: WindowManager, height: number = 1) {
        super(id, {
            direction: 'row',
            justifyContent: 'flex-start',
            gap: 1,
            padding: [0, 1],
            border: 'single',
            borderTop: true,
            borderBottom: false,
            borderLeft: false,
            borderRight: false
        });
        
        this.manager = manager;
        this.windowButtons = new Map();
        this.size = { width: manager.getSize().width, height };
        this.position = { x: 0, y: manager.getSize().height - height };
    }

    addWindow(window: Window): void {
        const button = new TaskbarButton(
            `${this.id}-btn-${window.getId()}`,
            window,
            () => this.manager.focusWindow(window.getId())
        );
        
        this.windowButtons.set(window.getId(), button);
        this.addFlexItem({ component: button, flexGrow: 0 });
    }

    removeWindow(window: Window): void {
        const button = this.windowButtons.get(window.getId());
        if (button) {
            this.removeChild(button);
            this.windowButtons.delete(window.getId());
        }
    }

    setActiveWindow(window: Window): void {
        this.windowButtons.forEach((button, windowId) => {
            button.setActive(windowId === window.getId());
        });
    }
}

/**
 * Taskbar button component
 */
class TaskbarButton extends BaseComponent {
    private window: Window;
    private active: boolean;
    private onClick: () => void;

    constructor(id: string, window: Window, onClick: () => void) {
        super(id);
        this.window = window;
        this.active = false;
        this.onClick = onClick;
        
        const title = window.getTitle() || 'Window';
        this.size = { width: Math.min(title.length + 2, 15), height: 1 };
    }

    setActive(active: boolean): void {
        this.active = active;
        this.markDirty();
    }

    handleInput(input: InputEvent): boolean {
        if (input.type === 'mouse' && input.button === 0) {
            this.onClick();
            return true;
        }
        return false;
    }

    render(): string {
        const title = this.window.getTitle() || 'Window';
        const displayTitle = title.length > 13 ? title.substring(0, 10) + '...' : title;
        
        if (this.active) {
            return `[${displayTitle}]`;
        } else {
            return ` ${displayTitle} `;
        }
    }
}
