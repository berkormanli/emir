import { Position, Size } from './types';

/**
 * Layout constraints for components
 */
export interface LayoutConstraints {
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
    width?: number | string;  // Can be percentage like '50%'
    height?: number | string;
}

/**
 * Padding/Margin configuration
 */
export interface Spacing {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
}

/**
 * Alignment options
 */
export type Alignment = 'start' | 'center' | 'end' | 'stretch';
export type JustifyContent = 'start' | 'center' | 'end' | 'space-between' | 'space-around' | 'space-evenly';
export type AlignItems = 'start' | 'center' | 'end' | 'stretch' | 'baseline';

/**
 * Direction for flex layouts
 */
export type FlexDirection = 'row' | 'column' | 'row-reverse' | 'column-reverse';

/**
 * Wrap behavior for flex layouts
 */
export type FlexWrap = 'nowrap' | 'wrap' | 'wrap-reverse';

/**
 * Layout utilities class
 */
export class LayoutUtils {
    /**
     * Parse spacing shorthand
     * Can be:
     * - Single number: applied to all sides
     * - Two numbers: [vertical, horizontal]
     * - Three numbers: [top, horizontal, bottom]
     * - Four numbers: [top, right, bottom, left]
     * - Object with specific sides
     */
    static parseSpacing(spacing: number | number[] | Spacing): Spacing {
        if (typeof spacing === 'number') {
            return {
                top: spacing,
                right: spacing,
                bottom: spacing,
                left: spacing
            };
        }
        
        if (Array.isArray(spacing)) {
            switch (spacing.length) {
                case 1:
                    return {
                        top: spacing[0],
                        right: spacing[0],
                        bottom: spacing[0],
                        left: spacing[0]
                    };
                case 2:
                    return {
                        top: spacing[0],
                        right: spacing[1],
                        bottom: spacing[0],
                        left: spacing[1]
                    };
                case 3:
                    return {
                        top: spacing[0],
                        right: spacing[1],
                        bottom: spacing[2],
                        left: spacing[1]
                    };
                case 4:
                    return {
                        top: spacing[0],
                        right: spacing[1],
                        bottom: spacing[2],
                        left: spacing[3]
                    };
                default:
                    return {
                        top: 0,
                        right: 0,
                        bottom: 0,
                        left: 0
                    };
            }
        }
        
        return {
            top: spacing.top || 0,
            right: spacing.right || 0,
            bottom: spacing.bottom || 0,
            left: spacing.left || 0
        };
    }

    /**
     * Calculate content area after applying padding
     */
    static getContentArea(size: Size, padding: Spacing): Size {
        const parsedPadding = this.parseSpacing(padding);
        return {
            width: Math.max(0, size.width - parsedPadding.left! - parsedPadding.right!),
            height: Math.max(0, size.height - parsedPadding.top! - parsedPadding.bottom!)
        };
    }

    /**
     * Calculate outer size including margin
     */
    static getOuterSize(size: Size, margin: Spacing): Size {
        const parsedMargin = this.parseSpacing(margin);
        return {
            width: size.width + parsedMargin.left! + parsedMargin.right!,
            height: size.height + parsedMargin.top! + parsedMargin.bottom!
        };
    }

    /**
     * Apply layout constraints to a size
     */
    static applyConstraints(size: Size, constraints: LayoutConstraints, parentSize?: Size): Size {
        let { width, height } = size;

        // Apply width constraints
        if (constraints.width !== undefined) {
            if (typeof constraints.width === 'string' && constraints.width.endsWith('%') && parentSize) {
                const percentage = parseFloat(constraints.width) / 100;
                width = Math.floor(parentSize.width * percentage);
            } else if (typeof constraints.width === 'number') {
                width = constraints.width;
            }
        }

        if (constraints.minWidth !== undefined) {
            width = Math.max(width, constraints.minWidth);
        }

        if (constraints.maxWidth !== undefined) {
            width = Math.min(width, constraints.maxWidth);
        }

        // Apply height constraints
        if (constraints.height !== undefined) {
            if (typeof constraints.height === 'string' && constraints.height.endsWith('%') && parentSize) {
                const percentage = parseFloat(constraints.height) / 100;
                height = Math.floor(parentSize.height * percentage);
            } else if (typeof constraints.height === 'number') {
                height = constraints.height;
            }
        }

        if (constraints.minHeight !== undefined) {
            height = Math.max(height, constraints.minHeight);
        }

        if (constraints.maxHeight !== undefined) {
            height = Math.min(height, constraints.maxHeight);
        }

        return { width, height };
    }

    /**
     * Calculate position based on alignment within parent
     */
    static alignInParent(
        childSize: Size,
        parentSize: Size,
        horizontalAlign: Alignment = 'start',
        verticalAlign: Alignment = 'start'
    ): Position {
        let x = 0;
        let y = 0;

        // Horizontal alignment
        switch (horizontalAlign) {
            case 'center':
                x = Math.floor((parentSize.width - childSize.width) / 2);
                break;
            case 'end':
                x = parentSize.width - childSize.width;
                break;
            case 'stretch':
            case 'start':
            default:
                x = 0;
        }

        // Vertical alignment
        switch (verticalAlign) {
            case 'center':
                y = Math.floor((parentSize.height - childSize.height) / 2);
                break;
            case 'end':
                y = parentSize.height - childSize.height;
                break;
            case 'stretch':
            case 'start':
            default:
                y = 0;
        }

        return { x: Math.max(0, x), y: Math.max(0, y) };
    }

