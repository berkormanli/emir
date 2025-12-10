import { Box, BoxOptions } from './box';
import { BaseComponent } from './base-component';
import { Position, Size } from './types';
import { LayoutUtils, Alignment } from './layout-utils';

/**
 * Grid item configuration
 */
export interface GridItem {
    component: BaseComponent;
    column?: number;
    row?: number;
    columnSpan?: number;
    rowSpan?: number;
    alignSelf?: Alignment;
    justifySelf?: Alignment;
}

/**
 * Grid template for columns/rows
 */
export type GridTemplate = number | string | (number | string)[];

/**
 * Grid component options
 */
export interface GridOptions extends BoxOptions {
    columns?: GridTemplate;
    rows?: GridTemplate;
    gap?: number;
    rowGap?: number;
    columnGap?: number;
    alignItems?: Alignment;
    justifyItems?: Alignment;
    autoFlow?: 'row' | 'column' | 'dense';
    autoRows?: number | string;
    autoColumns?: number | string;
}

/**
 * Grid component - implements CSS Grid-like layout
 */
export class Grid extends Box {
    protected gridItems: GridItem[];
    protected gridOptions: GridOptions;
    private columnSizes: number[];
    private rowSizes: number[];
    private gridColumns: number;
    private gridRows: number;

    constructor(
        id: string,
        options: GridOptions = {},
        position?: Position,
        size?: Size
    ) {
        super(id, options, position, size);
        this.gridItems = [];
        this.gridOptions = {
            columns: 1,
            rows: 1,
            gap: 0,
            alignItems: 'stretch',
            justifyItems: 'stretch',
            autoFlow: 'row',
            ...options
        };
        this.columnSizes = [];
        this.rowSizes = [];
        this.gridColumns = 1;
        this.gridRows = 1;
    }

    /**
     * Add a grid item
     */
    addGridItem(item: GridItem): void {
        this.gridItems.push(item);
        this.children.push(item.component);
        this.updateLayout();
        this.markDirty();
    }

    /**
     * Remove a grid item
     */
    removeGridItem(componentId: string): boolean {
        const index = this.gridItems.findIndex(item => item.component.getId() === componentId);
        if (index !== -1) {
            this.gridItems.splice(index, 1);
            return this.removeChild(componentId);
        }
        return false;
    }

    /**
     * Get grid items
     */
    getGridItems(): GridItem[] {
        return this.gridItems;
    }

    /**
     * Parse grid template to get sizes
     */
    private parseGridTemplate(template: GridTemplate, availableSize: number): number[] {
        const sizes: number[] = [];
        
        if (typeof template === 'number') {
            // Single number means that many equal columns/rows
            const count = template;
            const size = Math.floor(availableSize / count);
            for (let i = 0; i < count; i++) {
                sizes.push(size);
            }
        } else if (typeof template === 'string') {
            // Parse string template (e.g., "1fr 2fr 100px")
            const parts = template.split(' ').filter(p => p);
            const frTotal = parts.filter(p => p.endsWith('fr')).reduce((sum, p) => {
                return sum + parseFloat(p);
            }, 0);
            
            let remainingSize = availableSize;
            const frSizes: { index: number, fraction: number }[] = [];
            
            // First pass: fixed sizes
            parts.forEach((part, index) => {
                if (part.endsWith('px')) {
                    const pixels = parseInt(part);
                    sizes[index] = pixels;
                    remainingSize -= pixels;
                } else if (part.endsWith('%')) {
                    const percentage = parseFloat(part) / 100;
                    const pixels = Math.floor(availableSize * percentage);
                    sizes[index] = pixels;
                    remainingSize -= pixels;
                } else if (part.endsWith('fr')) {
                    frSizes.push({ index, fraction: parseFloat(part) });
                    sizes[index] = 0; // Placeholder
                } else {
                    // Assume pixels if no unit
                    const pixels = parseInt(part) || 0;
                    sizes[index] = pixels;
                    remainingSize -= pixels;
                }
            });
            
            // Second pass: fractional units
            if (frTotal > 0 && remainingSize > 0) {
                const frUnit = remainingSize / frTotal;
                frSizes.forEach(({ index, fraction }) => {
                    sizes[index] = Math.floor(frUnit * fraction);
                });
            }
        } else if (Array.isArray(template)) {
            // Array of sizes
            template.forEach((size, index) => {
                if (typeof size === 'number') {
                    sizes[index] = size;
                } else if (typeof size === 'string') {
                    if (size.endsWith('%')) {
                        sizes[index] = Math.floor(availableSize * (parseFloat(size) / 100));
                    } else if (size.endsWith('fr')) {
                        // For simplicity, treat 1fr as equal distribution
                        sizes[index] = Math.floor(availableSize / template.length);
                    } else {
                        sizes[index] = parseInt(size) || 0;
                    }
                }
            });
        }
        
        return sizes;
    }

