import { BaseComponent } from './base-component.js';
import type { Position, Size } from './types.js';

/**
 * Virtual item interface
 */
export interface VirtualItem {
    id: string;
    data: any;
    height?: number;
    selected?: boolean;
}

/**
 * Column definition for virtualized table
 */
export interface ColumnDefinition {
    id: string;
    title: string;
    width: number;
    minWidth?: number;
    maxWidth?: number;
    resizable?: boolean;
    sortable?: boolean;
    align?: 'left' | 'center' | 'right';
    formatter?: (value: any) => string;
}

/**
 * Virtual renderer options
 */
export interface VirtualRendererOptions {
    itemHeight?: number;
    overscan?: number; // Number of items to render outside viewport
    stickyHeader?: boolean;
    stickyFooter?: boolean;
    enableSelection?: boolean;
    enableMultiSelect?: boolean;
    virtualScrolling?: boolean;
    bufferItems?: number;
}

/**
 * Log entry for virtualized log
 */
export interface LogEntry {
    id: string;
    timestamp: Date;
    level: 'debug' | 'info' | 'warn' | 'error';
    message: string;
    data?: any;
    source?: string;
}

/**
 * Base virtualized renderer
 */
export abstract class VirtualizedRenderer extends BaseComponent {
    protected items: VirtualItem[] = [];
    protected scrollTop: number = 0;
    protected viewportHeight: number;
    protected itemHeight: number;
    protected overscan: number;
    protected renderCache: Map<string, string> = new Map();
    protected heightCache: Map<string, number> = new Map();
    protected selectedItems: Set<string> = new Set();
    protected lastFocusedIndex: number = -1;

    constructor(
        id: string,
        position: Position = { x: 0, y: 0 },
        size: Size = { width: 80, height: 24 },
        options: VirtualRendererOptions = {}
    ) {
        super(id, position, size);

        this.itemHeight = options.itemHeight || 1;
        this.overscan = options.overscan || 5;
        this.viewportHeight = size.height - this.getHeaderHeight() - this.getFooterHeight();
    }

    /**
     * Get header height (can be overridden)
     */
    protected getHeaderHeight(): number {
        return 0;
    }

    /**
     * Get footer height (can be overridden)
     */
    protected getFooterHeight(): number {
        return 0;
    }

    /**
     * Set items to render
     */
    setItems(items: VirtualItem[]): void {
        this.items = items;
        this.clearCache();
        this.scrollToTop();
        this.markDirty();
    }

    /**
     * Add items to the list
     */
    addItems(items: VirtualItem[], append: boolean = true): void {
        if (append) {
            this.items.push(...items);
        } else {
            this.items.unshift(...items);
        }
        this.clearCache();
        this.markDirty();
    }

    /**
     * Remove item by ID
     */
    removeItem(itemId: string): void {
        this.items = this.items.filter(item => item.id !== itemId);
        this.renderCache.delete(itemId);
        this.heightCache.delete(itemId);
        this.selectedItems.delete(itemId);
        this.markDirty();
    }

    /**
     * Clear all items
     */
    clearItems(): void {
        this.items = [];
        this.clearCache();
        this.scrollToTop();
        this.markDirty();
    }

    /**
     * Scroll to top
     */
    scrollToTop(): void {
        this.scrollTop = 0;
        this.markDirty();
    }

    /**
     * Scroll to bottom
     */
    scrollToBottom(): void {
        const totalHeight = this.getTotalHeight();
        this.scrollTop = Math.max(0, totalHeight - this.viewportHeight);
        this.markDirty();
    }

    /**
     * Scroll to item
     */
    scrollToItem(itemId: string): void {
        const index = this.items.findIndex(item => item.id === itemId);
        if (index === -1) return;

        let itemTop = 0;
        for (let i = 0; i < index; i++) {
            itemTop += this.getItemHeight(this.items[i]);
        }

        const itemHeight = this.getItemHeight(this.items[index]);

        // Scroll item into view
        if (itemTop < this.scrollTop) {
            this.scrollTop = itemTop;
        } else if (itemTop + itemHeight > this.scrollTop + this.viewportHeight) {
            this.scrollTop = itemTop + itemHeight - this.viewportHeight;
        }

        this.markDirty();
    }

