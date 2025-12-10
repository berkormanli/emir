import { Box, BoxOptions } from './box';
import { BaseComponent } from './base-component';
import { Position, Size, InputEvent } from './types';
import { ThemeManager } from './theme';
import { AnsiUtils } from './ansi-utils';

/**
 * Window state
 */
export type WindowState = 'normal' | 'minimized' | 'maximized' | 'closed';

/**
 * Window options
 */
export interface WindowOptions extends BoxOptions {
    title: string;
    closable?: boolean;
    minimizable?: boolean;
    maximizable?: boolean;
    resizable?: boolean;
    draggable?: boolean;
    modal?: boolean;
    alwaysOnTop?: boolean;
    minWidth?: number;
    minHeight?: number;
    maxWidth?: number;
    maxHeight?: number;
    onClose?: () => void;
    onMinimize?: () => void;
    onMaximize?: () => void;
    onRestore?: () => void;
    onFocus?: () => void;
    onBlur?: () => void;
    onMove?: (position: Position) => void;
    onResize?: (size: Size) => void;
}

/**
 * Window component - a movable, resizable container
 */
export class Window extends Box {
    protected windowOptions: WindowOptions;
    protected windowState: WindowState;
    protected zIndex: number;
    protected isDragging: boolean;
    protected isResizing: boolean;
    protected dragStart: Position | null;
    protected originalPosition: Position;
    protected originalSize: Size;
    protected savedPosition: Position | null;
    protected savedSize: Size | null;
    private titleBarHeight: number = 1;

    constructor(
        id: string,
        options: WindowOptions,
        position?: Position,
        size?: Size
    ) {
        // Ensure window has a border and title
        const boxOptions: BoxOptions = {
            ...options,
            border: true,
            borderStyle: options.borderStyle || 'single'
        };
        
        super(id, boxOptions, position, size);
        
        this.windowOptions = {
            closable: true,
            minimizable: true,
            maximizable: true,
            resizable: true,
            draggable: true,
            modal: false,
            alwaysOnTop: false,
            minWidth: 20,
            minHeight: 5,
            ...options
        };
        
        this.windowState = 'normal';
        this.zIndex = 0;
        this.isDragging = false;
        this.isResizing = false;
        this.dragStart = null;
        this.originalPosition = { ...this.position };
        this.originalSize = { ...this.size };
        this.savedPosition = null;
        this.savedSize = null;
    }

    /**
     * Get window state
     */
    getWindowState(): WindowState {
        return this.windowState;
    }

    /**
     * Set window state
     */
    setWindowState(state: WindowState): void {
        const previousState = this.windowState;
        this.windowState = state;
        
        switch (state) {
            case 'minimized':
                this.minimize();
                break;
            case 'maximized':
                this.maximize();
                break;
            case 'normal':
                this.restore();
                break;
            case 'closed':
                this.close();
                break;
        }
    }

    /**
     * Close the window
     */
    close(): void {
        if (this.windowOptions.closable) {
            this.windowState = 'closed';
            this.setVisible(false);
            if (this.windowOptions.onClose) {
                this.windowOptions.onClose();
            }
        }
    }

    /**
     * Minimize the window
     */
    minimize(): void {
        if (this.windowOptions.minimizable && this.windowState !== 'minimized') {
            this.savedPosition = { ...this.position };
            this.savedSize = { ...this.size };
            this.windowState = 'minimized';
            this.setVisible(false);
            if (this.windowOptions.onMinimize) {
                this.windowOptions.onMinimize();
            }
        }
    }

    /**
     * Maximize the window
     */
    maximize(): void {
        if (this.windowOptions.maximizable && this.windowState !== 'maximized') {
            this.savedPosition = { ...this.position };
            this.savedSize = { ...this.size };
            this.windowState = 'maximized';
            
            // Set to full screen size (this would need to be provided by the terminal controller)
            // For now, we'll use a large size
            this.setPosition({ x: 0, y: 0 });
            this.setSize({ width: 80, height: 24 }); // Default terminal size
            
            if (this.windowOptions.onMaximize) {
                this.windowOptions.onMaximize();
            }
        }
    }

