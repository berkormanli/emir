import { Box, BoxOptions } from './box';
import { Position, Size, InputEvent } from './types';

type WindowControl = 'minimize' | 'maximize' | 'close';

interface NormalizedMouseEvent {
    x: number;
    y: number;
    action: 'press' | 'release' | 'drag';
    button?: 'left' | 'right' | 'middle';
}

const isPositionLike = (value?: Position | Size): value is Position =>
    !!value && typeof value.x === 'number' && typeof value.y === 'number';

const isSizeLike = (value?: Position | Size): value is Size =>
    !!value && typeof value.width === 'number' && typeof value.height === 'number' &&
    (typeof (value as Position).x !== 'number' || typeof (value as Position).y !== 'number');

/**
 * Window state
 */
export type WindowState = 'normal' | 'minimized' | 'maximized' | 'closed';

/**
 * Window options
 */
export interface WindowOptions extends BoxOptions {
    title?: string;
    closable?: boolean;
    minimizable?: boolean;
    maximizable?: boolean;
    resizable?: boolean;
    draggable?: boolean;
    movable?: boolean;
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

    constructor(
        id: string,
        options: WindowOptions = {},
        positionOrSize?: Position | Size,
        sizeOverride?: Size
    ) {
        const {
            title = '',
            movable,
            draggable,
            ...otherOptions
        } = options;

        let initialPosition: Position | undefined;
        let initialSize: Size | undefined = sizeOverride;

        if (isPositionLike(positionOrSize)) {
            initialPosition = positionOrSize;
        } else if (!initialSize && isSizeLike(positionOrSize)) {
            initialSize = positionOrSize;
        }

        if (!initialSize) {
            initialSize = { width: 40, height: 20 };
        }

        const resolvedDraggable = movable ?? draggable ?? true;

        // Ensure window always has a border managed by Window itself
        const boxOptions: BoxOptions = {
            ...otherOptions,
            border: true,
            borderStyle: otherOptions.borderStyle || 'single'
        };
        
        super(id, boxOptions, initialPosition, initialSize);
        
        this.windowOptions = {
            title,
            closable: true,
            minimizable: true,
            maximizable: true,
            resizable: true,
            draggable: resolvedDraggable,
            movable: resolvedDraggable,
            modal: false,
            alwaysOnTop: false,
            minWidth: 10,
            minHeight: 5,
            ...otherOptions,
            title,
            draggable: resolvedDraggable,
            movable: resolvedDraggable
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
     * Get window title
     */
    getTitle(): string {
        return this.windowOptions.title || '';
    }

    /**
     * Set window title
     */
    setTitle(title: string): void {
        this.windowOptions.title = title;
        this.markDirty();
    }

    /**
     * Check if window is shown (visible)
     */
    isShown(): boolean {
        return this.visible && this.windowState !== 'closed' && this.windowState !== 'minimized';
    }

    /**
     * Get window state
     */
    getWindowState(): WindowState {
        return this.windowState;
    }

    /**
     * Get window state (alias for getWindowState)
     */
    getState(): WindowState {
        return this.getWindowState();
    }

    /**
     * Set window state
     */
    setWindowState(state: WindowState): void {
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
            this.setVisible(true);
            
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
            this.savedPosition = null;
            this.savedSize = null;
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
               relY === 0;
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
        const center = this.getControlCenter('close');
        return center !== null && this.isInControlArea(center, x, y);
    }

    /**
     * Check if position is minimize button
     */
    protected isInMinimizeButton(x: number, y: number): boolean {
        if (!this.windowOptions.minimizable) return false;
        const center = this.getControlCenter('minimize');
        return center !== null && this.isInControlArea(center, x, y);
    }

    /**
     * Check if position is maximize button
     */
    protected isInMaximizeButton(x: number, y: number): boolean {
        if (!this.windowOptions.maximizable) return false;
        const center = this.getControlCenter('maximize');
        return center !== null && this.isInControlArea(center, x, y);
    }

    private getControlOrder(): WindowControl[] {
        const order: WindowControl[] = [];
        if (this.windowOptions.minimizable) {
            order.push('minimize');
        }
        if (this.windowOptions.maximizable) {
            order.push('maximize');
        }
        if (this.windowOptions.closable) {
            order.push('close');
        }
        return order;
    }

    private getControlCenter(control: WindowControl): number | null {
        const order = this.getControlOrder();
        const index = order.indexOf(control);
        if (index === -1) {
            return null;
        }
        const controlsToRight = order.length - index - 1;
        return this.size.width - (2 * (controlsToRight + 1) + 1);
    }

    private isInControlArea(center: number, x: number, y: number): boolean {
        const relX = x - this.position.x;
        const relY = y - this.position.y;
        return relY === 0 && relX >= center - 1 && relX <= center + 1;
    }

    /**
     * Handle input events
     */
    handleInput(input: InputEvent): boolean {
        if (input.type === 'mouse') {
            const mouse = this.normalizeMouseInput(input);
            if (mouse && this.handleMouseInput(mouse)) {
                return true;
            }
        } else if (input.type === 'key') {
            if (this.handleKeyboardShortcuts(input)) {
                return true;
            }
        }

        // Pass input to children if not handled
        return super.handleInput(input);
    }

    private handleMouseInput(mouse: NormalizedMouseEvent): boolean {
        if (mouse.action === 'press' && mouse.button !== 'left') {
            return false;
        }

        const isInteractiveState = this.windowState !== 'closed' && this.windowState !== 'minimized';

        if (mouse.action === 'press' && mouse.button === 'left' && isInteractiveState) {
            if (this.isInCloseButton(mouse.x, mouse.y)) {
                this.close();
                return true;
            }
            if (this.isInMinimizeButton(mouse.x, mouse.y)) {
                this.minimize();
                return true;
            }
            if (this.isInMaximizeButton(mouse.x, mouse.y)) {
                if (this.windowState === 'maximized') {
                    this.restore();
                } else {
                    this.maximize();
                }
                return true;
            }
            if (this.isInResizeHandle(mouse.x, mouse.y) && this.windowOptions.resizable && this.windowState === 'normal') {
                this.startResizing({ x: mouse.x, y: mouse.y });
                return true;
            }
            if (this.isInTitleBar(mouse.x, mouse.y) && this.windowOptions.draggable && this.windowState === 'normal') {
                this.startDragging({ x: mouse.x, y: mouse.y });
                return true;
            }
        }

        if (mouse.action === 'release') {
            let handled = false;
            if (this.isDragging) {
                this.stopDragging();
                handled = true;
            }
            if (this.isResizing) {
                this.stopResizing();
                handled = true;
            }
            return handled;
        }

        if (mouse.action === 'drag') {
            if (this.isDragging) {
                this.updateDragPosition({ x: mouse.x, y: mouse.y });
                return true;
            }
            if (this.isResizing) {
                this.updateResize({ x: mouse.x, y: mouse.y });
                return true;
            }
        }

        return false;
    }

    private handleKeyboardShortcuts(input: InputEvent): boolean {
        if (!input.alt || !input.key) {
            return false;
        }

        const key = input.key.toLowerCase();
        switch (key) {
            case 'f4':
                if (this.windowOptions.closable) {
                    this.close();
                    return true;
                }
                break;
            case 'f9':
                if (this.windowOptions.minimizable) {
                    this.minimize();
                    return true;
                }
                break;
            case 'f10':
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

        return false;
    }

    private normalizeMouseInput(input: InputEvent): NormalizedMouseEvent | null {
        if (input.type !== 'mouse') {
            return null;
        }

        const raw: any = input;
        const positionSource = raw.position || raw.mouse || {};
        const x = typeof raw.x === 'number'
            ? raw.x
            : typeof positionSource.x === 'number'
                ? positionSource.x
                : undefined;
        const y = typeof raw.y === 'number'
            ? raw.y
            : typeof positionSource.y === 'number'
                ? positionSource.y
                : undefined;

        if (typeof x !== 'number' || typeof y !== 'number') {
            return null;
        }

        const rawButton = raw.button ?? positionSource.button ?? raw.mouse?.button;
        let button: 'left' | 'right' | 'middle' | undefined;
        switch (rawButton) {
            case 0:
            case 'left':
                button = 'left';
                break;
            case 1:
            case 'middle':
                button = 'middle';
                break;
            case 2:
            case 'right':
                button = 'right';
                break;
        }

        const rawAction = raw.action ?? positionSource.action ?? raw.mouse?.action;
        let action: 'press' | 'release' | 'drag';
        if (rawAction === 'press' || rawAction === 'release') {
            action = rawAction;
        } else if (rawAction === 'move' || rawAction === 'drag') {
            action = 'drag';
        } else if (this.isDragging || this.isResizing) {
            action = rawButton === undefined ? 'drag' : 'release';
        } else {
            action = 'press';
        }

        return { x, y, button, action };
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
        
        // Top border with title and controls
        const controlsWidth = this.calculateControlsWidth();
        const innerWidth = Math.max(0, this.size.width - 2);
        let titleAreaWidth = Math.max(0, innerWidth - controlsWidth);
        const controls = this.renderWindowControls();

        let topLine = this.themeManager.applyBorderColor(borderChars.topLeft);
        if (titleAreaWidth > 0) {
            topLine += this.themeManager.applyBorderColor(borderChars.horizontal);
            titleAreaWidth -= 1;
        }

        const rawTitle = this.windowOptions.title || 'Window';
        let displayTitle = titleAreaWidth > 0 ? ` ${rawTitle} ` : '';
        if (displayTitle.length > titleAreaWidth) {
            displayTitle = titleAreaWidth > 3
                ? displayTitle.substring(0, titleAreaWidth - 3) + '...'
                : displayTitle.substring(0, titleAreaWidth);
        }

        if (displayTitle.length > 0) {
            topLine += this.themeManager.applyTypography(displayTitle, 'heading');
            titleAreaWidth -= displayTitle.length;
        }

        if (titleAreaWidth > 0) {
            topLine += this.themeManager.applyBorderColor(borderChars.horizontal.repeat(titleAreaWidth));
        }

        topLine += controls;
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
        const count = this.getControlOrder().length;
        if (count === 0) {
            return 0;
        }
        // Layout: leading space, icons separated by single spaces, trailing space
        return (count * 2) + 1;
    }

    /**
     * Render window controls
     */
    private renderWindowControls(): string {
        const controlOrder = this.getControlOrder();
        if (controlOrder.length === 0) {
            return '';
        }

        const borderSpace = this.themeManager.applyBorderColor(' ');
        const icons = controlOrder.map(control => {
            switch (control) {
                case 'minimize':
                    return this.themeManager.applyColor('_', 'textPrimary');
                case 'maximize': {
                    const icon = this.windowState === 'maximized' ? '◫' : '□';
                    return this.themeManager.applyColor(icon, 'textPrimary');
                }
                case 'close':
                    return this.themeManager.applyColor('×', 'error');
            }
        });
        
        return borderSpace + icons.join(borderSpace) + borderSpace;
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
     * Set focused state
     */
    setFocused(focused: boolean): void {
        if (focused && !this.state.focused) {
            this.focus();
        } else if (!focused && this.state.focused) {
            this.blur();
        }
    }

    /**
     * Check if window is always on top
     */
    isAlwaysOnTop(): boolean {
        return this.windowOptions.alwaysOnTop || false;
    }
}