    /**
     * Get item height (supports variable height items)
     */
    protected getItemHeight(item: VirtualItem): number {
        if (item.height) {
            return item.height;
        }

        // Check cache
        const cached = this.heightCache.get(item.id);
        if (cached !== undefined) {
            return cached;
        }

        // Calculate height based on content
        const height = this.calculateItemHeight(item);
        this.heightCache.set(item.id, height);
        return height;
    }

    /**
     * Calculate item height (to be overridden)
     */
    protected calculateItemHeight(item: VirtualItem): number {
        return this.itemHeight;
    }

    /**
     * Get total height of all items
     */
    protected getTotalHeight(): number {
        return this.items.reduce((total, item) => total + this.getItemHeight(item), 0);
    }

    /**
     * Get visible range of items
     */
    protected getVisibleRange(): { start: number; end: number; startY: number } {
        let startY = 0;
        let startIndex = 0;

        // Find start index
        for (let i = 0; i < this.items.length; i++) {
            const itemHeight = this.getItemHeight(this.items[i]);
            if (startY + itemHeight > this.scrollTop) {
                startIndex = i;
                break;
            }
            startY += itemHeight;
        }

        // Find end index with overscan
        let currentY = startY;
        let endIndex = startIndex;

        for (let i = startIndex; i < this.items.length; i++) {
            const itemHeight = this.getItemHeight(this.items[i]);
            currentY += itemHeight;

            if (currentY >= this.scrollTop + this.viewportHeight) {
                endIndex = i + this.overscan;
                break;
            }
            endIndex = i;
        }

        // Apply overscan to start
        startIndex = Math.max(0, startIndex - this.overscan);
        endIndex = Math.min(this.items.length - 1, endIndex + this.overscan);

        return { start: startIndex, end: endIndex, startY };
    }

    /**
     * Clear render cache
     */
    protected clearCache(): void {
        this.renderCache.clear();
        this.heightCache.clear();
    }

    /**
     * Render item (to be overridden)
     */
    protected abstract renderItem(item: VirtualItem, isSelected: boolean): string;

    /**
     * Render header (to be overridden)
     */
    protected renderHeader(): string {
        return '';
    }

    /**
     * Render footer (to be overridden)
     */
    protected renderFooter(): string {
        return '';
    }

    /**
     * Handle selection
     */
    protected selectItem(itemId: string, multi: boolean = false): void {
        if (!multi) {
            this.selectedItems.clear();
        }
        this.selectedItems.add(itemId);
        this.markDirty();
    }

    /**
     * Toggle item selection
     */
    protected toggleItemSelection(itemId: string): void {
        if (this.selectedItems.has(itemId)) {
            this.selectedItems.delete(itemId);
        } else {
            this.selectedItems.add(itemId);
        }
        this.markDirty();
    }

    /**
     * Get selected items
     */
    getSelectedItems(): VirtualItem[] {
        return this.items.filter(item => this.selectedItems.has(item.id));
    }

    /**
     * Handle input
     */
    handleInput(input: string): boolean {
        // Handle scroll
        switch (input) {
            case '\u001b[A': // Up arrow
                this.scrollUp();
                return true;
            case '\u001b[B': // Down arrow
                this.scrollDown();
                return true;
            case '\u001b[5~': // Page up
                this.pageUp();
                return true;
            case '\u001b[6~': // Page down
                this.pageDown();
                return true;
            case '\u001b[H': // Home
                this.scrollToTop();
                return true;
            case '\u001b[F': // End
                this.scrollToBottom();
                return true;
        }

        return false;
    }

    /**
     * Scroll up by one item
     */
    protected scrollUp(): void {
        if (this.items.length === 0) return;

        // Find current item at top
        let currentY = 0;
        for (let i = 0; i < this.items.length; i++) {
            const itemHeight = this.getItemHeight(this.items[i]);
            if (currentY + itemHeight > this.scrollTop) {
                // Scroll to previous item
                if (i > 0) {
                    this.scrollTop = currentY - this.getItemHeight(this.items[i - 1]);
                }
                break;
            }
            currentY += itemHeight;
        }

        this.markDirty();
    }