    /**
     * Restore the window
     */
    restore(): void {
        if (this.windowState === 'minimized' || this.windowState === 'maximized') {
            if (this.savedPosition) {
                this.setPosition(this.savedPosition);
            }
            if (this.savedSize) {
                this.setSize(this.savedSize);
            }
            this.windowState = 'normal';
            this.setVisible(true);
            if (this.windowOptions.onRestore) {
                this.windowOptions.onRestore();
            }
        }
    }

    /**
     * Get z-index
     */
    getZIndex(): number {
        return this.zIndex;
    }

    /**
     * Set z-index
     */
    setZIndex(zIndex: number): void {
        this.zIndex = zIndex;
        this.markDirty();
    }

    /**
     * Start dragging
     */
    protected startDragging(mousePos: Position): void {
        if (this.windowOptions.draggable && this.windowState === 'normal') {
            this.isDragging = true;
            this.dragStart = mousePos;
            this.originalPosition = { ...this.position };
        }
    }

    /**
     * Stop dragging
     */
    protected stopDragging(): void {
        if (this.isDragging) {
            this.isDragging = false;
            this.dragStart = null;
            if (this.windowOptions.onMove) {
                this.windowOptions.onMove(this.position);
            }
        }
    }

    /**
     * Update drag position
     */
    protected updateDragPosition(mousePos: Position): void {
        if (this.isDragging && this.dragStart) {
            const deltaX = mousePos.x - this.dragStart.x;
            const deltaY = mousePos.y - this.dragStart.y;
            
            this.setPosition({
                x: this.originalPosition.x + deltaX,
                y: this.originalPosition.y + deltaY
            });
        }
    }

    /**
     * Start resizing
     */
    protected startResizing(mousePos: Position): void {
        if (this.windowOptions.resizable && this.windowState === 'normal') {
            this.isResizing = true;
            this.dragStart = mousePos;
            this.originalSize = { ...this.size };
        }
    }

    /**
     * Stop resizing
     */
    protected stopResizing(): void {
        if (this.isResizing) {
            this.isResizing = false;
            this.dragStart = null;
            if (this.windowOptions.onResize) {
                this.windowOptions.onResize(this.size);
            }
        }
    }

    /**
     * Update resize
     */
    protected updateResize(mousePos: Position): void {
        if (this.isResizing && this.dragStart) {
            const deltaX = mousePos.x - this.dragStart.x;
            const deltaY = mousePos.y - this.dragStart.y;
            
            let newWidth = this.originalSize.width + deltaX;
            let newHeight = this.originalSize.height + deltaY;
            
            // Apply min/max constraints
            if (this.windowOptions.minWidth) {
                newWidth = Math.max(newWidth, this.windowOptions.minWidth);
            }
            if (this.windowOptions.maxWidth) {
                newWidth = Math.min(newWidth, this.windowOptions.maxWidth);
            }
            if (this.windowOptions.minHeight) {
                newHeight = Math.max(newHeight, this.windowOptions.minHeight);
            }
            if (this.windowOptions.maxHeight) {
                newHeight = Math.min(newHeight, this.windowOptions.maxHeight);
            }
            
            this.setSize({ width: newWidth, height: newHeight });
        }
    }

    /**
     * Check if position is in title bar
     */
    protected isInTitleBar(x: number, y: number): boolean {
        const relX = x - this.position.x;
        const relY = y - this.position.y;
        
        return relX >= 0 && 
               relX < this.size.width && 
               relY >= 0 && 
               relY < this.titleBarHeight + 2; // Include border
    }

    /**
     * Check if position is in resize handle
     */
    protected isInResizeHandle(x: number, y: number): boolean {
        const relX = x - this.position.x;
        const relY = y - this.position.y;
        
        // Bottom-right corner resize handle
        return relX >= this.size.width - 3 && 
               relX < this.size.width &&
               relY >= this.size.height - 2 && 
               relY < this.size.height;
    }

