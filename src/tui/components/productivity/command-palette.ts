import { BaseComponent } from '../../base-component';
import { InputEvent, Position, Size } from '../../types';
import { ThemeManager } from '../../theme';

export interface Command {
    id: string;
    title: string;
    description?: string;
    icon?: string;
    shortcut?: string[];
    category?: string;
    keywords?: string[];
    action?: () => void | Promise<void>;
    subcommands?: Command[];
}

export interface CommandPaletteConfig {
    placeholder?: string;
    maxResults?: number;
    showShortcuts?: boolean;
    showCategories?: boolean;
    fuzzySearch?: boolean;
    historySize?: number;
    caseSensitive?: boolean;
    showRecent?: boolean;
}

interface CommandWithScore extends Command {
    score: number;
    matches?: { start: number; end: number }[];
}

export class CommandPalette extends BaseComponent {
    private commands: Command[] = [];
    private recentCommands: Command[] = [];
    private searchResults: CommandWithScore[] = [];
    private selectedIndex = 0;
    private searchQuery = '';
    private isShowing = false;
    private config: Required<CommandPaletteConfig>;
    private theme: ThemeManager;
    private history: string[] = [];

    constructor(
        id: string,
        position: Position,
        size: Size,
        config: CommandPaletteConfig = {}
    ) {
        super(id, position, size);
        this.config = {
            placeholder: config.placeholder ?? 'Type a command or search...',
            maxResults: config.maxResults ?? 10,
            showShortcuts: config.showShortcuts ?? true,
            showCategories: config.showCategories ?? true,
            fuzzySearch: config.fuzzySearch ?? true,
            historySize: config.historySize ?? 20,
            caseSensitive: config.caseSensitive ?? false,
            showRecent: config.showRecent ?? true
        };
        this.theme = ThemeManager.getInstance();
    }

    registerCommand(command: Command): void {
        this.commands.push(command);
    }

    registerCommands(commands: Command[]): void {
        this.commands.push(...commands);
    }

    unregisterCommand(commandId: string): void {
        const index = this.commands.findIndex(cmd => cmd.id === commandId);
        if (index !== -1) {
            this.commands.splice(index, 1);
        }
    }

    show(): void {
        this.isShowing = true;
        this.searchQuery = '';
        this.selectedIndex = 0;
        this.searchResults = [];
        this.focus();

        if (this.config.showRecent && this.recentCommands.length > 0) {
            this.searchResults = this.recentCommands.map(cmd => ({
                ...cmd,
                score: 1000
            }));
        }

        this.markDirty();
    }

    hide(): void {
        this.isShowing = false;
        this.blur();
        this.markDirty();
    }

    toggle(): void {
        if (this.isShowing) {
            this.hide();
        } else {
            this.show();
        }
    }

    executeCommand(commandId: string): void {
        const command = this.commands.find(cmd => cmd.id === commandId);
        if (command && command.action) {
            const result = command.action();
            if (result instanceof Promise) {
                result.catch(console.error);
            }

            this.addToHistory(command);
            this.hide();
        }
    }

    private addToHistory(command: Command): void {
        const existingIndex = this.recentCommands.findIndex(cmd => cmd.id === command.id);
        if (existingIndex !== -1) {
            this.recentCommands.splice(existingIndex, 1);
        }

        this.recentCommands.unshift(command);
        if (this.recentCommands.length > this.config.historySize) {
            this.recentCommands = this.recentCommands.slice(0, this.config.historySize);
        }
    }

