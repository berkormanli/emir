import { BaseComponent } from './base-component';
import { Position, Size, InputEvent } from './types';
import { LayoutUtils, Spacing, LayoutConstraints, Alignment } from './layout-utils';
import { ThemeManager, Theme } from './theme';
import { AnsiUtils } from './ansi-utils';

/**
 * Box component options
 */
export interface BoxOptions {
    padding?: number | number[] | Spacing;
    margin?: number | number[] | Spacing;
    border?: boolean;
    borderStyle?: 'single' | 'double' | 'rounded' | 'thick' | 'none';
    title?: string;
    titleAlign?: 'start' | 'center' | 'end';
    constraints?: LayoutConstraints;
    horizontalAlign?: Alignment;
    verticalAlign?: Alignment;
    overflow?: 'visible' | 'hidden' | 'scroll';
    backgroundColor?: number;
}

/**
 * Box component - a container with padding, margin, and border
 */
export class Box extends BaseComponent {
    protected children: BaseComponent[];
    protected options: BoxOptions;
    protected themeManager: ThemeManager;
    protected contentSize: Size;
    protected scrollOffset: Position;

    constructor(
        id: string,
        options: BoxOptions = {},
        position?: Position,
        size?: Size
    ) {
        super(id, position, size);
        this.children = [];
        this.options = {
            padding: 0,
            margin: 0,
            border: false,
            borderStyle: 'single',
            overflow: 'hidden',
            ...options
        };
        this.themeManager = ThemeManager.getInstance();
        this.contentSize = { width: 0, height: 0 };
        this.scrollOffset = { x: 0, y: 0 };
    }

    /**
     * Add a child component
     */
    addChild(child: BaseComponent): void {
        this.children.push(child);
        this.updateLayout();
        this.markDirty();
    }

    /**
     * Remove a child component
     */
    removeChild(childId: string): boolean {
        const index = this.children.findIndex(c => c.getId() === childId);
        if (index !== -1) {
            this.children.splice(index, 1);
            this.updateLayout();
            this.markDirty();
            return true;
        }
        return false;
    }

    /**
     * Get all children
     */
    getChildren(): BaseComponent[] {
        return this.children;
    }

    /**
     * Clear all children
     */
    clearChildren(): void {
        this.children = [];
        this.updateLayout();
        this.markDirty();
    }

    /**
     * Update layout calculations
     */
    protected updateLayout(): void {
        const padding = LayoutUtils.parseSpacing(this.options.padding || 0);
        const margin = LayoutUtils.parseSpacing(this.options.margin || 0);
        
        // Calculate content area
        let contentArea = LayoutUtils.getContentArea(this.size, padding);
        
        // Account for border
        if (this.options.border) {
            contentArea.width -= 2;
            contentArea.height -= 2;
            
            // Account for title row if present
            if (this.options.title) {
                contentArea.height -= 1;
            }
        }
        
        this.contentSize = contentArea;
        
        // Update child positions based on alignment
        if (this.children.length > 0) {
            const child = this.children[0]; // Box typically contains one child
            
            // Apply constraints if specified
            if (this.options.constraints) {
                const childSize = LayoutUtils.applyConstraints(
                    child.getSize(),
                    this.options.constraints,
                    contentArea
                );
                child.setSize(childSize);
            }
            
            // Calculate aligned position
            const alignedPos = LayoutUtils.alignInParent(
                child.getSize(),
                contentArea,
                this.options.horizontalAlign,
                this.options.verticalAlign
            );
            
            // Apply padding offset
            const childPos: Position = {
                x: alignedPos.x + padding.left!,
                y: alignedPos.y + padding.top!
            };
            
            // Account for border
            if (this.options.border) {
                childPos.x += 1;
                childPos.y += 1;
                
                // Account for title
                if (this.options.title) {
                    childPos.y += 1;
                }
            }
            
            child.setPosition(childPos);
        }
    }

    /**
     * Handle input events
     */
    handleInput(input: InputEvent): boolean {
        // Pass input to focused child
        for (const child of this.children) {
            if (child.isFocused() && child.handleInput(input)) {
                return true;
            }
        }
        
        // Handle scrolling if overflow is scroll
        if (this.options.overflow === 'scroll' && this.state.focused) {
            if (input.type === 'key') {
                switch (input.key) {
                    case 'page-up':
                        this.scrollOffset.y = Math.max(0, this.scrollOffset.y - 10);
                        this.markDirty();
                        return true;
                    case 'page-down':
                        this.scrollOffset.y = Math.min(
                            Math.max(0, this.contentSize.height - this.size.height),
                            this.scrollOffset.y + 10
                        );
                        this.markDirty();
                        return true;
                }
            }
        }
        
        return false;
    }

