import { Box, BoxOptions } from './box';
import { BaseComponent } from './base-component';
import { Position, Size } from './types';
import { 
    LayoutUtils, 
    FlexDirection, 
    JustifyContent, 
    AlignItems, 
    FlexWrap 
} from './layout-utils';

/**
 * Flex item configuration
 */
export interface FlexItem {
    component: BaseComponent;
    flexGrow?: number;
    flexShrink?: number;
    flexBasis?: number | string;
    alignSelf?: AlignItems | 'auto';
    minSize?: number;
    maxSize?: number;
}

/**
 * Flex component options
 */
export interface FlexOptions extends BoxOptions {
    direction?: FlexDirection;
    justifyContent?: JustifyContent;
    alignItems?: AlignItems;
    flexWrap?: FlexWrap;
    gap?: number;
    rowGap?: number;
    columnGap?: number;
}

/**
 * Flex component - implements flexbox-like layout
 */
export class Flex extends Box {
    protected flexItems: FlexItem[];
    protected flexOptions: FlexOptions;

    constructor(
        id: string,
        options: FlexOptions = {},
        position?: Position,
        size?: Size
    ) {
        super(id, options, position, size);
        this.flexItems = [];
        this.flexOptions = {
            direction: 'row',
            justifyContent: 'start',
            alignItems: 'stretch',
            flexWrap: 'nowrap',
            gap: 0,
            ...options
        };
    }

    /**
     * Add a flex item
     */
    addFlexItem(item: FlexItem): void {
        this.flexItems.push(item);
        this.children.push(item.component);
        this.updateLayout();
        this.markDirty();
    }

    /**
     * Remove a flex item
     */
    removeFlexItem(componentId: string): boolean {
        const index = this.flexItems.findIndex(item => item.component.getId() === componentId);
        if (index !== -1) {
            this.flexItems.splice(index, 1);
            return this.removeChild(componentId);
        }
        return false;
    }

    /**
     * Get flex items
     */
    getFlexItems(): FlexItem[] {
        return this.flexItems;
    }