    /**
     * Distribute space for flex layouts
     */
    static distributeFlexSpace(
        availableSpace: number,
        itemCount: number,
        gap: number,
        justifyContent: JustifyContent
    ): { positions: number[], spacing: number } {
        const positions: number[] = [];
        const totalGapSpace = gap * Math.max(0, itemCount - 1);
        const remainingSpace = Math.max(0, availableSpace - totalGapSpace);

        switch (justifyContent) {
            case 'start':
                for (let i = 0; i < itemCount; i++) {
                    positions.push(i * gap);
                }
                return { positions, spacing: gap };

            case 'end':
                const startOffset = availableSpace - totalGapSpace;
                for (let i = 0; i < itemCount; i++) {
                    positions.push(startOffset + (i * gap));
                }
                return { positions, spacing: gap };

            case 'center':
                const centerOffset = Math.floor((availableSpace - totalGapSpace) / 2);
                for (let i = 0; i < itemCount; i++) {
                    positions.push(centerOffset + (i * gap));
                }
                return { positions, spacing: gap };

            case 'space-between':
                if (itemCount <= 1) {
                    positions.push(0);
                    return { positions, spacing: 0 };
                }
                const betweenSpacing = availableSpace / (itemCount - 1);
                for (let i = 0; i < itemCount; i++) {
                    positions.push(i * betweenSpacing);
                }
                return { positions, spacing: betweenSpacing };

            case 'space-around':
                const aroundSpacing = availableSpace / itemCount;
                const itemSpacing = aroundSpacing;
                for (let i = 0; i < itemCount; i++) {
                    positions.push((aroundSpacing / 2) + (i * itemSpacing));
                }
                return { positions, spacing: itemSpacing };

            case 'space-evenly':
                const evenSpacing = availableSpace / (itemCount + 1);
                for (let i = 0; i < itemCount; i++) {
                    positions.push(evenSpacing * (i + 1));
                }
                return { positions, spacing: evenSpacing };

            default:
                return { positions: [], spacing: 0 };
        }
    }

    /**
     * Calculate grid cell positions
     */
    static calculateGridLayout(
        containerSize: Size,
        columns: number,
        rows: number,
        gap: number = 0,
        padding: Spacing = {}
    ): { cellSize: Size, positions: Position[] } {
        const parsedPadding = this.parseSpacing(padding);
        const contentWidth = containerSize.width - parsedPadding.left! - parsedPadding.right!;
        const contentHeight = containerSize.height - parsedPadding.top! - parsedPadding.bottom!;

        const totalGapWidth = gap * Math.max(0, columns - 1);
        const totalGapHeight = gap * Math.max(0, rows - 1);

        const cellWidth = Math.floor((contentWidth - totalGapWidth) / columns);
        const cellHeight = Math.floor((contentHeight - totalGapHeight) / rows);

        const positions: Position[] = [];

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < columns; col++) {
                positions.push({
                    x: parsedPadding.left! + col * (cellWidth + gap),
                    y: parsedPadding.top! + row * (cellHeight + gap)
                });
            }
        }

        return {
            cellSize: { width: cellWidth, height: cellHeight },
            positions
        };
    }

    /**
     * Clip content to fit within bounds
     */
    static clipToBounds(content: string[], maxWidth: number, maxHeight: number): string[] {
        const clipped: string[] = [];
        
        for (let i = 0; i < Math.min(content.length, maxHeight); i++) {
            const line = content[i];
            if (line.length > maxWidth) {
                clipped.push(line.substring(0, maxWidth));
            } else {
                clipped.push(line);
            }
        }
        
        return clipped;
    }

    /**
     * Merge positions (useful for nested layouts)
     */
    static mergePositions(parent: Position, child: Position): Position {
        return {
            x: parent.x + child.x,
            y: parent.y + child.y
        };
    }

    /**
     * Check if a position is within bounds
     */
    static isInBounds(position: Position, size: Size, bounds: Size): boolean {
        return position.x >= 0 &&
               position.y >= 0 &&
               position.x + size.width <= bounds.width &&
               position.y + size.height <= bounds.height;
    }

    /**
     * Calculate flex item sizes with flex-grow support
     */
    static calculateFlexItemSizes(
        items: Array<{ flexGrow?: number, minSize?: number, maxSize?: number }>,
        availableSpace: number,
        gap: number
    ): number[] {
        const totalGap = gap * Math.max(0, items.length - 1);
        let remainingSpace = availableSpace - totalGap;
        const sizes: number[] = new Array(items.length).fill(0);
        
        // First pass: allocate minimum sizes
        items.forEach((item, index) => {
            const minSize = item.minSize || 0;
            sizes[index] = minSize;
            remainingSpace -= minSize;
        });
        
        // Second pass: distribute remaining space based on flex-grow
        const totalFlexGrow = items.reduce((sum, item) => sum + (item.flexGrow || 0), 0);
        
        if (totalFlexGrow > 0 && remainingSpace > 0) {
            items.forEach((item, index) => {
                if (item.flexGrow) {
                    const extraSpace = Math.floor(remainingSpace * (item.flexGrow / totalFlexGrow));
                    sizes[index] += extraSpace;
                    
                    // Apply max size constraint
                    if (item.maxSize && sizes[index] > item.maxSize) {
                        sizes[index] = item.maxSize;
                    }
                }
            });
        }
        
        return sizes;
    }
}
