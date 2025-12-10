import { BaseComponent } from './base-component';
import { Size, InputEvent } from './types';
import { AnsiUtils } from './ansi-utils';

/**
 * Table column definition
 */
export interface TableColumn {
    key: string;
    header: string;
    width?: number;
    align?: 'left' | 'center' | 'right';
    format?: (value: any, row: any) => string;
    sortable?: boolean;
    color?: number | ((value: any, row: any) => number);
    truncate?: boolean;
    wrap?: boolean;
}

/**
 * Table border style
 */
export type TableBorderStyle = 'none' | 'single' | 'double' | 'rounded' | 'ascii' | 'compact';

/**
 * Sort direction
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Table options
 */
export interface TableOptions {
    borderStyle?: TableBorderStyle;
    showHeader?: boolean;
    showRowNumbers?: boolean;
    highlightHeader?: boolean;
    headerColor?: number;
    alternateRowColor?: boolean;
    evenRowColor?: number;
    oddRowColor?: number;
    selectedRowColor?: number;
    pageSize?: number;
    selectable?: boolean;
    multiSelect?: boolean;
    sortable?: boolean;
    defaultSort?: { column: string; direction: SortDirection };
    padding?: number;
    maxColumnWidth?: number;
    minColumnWidth?: number;
    ellipsis?: string;
}

/**
 * Table component for displaying tabular data
 */
export class Table extends BaseComponent {
    private columns: TableColumn[];
    private data: any[];
    private options: Required<TableOptions>;
    private currentPage: number;
    private selectedRows: Set<number>;
    private focusedRow: number;
    private sortColumn: string | null;
    private sortDirection: SortDirection;
    private processedData: any[];
    private columnWidths: number[];
    private totalWidth: number;
    private headerHeight: number;
    private rowHeight: number;

    constructor(
        id: string,
        columns: TableColumn[],
        data: any[] = [],
        options: TableOptions = {},
        size: Size = { width: 80, height: 24 }
    ) {
        super(id);
        this.columns = columns;
        this.data = data;
        this.size = size;
        
        this.options = {
            borderStyle: options.borderStyle ?? 'single',
            showHeader: options.showHeader ?? true,
            showRowNumbers: options.showRowNumbers ?? false,
            highlightHeader: options.highlightHeader ?? true,
            headerColor: options.headerColor ?? 7,
            alternateRowColor: options.alternateRowColor ?? false,
            evenRowColor: options.evenRowColor ?? 0,
            oddRowColor: options.oddRowColor ?? 8,
            selectedRowColor: options.selectedRowColor ?? 4,
            pageSize: options.pageSize ?? 0, // 0 means no pagination
            selectable: options.selectable ?? false,
            multiSelect: options.multiSelect ?? false,
            sortable: options.sortable ?? true,
            defaultSort: options.defaultSort ?? null,
            padding: options.padding ?? 1,
            maxColumnWidth: options.maxColumnWidth ?? 50,
            minColumnWidth: options.minColumnWidth ?? 3,
            ellipsis: options.ellipsis ?? '…'
        };
        
        this.currentPage = 0;
        this.selectedRows = new Set();
        this.focusedRow = 0;
        this.sortColumn = this.options.defaultSort?.column || null;
        this.sortDirection = this.options.defaultSort?.direction || 'asc';
        this.processedData = [];
        this.columnWidths = [];
        this.totalWidth = 0;
        this.headerHeight = this.options.showHeader ? 3 : 1; // Header + border
        this.rowHeight = 1;
        
        this.processData();
        this.calculateColumnWidths();
    }

    /**
     * Set table data
     */
    setData(data: any[]): void {
        this.data = data;
        this.processData();
        this.calculateColumnWidths();
        this.currentPage = 0;
        this.selectedRows.clear();
        this.focusedRow = 0;
        this.markDirty();
    }

    /**
     * Add row to table
     */
    addRow(row: any): void {
        this.data.push(row);
        this.processData();
        this.calculateColumnWidths();
        this.markDirty();
    }