    /**
     * Calculate grid dimensions
     */
    private calculateGridDimensions(): void {
        const columns = this.gridOptions.columns || 1;
        const rows = this.gridOptions.rows || 1;
        
        if (typeof columns === 'number') {
            this.gridColumns = columns;
        } else if (typeof columns === 'string') {
            this.gridColumns = columns.split(' ').filter(p => p).length;
        } else if (Array.isArray(columns)) {
            this.gridColumns = columns.length;
        }
        
        if (typeof rows === 'number') {
            this.gridRows = rows;
        } else if (typeof rows === 'string') {
            this.gridRows = rows.split(' ').filter(p => p).length;
        } else if (Array.isArray(rows)) {
            this.gridRows = rows.length;
        }
        
        // Auto-calculate rows if needed based on items
        if (this.gridOptions.autoFlow === 'row' && this.gridItems.length > this.gridColumns * this.gridRows) {
            this.gridRows = Math.ceil(this.gridItems.length / this.gridColumns);
        } else if (this.gridOptions.autoFlow === 'column' && this.gridItems.length > this.gridColumns * this.gridRows) {
            this.gridColumns = Math.ceil(this.gridItems.length / this.gridRows);
        }
    }

    /**
     * Update layout calculations for grid
     */
    protected updateLayout(): void {
        // First, let Box handle its layout (padding, margin, border)
        super.updateLayout();
        
        if (this.gridItems.length === 0) return;
        
        // Calculate grid dimensions
        this.calculateGridDimensions();
        
        const gap = this.gridOptions.gap || 0;
        const rowGap = this.gridOptions.rowGap ?? gap;
        const columnGap = this.gridOptions.columnGap ?? gap;
        
        // Calculate available space
        const totalColumnGap = columnGap * Math.max(0, this.gridColumns - 1);
        const totalRowGap = rowGap * Math.max(0, this.gridRows - 1);
        const availableWidth = this.contentSize.width - totalColumnGap;
        const availableHeight = this.contentSize.height - totalRowGap;
        
        // Parse grid templates to get sizes
        this.columnSizes = this.parseGridTemplate(
            this.gridOptions.columns || this.gridColumns,
            availableWidth
        );
        this.rowSizes = this.parseGridTemplate(
            this.gridOptions.rows || this.gridRows,
            availableHeight
        );
        
        // Position items in grid
        const padding = LayoutUtils.parseSpacing(this.options.padding || 0);
        const autoFlow = this.gridOptions.autoFlow || 'row';
        let autoColumn = 0;
        let autoRow = 0;
        
        this.gridItems.forEach((item, index) => {
            const component = item.component;
            
            // Determine grid position
            let column = item.column;
            let row = item.row;
            
            // Auto-placement if position not specified
            if (column === undefined || row === undefined) {
                if (autoFlow === 'row') {
                    column = autoColumn;
                    row = autoRow;
                    autoColumn++;
                    if (autoColumn >= this.gridColumns) {
                        autoColumn = 0;
                        autoRow++;
                    }
                } else if (autoFlow === 'column') {
                    column = autoColumn;
                    row = autoRow;
                    autoRow++;
                    if (autoRow >= this.gridRows) {
                        autoRow = 0;
                        autoColumn++;
                    }
                }
            }
            
            // Ensure valid position
            column = Math.min(column || 0, this.gridColumns - 1);
            row = Math.min(row || 0, this.gridRows - 1);
            
            // Calculate spans
            const columnSpan = Math.min(item.columnSpan || 1, this.gridColumns - column);
            const rowSpan = Math.min(item.rowSpan || 1, this.gridRows - row);
            
            // Calculate cell size
            let cellWidth = 0;
            let cellHeight = 0;
            
            for (let c = column; c < column + columnSpan; c++) {
                cellWidth += this.columnSizes[c] || 0;
                if (c < column + columnSpan - 1) {
                    cellWidth += columnGap;
                }
            }
            
            for (let r = row; r < row + rowSpan; r++) {
                cellHeight += this.rowSizes[r] || 0;
                if (r < row + rowSpan - 1) {
                    cellHeight += rowGap;
                }
            }
            
            // Apply alignment
            const alignItems = item.alignSelf || this.gridOptions.alignItems || 'stretch';
            const justifyItems = item.justifySelf || this.gridOptions.justifyItems || 'stretch';
            
            let itemWidth = cellWidth;
            let itemHeight = cellHeight;
            let offsetX = 0;
            let offsetY = 0;
            
            // Handle justify (horizontal in LTR)
            if (justifyItems !== 'stretch') {
                itemWidth = Math.min(component.getSize().width, cellWidth);
                switch (justifyItems) {
                    case 'center':
                        offsetX = Math.floor((cellWidth - itemWidth) / 2);
                        break;
                    case 'end':
                        offsetX = cellWidth - itemWidth;
                        break;
                }
            }
            
            // Handle align (vertical)
            if (alignItems !== 'stretch') {
                itemHeight = Math.min(component.getSize().height, cellHeight);
                switch (alignItems) {
                    case 'center':
                        offsetY = Math.floor((cellHeight - itemHeight) / 2);
                        break;
                    case 'end':
                        offsetY = cellHeight - itemHeight;
                        break;
                }
            }
            
            // Set component size
            component.setSize({ width: itemWidth, height: itemHeight });
            
            // Calculate position
            let x = 0;
            let y = 0;
            
            // Sum up column positions
            for (let c = 0; c < column; c++) {
                x += this.columnSizes[c] || 0;
                x += columnGap;
            }
            
            // Sum up row positions
            for (let r = 0; r < row; r++) {
                y += this.rowSizes[r] || 0;
                y += rowGap;
            }
            
            // Add offset from alignment
            x += offsetX;
            y += offsetY;
            
            // Add padding offset
            x += padding.left!;
            y += padding.top!;
            
            // Account for border
            if (this.options.border) {
                x += 1;
                y += 1;
                
                // Account for title
                if (this.options.title) {
                    y += 1;
                }
            }
            
            component.setPosition({ x, y });
        });
    }

