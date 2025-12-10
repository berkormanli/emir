import { Window } from './window.js';
import { Modal } from './modal.js';
import { Dialog } from './dialog.js';
import { BaseComponent } from './base-component.js';
import type { Position, Size, InputEvent } from './types.js';
import { Box } from './box.js';
import { AdvancedContainer } from './advanced-container.js';

/**
 * Enhanced window info with additional properties
 */
interface EnhancedManagedWindow {
    window: Window;
    zIndex: number;
    isModal: boolean;
    isVisible: boolean;
    originalPosition?: Position;
    originalSize?: Size;
    isSnapped?: boolean;
    snapPosition?: 'left' | 'right' | 'top' | 'bottom' | 'topleft' | 'topright' | 'bottomleft' | 'bottomright';
    isMaximized?: boolean;
}

/**
 * Snap zones configuration
 */
export interface SnapZones {
    enabled: boolean;
    threshold: number; // Distance from edge to trigger snap
    snapToEdges: boolean;
    snapToCorners: boolean;
    snapToOtherWindows: boolean;
}

/**
 * Tiling layout options
 */
export interface TilingLayout {
    type: 'grid' | 'vertical' | 'horizontal' | 'master-pane' | 'custom';
    gridCols?: number;
    gridRows?: number;
    masterPaneRatio?: number; // For master-pane layout
    customLayout?: (windows: EnhancedManagedWindow[], bounds: Size) => Array<{window: Window, pos: Position, size: Size}>;
}

/**
 * Window snap regions
 */
export type SnapRegion = 'left' | 'right' | 'top' | 'bottom' | 'topleft' | 'topright' | 'bottomleft' | 'bottomright' | 'center' | 'maximize';

/**
 * Enhanced window manager with snapping, tiling, and advanced maximize
 */
export class EnhancedWindowManager extends Box {
    private windows: Map<string, EnhancedManagedWindow>;
    private windowStack: string[];
    private focusedWindowId: string | null;
    private nextZIndex: number;
    private minimizedWindows: Set<string>;
    private snapZones: SnapZones;
    private dragState: {
        isDragging: boolean;
        windowId: string | null;
        initialPos: Position;
        initialMousePos: Position;
    };
    private terminalSize: Size;
    private tilingLayouts: Map<string, TilingLayout>;

    constructor(
        id: string,
        options: {
            snapZones?: Partial<SnapZones>;
            enableTiling?: boolean;
        } = {},
        size: Size = { width: 80, height: 24 }
    ) {
        super(id, {
            border: false,
            overflow: 'hidden'
        });

        this.size = size;
        this.terminalSize = size;
        this.windows = new Map();
        this.windowStack = [];
        this.focusedWindowId = null;
        this.nextZIndex = 1000;
        this.minimizedWindows = new Set();

        // Initialize snap zones
        this.snapZones = {
            enabled: true,
            threshold: 20,
            snapToEdges: true,
            snapToCorners: true,
            snapToOtherWindows: true,
            ...options.snapZones
        };

        // Initialize drag state
        this.dragState = {
            isDragging: false,
            windowId: null,
            initialPos: { x: 0, y: 0 },
            initialMousePos: { x: 0, y: 0 }
        };

        // Initialize tiling layouts
        this.tilingLayouts = new Map();
        this.initializeDefaultLayouts();
    }

    /**
     * Initialize default tiling layouts
     */
    private initializeDefaultLayouts(): void {
        // Grid layout
        this.tilingLayouts.set('grid-2x2', {
            type: 'grid',
            gridCols: 2,
            gridRows: 2
        });

        this.tilingLayouts.set('grid-3x3', {
            type: 'grid',
            gridCols: 3,
            gridRows: 3
        });

        // Master pane layout
        this.tilingLayouts.set('master-pane', {
            type: 'master-pane',
            masterPaneRatio: 0.6
        });

        // Vertical split
        this.tilingLayouts.set('vertical', {
            type: 'vertical'
        });

        // Horizontal split
        this.tilingLayouts.set('horizontal', {
            type: 'horizontal'
        });
    }