    /**
     * Remove row from table
     */
    removeRow(index: number): void {
        if (index >= 0 && index < this.data.length) {
            this.data.splice(index, 1);
            this.processData();
            this.selectedRows.delete(index);
            if (this.focusedRow >= this.data.length) {
                this.focusedRow = Math.max(0, this.data.length - 1);
            }
            this.markDirty();
        }
    }

    /**
     * Sort table by column
     */
    sortBy(columnKey: string, direction?: SortDirection): void {
        const column = this.columns.find(c => c.key === columnKey);
        if (!column || (column.sortable === false && this.options.sortable)) return;
        
        if (this.sortColumn === columnKey && !direction) {
            // Toggle direction
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = columnKey;
            this.sortDirection = direction || 'asc';
        }
        
        this.processData();
        this.markDirty();
    }

    /**
     * Process and sort data
     */
    private processData(): void {
        this.processedData = [...this.data];
        
        if (this.sortColumn) {
            this.processedData.sort((a, b) => {
                const aVal = a[this.sortColumn!];
                const bVal = b[this.sortColumn!];
                
                let comparison = 0;
                if (aVal === null || aVal === undefined) comparison = 1;
                else if (bVal === null || bVal === undefined) comparison = -1;
                else if (typeof aVal === 'number' && typeof bVal === 'number') {
                    comparison = aVal - bVal;
                } else {
                    comparison = String(aVal).localeCompare(String(bVal));
                }
                
                return this.sortDirection === 'asc' ? comparison : -comparison;
            });
        }
    }

    /**
     * Calculate column widths
     */
    private calculateColumnWidths(): void {
        this.columnWidths = [];
        let availableWidth = this.size.width;
        
        // Account for borders
        if (this.options.borderStyle !== 'none') {
            availableWidth -= this.columns.length + 1; // Vertical borders
        }
        
        // Account for row numbers
        if (this.options.showRowNumbers) {
            const maxRowNum = this.processedData.length;
            const rowNumWidth = String(maxRowNum).length + 2;
            availableWidth -= rowNumWidth + 1;
        }
        
        // Calculate column widths
        const flexColumns: number[] = [];
        let fixedWidth = 0;
        
        this.columns.forEach((column, index) => {
            if (column.width) {
                this.columnWidths[index] = Math.min(column.width, this.options.maxColumnWidth);
                fixedWidth += this.columnWidths[index];
            } else {
                flexColumns.push(index);
                this.columnWidths[index] = 0;
            }
        });
        
        // Distribute remaining width to flex columns
        if (flexColumns.length > 0) {
            const remainingWidth = availableWidth - fixedWidth;
            const baseWidth = Math.floor(remainingWidth / flexColumns.length);
            
            flexColumns.forEach(index => {
                // Calculate based on content
                let maxWidth = this.columns[index].header.length;
                
                this.processedData.forEach(row => {
                    const value = this.formatCellValue(row[this.columns[index].key], row, this.columns[index]);
                    maxWidth = Math.max(maxWidth, value.length);
                });
                
                this.columnWidths[index] = Math.max(
                    this.options.minColumnWidth,
                    Math.min(baseWidth, maxWidth + this.options.padding * 2, this.options.maxColumnWidth)
                );
            });
        }
        
        this.totalWidth = this.columnWidths.reduce((sum, w) => sum + w, 0);
        if (this.options.borderStyle !== 'none') {
            this.totalWidth += this.columns.length + 1;
        }
        if (this.options.showRowNumbers) {
            this.totalWidth += String(this.processedData.length).length + 3;
        }
    }

    /**
     * Format cell value
     */
    private formatCellValue(value: any, row: any, column: TableColumn): string {
        if (column.format) {
            return column.format(value, row);
        }
        
        if (value === null || value === undefined) {
            return '';
        }
        
        return String(value);
    }