    /**
     * Check if position is close button
     */
    protected isInCloseButton(x: number, y: number): boolean {
        if (!this.windowOptions.closable) return false;
        
        const relX = x - this.position.x;
        const relY = y - this.position.y;
        
        // Close button is typically at top-right
        return relX >= this.size.width - 4 && 
               relX < this.size.width - 1 &&
               relY === 1; // Title bar row
    }

    /**
     * Check if position is minimize button
     */
    protected isInMinimizeButton(x: number, y: number): boolean {
        if (!this.windowOptions.minimizable) return false;
        
        const relX = x - this.position.x;
        const relY = y - this.position.y;
        
        // Minimize button is before maximize button
        const offset = this.windowOptions.maximizable ? 6 : 4;
        const closeOffset = this.windowOptions.closable ? 4 : 0;
        
        return relX >= this.size.width - offset - closeOffset && 
               relX < this.size.width - offset - closeOffset + 2 &&
               relY === 1;
    }

    /**
     * Check if position is maximize button
     */
    protected isInMaximizeButton(x: number, y: number): boolean {
        if (!this.windowOptions.maximizable) return false;
        
        const relX = x - this.position.x;
        const relY = y - this.position.y;
        
        // Maximize button is before close button
        const closeOffset = this.windowOptions.closable ? 4 : 0;
        
        return relX >= this.size.width - 4 - closeOffset && 
               relX < this.size.width - 2 - closeOffset &&
               relY === 1;
    }

    /**
     * Handle input events
     */
    handleInput(input: InputEvent): boolean {
        // Don't handle input if window is not in normal state
        if (this.windowState !== 'normal') {
            return false;
        }

        if (input.type === 'mouse') {
            const { x, y, button, action } = input;
            
            if (!x || !y) return false;
            
            if (action === 'press' && button === 'left') {
                // Check for window controls
                if (this.isInCloseButton(x, y)) {
                    this.close();
                    return true;
                } else if (this.isInMinimizeButton(x, y)) {
                    this.minimize();
                    return true;
                } else if (this.isInMaximizeButton(x, y)) {
                    this.maximize();
                    return true;
                } else if (this.isInResizeHandle(x, y)) {
                    this.startResizing({ x, y });
                    return true;
                } else if (this.isInTitleBar(x, y)) {
                    this.startDragging({ x, y });
                    return true;
                }
            } else if (action === 'release') {
                if (this.isDragging) {
                    this.stopDragging();
                    return true;
                } else if (this.isResizing) {
                    this.stopResizing();
                    return true;
                }
            } else if (action === 'drag') {
                if (this.isDragging) {
                    this.updateDragPosition({ x, y });
                    return true;
                } else if (this.isResizing) {
                    this.updateResize({ x, y });
                    return true;
                }
            }
        }

        // Handle keyboard shortcuts
        if (input.type === 'key' && this.state.focused) {
            if (input.alt) {
                switch (input.key) {
                    case 'f4': // Alt+F4 to close
                        if (this.windowOptions.closable) {
                            this.close();
                            return true;
                        }
                        break;
                    case 'f9': // Alt+F9 to minimize
                        if (this.windowOptions.minimizable) {
                            this.minimize();
                            return true;
                        }
                        break;
                    case 'f10': // Alt+F10 to maximize
                        if (this.windowOptions.maximizable) {
                            if (this.windowState === 'maximized') {
                                this.restore();
                            } else {
                                this.maximize();
                            }
                            return true;
                        }
                        break;
                }
            }
        }

        // Pass input to children if not handled
        return super.handleInput(input);
    }