    /**
     * Scroll down by one item
     */
    protected scrollDown(): void {
        if (this.items.length === 0) return;

        // Find first visible item
        let currentY = 0;
        for (let i = 0; i < this.items.length; i++) {
            const itemHeight = this.getItemHeight(this.items[i]);

            if (currentY >= this.scrollTop && currentY < this.scrollTop + this.viewportHeight) {
                // Scroll to next item
                this.scrollTop = currentY + itemHeight;
                break;
            }
            currentY += itemHeight;
        }

        this.markDirty();
    }

    /**
     * Page up
     */
    protected pageUp(): void {
        this.scrollTop = Math.max(0, this.scrollTop - this.viewportHeight);
        this.markDirty();
    }

    /**
     * Page down
     */
    protected pageDown(): void {
        const maxScroll = Math.max(0, this.getTotalHeight() - this.viewportHeight);
        this.scrollTop = Math.min(maxScroll, this.scrollTop + this.viewportHeight);
        this.markDirty();
    }

    /**
     * Render the virtualized content
     */
    render(): string {
        const output: string[] = [];
        let currentLine = 0;

        // Render header
        const headerHeight = this.getHeaderHeight();
        if (headerHeight > 0) {
            const header = this.renderHeader();
            if (header) {
                const headerLines = header.split('\n');
                for (const line of headerLines) {
                    if (currentLine < this.size.height) {
                        output.push(line.padEnd(this.size.width));
                        currentLine++;
                    }
                }
            }
        }

        // Calculate visible range
        const { start, end, startY } = this.getVisibleRange();
        let offsetY = this.scrollTop - startY;

        // Render visible items
        for (let i = start; i <= end && currentLine < this.size.height - this.getFooterHeight(); i++) {
            const item = this.items[i];
            const isSelected = this.selectedItems.has(item.id);
            const itemContent = this.renderItem(item, isSelected);

            // Handle multi-line items
            const lines = itemContent.split('\n');
            for (const line of lines) {
                if (offsetY <= 0 && currentLine < this.size.height - this.getFooterHeight()) {
                    output.push(line.padEnd(this.size.width));
                    currentLine++;
                }
                offsetY--;
            }
        }

        // Fill remaining space
        while (currentLine < this.size.height - this.getFooterHeight()) {
            output.push(' '.repeat(this.size.width));
            currentLine++;
        }

        // Render footer
        const footerHeight = this.getFooterHeight();
        if (footerHeight > 0) {
            const footer = this.renderFooter();
            if (footer) {
                const footerLines = footer.split('\n');
                for (const line of footerLines) {
                    if (currentLine < this.size.height) {
                        output.push(line.padEnd(this.size.width));
                        currentLine++;
                    }
                }
            }
        }

        return output.join('\n');
    }
}

/**
 * Virtualized list component
 */
export class VirtualizedList extends VirtualizedRenderer {
    private showNumbers: boolean = false;
    private numberWidth: number = 4;

    constructor(
        id: string,
        position: Position = { x: 0, y: 0 },
        size: Size = { width: 80, height: 24 },
        options: VirtualRendererOptions & { showNumbers?: boolean } = {}
    ) {
        super(id, position, size, options);
        this.showNumbers = options.showNumbers || false;
    }

    /**
     * Render list item
     */
    protected renderItem(item: VirtualItem, isSelected: boolean): string {
        const prefix = isSelected ? '► ' : '  ';
        let content = `${prefix}${item.data.toString()}`;

        if (this.showNumbers) {
            const index = this.items.indexOf(item);
            const number = `${index + 1}`.padStart(this.numberWidth);
            content = `${number} ${content}`;
        }

        return content;
    }

    /**
     * Render header
     */
    protected renderHeader(): string {
        if (this.showNumbers) {
            return '#'.padStart(this.numberWidth) + ' ' + '─'.repeat(this.size.width - this.numberWidth - 1);
        }
        return '─'.repeat(this.size.width);
    }
}

/**
 * Virtualized table component
 */