    /**
     * Get border characters
     */
    private getBorderChars(): any {
        switch (this.options.borderStyle) {
            case 'double':
                return {
                    horizontal: '═', vertical: '║', 
                    topLeft: '╔', topRight: '╗', 
                    bottomLeft: '╚', bottomRight: '╝',
                    cross: '╬', topJoin: '╦', bottomJoin: '╩',
                    leftJoin: '╠', rightJoin: '╣'
                };
            case 'rounded':
                return {
                    horizontal: '─', vertical: '│',
                    topLeft: '╭', topRight: '╮',
                    bottomLeft: '╰', bottomRight: '╯',
                    cross: '┼', topJoin: '┬', bottomJoin: '┴',
                    leftJoin: '├', rightJoin: '┤'
                };
            case 'ascii':
                return {
                    horizontal: '-', vertical: '|',
                    topLeft: '+', topRight: '+',
                    bottomLeft: '+', bottomRight: '+',
                    cross: '+', topJoin: '+', bottomJoin: '+',
                    leftJoin: '+', rightJoin: '+'
                };
            case 'compact':
                return {
                    horizontal: '─', vertical: ' ',
                    topLeft: ' ', topRight: ' ',
                    bottomLeft: ' ', bottomRight: ' ',
                    cross: ' ', topJoin: ' ', bottomJoin: ' ',
                    leftJoin: ' ', rightJoin: ' '
                };
            default: // single
                return {
                    horizontal: '─', vertical: '│',
                    topLeft: '┌', topRight: '┐',
                    bottomLeft: '└', bottomRight: '┘',
                    cross: '┼', topJoin: '┬', bottomJoin: '┴',
                    leftJoin: '├', rightJoin: '┤'
                };
        }
    }

    /**
     * Render border line
     */
    private renderBorderLine(position: 'top' | 'middle' | 'bottom'): string {
        if (this.options.borderStyle === 'none') return '';
        
        const chars = this.getBorderChars();
        const line: string[] = [];
        
        // Left corner
        if (position === 'top') line.push(chars.topLeft);
        else if (position === 'bottom') line.push(chars.bottomLeft);
        else line.push(chars.leftJoin);
        
        // Row number column
        if (this.options.showRowNumbers) {
            const width = String(this.processedData.length).length + 2;
            line.push(chars.horizontal.repeat(width));
            
            if (position === 'top') line.push(chars.topJoin);
            else if (position === 'bottom') line.push(chars.bottomJoin);
            else line.push(chars.cross);
        }
        
        // Data columns
        this.columnWidths.forEach((width, index) => {
            line.push(chars.horizontal.repeat(width));
            
            if (index < this.columnWidths.length - 1) {
                if (position === 'top') line.push(chars.topJoin);
                else if (position === 'bottom') line.push(chars.bottomJoin);
                else line.push(chars.cross);
            }
        });
        
        // Right corner
        if (position === 'top') line.push(chars.topRight);
        else if (position === 'bottom') line.push(chars.bottomRight);
        else line.push(chars.rightJoin);
        
        return line.join('');
    }

    /**
     * Render header
     */
    private renderHeader(): string[] {
        if (!this.options.showHeader) return [];
        
        const lines: string[] = [];
        const chars = this.getBorderChars();
        
        // Top border
        if (this.options.borderStyle !== 'none') {
            lines.push(this.renderBorderLine('top'));
        }
        
        // Header row
        const headerCells: string[] = [];
        
        if (this.options.borderStyle !== 'none') {
            headerCells.push(chars.vertical);
        }
        
        // Row number header
        if (this.options.showRowNumbers) {
            const width = String(this.processedData.length).length + 2;
            headerCells.push(this.alignText('#', width, 'center'));
            if (this.options.borderStyle !== 'none') {
                headerCells.push(chars.vertical);
            }
        }
        
        // Column headers
        this.columns.forEach((column, index) => {
            let header = column.header;
            
            // Add sort indicator
            if (this.options.sortable && column.sortable !== false && this.sortColumn === column.key) {
                header += this.sortDirection === 'asc' ? ' ▲' : ' ▼';
            }
            
            const aligned = this.alignText(header, this.columnWidths[index], column.align || 'left');
            
            if (this.options.highlightHeader) {
                headerCells.push(AnsiUtils.setForegroundColor(this.options.headerColor) + aligned + AnsiUtils.reset());
            } else {
                headerCells.push(aligned);
            }
            
            if (this.options.borderStyle !== 'none' && index < this.columns.length - 1) {
                headerCells.push(chars.vertical);
            }
        });
        
        if (this.options.borderStyle !== 'none') {
            headerCells.push(chars.vertical);
        }
        
        lines.push(headerCells.join(''));
        
        // Header separator
        if (this.options.borderStyle !== 'none') {
            lines.push(this.renderBorderLine('middle'));
        }
        
        return lines;
    }

