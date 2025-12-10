import { BaseComponent } from './base-component.js';
import type { Component, Position, Size } from './types.js';

/**
 * Layout constraints
 */
export interface LayoutConstraints {
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
    aspectRatio?: number;
    flex?: boolean;
    flexBasis?: number;
    flexGrow?: number;
    flexShrink?: number;
}

/**
 * Child layout properties
 */
export interface ChildLayoutProps {
    component: Component;
    constraints?: LayoutConstraints;
    alignSelf?: 'start' | 'center' | 'end' | 'stretch';
    margin?: {
        top?: number;
        right?: number;
        bottom?: number;
        left?: number;
    };
    zIndex?: number;
}

/**
 * Layout direction
 */
export type LayoutDirection = 'row' | 'column' | 'row-reverse' | 'column-reverse';

/**
 * Alignment options
 */
export type AlignItems = 'start' | 'center' | 'end' | 'stretch';
export type JustifyContent = 'start' | 'center' | 'end' | 'space-between' | 'space-around' | 'space-evenly';

/**
 * Wrap mode
 */
export type WrapMode = 'nowrap' | 'wrap' | 'wrap-reverse';

/**
 * Advanced container with multi-child support, wrapping, and constraints
 */
export class AdvancedContainer extends BaseComponent {
    private children: ChildLayoutProps[] = [];
    private direction: LayoutDirection = 'row';
    private justifyContent: JustifyContent = 'start';
    private alignItems: AlignItems = 'start';
    private wrap: WrapMode = 'nowrap';
    private gap: number = 0;
    private padding: number = 0;
    private backgroundChar: string = ' ';
    private layoutCache: Map<string, Size> = new Map();
    private layoutInvalidated: boolean = true;

    constructor(
        id: string,
        position: Position = { x: 0, y: 0 },
        size: Size = { width: 80, height: 24 }
    ) {
        super(id, position, size);
    }

    /**
     * Add a child component with layout properties
     */
    addChild(child: Component, props: Partial<ChildLayoutProps> = {}): void {
        const childProps: ChildLayoutProps = {
            component: child,
            constraints: {
                flex: false,
                flexGrow: 0,
                flexShrink: 1,
                ...props.constraints
            },
            alignSelf: props.alignSelf || 'stretch',
            margin: props.margin || { top: 0, right: 0, bottom: 0, left: 0 },
            zIndex: props.zIndex || 0
        };

        this.children.push(childProps);
        this.invalidateLayout();
    }

    /**
     * Remove a child component
     */
    removeChild(componentId: string): boolean {
        const index = this.children.findIndex(c => c.component.id === componentId);
        if (index !== -1) {
            this.children.splice(index, 1);
            this.invalidateLayout();
            return true;
        }
        return false;
    }

    /**
     * Set layout direction
     */
    setDirection(direction: LayoutDirection): void {
        if (this.direction !== direction) {
            this.direction = direction;
            this.invalidateLayout();
        }
    }

    /**
     * Set justify content alignment
     */
    setJustifyContent(justify: JustifyContent): void {
        if (this.justifyContent !== justify) {
            this.justifyContent = justify;
            this.invalidateLayout();
        }
    }

    /**
     * Set cross-axis alignment
     */
    setAlignItems(align: AlignItems): void {
        if (this.alignItems !== align) {
            this.alignItems = align;
            this.invalidateLayout();
        }
    }

    /**
     * Set wrap mode
     */
    setWrap(wrap: WrapMode): void {
        if (this.wrap !== wrap) {
            this.wrap = wrap;
            this.invalidateLayout();
        }
    }

    /**
     * Set gap between children
     */
    setGap(gap: number): void {
        if (this.gap !== gap) {
            this.gap = gap;
            this.invalidateLayout();
        }
    }

    /**
     * Set padding
     */
    setPadding(padding: number): void {
        if (this.padding !== padding) {
            this.padding = padding;
            this.invalidateLayout();
        }
    }

    /**
     * Set background character
     */
    setBackgroundChar(char: string): void {
        if (this.backgroundChar !== char) {
            this.backgroundChar = char;
            this.markDirty();
        }
    }

    /**
     * Invalidate layout cache
     */
    private invalidateLayout(): void {
        this.layoutInvalidated = true;
        this.layoutCache.clear();
        this.markDirty();
    }