    /**
     * Render the box
     */
    render(): string {
        const lines: string[] = [];
        const padding = LayoutUtils.parseSpacing(this.options.padding || 0);
        const margin = LayoutUtils.parseSpacing(this.options.margin || 0);
        
        // Get border characters from theme
        const borderChars = this.options.borderStyle && this.options.borderStyle !== 'none' 
            ? this.themeManager.getBorderChars()
            : null;
        
        // Apply background color if specified
        const bgColor = this.options.backgroundColor;
        
        // Calculate dimensions
        const totalWidth = this.size.width;
        const totalHeight = this.size.height;
        const contentWidth = totalWidth - (this.options.border ? 2 : 0);
        const contentHeight = totalHeight - (this.options.border ? 2 : 0) - (this.options.title ? 1 : 0);
        
        // Top margin
        for (let i = 0; i < margin.top!; i++) {
            lines.push(' '.repeat(totalWidth));
        }
        
        // Top border
        if (this.options.border && borderChars) {
            let topBorder = this.themeManager.applyBorderColor(borderChars.topLeft) +
                           this.themeManager.applyBorderColor(borderChars.horizontal.repeat(contentWidth)) +
                           this.themeManager.applyBorderColor(borderChars.topRight);
            
            // Add title if present
            if (this.options.title) {
                const title = this.options.title;
                const titleAlign = this.options.titleAlign || 'center';
                let titlePos = 0;
                
                switch (titleAlign) {
                    case 'center':
                        titlePos = Math.floor((contentWidth - title.length - 2) / 2);
                        break;
                    case 'end':
                        titlePos = contentWidth - title.length - 3;
                        break;
                    case 'start':
                    default:
                        titlePos = 1;
                }
                
                const titleStr = ` ${title} `;
                topBorder = this.themeManager.applyBorderColor(borderChars.topLeft) +
                           this.themeManager.applyBorderColor(borderChars.horizontal.repeat(titlePos)) +
                           this.themeManager.applyTypography(titleStr, 'heading') +
                           this.themeManager.applyBorderColor(borderChars.horizontal.repeat(contentWidth - titlePos - titleStr.length)) +
                           this.themeManager.applyBorderColor(borderChars.topRight);
            }
            
            lines.push(' '.repeat(margin.left!) + topBorder + ' '.repeat(margin.right!));
            
            // Title separator if title exists
            if (this.options.title) {
                const separator = this.themeManager.applyBorderColor(borderChars.vertical) +
                                this.themeManager.applyBorderColor(borderChars.horizontal.repeat(contentWidth)) +
                                this.themeManager.applyBorderColor(borderChars.vertical);
                lines.push(' '.repeat(margin.left!) + separator + ' '.repeat(margin.right!));
            }
        }
        
        // Render content
        const childLines: string[] = [];
        
        // Render children
        for (const child of this.children) {
            if (child.isVisible()) {
                const childRender = child.render();
                const childRenderLines = childRender.split('\n');
                
                // Position child content
                const childPos = child.getPosition();
                const childSize = child.getSize();
                
                // Ensure we have enough lines
                while (childLines.length < childPos.y + childSize.height) {
                    childLines.push('');
                }
                
                // Place child content
                for (let i = 0; i < childRenderLines.length; i++) {
                    const lineIndex = childPos.y + i;
                    if (lineIndex < childLines.length) {
                        const line = childLines[lineIndex];
                        const before = line.substring(0, childPos.x);
                        const after = line.substring(childPos.x + childRenderLines[i].length);
                        childLines[lineIndex] = before.padEnd(childPos.x, ' ') + childRenderLines[i] + after;
                    }
                }
            }
        }
        
        // Apply padding and clipping
        for (let y = 0; y < contentHeight; y++) {
            let line = '';
            
            // Left padding
            line += ' '.repeat(padding.left!);
            
            // Content
            if (y - padding.top! >= 0 && y - padding.top! < childLines.length) {
                const contentLine = childLines[y - padding.top! + this.scrollOffset.y] || '';
                
                // Apply overflow handling
                if (this.options.overflow === 'hidden') {
                    line += contentLine.substring(0, contentWidth - padding.left! - padding.right!);
                } else {
                    line += contentLine;
                }
            }
            
            // Pad to full width
            line = line.padEnd(contentWidth, ' ');
            
            // Apply background color if specified
            if (bgColor !== undefined) {
                line = AnsiUtils.setBackgroundColor(bgColor) + line + AnsiUtils.reset();
            }
            
            // Add borders
            if (this.options.border && borderChars) {
                line = this.themeManager.applyBorderColor(borderChars.vertical) + 
                      line + 
                      this.themeManager.applyBorderColor(borderChars.vertical);
            }
            
            // Add margins
            line = ' '.repeat(margin.left!) + line + ' '.repeat(margin.right!);
            
            lines.push(line);
        }
        
        // Bottom border
        if (this.options.border && borderChars) {
            const bottomBorder = this.themeManager.applyBorderColor(borderChars.bottomLeft) +
                               this.themeManager.applyBorderColor(borderChars.horizontal.repeat(contentWidth)) +
                               this.themeManager.applyBorderColor(borderChars.bottomRight);
            lines.push(' '.repeat(margin.left!) + bottomBorder + ' '.repeat(margin.right!));
        }
        
        // Bottom margin
        for (let i = 0; i < margin.bottom!; i++) {
            lines.push(' '.repeat(totalWidth));
        }
        
        this.markClean();
        return lines.join('\n');
    }

    /**
     * Set box options
     */
    setOptions(options: Partial<BoxOptions>): void {
        this.options = { ...this.options, ...options };
        this.updateLayout();
        this.markDirty();
    }

    /**
     * Get box options
     */
    getOptions(): BoxOptions {
        return this.options;
    }

    /**
     * Set theme
     */
    setTheme(theme: Theme | string): void {
        this.themeManager.setTheme(theme);
        this.markDirty();
    }

    /**
     * Focus the box or its first child
     */
    focus(): void {
        super.focus();
        if (this.children.length > 0 && !this.children[0].isFocused()) {
            this.children[0].focus();
        }
    }

    /**
     * Blur the box and its children
     */
    blur(): void {
        super.blur();
        for (const child of this.children) {
            child.blur();
        }
    }

    /**
     * Set size and update layout
     */
    setSize(size: Size): void {
        super.setSize(size);
        this.updateLayout();
    }
}