    /**
     * Render data rows
     */
    private renderDataRows(): string[] {
        const lines: string[] = [];
        const chars = this.getBorderChars();
        
        // Calculate visible rows based on pagination
        let startRow = 0;
        let endRow = this.processedData.length;
        
        if (this.options.pageSize > 0) {
            startRow = this.currentPage * this.options.pageSize;
            endRow = Math.min(startRow + this.options.pageSize, this.processedData.length);
        }
        
        // Render each row
        for (let rowIndex = startRow; rowIndex < endRow; rowIndex++) {
            const row = this.processedData[rowIndex];
            const cells: string[] = [];
            
            if (this.options.borderStyle !== 'none') {
                cells.push(chars.vertical);
            }
            
            // Row number
            if (this.options.showRowNumbers) {
                const width = String(this.processedData.length).length + 2;
                cells.push(this.alignText(String(rowIndex + 1), width, 'right'));
                if (this.options.borderStyle !== 'none') {
                    cells.push(chars.vertical);
                }
            }
            
            // Data cells
            this.columns.forEach((column, colIndex) => {
                const value = this.formatCellValue(row[column.key], row, column);
                const truncated = this.truncateText(value, this.columnWidths[colIndex]);
                const aligned = this.alignText(truncated, this.columnWidths[colIndex], column.align || 'left');
                
                // Apply cell color
                let cellColor: number | undefined;
                if (typeof column.color === 'function') {
                    cellColor = column.color(row[column.key], row);
                } else if (column.color !== undefined) {
                    cellColor = column.color;
                }
                
                // Apply row highlighting
                let cellContent = aligned;
                if (this.selectedRows.has(rowIndex) && this.options.selectable) {
                    cellContent = AnsiUtils.setBackgroundColor(this.options.selectedRowColor) + cellContent + AnsiUtils.reset();
                } else if (this.options.alternateRowColor && rowIndex % 2 === 0) {
                    if (this.options.evenRowColor > 0) {
                        cellContent = AnsiUtils.setBackgroundColor(this.options.evenRowColor) + cellContent + AnsiUtils.reset();
                    }
                } else if (this.options.alternateRowColor && rowIndex % 2 === 1) {
                    if (this.options.oddRowColor > 0) {
                        cellContent = AnsiUtils.setBackgroundColor(this.options.oddRowColor) + cellContent + AnsiUtils.reset();
                    }
                }
                
                if (cellColor !== undefined) {
                    cellContent = AnsiUtils.setForegroundColor(cellColor) + cellContent + AnsiUtils.reset();
                }
                
                cells.push(cellContent);
                
                if (this.options.borderStyle !== 'none' && colIndex < this.columns.length - 1) {
                    cells.push(chars.vertical);
                }
            });
            
            if (this.options.borderStyle !== 'none') {
                cells.push(chars.vertical);
            }
            
            lines.push(cells.join(''));
        }
        
        return lines;
    }

    /**
     * Render footer (pagination info)
     */
    private renderFooter(): string[] {
        const lines: string[] = [];
        
        // Bottom border
        if (this.options.borderStyle !== 'none') {
            lines.push(this.renderBorderLine('bottom'));
        }
        
        // Pagination info
        if (this.options.pageSize > 0) {
            const totalPages = Math.ceil(this.processedData.length / this.options.pageSize);
            const currentPage = this.currentPage + 1;
            const startRow = this.currentPage * this.options.pageSize + 1;
            const endRow = Math.min((this.currentPage + 1) * this.options.pageSize, this.processedData.length);
            
            const pageInfo = `Page ${currentPage}/${totalPages} | Rows ${startRow}-${endRow} of ${this.processedData.length}`;
            lines.push(this.alignText(pageInfo, this.totalWidth, 'center'));
        }
        
        return lines;
    }