export class VirtualizedTable extends VirtualizedRenderer {
    private columns: ColumnDefinition[] = [];
    private sortColumn: string | null = null;
    private sortDirection: 'asc' | 'desc' = 'asc';
    private columnWidths: Map<string, number> = new Map();

    constructor(
        id: string,
        columns: ColumnDefinition[],
        position: Position = { x: 0, y: 0 },
        size: Size = { width: 80, height: 24 },
        options: VirtualRendererOptions & { stickyHeader?: boolean } = {}
    ) {
        super(id, position, size, { ...options, stickyHeader: true });
        this.columns = columns;
        this.calculateColumnWidths();
    }

    /**
     * Calculate column widths
     */
    private calculateColumnWidths(): void {
        const totalWidth = this.size.width;
        const resizableColumns = this.columns.filter(col => col.resizable !== false);
        const fixedWidth = this.columns
            .filter(col => col.resizable === false)
            .reduce((sum, col) => sum + col.width, 0);

        const availableWidth = totalWidth - fixedWidth;
        const widthPerColumn = Math.floor(availableWidth / resizableColumns.length);

        this.columns.forEach(col => {
            if (col.resizable === false) {
                this.columnWidths.set(col.id, col.width);
            } else {
                this.columnWidths.set(col.id, Math.max(col.minWidth || 10, widthPerColumn));
            }
        });
    }

    /**
     * Get header height
     */
    protected getHeaderHeight(): number {
        return 2; // Title line + separator line
    }

    /**
     * Render table header
     */
    protected renderHeader(): string {
        // Title row
        let titleRow = '';
        let separatorRow = '';

        this.columns.forEach(col => {
            const width = this.columnWidths.get(col.id) || col.width;
            const title = col.title.padEnd(width);

            // Add sort indicator
            let sortIndicator = '';
            if (this.sortColumn === col.id) {
                sortIndicator = this.sortDirection === 'asc' ? ' ↑' : ' ↓';
            }

            titleRow += ` ${title.substring(0, width - sortIndicator.length)}${sortIndicator} `;
            separatorRow += '─'.repeat(width + 2);
        });

        return titleRow + '\n' + separatorRow;
    }

    /**
     * Render table row
     */
    protected renderItem(item: VirtualItem, isSelected: boolean): string {
        const rowData = item.data;
        let row = isSelected ? '►' : ' ';

        this.columns.forEach(col => {
            const width = this.columnWidths.get(col.id) || col.width;
            let value = rowData[col.id] || '';

            // Apply formatter
            if (col.formatter) {
                value = col.formatter(value);
            }

            // Truncate if necessary
            value = value.toString().substring(0, width);

            // Apply alignment
            switch (col.align) {
                case 'center':
                    value = value.padStart(Math.floor((width - value.length) / 2) + value.length)
                              .padEnd(width);
                    break;
                case 'right':
                    value = value.padStart(width);
                    break;
                default:
                    value = value.padEnd(width);
            }

            row += ` ${value} `;
        });

        return row;
    }

    /**
     * Sort table by column
     */
    sortByColumn(columnId: string): void {
        if (this.sortColumn === columnId) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = columnId;
            this.sortDirection = 'asc';
        }

        const column = this.columns.find(col => col.id === columnId);
        if (!column || !column.sortable) return;

        this.items.sort((a, b) => {
            const aValue = a.data[columnId] || '';
            const bValue = b.data[columnId] || '';

            let comparison = 0;
            if (typeof aValue === 'number' && typeof bValue === 'number') {
                comparison = aValue - bValue;
            } else {
                comparison = aValue.toString().localeCompare(bValue.toString());
            }

            return this.sortDirection === 'asc' ? comparison : -comparison;
        });

        this.clearCache();
        this.markDirty();
    }
}

/**
 * Virtualized log viewer
 */
export class VirtualizedLog extends VirtualizedRenderer {
    private levelColors: Map<string, string> = new Map([
        ['debug', '\x1b[37m'], // White
        ['info', '\x1b[36m'],  // Cyan
        ['warn', '\x1b[33m'],  // Yellow
        ['error', '\x1b[31m']  // Red
    ]);

    private showTimestamp: boolean = true;
    private showLevel: boolean = true;
    private showSource: boolean = false;
    private maxMessageLength: number = 100;