    /**
     * Calculate layout for all children
     */
    private calculateLayout(): void {
        if (!this.layoutInvalidated && this.layoutCache.size > 0) {
            return;
        }

        const availableWidth = this.size.width - (this.padding * 2);
        const availableHeight = this.size.height - (this.padding * 2);

        // Clear previous layout
        this.layoutCache.clear();

        // Sort children by zIndex
        const sortedChildren = [...this.children].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

        if (this.wrap === 'nowrap') {
            this.calculateNoWrapLayout(sortedChildren, availableWidth, availableHeight);
        } else {
            this.calculateWrapLayout(sortedChildren, availableWidth, availableHeight);
        }

        this.layoutInvalidated = false;
    }

    /**
     * Calculate layout for non-wrapping children
     */
    private calculateNoWrapLayout(children: ChildLayoutProps[], availableWidth: number, availableHeight: number): void {
        const isRow = this.direction === 'row' || this.direction === 'row-reverse';
        const isReversed = this.direction === 'row-reverse' || this.direction === 'column-reverse';

        // Calculate total size including gaps and margins
        let totalFlexGrow = 0;
        let totalFixedSize = 0;
        const childSizes: Size[] = [];

        // First pass: calculate fixed sizes
        for (const child of children) {
            const margin = child.margin || { top: 0, right: 0, bottom: 0, left: 0 };
            const constraints = child.constraints || {};

            let childSize: Size;

            // Get natural size from component
            const naturalSize = child.component.getSize();

            if (constraints.flex && constraints.flexGrow && constraints.flexGrow > 0) {
                totalFlexGrow += constraints.flexGrow;
                childSize = { width: 0, height: 0 }; // Will be calculated later
            } else {
                childSize = {
                    width: this.applyConstraints(naturalSize.width, constraints, 'width', availableWidth),
                    height: this.applyConstraints(naturalSize.height, constraints, 'height', availableHeight)
                };
            }

            // Apply alignSelf for cross axis
            if (isRow && child.alignSelf !== 'stretch') {
                childSize.height = Math.min(childSize.height, availableHeight);
            } else if (!isRow && child.alignSelf !== 'stretch') {
                childSize.width = Math.min(childSize.width, availableWidth);
            }

            childSizes.push(childSize);

            // Add to total size
            if (isRow) {
                totalFixedSize += childSize.width + margin.left + margin.right;
            } else {
                totalFixedSize += childSize.height + margin.top + margin.bottom;
            }
        }

        // Add gaps
        const totalGaps = Math.max(0, children.length - 1) * this.gap;
        totalFixedSize += totalGaps;

        // Calculate remaining space for flex items
        const availableSpace = isRow ? availableWidth - totalFixedSize : availableHeight - totalFixedSize;

        // Second pass: distribute remaining space to flex items
        let currentPos = 0;

        // Apply justify content offset
        const justifyContentOffset = this.calculateJustifyContentOffset(totalFixedSize, availableSpace);

        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            const margin = child.margin || { top: 0, right: 0, bottom: 0, left: 0 };
            const constraints = child.constraints || {};
            let childSize = childSizes[i];

            // Calculate flex size if needed
            if (constraints.flex && constraints.flexGrow && constraints.flexGrow > 0) {
                const flexSize = Math.floor((availableSpace * constraints.flexGrow) / totalFlexGrow);

                if (isRow) {
                    childSize.width = Math.max(1, flexSize);
                    childSize.height = this.applyConstraints(
                        childSize.height,
                        constraints,
                        'height',
                        availableHeight
                    );
                } else {
                    childSize.height = Math.max(1, flexSize);
                    childSize.width = this.applyConstraints(
                        childSize.width,
                        constraints,
                        'width',
                        availableWidth
                    );
                }
            }

            // Calculate position
            let x = this.padding;
            let y = this.padding;

            if (isReversed) {
                // Start from the end
                if (isRow) {
                    x = this.padding + availableWidth - currentPos - childSize.width - margin.right;
                } else {
                    y = this.padding + availableHeight - currentPos - childSize.height - margin.bottom;
                }
            } else {
                // Start from the beginning
                if (isRow) {
                    x = this.padding + justifyContentOffset + currentPos + margin.left;
                } else {
                    y = this.padding + justifyContentOffset + currentPos + margin.top;
                }
            }

            // Apply cross-axis alignment
            if (isRow) {
                const crossSize = childSize.height;
                const availableCross = availableHeight;
                const alignOffset = this.calculateAlignOffset(crossSize, availableCross, child.alignSelf || this.alignItems);
                y += alignOffset + margin.top;
            } else {
                const crossSize = childSize.width;
                const availableCross = availableWidth;
                const alignOffset = this.calculateAlignOffset(crossSize, availableCross, child.alignSelf || this.alignItems);
                x += alignOffset + margin.left;
            }

            // Set component position and size
            const childPosition = {
                x: this.position.x + x,
                y: this.position.y + y
            };

            child.component.setPosition(childPosition);
            child.component.setSize(childSize);

            // Store in cache
            this.layoutCache.set(child.component.id, childSize);

            // Update current position for next item
            if (!isReversed) {
                if (isRow) {
                    currentPos += childSize.width + margin.left + margin.right + this.gap;
                } else {
                    currentPos += childSize.height + margin.top + margin.bottom + this.gap;
                }
            } else {
                if (isRow) {
                    currentPos += childSize.width + margin.left + margin.right + this.gap;
                } else {
                    currentPos += childSize.height + margin.top + margin.bottom + this.gap;
                }
            }
        }
    }

    /**
     * Calculate layout for wrapping children
     */
    private calculateWrapLayout(children: ChildLayoutProps[], availableWidth: number, availableHeight: number): void {
        const isRow = this.direction === 'row' || this.direction === 'row-reverse';
        const isReversed = this.direction === 'row-reverse' || this.direction === 'column-reverse';
        const isWrapReverse = this.wrap === 'wrap-reverse';

        let currentLinePos = 0;
        let currentCrossPos = 0;
        let maxCrossSize = 0;
        const lines: ChildLayoutProps[][] = [];
        let currentLine: ChildLayoutProps[] = [];

        // Group children into lines
        for (const child of children) {
            const margin = child.margin || { top: 0, right: 0, bottom: 0, left: 0 };
            const naturalSize = child.component.getSize();
            const constraints = child.constraints || {};

            let childSize: Size;
            if (isRow) {
                childSize = {
                    width: this.applyConstraints(naturalSize.width, constraints, 'width', availableWidth),
                    height: this.applyConstraints(naturalSize.height, constraints, 'height', availableHeight)
                };
            } else {
                childSize = {
                    width: this.applyConstraints(naturalSize.width, constraints, 'width', availableWidth),
                    height: this.applyConstraints(naturalSize.height, constraints, 'height', availableHeight)
                };
            }

            const requiredSize = isRow ?
                childSize.width + margin.left + margin.right :
                childSize.height + margin.top + margin.bottom;

            // Check if child fits in current line
            if (currentLine.length > 0 && currentLinePos + this.gap + requiredSize > (isRow ? availableWidth : availableHeight)) {
                // Start new line
                lines.push(currentLine);
                currentLine = [child];
                currentLinePos = requiredSize;
                maxCrossSize = Math.max(maxCrossSize, isRow ? childSize.height : childSize.width);
            } else {
                // Add to current line
                if (currentLine.length > 0) {
                    currentLinePos += this.gap;
                }
                currentLine.push(child);
                currentLinePos += requiredSize;
                maxCrossSize = Math.max(maxCrossSize, isRow ? childSize.height : childSize.width);
            }
        }

        // Add last line
        if (currentLine.length > 0) {
            lines.push(currentLine);
        }

        // Position lines
        let crossPos = isWrapReverse ? this.size.height - this.padding : this.padding;

        for (const line of lines) {
            // Calculate main axis distribution for this line
            let lineMainPos = 0;
            const totalLineSize = line.reduce((sum, child) => {
                const margin = child.margin || { top: 0, right: 0, bottom: 0, left: 0 };
                const childSize = child.component.getSize();
                return sum + (isRow ? childSize.width + margin.left + margin.right : childSize.height + margin.top + margin.bottom);
            }, 0) + (line.length - 1) * this.gap;

            const mainOffset = this.calculateJustifyContentOffset(totalLineSize, isRow ? availableWidth - totalLineSize : availableHeight - totalLineSize);

            // Position children in line
            for (const child of line) {
                const margin = child.margin || { top: 0, right: 0, bottom: 0, left: 0 };
                const childSize = child.component.getSize();

                let x, y;

                if (isRow) {
                    if (isReversed) {
                        x = this.position.x + this.size.width - this.padding - mainOffset - lineMainPos - childSize.width - margin.right;
                    } else {
                        x = this.position.x + this.padding + mainOffset + lineMainPos + margin.left;
                    }

                    // Apply cross-axis alignment
                    const alignOffset = this.calculateAlignOffset(childSize.height, maxCrossSize, child.alignSelf || this.alignItems);
                    y = this.position.y + crossPos + alignOffset + margin.top;

                    lineMainPos += childSize.width + margin.left + margin.right + this.gap;
                } else {
                    if (isReversed) {
                        y = this.position.y + this.size.height - this.padding - mainOffset - lineMainPos - childSize.height - margin.bottom;
                    } else {
                        y = this.position.y + this.padding + mainOffset + lineMainPos + margin.top;
                    }

                    // Apply cross-axis alignment
                    const alignOffset = this.calculateAlignOffset(childSize.width, maxCrossSize, child.alignSelf || this.alignItems);
                    x = this.position.x + crossPos + alignOffset + margin.left;

                    lineMainPos += childSize.height + margin.top + margin.bottom + this.gap;
                }

                child.component.setPosition({ x, y });
                child.component.setSize(childSize);
                this.layoutCache.set(child.component.id, childSize);
            }

            // Move to next line
            crossPos += isWrapReverse ? -maxCrossSize - this.gap : maxCrossSize + this.gap;
        }
    }

    /**
     * Apply size constraints
     */
    private applyConstraints(size: number, constraints: LayoutConstraints, dimension: 'width' | 'height', available: number): number {
        const minConstraint = dimension === 'width' ? constraints.minWidth : constraints.minHeight;
        const maxConstraint = dimension === 'width' ? constraints.maxWidth : constraints.maxHeight;

        let constrainedSize = size;

        if (minConstraint !== undefined) {
            constrainedSize = Math.max(constrainedSize, minConstraint);
        }

        if (maxConstraint !== undefined) {
            constrainedSize = Math.min(constrainedSize, maxConstraint);
        }

        // Apply aspect ratio if both width and height constraints are present
        if (constraints.aspectRatio && dimension === 'width') {
            const heightForAspectRatio = constrainedSize / constraints.aspectRatio;
            // This is a simplified approach - in a full implementation, we'd need to handle this more carefully
        }

        return Math.min(constrainedSize, available);
    }

    /**
     * Calculate offset for justify content
     */
    private calculateJustifyContentOffset(totalSize: number, availableSpace: number): number {
        switch (this.justifyContent) {
            case 'center':
                return Math.max(0, availableSpace / 2);
            case 'end':
                return Math.max(0, availableSpace);
            case 'space-between':
                // This will be handled in the main layout loop
                return 0;
            case 'space-around':
                // This will be handled in the main layout loop
                return 0;
            case 'space-evenly':
                // This will be handled in the main layout loop
                return 0;
            case 'start':
            default:
                return 0;
        }
    }

    /**
     * Calculate offset for alignment
     */
    private calculateAlignOffset(childSize: number, availableSize: number, alignment: AlignItems): number {
        switch (alignment) {
            case 'center':
                return Math.max(0, (availableSize - childSize) / 2);
            case 'end':
                return Math.max(0, availableSize - childSize);
            case 'stretch':
                return 0; // Child will be stretched to fill
            case 'start':
            default:
                return 0;
        }
    }

    /**
     * Render the container and all children
     */
    render(): string {
        this.calculateLayout();

        // Create output buffer
        const output: string[] = [];

        // Fill background
        if (this.backgroundChar !== ' ') {
            for (let y = 0; y < this.size.height; y++) {
                output.push(this.backgroundChar.repeat(this.size.width));
            }
        } else {
            for (let y = 0; y < this.size.height; y++) {
                output.push(' '.repeat(this.size.width));
            }
        }

        // Render children in z-order
        const sortedChildren = [...this.children].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

        for (const child of sortedChildren) {
            if (!child.component.visible) continue;

            const childContent = child.component.render();
            if (!childContent) continue;

            const childPos = child.component.position;
            const childSize = child.component.size;

            // Calculate relative position
            const relX = childPos.x - this.position.x;
            const relY = childPos.y - this.position.y;

            // Render child content to buffer
            const lines = childContent.split('\n');
            for (let i = 0; i < lines.length && relY + i < this.size.height; i++) {
                if (relY + i >= 0) {
                    const line = lines[i];
                    const lineLength = Math.min(line.length, this.size.width - relX);

                    if (relX >= 0 && relX < this.size.width) {
                        output[relY + i] =
                            output[relY + i].substring(0, relX) +
                            line.substring(0, lineLength) +
                            output[relY + i].substring(relX + lineLength);
                    }
                }
            }
        }

        return output.join('\n');
    }

    /**
     * Handle input events and pass to children
     */
    handleInput(input: string): boolean {
        // Pass input to focused child
        for (const child of this.children) {
            if (child.component.state?.focused && child.component.visible) {
                if (child.component.handleInput(input)) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Update all children
     */
    update(data?: any): void {
        super.update(data);

        for (const child of this.children) {
            child.component.update();
        }
    }

    /**
     * Destroy container and all children
     */
    destroy(): void {
        for (const child of this.children) {
            child.component.destroy();
        }

        this.children = [];
        this.layoutCache.clear();
        super.destroy();
    }
}