    /**
     * Add a window with enhanced features
     */
    addWindow(window: Window, position?: Position, size?: Size): void {
        const windowId = window.getId();

        // Check if already managed
        if (this.windows.has(windowId)) {
            this.focusWindow(windowId);
            return;
        }

        // Set initial position and size
        const windowPosition = position || this.calculateInitialPosition();
        const windowSize = size || window.getSize() || { width: 40, height: 15 };

        window.setPosition(windowPosition);
        window.setSize(windowSize);

        // Create enhanced managed window
        const managedWindow: EnhancedManagedWindow = {
            window,
            zIndex: this.nextZIndex++,
            isModal: window instanceof Modal || window instanceof Dialog,
            isVisible: true,
            originalPosition: windowPosition,
            originalSize: windowSize,
            isSnapped: false,
            isMaximized: false
        };

        this.windows.set(windowId, managedWindow);
        this.windowStack.push(windowId);
        this.addChild(window);

        // Focus the new window
        this.focusWindow(windowId);

        // Set up enhanced event handlers
        this.setupEnhancedHandlers(window);
    }

    /**
     * Calculate initial window position avoiding overlap
     */
    private calculateInitialPosition(): Position {
        const offset = { x: 30, y: 10 };
        let position = { x: 10, y: 3 };

        // Try to find a non-overlapping position
        for (let i = 0; i < 10; i++) {
            const testPos = {
                x: position.x + (offset.x * i) % (this.terminalSize.width - 50),
                y: position.y + (offset.y * Math.floor(i / 3)) % (this.terminalSize.height - 20)
            };

            if (!this.isPositionOccupied(testPos, { width: 40, height: 15 })) {
                return testPos;
            }
        }

        return position;
    }

