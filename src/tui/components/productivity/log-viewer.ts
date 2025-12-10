import { BaseComponent } from '../../base-component';
import { InputEvent, Position, Size } from '../../types';
import { ThemeManager } from '../../theme';

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    FATAL = 4
}

export interface LogEntry {
    id: string;
    timestamp: Date;
    level: LogLevel;
    message: string;
    source?: string;
    data?: any;
    stackTrace?: string;
}

export interface LogViewerConfig {
    maxLines?: number;
    followTail?: boolean;
    showTimestamp?: boolean;
    showSource?: boolean;
    showLevel?: boolean;
    dateFormat?: string;
    filterLevel?: LogLevel;
    searchTerm?: string;
    caseSensitive?: boolean;
    wrapLines?: boolean;
    highlightMatches?: boolean;
    autoScroll?: boolean;
}

export class LogViewer extends BaseComponent {
    private entries: LogEntry[] = [];
    private filteredEntries: LogEntry[] = [];
    private config: Required<LogViewerConfig>;
    private theme: ThemeManager;
    private scrollOffset = 0;
    private selectedIndex = -1;
    private searchTerm = '';
    private isSearching = false;

    constructor(
        id: string,
        position: Position,
        size: Size,
        config: LogViewerConfig = {}
    ) {
        super(id, position, size);
        this.config = {
            maxLines: config.maxLines ?? 1000,
            followTail: config.followTail ?? true,
            showTimestamp: config.showTimestamp ?? true,
            showSource: config.showSource ?? false,
            showLevel: config.showLevel ?? true,
            dateFormat: config.dateFormat ?? 'HH:mm:ss',
            filterLevel: config.filterLevel ?? LogLevel.DEBUG,
            searchTerm: config.searchTerm ?? '',
            caseSensitive: config.caseSensitive ?? false,
            wrapLines: config.wrapLines ?? false,
            highlightMatches: config.highlightMatches ?? true,
            autoScroll: config.autoScroll ?? true
        };
        this.theme = ThemeManager.getInstance();
    }

    addLog(entry: LogEntry): void {
        this.entries.push(entry);

        if (this.entries.length > this.config.maxLines) {
            this.entries.shift();
        }

        this.applyFilters();

        if (this.config.followTail || this.config.autoScroll) {
            this.scrollToBottom();
        }

        this.markDirty();
    }

    addLogMessage(level: LogLevel, message: string, source?: string, data?: any): void {
        const entry: LogEntry = {
            id: `${Date.now()}-${Math.random()}`,
            timestamp: new Date(),
            level,
            message,
            source,
            data
        };
        this.addLog(entry);
    }

    clear(): void {
        this.entries = [];
        this.filteredEntries = [];
        this.scrollOffset = 0;
        this.selectedIndex = -1;
        this.markDirty();
    }

    setFilterLevel(level: LogLevel): void {
        this.config.filterLevel = level;
        this.applyFilters();
        this.markDirty();
    }

    setSearchTerm(term: string): void {
        this.searchTerm = term;
        this.isSearching = term.length > 0;
        this.applyFilters();
        this.markDirty();
    }

    exportLogs(): string {
        return this.filteredEntries
            .map(entry => this.formatLogEntry(entry, false))
            .join('\n');
    }

    copySelected(): string {
        if (this.selectedIndex >= 0 && this.selectedIndex < this.filteredEntries.length) {
            const entry = this.filteredEntries[this.selectedIndex];
            return this.formatLogEntry(entry, false);
        }
        return '';
    }

    private applyFilters(): void {
        this.filteredEntries = this.entries.filter(entry => {
            if (entry.level < this.config.filterLevel) {
                return false;
            }

            if (this.isSearching && this.searchTerm) {
                const searchText = this.config.caseSensitive ?
                    this.searchTerm : this.searchTerm.toLowerCase();
                const message = this.config.caseSensitive ?
                    entry.message : entry.message.toLowerCase();

                if (!message.includes(searchText)) {
                    return false;
                }
            }

            return true;
        });
    }

    private scrollToBottom(): void {
        const visibleHeight = this.size.height;
        const totalHeight = this.getTotalHeight();

        if (totalHeight > visibleHeight) {
            this.scrollOffset = totalHeight - visibleHeight;
        }
    }

    private getTotalHeight(): number {
        let height = 0;

        for (const entry of this.filteredEntries) {
            if (this.config.wrapLines) {
                const lineLength = this.size.width;
                const formatted = this.formatLogEntry(entry, true);
                height += Math.ceil(formatted.length / lineLength);
            } else {
                height += 1;
                if (entry.stackTrace) {
                    height += entry.stackTrace.split('\n').length;
                }
            }
        }

        return height;
    }

