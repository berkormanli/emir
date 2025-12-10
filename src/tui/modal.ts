import { Window, WindowOptions } from './window';
import { Position, Size, InputEvent } from './types';
import { AnsiUtils } from './ansi-utils';

/**
 * Modal options
 */
export interface ModalOptions extends Omit<WindowOptions, 'draggable' | 'resizable' | 'minimizable' | 'maximizable'> {
    overlay?: boolean;
    overlayOpacity?: number; // 0-1
    escapeToClose?: boolean;
    clickOutsideToClose?: boolean;
    onShow?: () => void;
    onHide?: () => void;
}

/**
 * Modal component - a centered window that blocks interaction with underlying content
 */
export class Modal extends Window {
    protected modalOptions: ModalOptions;
    private screenSize: Size;
    private isShown: boolean;

    constructor(
        id: string,
        options: ModalOptions,
        size?: Size
    ) {
        // Force modal-specific settings
        const windowOptions: WindowOptions = {
            ...options,
            modal: true,
            draggable: false,
            resizable: false,
            minimizable: false,
            maximizable: false,
            alwaysOnTop: true
        };
        
        // Default screen size (will be updated by WindowManager)
        const screenSize = { width: 80, height: 24 };
        
        // Calculate centered position
        const modalSize = size || { width: 40, height: 10 };
        const centeredPosition = Modal.calculateCenteredPosition(modalSize, screenSize);
        
        super(id, windowOptions, centeredPosition, modalSize);
        
        this.modalOptions = {
            overlay: true,
            overlayOpacity: 0.5,
            escapeToClose: true,
            clickOutsideToClose: false,
            ...options
        };
        
        this.screenSize = screenSize;
        this.isShown = false;
    }

    /**
     * Calculate centered position
     */
    private static calculateCenteredPosition(size: Size, screenSize: Size): Position {
        return {
            x: Math.floor((screenSize.width - size.width) / 2),
            y: Math.floor((screenSize.height - size.height) / 2)
        };
    }

    /**
     * Update screen size (called by WindowManager)
     */
    updateScreenSize(screenSize: Size): void {
        this.screenSize = screenSize;
        this.centerModal();
    }

    /**
     * Center the modal on screen
     */
    centerModal(): void {
        const centeredPosition = Modal.calculateCenteredPosition(this.size, this.screenSize);
        this.setPosition(centeredPosition);
    }

    /**
     * Show the modal
     */
    show(): void {
        if (!this.isShown) {
            this.isShown = true;
            this.setVisible(true);
            this.centerModal();
            this.focus();
            
            if (this.modalOptions.onShow) {
                this.modalOptions.onShow();
            }
        }
    }

    /**
     * Hide the modal
     */
    hide(): void {
        if (this.isShown) {
            this.isShown = false;
            this.setVisible(false);
            this.blur();
            
            if (this.modalOptions.onHide) {
                this.modalOptions.onHide();
            }
        }
    }

    /**
     * Check if modal is shown
     */
    isModalShown(): boolean {
        return this.isShown;
    }

    /**
     * Close the modal (same as hide)
     */
    close(): void {
        this.hide();
        if (this.windowOptions.onClose) {
            this.windowOptions.onClose();
        }
    }

    /**
     * Handle input events
     */
    handleInput(input: InputEvent): boolean {
        // Handle escape key to close
        if (input.type === 'key' && input.key === 'escape' && this.modalOptions.escapeToClose) {
            this.hide();
            return true;
        }

        // Handle click outside to close
        if (input.type === 'mouse' && input.action === 'press' && this.modalOptions.clickOutsideToClose) {
            if (input.x !== undefined && input.y !== undefined) {
                if (!this.containsPoint(input.x, input.y)) {
                    this.hide();
                    return true;
                }
            }
        }

        // Let Window handle other input
        return super.handleInput(input);
    }