    /**
     * Align text within width
     */
    private alignText(text: string, width: number, align: 'left' | 'center' | 'right'): string {
        const padding = width - text.length;
        if (padding <= 0) return text.substring(0, width);
        
        switch (align) {
            case 'center':
                const leftPad = Math.floor(padding / 2);
                const rightPad = padding - leftPad;
                return ' '.repeat(leftPad) + text + ' '.repeat(rightPad);
            case 'right':
                return ' '.repeat(padding) + text;
            default: // left
                return text + ' '.repeat(padding);
        }
    }

    /**
     * Truncate text to fit width
     */
    private truncateText(text: string, width: number): string {
        if (text.length <= width) return text;
        
        const ellipsisLen = this.options.ellipsis.length;
        if (width <= ellipsisLen) return this.options.ellipsis.substring(0, width);
        
        return text.substring(0, width - ellipsisLen) + this.options.ellipsis;
    }

    /**
     * Handle input events
     */
    handleInput(input: InputEvent): boolean {
        if (!this.options.selectable) return false;
        
        if (input.type === 'key') {
            switch (input.key) {
                case 'up':
                    if (this.focusedRow > 0) {
                        this.focusedRow--;
                        this.ensureRowVisible(this.focusedRow);
                        this.markDirty();
                        return true;
                    }
                    break;
                    
                case 'down':
                    if (this.focusedRow < this.processedData.length - 1) {
                        this.focusedRow++;
                        this.ensureRowVisible(this.focusedRow);
                        this.markDirty();
                        return true;
                    }
                    break;
                    
                case 'space':
                case 'enter':
                    if (this.options.multiSelect) {
                        if (this.selectedRows.has(this.focusedRow)) {
                            this.selectedRows.delete(this.focusedRow);
                        } else {
                            this.selectedRows.add(this.focusedRow);
                        }
                    } else {
                        this.selectedRows.clear();
                        this.selectedRows.add(this.focusedRow);
                    }
                    this.markDirty();
                    return true;
                    
                case 'pageup':
                    if (this.options.pageSize > 0 && this.currentPage > 0) {
                        this.currentPage--;
                        this.focusedRow = this.currentPage * this.options.pageSize;
                        this.markDirty();
                        return true;
                    }
                    break;
                    
                case 'pagedown':
                    if (this.options.pageSize > 0) {
                        const totalPages = Math.ceil(this.processedData.length / this.options.pageSize);
                        if (this.currentPage < totalPages - 1) {
                            this.currentPage++;
                            this.focusedRow = this.currentPage * this.options.pageSize;
                            this.markDirty();
                            return true;
                        }
                    }
                    break;
            }
        }
        
        return false;
    }

    /**
     * Ensure row is visible
     */
    private ensureRowVisible(rowIndex: number): void {
        if (this.options.pageSize === 0) return;
        
        const page = Math.floor(rowIndex / this.options.pageSize);
        if (page !== this.currentPage) {
            this.currentPage = page;
        }
    }

    /**
     * Get selected rows
     */
    getSelectedRows(): any[] {
        return Array.from(this.selectedRows).map(index => this.processedData[index]);
    }

    /**
     * Clear selection
     */
    clearSelection(): void {
        this.selectedRows.clear();
        this.markDirty();
    }

    /**
     * Select all rows
     */
    selectAll(): void {
        if (!this.options.multiSelect) return;
        
        for (let i = 0; i < this.processedData.length; i++) {
            this.selectedRows.add(i);
        }
        this.markDirty();
    }

    /**
     * Render the table
     */
    render(): string {
        const lines: string[] = [];
        
        // Render header
        lines.push(...this.renderHeader());
        
        // Render data rows
        lines.push(...this.renderDataRows());
        
        // Render footer
        lines.push(...this.renderFooter());
        
        return lines.join('\n');
    }
}