    private formatLogEntry(entry: LogEntry, includeFormatting: boolean = true): string {
        const theme = this.theme.getCurrentTheme();
        let formatted = '';

        if (this.config.showTimestamp) {
            const time = this.formatTimestamp(entry.timestamp);
            formatted += includeFormatting ? this.theme.applyColor(`[${time}] `, 'textSecondary') : `[${time}] `;
        }

        if (this.config.showLevel) {
            const levelName = LogLevel[entry.level].padEnd(5);
            const levelColor = this.getLevelColor(entry.level);
            formatted += includeFormatting ? this.theme.applyColor(levelName + ' ', levelColor) : levelName + ' ';
        }

        if (this.config.showSource && entry.source) {
            const source = `(${entry.source}) `;
            formatted += includeFormatting ? this.theme.applyColor(source, 'info') : source;
        }

        let message = entry.message;
        if (this.isSearching && this.config.highlightMatches && this.searchTerm) {
            message = this.highlightSearchTerm(message);
        }

        formatted += includeFormatting ? this.theme.applyColor(message, 'textPrimary') : message;

        if (entry.data && includeFormatting) {
            formatted += '\n' + this.theme.applyColor(JSON.stringify(entry.data, null, 2), 'textSecondary');
        }

        if (entry.stackTrace && includeFormatting) {
            formatted += '\n' + this.theme.applyColor(entry.stackTrace, 'error');
        }

        return formatted;
    }

    private formatTimestamp(timestamp: Date): string {
        switch (this.config.dateFormat) {
            case 'HH:mm:ss':
                return timestamp.toTimeString().substring(0, 8);
            case 'HH:mm:ss.SSS':
                return timestamp.toTimeString().substring(0, 12);
            case 'YYYY-MM-DD HH:mm:ss':
                const year = timestamp.getFullYear();
                const month = String(timestamp.getMonth() + 1).padStart(2, '0');
                const day = String(timestamp.getDate()).padStart(2, '0');
                const time = timestamp.toTimeString().substring(0, 8);
                return `${year}-${month}-${day} ${time}`;
            default:
                return timestamp.toTimeString().substring(0, 8);
        }
    }

    private getLevelColor(level: LogLevel): string {
        switch (level) {
            case LogLevel.DEBUG: return 'muted';
            case LogLevel.INFO: return 'info';
            case LogLevel.WARN: return 'warning';
            case LogLevel.ERROR: return 'error';
            case LogLevel.FATAL: return 'error';
            default: return 'textPrimary';
        }
    }

    private highlightSearchTerm(text: string): string {
        if (!this.searchTerm || !this.config.highlightMatches) return text;

        const theme = this.theme.getCurrentTheme();
        const searchText = this.config.caseSensitive ? this.searchTerm : this.searchTerm.toLowerCase();
        const source = this.config.caseSensitive ? text : text.toLowerCase();

        let result = '';
        let lastEnd = 0;
        let index = source.indexOf(searchText);

        while (index !== -1) {
            result += text.substring(lastEnd, index);
            result += theme.applyColor(
                text.substring(index, index + this.searchTerm.length),
                'warning'
            );
            lastEnd = index + this.searchTerm.length;
            index = source.indexOf(searchText, lastEnd);
        }

        result += text.substring(lastEnd);
        return result;
    }

    handleInput(input: InputEvent): boolean {
        if (input.type === 'key') {
            switch (input.key) {
                case 'up':
                case 'ArrowUp':
                case 'k':
                    this.navigateUp();
                    return true;

                case 'down':
                case 'ArrowDown':
                case 'j':
                    this.navigateDown();
                    return true;

                case 'pageup':
                case 'PageUp':
                    this.pageUp();
                    return true;

                case 'pagedown':
                case 'PageDown':
                    this.pageDown();
                    return true;

                case 'home':
                    this.scrollToTop();
                    return true;

                case 'end':
                    this.scrollToBottom();
                    return true;

                case 'c':
                    if (input.ctrl) {
                        navigator.clipboard.writeText(this.copySelected());
                        return true;
                    }
                    break;

                case 'e':
                    if (input.ctrl) {
                        navigator.clipboard.writeText(this.exportLogs());
                        return true;
                    }
                    break;

                case 'l':
                    if (input.ctrl) {
                        this.clear();
                        return true;
                    }
                    break;

                case 'f':
                    if (input.ctrl) {
                        this.isSearching = true;
                        this.searchTerm = '';
                        this.markDirty();
                        return true;
                    }
                    break;

                case 'escape':
                    if (this.isSearching) {
                        this.isSearching = false;
                        this.searchTerm = '';
                        this.applyFilters();
                        this.markDirty();
                    } else {
                        this.blur();
                    }
                    return true;

                default:
                    if (this.isSearching && input.key && input.key.length === 1) {
                        this.searchTerm += input.key;
                        this.applyFilters();
                        this.markDirty();
                        return true;
                    } else if (this.isSearching && input.key === 'backspace') {
                        this.searchTerm = this.searchTerm.slice(0, -1);
                        this.applyFilters();
                        this.markDirty();
                        return true;
                    }
            }
        }

        return false;
    }