    handleInput(input: InputEvent): boolean {
        if (!this.isShowing) return false;

        if (input.type === 'key') {
            switch (input.key) {
                case 'up':
                case 'ArrowUp':
                    this.navigateUp();
                    return true;

                case 'down':
                case 'ArrowDown':
                    this.navigateDown();
                    return true;

                case 'enter':
                case 'Return':
                    this.executeSelected();
                    return true;

                case 'tab':
                    this.selectNextResult();
                    return true;

                case 'escape':
                    this.hide();
                    return true;

                case 'backspace':
                    if (this.searchQuery.length > 0) {
                        this.searchQuery = this.searchQuery.slice(0, -1);
                        this.performSearch();
                        this.markDirty();
                    }
                    return true;

                default:
                    if (input.key && input.key.length === 1) {
                        this.searchQuery += input.key;
                        this.performSearch();
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
            this.markDirty();
        }
    }

    private navigateDown(): void {
        if (this.selectedIndex < this.searchResults.length - 1) {
            this.selectedIndex++;
            this.markDirty();
        }
    }

    private selectNextResult(): void {
        if (this.searchResults.length === 1) {
            this.executeSelected();
        }
    }

    private executeSelected(): void {
        if (this.selectedIndex >= 0 && this.selectedIndex < this.searchResults.length) {
            const command = this.searchResults[this.selectedIndex];
            this.executeCommand(command.id);
        }
    }

    private performSearch(): void {
        if (this.searchQuery.length === 0) {
            if (this.config.showRecent && this.recentCommands.length > 0) {
                this.searchResults = this.recentCommands.map(cmd => ({
                    ...cmd,
                    score: 1000
                }));
            } else {
                this.searchResults = this.commands.slice(0, this.config.maxResults).map(cmd => ({
                    ...cmd,
                    score: 500
                }));
            }
            this.selectedIndex = 0;
            return;
        }

        const results: CommandWithScore[] = [];

        for (const command of this.commands) {
            const score = this.calculateScore(command, this.searchQuery);
            if (score > 0) {
                results.push({
                    ...command,
                    score,
                    matches: this.findMatches(command, this.searchQuery)
                });
            }
        }

        results.sort((a, b) => b.score - a.score);
        this.searchResults = results.slice(0, this.config.maxResults);
        this.selectedIndex = 0;
    }

    private calculateScore(command: Command, query: string): number {
        const queryLower = this.config.caseSensitive ? query : query.toLowerCase();
        const title = this.config.caseSensitive ? command.title : command.title.toLowerCase();
        const description = command.description ?
            (this.config.caseSensitive ? command.description : command.description.toLowerCase()) : '';

        let score = 0;

        if (this.config.fuzzySearch) {
            score += this.fuzzyMatch(title, queryLower) * 10;
            score += this.fuzzyMatch(description, queryLower) * 5;

            if (command.keywords) {
                for (const keyword of command.keywords) {
                    const kw = this.config.caseSensitive ? keyword : keyword.toLowerCase();
                    score += this.fuzzyMatch(kw, queryLower) * 3;
                }
            }

            if (command.category) {
                const cat = this.config.caseSensitive ? command.category : command.category.toLowerCase();
                score += this.fuzzyMatch(cat, queryLower) * 2;
            }
        } else {
            if (title.includes(queryLower)) score += 100;
            if (description.includes(queryLower)) score += 50;
            if (title.startsWith(queryLower)) score += 50;

            if (command.keywords) {
                for (const keyword of command.keywords) {
                    const kw = this.config.caseSensitive ? keyword : keyword.toLowerCase();
                    if (kw.includes(queryLower)) score += 25;
                }
            }
        }

        if (command.shortcut) {
            for (const key of command.shortcut) {
                if (key.toLowerCase().includes(queryLower)) {
                    score += 15;
                }
            }
        }

        return score;
    }

    private fuzzyMatch(text: string, pattern: string): number {
        let score = 0;
        let patternIdx = 0;
        let consecutiveMatches = 0;

        for (let i = 0; i < text.length && patternIdx < pattern.length; i++) {
            if (text[i] === pattern[patternIdx]) {
                patternIdx++;
                consecutiveMatches++;
                score += 10;

                if (i === 0 || text[i - 1] === ' ') {
                    score += 20;
                }
            } else {
                consecutiveMatches = 0;
            }

            if (consecutiveMatches > 1) {
                score += consecutiveMatches * 2;
            }
        }

        return patternIdx === pattern.length ? score : 0;
    }

    private findMatches(command: Command, query: string): { start: number; end: number }[] {
        const matches: { start: number; end: number }[] = [];
        const queryLower = this.config.caseSensitive ? query : query.toLowerCase();
        const title = this.config.caseSensitive ? command.title : command.title.toLowerCase();

        let start = title.indexOf(queryLower);
        while (start !== -1) {
            matches.push({ start, end: start + query.length });
            start = title.indexOf(queryLower, start + 1);
        }

        return matches;
    }

    render(): string {
        if (!this.isShowing) return '';

        const theme = this.theme.getCurrentTheme();
        const lines: string[] = [];

        const searchLine = `${this.config.placeholder} ${this.searchQuery}_`;
        lines.push(this.theme.applyColor(searchLine, 'textPrimary'));

        if (this.searchResults.length === 0 && this.searchQuery.length > 0) {
            lines.push('');
            lines.push(this.theme.applyColor('  No commands found', 'textDisabled'));
            return lines.slice(0, this.size.height).join('\n');
        }

        let lastCategory = '';

        for (let i = 0; i < Math.min(this.searchResults.length, this.config.maxResults); i++) {
            const command = this.searchResults[i];
            const isSelected = i === this.selectedIndex;

            let line = '';

            if (this.config.showCategories && command.category && command.category !== lastCategory) {
                if (i > 0) lines.push('');
                lines.push(this.theme.applyColor(` ${command.category}`, 'muted'));
                lastCategory = command.category;
            }

            line += ' ';

            if (this.config.showShortcuts && command.shortcut) {
                const shortcut = command.shortcut.join(' or ');
                line += this.theme.applyColor(`[${shortcut}]`.padEnd(12), 'textSecondary') + ' ';
            } else {
                line += ' '.repeat(13);
            }

            if (command.icon) {
                line += command.icon + ' ';
            }

            if (command.matches && command.matches.length > 0) {
                let highlightedTitle = '';
                let lastEnd = 0;

                for (const match of command.matches) {
                    highlightedTitle += command.title.substring(lastEnd, match.start);
                    highlightedTitle += this.theme.applyColor(
                        command.title.substring(match.start, match.end),
                        'warning'
                    );
                    lastEnd = match.end;
                }
                highlightedTitle += command.title.substring(lastEnd);

                line += highlightedTitle;
            } else {
                line += command.title;
            }

            if (command.description) {
                const desc = ' - ' + command.description;
                const maxLength = this.size.width - line.length - 2;
                if (desc.length > maxLength) {
                    line += this.theme.applyColor(desc.substring(0, maxLength - 3) + '...', 'textSecondary');
                } else {
                    line += this.theme.applyColor(desc, 'textSecondary');
                }
            }

            if (isSelected) {
                line = this.theme.applyColor(line, 'primary');
                line = this.theme.applyTypography(line, 'button');
            }

            lines.push(line);

            if (lines.length >= this.size.height) break;
        }

        return lines.join('\n');
    }
}