    constructor(
        id: string,
        position: Position = { x: 0, y: 0 },
        size: Size = { width: 80, height: 24 },
        options: VirtualRendererOptions & {
            showTimestamp?: boolean;
            showLevel?: boolean;
            showSource?: boolean;
            maxMessageLength?: number;
        } = {}
    ) {
        super(id, position, size, options);
        this.showTimestamp = options.showTimestamp !== false;
        this.showLevel = options.showLevel !== false;
        this.showSource = options.showSource || false;
        this.maxMessageLength = options.maxMessageLength || 100;
    }

    /**
     * Add log entry
     */
    addLogEntry(entry: LogEntry): void {
        const item: VirtualItem = {
            id: entry.id,
            data: entry,
            height: this.calculateLogHeight(entry)
        };
        this.addItems([item], true);
    }

    /**
     * Add multiple log entries
     */
    addLogEntries(entries: LogEntry[]): void {
        const items = entries.map(entry => ({
            id: entry.id,
            data: entry,
            height: this.calculateLogHeight(entry)
        }));
        this.addItems(items, true);
    }

    /**
     * Calculate log entry height
     */
    private calculateLogHeight(entry: LogEntry): number {
        const message = entry.message;
        const width = this.size.width - this.getLogPrefixWidth();

        // Word wrap calculation
        const words = message.split(' ');
        let lines = 1;
        let currentLength = 0;

        for (const word of words) {
            if (currentLength + word.length + 1 > width) {
                lines++;
                currentLength = word.length;
            } else {
                currentLength += word.length + 1;
            }
        }

        return lines;
    }

    /**
     * Get width of log prefix (timestamp, level, source)
     */
    private getLogPrefixWidth(): number {
        let width = 2; // Selection indicator
        if (this.showTimestamp) width += 19; // [HH:MM:SS.mmm]
        if (this.showLevel) width += 7; // [LEVEL]
        if (this.showSource && entry.source) width + entry.source.length + 3;
        return width;
    }

    /**
     * Render log entry
     */
    protected renderItem(item: VirtualItem, isSelected: boolean): string {
        const entry: LogEntry = item.data;
        const color = this.levelColors.get(entry.level) || '';
        const reset = '\x1b[0m';

        let prefix = isSelected ? '►' : ' ';

        if (this.showTimestamp) {
            const time = entry.timestamp.toTimeString().split(' ')[0];
            prefix += ` [${time}]`;
        }

        if (this.showLevel) {
            prefix += ` [${entry.level.toUpperCase().padEnd(5)}]`;
        }

        if (this.showSource && entry.source) {
            prefix += ` [${entry.source}]`;
        }

        // Word wrap message
        const maxWidth = this.size.width - prefix.length - 1;
        const message = entry.message.length > this.maxMessageLength ?
                       entry.message.substring(0, this.maxMessageLength) + '...' :
                       entry.message;

        const lines = this.wordWrap(message, maxWidth);
        let output = `${color}${prefix} ${lines[0]}${reset}`;

        for (let i = 1; i < lines.length; i++) {
            output += `\n${color}${' '.repeat(prefix.length)} ${lines[i]}${reset}`;
        }

        return output;
    }

    /**
     * Word wrap text
     */
    private wordWrap(text: string, maxWidth: number): string[] {
        if (maxWidth <= 0) return [text];

        const words = text.split(' ');
        const lines: string[] = [];
        let currentLine = '';

        for (const word of words) {
            if (currentLine.length === 0) {
                currentLine = word;
            } else if (currentLine.length + word.length + 1 <= maxWidth) {
                currentLine += ' ' + word;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }

        if (currentLine) {
            lines.push(currentLine);
        }

        return lines.length > 0 ? lines : [''];
    }

    /**
     * Render footer with stats
     */
    protected renderFooter(): string {
        const total = this.items.length;
        const visible = this.items.filter(item => {
            const entry: LogEntry = item.data;
            return true; // Could filter by level here
        }).length;

        const stats = `Total: ${total} | Visible: ${visible}`;
        return stats.padEnd(this.size.width);
    }
}