    /**
     * Check if position is occupied by another window
     */
    private isPositionOccupied(position: Position, size: Size, excludeWindowId?: string): boolean {
        for (const [windowId, managedWindow] of this.windows) {
            if (windowId === excludeWindowId || !managedWindow.isVisible) continue;

            const otherPos = managedWindow.window.getPosition();
            const otherSize = managedWindow.window.getSize();

            if (!(position.x + size.width <= otherPos.x ||
                  position.x >= otherPos.x + otherSize.width ||
                  position.y + size.height <= otherPos.y ||
                  position.y >= otherPos.y + otherSize.height)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Maximize window to full terminal size
     */
    maximizeWindow(windowId: string, useRealTerminalSize: boolean = true): void {
        const managedWindow = this.windows.get(windowId);
        if (!managedWindow || managedWindow.isModal) return;

        const window = managedWindow.window;

        // Store original state if not already maximized
        if (!managedWindow.isMaximized) {
            managedWindow.originalPosition = window.getPosition();
            managedWindow.originalSize = window.getSize();
        }

        // Calculate maximize bounds
        let bounds: Size;
        let pos: Position = { x: 0, y: 0 };

        if (useRealTerminalSize) {
            // Use actual terminal size
            bounds = { ...this.terminalSize };
            pos = { x: 0, y: 0 };
        } else {
            // Use container bounds
            bounds = { ...this.size };
            pos = { x: 0, y: 0 };
        }

        window.setPosition(pos);
        window.setSize(bounds);
        window.setState('maximized');
        managedWindow.isMaximized = true;
        managedWindow.isSnapped = false;

        this.markDirty();
    }

    /**
     * Restore window from maximized state
     */
    restoreWindow(windowId: string): void {
        const managedWindow = this.windows.get(windowId);
        if (!managedWindow || (!managedWindow.isMaximized && !this.minimizedWindows.has(windowId))) return;

        // Handle minimization
        if (this.minimizedWindows.has(windowId)) {
            this.restoreFromMinimized(windowId);
        } else if (managedWindow.isMaximized) {
            // Restore from maximized
            if (managedWindow.originalPosition) {
                managedWindow.window.setPosition(managedWindow.originalPosition);
            }
            if (managedWindow.originalSize) {
                managedWindow.window.setSize(managedWindow.originalSize);
            }

            managedWindow.window.setState('normal');
            managedWindow.isMaximized = false;
        }

        this.focusWindow(windowId);
        this.markDirty();
    }

    /**
     * Restore from minimized state
     */
    private restoreFromMinimized(windowId: string): void {
        const managedWindow = this.windows.get(windowId);
        if (!managedWindow) return;

        if (managedWindow.originalPosition) {
            managedWindow.window.setPosition(managedWindow.originalPosition);
        }
        if (managedWindow.originalSize) {
            managedWindow.window.setSize(managedWindow.originalSize);
        }

        managedWindow.isVisible = true;
        managedWindow.window.setState('normal');
        this.minimizedWindows.delete(windowId);
    }

    /**
     * Snap window to a region
     */
    snapWindow(windowId: string, region: SnapRegion): void {
        const managedWindow = this.windows.get(windowId);
        if (!managedWindow || managedWindow.isModal) return;

        const window = managedWindow.window;
        const bounds = { ...this.terminalSize };

        // Store original size if first snap
        if (!managedWindow.originalSize) {
            managedWindow.originalSize = window.getSize();
        }

        let newPos: Position;
        let newSize: Size;

        switch (region) {
            case 'left':
                newPos = { x: 0, y: 0 };
                newSize = { width: Math.floor(bounds.width / 2), height: bounds.height };
                managedWindow.snapPosition = 'left';
                break;

            case 'right':
                newPos = { x: Math.floor(bounds.width / 2), y: 0 };
                newSize = { width: Math.ceil(bounds.width / 2), height: bounds.height };
                managedWindow.snapPosition = 'right';
                break;

            case 'top':
                newPos = { x: 0, y: 0 };
                newSize = { width: bounds.width, height: Math.floor(bounds.height / 2) };
                managedWindow.snapPosition = 'top';
                break;

            case 'bottom':
                newPos = { x: 0, y: Math.floor(bounds.height / 2) };
                newSize = { width: bounds.width, height: Math.ceil(bounds.height / 2) };
                managedWindow.snapPosition = 'bottom';
                break;

            case 'topleft':
                newPos = { x: 0, y: 0 };
                newSize = { width: Math.floor(bounds.width / 2), height: Math.floor(bounds.height / 2) };
                managedWindow.snapPosition = 'topleft';
                break;

            case 'topright':
                newPos = { x: Math.floor(bounds.width / 2), y: 0 };
                newSize = { width: Math.ceil(bounds.width / 2), height: Math.floor(bounds.height / 2) };
                managedWindow.snapPosition = 'topright';
                break;

            case 'bottomleft':
                newPos = { x: 0, y: Math.floor(bounds.height / 2) };
                newSize = { width: Math.floor(bounds.width / 2), height: Math.ceil(bounds.height / 2) };
                managedWindow.snapPosition = 'bottomleft';
                break;

            case 'bottomright':
                newPos = { x: Math.floor(bounds.width / 2), y: Math.floor(bounds.height / 2) };
                newSize = { width: Math.ceil(bounds.width / 2), height: Math.ceil(bounds.height / 2) };
                managedWindow.snapPosition = 'bottomright';
                break;

            case 'maximize':
                this.maximizeWindow(windowId, true);
                return;

            default:
                return;
        }

        window.setPosition(newPos);
        window.setSize(newSize);
        window.setState('normal');

        managedWindow.isSnapped = true;
        managedWindow.isMaximized = false;
        this.markDirty();
    }

    /**
     * Unsnap window
     */
    unsnapWindow(windowId: string): void {
        const managedWindow = this.windows.get(windowId);
        if (!managedWindow || !managedWindow.isSnapped) return;

        const window = managedWindow.window;

        // Restore original size, keep current position
        if (managedWindow.originalSize) {
            window.setSize(managedWindow.originalSize);
        }

        window.setState('normal');
        managedWindow.isSnapped = false;
        managedWindow.snapPosition = undefined;

        this.markDirty();
    }

    /**
     * Apply tiling layout to windows
     */
    applyTilingLayout(layoutName: string): void {
        const layout = this.tilingLayouts.get(layoutName);
        if (!layout) return;

        const visibleWindows = Array.from(this.windows.values())
            .filter(w => w.isVisible && !w.isModal);

        if (visibleWindows.length === 0) return;

        // Calculate bounds (terminal size)
        const bounds = { ...this.terminalSize };

        // Apply layout
        if (layout.type === 'custom' && layout.customLayout) {
            const arranged = layout.customLayout(visibleWindows, bounds);
            arranged.forEach(({ window, pos, size }) => {
                window.setPosition(pos);
                window.setSize(size);
                window.setState('normal');

                const managed = this.windows.get(window.getId());
                if (managed) {
                    managed.isSnapped = false;
                    managed.isMaximized = false;
                }
            });
        } else {
            this.applyStandardLayout(layout, visibleWindows, bounds);
        }

        this.markDirty();
    }

    /**
     * Apply standard predefined layouts
     */
    private applyStandardLayout(layout: TilingLayout, windows: EnhancedManagedWindow[], bounds: Size): void {
        const count = windows.length;

        switch (layout.type) {
            case 'grid':
                this.applyGridLayout(windows, bounds, layout.gridCols || 2, layout.gridRows || Math.ceil(count / 2));
                break;

            case 'vertical':
                this.applyVerticalLayout(windows, bounds);
                break;

            case 'horizontal':
                this.applyHorizontalLayout(windows, bounds);
                break;

            case 'master-pane':
                this.applyMasterPaneLayout(windows, bounds, layout.masterPaneRatio || 0.6);
                break;
        }
    }

    /**
     * Apply grid layout
     */
    private applyGridLayout(windows: EnhancedManagedWindow[], bounds: Size, cols: number, rows: number): void {
        const cellWidth = Math.floor(bounds.width / cols);
        const cellHeight = Math.floor(bounds.height / rows);

        windows.forEach((managedWindow, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);

            if (row >= rows) return;

            const pos = {
                x: col * cellWidth,
                y: row * cellHeight
            };

            const size = {
                width: col === cols - 1 ? bounds.width - (col * cellWidth) : cellWidth,
                height: row === rows - 1 ? bounds.height - (row * cellHeight) : cellHeight
            };

            managedWindow.window.setPosition(pos);
            managedWindow.window.setSize(size);
            managedWindow.window.setState('normal');
            managedWindow.isSnapped = false;
            managedWindow.isMaximized = false;
        });
    }

    /**
     * Apply vertical layout
     */
    private applyVerticalLayout(windows: EnhancedManagedWindow[], bounds: Size): void {
        const count = windows.length;
        const windowHeight = Math.floor(bounds.height / count);

        windows.forEach((managedWindow, index) => {
            const pos = {
                x: 0,
                y: index * windowHeight
            };

            const size = {
                width: bounds.width,
                height: index === count - 1 ? bounds.height - (index * windowHeight) : windowHeight
            };

            managedWindow.window.setPosition(pos);
            managedWindow.window.setSize(size);
            managedWindow.window.setState('normal');
            managedWindow.isSnapped = false;
            managedWindow.isMaximized = false;
        });
    }

    /**
     * Apply horizontal layout
     */
    private applyHorizontalLayout(windows: EnhancedManagedWindow[], bounds: Size): void {
        const count = windows.length;
        const windowWidth = Math.floor(bounds.width / count);

        windows.forEach((managedWindow, index) => {
            const pos = {
                x: index * windowWidth,
                y: 0
            };

            const size = {
                width: index === count - 1 ? bounds.width - (index * windowWidth) : windowWidth,
                height: bounds.height
            };

            managedWindow.window.setPosition(pos);
            managedWindow.window.setSize(size);
            managedWindow.window.setState('normal');
            managedWindow.isSnapped = false;
            managedWindow.isMaximized = false;
        });
    }

    /**
     * Apply master-pane layout
     */
    private applyMasterPaneLayout(windows: EnhancedManagedWindow[], bounds: Size, masterRatio: number): void {
        if (windows.length === 0) return;

        const masterWidth = Math.floor(bounds.width * masterRatio);
        const slaveWidth = bounds.width - masterWidth;

        // Master window (first window)
        const master = windows[0];
        master.window.setPosition({ x: 0, y: 0 });
        master.window.setSize({ width: masterWidth, height: bounds.height });
        master.window.setState('normal');
        master.isSnapped = false;
        master.isMaximized = false;

        // Slave windows (remaining windows)
        if (windows.length > 1) {
            const slaveHeight = Math.floor(bounds.height / (windows.length - 1));
            const slaves = windows.slice(1);

            slaves.forEach((slave, index) => {
                const pos = {
                    x: masterWidth,
                    y: index * slaveHeight
                };

                const size = {
                    width: slaveWidth,
                    height: index === slaves.length - 1 ? bounds.height - (index * slaveHeight) : slaveHeight
                };

                slave.window.setPosition(pos);
                slave.window.setSize(size);
                slave.window.setState('normal');
                slave.isSnapped = false;
                slave.isMaximized = false;
            });
        }
    }

    /**
     * Handle window dragging
     */
    private handleWindowDrag(windowId: string, mousePos: Position): void {
        const managedWindow = this.windows.get(windowId);
        if (!managedWindow) return;

        const window = managedWindow.window;
        const initialPos = this.dragState.initialPos;
        const initialMousePos = this.dragState.initialMousePos;

        // Calculate new position
        const deltaX = mousePos.x - initialMousePos.x;
        const deltaY = mousePos.y - initialMousePos.y;

        let newPos = {
            x: initialPos.x + deltaX,
            y: initialPos.y + deltaY
        };

        // Check for snap zones
        if (this.snapZones.enabled) {
            const snapRegion = this.detectSnapRegion(mousePos);
            if (snapRegion) {
                this.snapWindow(windowId, snapRegion);
                this.endDrag();
                return;
            }
        }

        // Constrain to bounds
        newPos = this.constrainPosition(newPos, window.getSize());

        window.setPosition(newPos);

        // Unsnap if was previously snapped
        if (managedWindow.isSnapped) {
            this.unsnapWindow(windowId);
        }
    }

    /**
     * Detect snap region based on mouse position
     */
    private detectSnapRegion(mousePos: Position): SnapRegion | null {
        const bounds = { ...this.terminalSize };
        const threshold = this.snapZones.threshold;

        // Check corners first (smaller regions)
        const cornerThreshold = threshold / 2;

        if (mousePos.x < cornerThreshold && mousePos.y < cornerThreshold) {
            return 'topleft';
        }
        if (mousePos.x > bounds.width - cornerThreshold && mousePos.y < cornerThreshold) {
            return 'topright';
        }
        if (mousePos.x < cornerThreshold && mousePos.y > bounds.height - cornerThreshold) {
            return 'bottomleft';
        }
        if (mousePos.x > bounds.width - cornerThreshold && mousePos.y > bounds.height - cornerThreshold) {
            return 'bottomright';
        }

        // Check edges
        if (mousePos.x < threshold && mousePos.y > cornerThreshold && mousePos.y < bounds.height - cornerThreshold) {
            return 'left';
        }
        if (mousePos.x > bounds.width - threshold && mousePos.y > cornerThreshold && mousePos.y < bounds.height - cornerThreshold) {
            return 'right';
        }
        if (mousePos.y < threshold && mousePos.x > cornerThreshold && mousePos.x < bounds.width - cornerThreshold) {
            return 'top';
        }
        if (mousePos.y > bounds.height - threshold && mousePos.x > cornerThreshold && mousePos.x < bounds.width - cornerThreshold) {
            return 'bottom';
        }

        // Check for maximize region (top center)
        if (mousePos.y < threshold && mousePos.x > bounds.width / 3 && mousePos.x < (bounds.width * 2) / 3) {
            return 'maximize';
        }

        return null;
    }

    /**
     * Constrain position to terminal bounds
     */
    private constrainPosition(position: Position, size: Size): Position {
        return {
            x: Math.max(0, Math.min(position.x, this.terminalSize.width - size.width)),
            y: Math.max(0, Math.min(position.y, this.terminalSize.height - size.height))
        };
    }

    /**
     * Start dragging a window
     */
    private startDrag(windowId: string, mousePos: Position): void {
        const managedWindow = this.windows.get(windowId);
        if (!managedWindow || managedWindow.isModal) return;

        this.dragState = {
            isDragging: true,
            windowId,
            initialPos: managedWindow.window.getPosition(),
            initialMousePos: mousePos
        };
    }

    /**
     * End dragging
     */
    private endDrag(): void {
        this.dragState = {
            isDragging: false,
            windowId: null,
            initialPos: { x: 0, y: 0 },
            initialMousePos: { x: 0, y: 0 }
        };
    }

    /**
     * Setup enhanced event handlers
     */
    private setupEnhancedHandlers(window: Window): void {
        // Override window event handlers for dragging
        window.handleInput = (input: InputEvent): boolean => {
            // Handle mouse events for dragging
            if (input.type === 'mouse') {
                const mousePos = input.position!;

                if (input.button === 0 && input.pressed) {
                    // Mouse down - start drag if in title bar
                    if (this.isInTitleBar(window, mousePos)) {
                        this.startDrag(window.getId(), mousePos);
                        return true;
                    }
                } else if (input.button === 0 && !input.pressed) {
                    // Mouse up - end drag
                    if (this.dragState.windowId === window.getId()) {
                        this.endDrag();
                        return true;
                    }
                }
            }

            // Handle original input
            return window.handleInput(input);
        };
    }

    /**
     * Check if mouse position is in window title bar
     */
    private isInTitleBar(window: Window, pos: Position): boolean {
        const windowPos = window.getPosition();
        const windowSize = window.getSize();
        const titleBarHeight = 1;

        return pos.x >= windowPos.x &&
               pos.x < windowPos.x + windowSize.width &&
               pos.y >= windowPos.y &&
               pos.y < windowPos.y + titleBarHeight;
    }

    /**
     * Update terminal size
     */
    updateTerminalSize(size: Size): void {
        this.terminalSize = size;
        this.size = size;

        // Reposition windows if they're outside new bounds
        for (const [windowId, managedWindow] of this.windows) {
            const window = managedWindow.window;
            const pos = window.getPosition();
            const windowSize = window.getSize();

            // Constrain to new bounds
            const newPos = this.constrainPosition(pos, windowSize);
            if (newPos.x !== pos.x || newPos.y !== pos.y) {
                window.setPosition(newPos);
            }

            // Resize snapped/maximized windows
            if (managedWindow.isMaximized) {
                this.maximizeWindow(windowId, true);
            } else if (managedWindow.isSnapped && managedWindow.snapPosition) {
                this.snapWindow(windowId, managedWindow.snapPosition as SnapRegion);
            }
        }
    }

    /**
     * Handle input with enhanced features
     */
    handleInput(input: InputEvent): boolean {
        // Handle window dragging
        if (this.dragState.isDragging && input.type === 'mouse' && input.position) {
            this.handleWindowDrag(this.dragState.windowId!, input.position);
            return true;
        }

        // Handle keyboard shortcuts
        if (input.type === 'key') {
            // Alt + arrow keys for window snapping
            if (input.alt) {
                if (this.focusedWindowId) {
                    switch (input.key) {
                        case 'left':
                            this.snapWindow(this.focusedWindowId, 'left');
                            return true;
                        case 'right':
                            this.snapWindow(this.focusedWindowId, 'right');
                            return true;
                        case 'up':
                            this.snapWindow(this.focusedWindowId, 'maximize');
                            return true;
                        case 'down':
                            this.restoreWindow(this.focusedWindowId);
                            return true;
                    }
                }

                // Alt + number keys for tiling layouts
                if (input.key >= '1' && input.key <= '5') {
                    const layouts = ['grid-2x2', 'grid-3x3', 'master-pane', 'vertical', 'horizontal'];
                    const layoutIndex = parseInt(input.key) - 1;
                    if (layoutIndex < layouts.length) {
                        this.applyTilingLayout(layouts[layoutIndex]);
                        return true;
                    }
                }
            }
        }

        // Handle focus switching
        if (input.type === 'mouse' && input.button === 0 && input.pressed && input.position) {
            const clickedWindow = this.getWindowAtPosition(input.position);
            if (clickedWindow && clickedWindow !== this.focusedWindowId) {
                this.focusWindow(clickedWindow);
                return true;
            }
        }

        return super.handleInput(input);
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
     * Focus window
     */
    focusWindow(windowId: string): void {
        const managedWindow = this.windows.get(windowId);
        if (!managedWindow) return;

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
    }

    /**
     * Bring window to front
     */
    private bringToFront(windowId: string): void {
        const index = this.windowStack.indexOf(windowId);
        if (index >= 0) {
            this.windowStack.splice(index, 1);
            this.windowStack.push(windowId);
        }

        // Update z-indices
        this.windowStack.forEach((id, idx) => {
            const managed = this.windows.get(id);
            if (managed) {
                managed.zIndex = this.nextZIndex + idx;
            }
        });
    }

    /**
     * Render with overlay for snap zones
     */
    render(): string {
        const output: string[] = [];

        // Clear background
        for (let y = 0; y < this.size.height; y++) {
            output.push(' '.repeat(this.size.width));
        }

        // Render windows in z-order
        this.windowStack.forEach(windowId => {
            const managedWindow = this.windows.get(windowId);
            if (!managedWindow || !managedWindow.isVisible) return;

            const window = managedWindow.window;
            const windowContent = window.render();
            if (!windowContent) return;

            const windowPos = window.getPosition();
            const windowSize = window.getSize();

            // Render window to buffer
            const lines = windowContent.split('\n');
            for (let i = 0; i < lines.length && windowPos.y + i < this.size.height; i++) {
                if (windowPos.y + i >= 0) {
                    const line = lines[i];
                    const lineLength = Math.min(line.length, this.size.width - windowPos.x);

                    if (windowPos.x >= 0 && windowPos.x < this.size.width) {
                        output[windowPos.y + i] =
                            output[windowPos.y + i].substring(0, windowPos.x) +
                            line.substring(0, lineLength) +
                            output[windowPos.y + i].substring(windowPos.x + lineLength);
                    }
                }
            }
        });

        // Show snap zone preview if dragging
        if (this.dragState.isDragging && this.snapZones.enabled && this.dragState.initialMousePos) {
            const snapRegion = this.detectSnapRegion(this.dragState.initialMousePos);
            if (snapRegion) {
                this.renderSnapPreview(output, snapRegion);
            }
        }

        return output.join('\n');
    }

    /**
     * Render snap zone preview
     */
    private renderSnapPreview(output: string[], region: SnapRegion): void {
        const bounds = { ...this.terminalSize };

        let previewArea: { x: number; y: number; width: number; height: number };

        switch (region) {
            case 'left':
                previewArea = { x: 0, y: 0, width: Math.floor(bounds.width / 2), height: bounds.height };
                break;
            case 'right':
                previewArea = { x: Math.floor(bounds.width / 2), y: 0, width: Math.ceil(bounds.width / 2), height: bounds.height };
                break;
            case 'top':
                previewArea = { x: 0, y: 0, width: bounds.width, height: Math.floor(bounds.height / 2) };
                break;
            case 'bottom':
                previewArea = { x: 0, y: Math.floor(bounds.height / 2), width: bounds.width, height: Math.ceil(bounds.height / 2) };
                break;
            case 'maximize':
                previewArea = { x: 0, y: 0, width: bounds.width, height: bounds.height };
                break;
            default:
                return;
        }

        // Draw preview border
        const borderChar = '░';
        for (let y = previewArea.y; y < previewArea.y + previewArea.height; y++) {
            if (y >= 0 && y < output.length) {
                const line = output[y];
                let newLine = line;

                for (let x = previewArea.x; x < previewArea.x + previewArea.width; x++) {
                    if (x >= 0 && x < line.length) {
                        if (y === previewArea.y || y === previewArea.y + previewArea.height - 1 ||
                            x === previewArea.x || x === previewArea.x + previewArea.width - 1) {
                            newLine = newLine.substring(0, x) + borderChar + newLine.substring(x + 1);
                        }
                    }
                }

                output[y] = newLine;
            }
        }
    }
}