    /**
     * Update layout calculations for flex
     */
    protected updateLayout(): void {
        // First, let Box handle its layout (padding, margin, border)
        super.updateLayout();
        
        if (this.flexItems.length === 0) return;
        
        const direction = this.flexOptions.direction || 'row';
        const justifyContent = this.flexOptions.justifyContent || 'start';
        const alignItems = this.flexOptions.alignItems || 'stretch';
        const flexWrap = this.flexOptions.flexWrap || 'nowrap';
        const gap = this.flexOptions.gap || 0;
        const rowGap = this.flexOptions.rowGap ?? gap;
        const columnGap = this.flexOptions.columnGap ?? gap;
        
        // Determine main and cross axis
        const isRow = direction === 'row' || direction === 'row-reverse';
        const isReverse = direction === 'row-reverse' || direction === 'column-reverse';
        
        const mainAxisSize = isRow ? this.contentSize.width : this.contentSize.height;
        const crossAxisSize = isRow ? this.contentSize.height : this.contentSize.width;
        const mainAxisGap = isRow ? columnGap : rowGap;
        const crossAxisGap = isRow ? rowGap : columnGap;
        
        // Calculate flex item sizes
        const itemConfigs = this.flexItems.map(item => ({
            flexGrow: item.flexGrow || 0,
            minSize: item.minSize || 0,
            maxSize: item.maxSize
        }));
        
        const itemSizes = LayoutUtils.calculateFlexItemSizes(
            itemConfigs,
            mainAxisSize,
            mainAxisGap
        );
        
        // Calculate positions based on justifyContent
        const distribution = LayoutUtils.distributeFlexSpace(
            mainAxisSize,
            this.flexItems.length,
            mainAxisGap,
            justifyContent
        );
        
        // Position items
        let currentMainPos = 0;
        let currentCrossPos = 0;
        let currentLineHeight = 0;
        let lineStartIndex = 0;
        
        this.flexItems.forEach((item, index) => {
            const component = item.component;
            const mainSize = itemSizes[index];
            let crossSize = crossAxisSize;
            
            // Handle align-self
            const itemAlign = item.alignSelf === 'auto' ? alignItems : item.alignSelf;
            
            // Calculate cross-axis size based on alignment
            if (itemAlign === 'stretch') {
                crossSize = crossAxisSize;
            } else {
                crossSize = isRow ? component.getSize().height : component.getSize().width;
            }
            
            // Set component size
            if (isRow) {
                component.setSize({ width: mainSize, height: crossSize });
            } else {
                component.setSize({ width: crossSize, height: mainSize });
            }
            
            // Calculate position
            let mainPos = distribution.positions[index] || currentMainPos;
            let crossPos = 0;
            
            // Handle cross-axis alignment
            switch (itemAlign) {
                case 'center':
                    crossPos = Math.floor((crossAxisSize - crossSize) / 2);
                    break;
                case 'end':
                    crossPos = crossAxisSize - crossSize;
                    break;
                case 'stretch':
                case 'start':
                default:
                    crossPos = 0;
            }
            
            // Handle wrapping
            if (flexWrap !== 'nowrap') {
                // Check if item fits on current line
                if (currentMainPos + mainSize > mainAxisSize && index > lineStartIndex) {
                    // Start new line
                    currentCrossPos += currentLineHeight + crossAxisGap;
                    currentMainPos = 0;
                    currentLineHeight = crossSize;
                    lineStartIndex = index;
                    mainPos = 0;
                }
                
                crossPos += currentCrossPos;
                currentLineHeight = Math.max(currentLineHeight, crossSize);
            }
            
            // Apply reverse if needed
            if (isReverse) {
                if (isRow) {
                    mainPos = mainAxisSize - mainPos - mainSize;
                } else {
                    mainPos = mainAxisSize - mainPos - mainSize;
                }
            }
            
            // Set final position accounting for padding and border
            const padding = LayoutUtils.parseSpacing(this.options.padding || 0);
            const position: Position = {
                x: isRow ? mainPos : crossPos,
                y: isRow ? crossPos : mainPos
            };
            
            // Add padding offset
            position.x += padding.left!;
            position.y += padding.top!;
            
            // Account for border
            if (this.options.border) {
                position.x += 1;
                position.y += 1;
                
                // Account for title
                if (this.options.title) {
                    position.y += 1;
                }
            }
            
            component.setPosition(position);
            
            // Update current position for next item
            currentMainPos = mainPos + mainSize + mainAxisGap;
        });
    }

    /**
     * Set flex options
     */
    setFlexOptions(options: Partial<FlexOptions>): void {
        this.flexOptions = { ...this.flexOptions, ...options };
        this.options = { ...this.options, ...options };
        this.updateLayout();
        this.markDirty();
    }

    /**
     * Get flex options
     */
    getFlexOptions(): FlexOptions {
        return this.flexOptions;
    }

    /**
     * Clear all flex items
     */
    clearFlexItems(): void {
        this.flexItems = [];
        this.clearChildren();
    }

    /**
     * Update a flex item's configuration
     */
    updateFlexItem(componentId: string, config: Partial<FlexItem>): boolean {
        const item = this.flexItems.find(i => i.component.getId() === componentId);
        if (item) {
            Object.assign(item, config);
            this.updateLayout();
            this.markDirty();
            return true;
        }
        return false;
    }

    /**
     * Get flex item by component ID
     */
    getFlexItem(componentId: string): FlexItem | undefined {
        return this.flexItems.find(item => item.component.getId() === componentId);
    }

    /**
     * Reorder flex items
     */
    reorderFlexItems(fromIndex: number, toIndex: number): void {
        if (fromIndex < 0 || fromIndex >= this.flexItems.length ||
            toIndex < 0 || toIndex >= this.flexItems.length) {
            return;
        }
        
        const [item] = this.flexItems.splice(fromIndex, 1);
        this.flexItems.splice(toIndex, 0, item);
        
        // Reorder children to match
        const [child] = this.children.splice(fromIndex, 1);
        this.children.splice(toIndex, 0, child);
        
        this.updateLayout();
        this.markDirty();
    }
}