    /**
     * Set grid options
     */
    setGridOptions(options: Partial<GridOptions>): void {
        this.gridOptions = { ...this.gridOptions, ...options };
        this.options = { ...this.options, ...options };
        this.updateLayout();
        this.markDirty();
    }

    /**
     * Get grid options
     */
    getGridOptions(): GridOptions {
        return this.gridOptions;
    }

    /**
     * Clear all grid items
     */
    clearGridItems(): void {
        this.gridItems = [];
        this.clearChildren();
    }

    /**
     * Update a grid item's configuration
     */
    updateGridItem(componentId: string, config: Partial<GridItem>): boolean {
        const item = this.gridItems.find(i => i.component.getId() === componentId);
        if (item) {
            Object.assign(item, config);
            this.updateLayout();
            this.markDirty();
            return true;
        }
        return false;
    }

    /**
     * Get grid item by component ID
     */
    getGridItem(componentId: string): GridItem | undefined {
        return this.gridItems.find(item => item.component.getId() === componentId);
    }

    /**
     * Get grid dimensions
     */
    getGridDimensions(): { columns: number, rows: number } {
        return {
            columns: this.gridColumns,
            rows: this.gridRows
        };
    }

    /**
     * Get cell size at position
     */
    getCellSize(column: number, row: number): Size | null {
        if (column < 0 || column >= this.gridColumns || 
            row < 0 || row >= this.gridRows) {
            return null;
        }
        
        return {
            width: this.columnSizes[column] || 0,
            height: this.rowSizes[row] || 0
        };
    }
}