    private navigateUp(): void {
        if (this.selectedIndex > 0) {
            this.selectedIndex--;
        } else if (this.selectedIndex === -1 && this.filteredEntries.length > 0) {
            this.selectedIndex = this.filteredEntries.length - 1;
        }

        if (this.selectedIndex >= 0 && this.selectedIndex < this.filteredEntries.length) {
            this.ensureSelectedVisible();
            this.markDirty();
        }
    }

    private navigateDown(): void {
        if (this.selectedIndex < this.filteredEntries.length - 1) {
            this.selectedIndex++;
            this.ensureSelectedVisible();
            this.markDirty();
        } else {
            this.selectedIndex = -1;
            this.markDirty();
        }
    }

    private pageUp(): void {
        this.scrollOffset = Math.max(0, this.scrollOffset - this.size.height);
        this.markDirty();
    }

    private pageDown(): void {
        const maxScroll = Math.max(0, this.getTotalHeight() - this.size.height);
        this.scrollOffset = Math.min(maxScroll, this.scrollOffset + this.size.height);
        this.markDirty();
    }

    private scrollToTop(): void {
        this.scrollOffset = 0;
        this.markDirty();
    }

    private ensureSelectedVisible(): void {
        const entryLineCount = this.getEntryLineCount(this.selectedIndex);
        const entryStart = this.getEntryLineStart(this.selectedIndex);

        if (entryStart < this.scrollOffset) {
            this.scrollOffset = entryStart;
        } else if (entryStart + entryLineCount > this.scrollOffset + this.size.height) {
            this.scrollOffset = entryStart + entryLineCount - this.size.height;
        }
    }

    private getEntryLineCount(entryIndex: number): number {
        if (entryIndex < 0 || entryIndex >= this.filteredEntries.length) return 0;

        const entry = this.filteredEntries[entryIndex];
        if (this.config.wrapLines) {
            const lineLength = this.size.width;
            const formatted = this.formatLogEntry(entry, true);
            return Math.ceil(formatted.length / lineLength);
        } else {
            let count = 1;
            if (entry.stackTrace) {
                count += entry.stackTrace.split('\n').length;
            }
            if (entry.data) {
                count += JSON.stringify(entry.data, null, 2).split('\n').length;
            }
            return count;
        }
    }

    private getEntryLineStart(entryIndex: number): number {
        let lineCount = 0;

        for (let i = 0; i < entryIndex; i++) {
            lineCount += this.getEntryLineCount(i);
        }

        return lineCount;
    }

    render(): string {
        const theme = this.theme.getCurrentTheme();
        const lines: string[] = [];

        if (this.isSearching) {
            const searchLine = `Search: ${this.searchTerm}_`;
            lines.push(theme.applyColor(searchLine, 'warning'));
        }

        let currentLine = 0;
        let entryIndex = 0;

        for (const entry of this.filteredEntries) {
            const entryLineCount = this.getEntryLineCount(entryIndex);

            if (currentLine + entryLineCount > this.scrollOffset) {
                const isSelected = entryIndex === this.selectedIndex;
                const formatted = this.formatLogEntry(entry, true);

                if (this.config.wrapLines) {
                    const lineLength = this.size.width;
                    const wrappedLines = this.wrapText(formatted, lineLength);

                    for (const line of wrappedLines) {
                        if (currentLine >= this.scrollOffset && lines.length < this.size.height) {
                            if (isSelected) {
                                lines.push(theme.applyColor(line, 'selection'));
                            } else {
                                lines.push(line);
                            }
                        }
                        currentLine++;
                    }
                } else {
                    const entryLines = formatted.split('\n');

                    for (const line of entryLines) {
                        if (currentLine >= this.scrollOffset && lines.length < this.size.height) {
                            if (isSelected) {
                                lines.push(theme.applyColor(line, 'selection'));
                            } else {
                                lines.push(line);
                            }
                        }
                        currentLine++;
                    }
                }
            } else {
                currentLine += entryLineCount;
            }

            entryIndex++;

            if (lines.length >= this.size.height) break;
        }

        while (lines.length < this.size.height) {
            lines.push('');
        }

        return lines.join('\n');
    }

    private wrapText(text: string, width: number): string[] {
        const lines: string[] = [];
        const ansiRegex = /\x1b\[[0-9;]*m/g;

        for (let i = 0; i < text.length; i += width) {
            let line = text.substring(i, i + width);

            const ansiMatch = line.match(ansiRegex);
            if (ansiMatch && i + width < text.length) {
                const lastAnsiIndex = line.lastIndexOf('\x1b');
                if (lastAnsiIndex > width - 10) {
                    const ansiEnd = text.indexOf('m', lastAnsiIndex);
                    if (ansiEnd !== -1 && ansiEnd > i + width) {
                        line = text.substring(i, lastAnsiIndex);
                        i = lastAnsiIndex - 1;
                    }
                }
            }

            lines.push(line);
        }

        return lines;
    }
}