    /**
     * Render the window
     */
    render(): string {
        if (this.windowState === 'closed' || this.windowState === 'minimized') {
            return '';
        }

        const lines: string[] = [];
        const borderChars = this.themeManager.getBorderChars();
        const theme = this.themeManager.getCurrentTheme();
        
        // Top border with title and controls
        let topLine = this.themeManager.applyBorderColor(borderChars.topLeft);
        
        // Add title
        const title = this.windowOptions.title || 'Window';
        const titleStr = ` ${title} `;
        const controlsWidth = this.calculateControlsWidth();
        const availableWidth = this.size.width - 2 - controlsWidth;
        
        // Truncate title if needed
        let displayTitle = titleStr;
        if (displayTitle.length > availableWidth) {
            displayTitle = titleStr.substring(0, availableWidth - 3) + '...';
        }
        
        topLine += this.themeManager.applyBorderColor(borderChars.horizontal);
        topLine += this.themeManager.applyTypography(displayTitle, 'heading');
        
        // Add padding
        const paddingWidth = availableWidth - displayTitle.length;
        topLine += this.themeManager.applyBorderColor(borderChars.horizontal.repeat(paddingWidth));
        
        // Add window controls
        topLine += this.renderWindowControls();
        topLine += this.themeManager.applyBorderColor(borderChars.topRight);
        
        lines.push(topLine);
        
        // Render content using Box's render, but skip the top border
        const baseRender = super.render();
        const baseLines = baseRender.split('\n');
        
        // Skip the first line (top border) and use our custom one
        for (let i = 1; i < baseLines.length; i++) {
            lines.push(baseLines[i]);
        }
        
        // Add resize handle indicator if resizable
        if (this.windowOptions.resizable && this.windowState === 'normal') {
            const lastLineIndex = lines.length - 1;
            const lastLine = lines[lastLineIndex];
            
            // Add resize handle indicator at bottom-right
            const handleIndicator = '◢'; // or '⋮⋮'
            const lineWithoutLastChars = lastLine.substring(0, lastLine.length - 3);
            lines[lastLineIndex] = lineWithoutLastChars + 
                                  this.themeManager.applyColor(handleIndicator, 'border') +
                                  this.themeManager.applyBorderColor(borderChars.bottomRight);
        }
        
        return lines.join('\n');
    }

    /**
     * Calculate controls width
     */
    private calculateControlsWidth(): number {
        let width = 1; // Space before controls
        
        if (this.windowOptions.minimizable) {
            width += 3; // [_]
        }
        if (this.windowOptions.maximizable) {
            width += 3; // [□]
        }
        if (this.windowOptions.closable) {
            width += 3; // [X]
        }
        
        return width;
    }

    /**
     * Render window controls
     */
    private renderWindowControls(): string {
        let controls = ' ';
        
        if (this.windowOptions.minimizable) {
            controls += this.themeManager.applyColor('[', 'border');
            controls += this.themeManager.applyColor('_', 'textPrimary');
            controls += this.themeManager.applyColor(']', 'border');
        }
        
        if (this.windowOptions.maximizable) {
            controls += this.themeManager.applyColor('[', 'border');
            const icon = this.windowState === 'maximized' ? '◱' : '□';
            controls += this.themeManager.applyColor(icon, 'textPrimary');
            controls += this.themeManager.applyColor(']', 'border');
        }
        
        if (this.windowOptions.closable) {
            controls += this.themeManager.applyColor('[', 'border');
            controls += this.themeManager.applyColor('X', 'error');
            controls += this.themeManager.applyColor(']', 'border');
        }
        
        return controls;
    }

    /**
     * Focus the window
     */
    focus(): void {
        super.focus();
        if (this.windowOptions.onFocus) {
            this.windowOptions.onFocus();
        }
    }

    /**
     * Blur the window
     */
    blur(): void {
        super.blur();
        if (this.windowOptions.onBlur) {
            this.windowOptions.onBlur();
        }
    }

    /**
     * Check if window is modal
     */
    isModal(): boolean {
        return this.windowOptions.modal || false;
    }

    /**
     * Check if window is always on top
     */
    isAlwaysOnTop(): boolean {
        return this.windowOptions.alwaysOnTop || false;
    }
}