    /**
     * Render the modal with overlay
     */
    render(): string {
        if (!this.isShown || !this.visible) {
            return '';
        }

        const lines: string[] = [];
        
        // Render overlay if enabled
        if (this.modalOptions.overlay) {
            const overlay = this.renderOverlay();
            const overlayLines = overlay.split('\n');
            
            // Render the modal window on top of the overlay
            const modalRender = super.render();
            const modalLines = modalRender.split('\n');
            
            // Composite the modal onto the overlay
            for (let y = 0; y < this.screenSize.height; y++) {
                if (y >= this.position.y && y < this.position.y + this.size.height) {
                    // This line contains part of the modal
                    const modalLineIndex = y - this.position.y;
                    if (modalLineIndex < modalLines.length) {
                        const overlayLine = overlayLines[y] || '';
                        const modalLine = modalLines[modalLineIndex];
                        
                        // Composite the modal line onto the overlay line
                        let compositeLine = '';
                        
                        // Before modal
                        if (this.position.x > 0) {
                            compositeLine += overlayLine.substring(0, this.position.x);
                        }
                        
                        // Modal content
                        compositeLine += modalLine;
                        
                        // After modal
                        const afterStart = this.position.x + this.size.width;
                        if (afterStart < this.screenSize.width) {
                            compositeLine += overlayLine.substring(afterStart);
                        }
                        
                        lines.push(compositeLine);
                    } else {
                        lines.push(overlayLines[y] || '');
                    }
                } else {
                    // This line doesn't contain the modal
                    lines.push(overlayLines[y] || '');
                }
            }
        } else {
            // No overlay, just render the modal
            return super.render();
        }
        
        return lines.join('\n');
    }

    /**
     * Render the overlay background
     */
    private renderOverlay(): string {
        const lines: string[] = [];
        const theme = this.themeManager.getCurrentTheme();
        
        // Use a semi-transparent character for the overlay
        const overlayChar = '░'; // Light shade character
        const overlayColor = theme.colors.shadow;
        
        for (let y = 0; y < this.screenSize.height; y++) {
            let line = '';
            for (let x = 0; x < this.screenSize.width; x++) {
                line += overlayChar;
            }
            
            // Apply overlay color
            if (this.modalOptions.overlayOpacity && this.modalOptions.overlayOpacity > 0) {
                line = AnsiUtils.dim() + 
                      AnsiUtils.setForegroundColor(overlayColor) + 
                      line + 
                      AnsiUtils.reset();
            }
            
            lines.push(line);
        }
        
        return lines.join('\n');
    }

    /**
     * Render the modal at a specific position on the overlay
     */
    renderAtPosition(baseCanvas: string[]): string[] {
        if (!this.isShown || !this.visible) {
            return baseCanvas;
        }

        const modalRender = super.render();
        const modalLines = modalRender.split('\n');
        const result = [...baseCanvas];
        
        // Place modal on the canvas
        for (let y = 0; y < modalLines.length; y++) {
            const canvasY = this.position.y + y;
            if (canvasY >= 0 && canvasY < result.length) {
                const modalLine = modalLines[y];
                const canvasLine = result[canvasY] || '';
                
                // Replace the portion of the canvas line with the modal line
                let newLine = '';
                
                // Before modal
                if (this.position.x > 0) {
                    newLine += canvasLine.substring(0, this.position.x);
                }
                
                // Modal content
                newLine += modalLine;
                
                // After modal (if canvas line is longer)
                const afterStart = this.position.x + modalLine.length;
                if (afterStart < canvasLine.length) {
                    newLine += canvasLine.substring(afterStart);
                }
                
                result[canvasY] = newLine;
            }
        }
        
        return result;
    }

    /**
     * Override minimize to prevent it
     */
    minimize(): void {
        // Modals cannot be minimized
        return;
    }

    /**
     * Override maximize to prevent it
     */
    maximize(): void {
        // Modals cannot be maximized
        return;
    }

    /**
     * Override restore to prevent state changes
     */
    restore(): void {
        // Modals are always in normal state
        return;
    }
}
