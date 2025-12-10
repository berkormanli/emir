import { BaseComponent } from '../../base-component';
import { InputEvent, Position, Size } from '../../types';
import { ThemeManager } from '../../theme';

export interface StatusItem {
    id: string;
    text: string;
    icon?: string;
    position: 'left' | 'center' | 'right';
    color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'textPrimary' | 'textSecondary';
    tooltip?: string;
    action?: () => void;
    priority?: number;
}

export interface ProgressBarConfig {
    showPercentage?: boolean;
    showLabel?: boolean;
    label?: string;
    color?: 'primary' | 'success' | 'warning' | 'error';
}

export interface StatusBarConfig {
    sections?: StatusItem[][];
    showProgressBar?: boolean;
    progressBar?: ProgressBarConfig;
    clickable?: boolean;
    autoHide?: boolean;
    hideDelay?: number;
}

export class StatusBar extends BaseComponent {
    private sections: StatusItem[][] = [];
    private config: Required<StatusBarConfig>;
    private theme: ThemeManager;
    private progress = 0;
    private isHovered = false;
    private hoveredItemId: string | null = null;
    private lastInteraction = Date.now();

    constructor(
        id: string,
        position: Position,
        size: Size,
        config: StatusBarConfig = {}
    ) {
        super(id, position, size);
        this.config = {
            sections: config.sections ?? [[], [], []],
            showProgressBar: config.showProgressBar ?? false,
            progressBar: {
                showPercentage: config.progressBar?.showPercentage ?? true,
                showLabel: config.progressBar?.showLabel ?? true,
                label: config.progressBar?.label ?? '',
                color: config.progressBar?.color ?? 'primary'
            },
            clickable: config.clickable ?? true,
            autoHide: config.autoHide ?? false,
            hideDelay: config.hideDelay ?? 3000
        };
        this.theme = ThemeManager.getInstance();
    }

    addItem(item: StatusItem, section: 'left' | 'center' | 'right' = 'left'): void {
        const sectionIndex = section === 'left' ? 0 : section === 'center' ? 1 : 2;
        if (!this.sections[sectionIndex]) {
            this.sections[sectionIndex] = [];
        }

        const existingIndex = this.sections[sectionIndex].findIndex(i => i.id === item.id);
        if (existingIndex !== -1) {
            this.sections[sectionIndex][existingIndex] = item;
        } else {
            this.sections[sectionIndex].push(item);
            this.sections[sectionIndex].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
        }

        this.lastInteraction = Date.now();
        this.markDirty();
    }

    removeItem(itemId: string): void {
        for (const section of this.sections) {
            const index = section.findIndex(item => item.id === itemId);
            if (index !== -1) {
                section.splice(index, 1);
                this.markDirty();
                return;
            }
        }
    }

    updateItem(itemId: string, updates: Partial<StatusItem>): void {
        for (const section of this.sections) {
            const item = section.find(i => i.id === itemId);
            if (item) {
                Object.assign(item, updates);
                this.lastInteraction = Date.now();
                this.markDirty();
                return;
            }
        }
    }

    setProgress(value: number): void {
        this.progress = Math.max(0, Math.min(100, value));
        this.lastInteraction = Date.now();
        this.markDirty();
    }

    getProgress(): number {
        return this.progress;
    }

    setSections(sections: StatusItem[][]): void {
        this.sections = sections.map(section =>
            [...section].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
        );
        this.lastInteraction = Date.now();
        this.markDirty();
    }

    getSections(): readonly StatusItem[][] {
        return this.sections;
    }

    handleInput(input: InputEvent): boolean {
        if (!this.config.clickable) return false;

        if (input.type === 'mouse') {
            return this.handleMouseInput(input);
        }

        return false;
    }

    private handleMouseInput(input: InputEvent): boolean {
        if (!input.mouse) return false;

        const x = input.mouse.x - this.position.x;
        const y = input.mouse.y - this.position.y;

        if (y !== 0 && (!this.config.showProgressBar || y !== 0)) {
            if (this.isHovered) {
                this.isHovered = false;
                this.hoveredItemId = null;
                this.markDirty();
            }
            return false;
        }

        const clickedItem = this.getItemAtPosition(x);
        if (clickedItem) {
            if (input.mouse.action === 'press') {
                this.isHovered = true;
                this.hoveredItemId = clickedItem.id;
                this.markDirty();
            } else if (input.mouse.action === 'release' && this.isHovered) {
                if (clickedItem.action) {
                    clickedItem.action();
                }
                this.isHovered = false;
                this.hoveredItemId = null;
                this.markDirty();
                return true;
            }
        } else {
            if (this.isHovered) {
                this.isHovered = false;
                this.hoveredItemId = null;
                this.markDirty();
            }
        }

        return false;
    }

    private getItemAtPosition(x: number): StatusItem | null {
        const sections = this.renderSections();
        let currentX = 0;

        for (let i = 0; i < 3; i++) {
            const sectionText = sections[i];
            const sectionWidth = this.stripAnsiCodes(sectionText).length;

            if (x >= currentX && x < currentX + sectionWidth) {
                const relativeX = x - currentX;
                const items = this.sections[i];

                let itemX = 0;
                for (const item of items) {
                    const itemWidth = this.getItemWidth(item);
                    if (relativeX >= itemX && relativeX < itemX + itemWidth) {
                        return item;
                    }
                    itemX += itemWidth + 2;
                }
            }

            currentX += sectionWidth;

            if (i < 2) {
                const remainingWidth = this.size.width - currentX;
                if (i === 0) {
                    currentX += Math.floor(remainingWidth / 3);
                } else if (i === 1) {
                    currentX += Math.floor(remainingWidth / 2);
                }
            }
        }

        return null;
    }

    private getItemWidth(item: StatusItem): number {
        let width = item.text.length;
        if (item.icon) width += 2;
        return width;
    }

    private renderSections(): [string, string, string] {
        const leftSection = this.renderSection(0);
        const centerSection = this.renderSection(1);
        const rightSection = this.renderSection(2);

        return [leftSection, centerSection, rightSection];
    }

    private renderSection(index: number): string {
        const section = this.sections[index] ?? [];
        const theme = this.theme.getCurrentTheme();
        const parts: string[] = [];

        for (const item of section) {
            let itemText = '';

            if (item.icon) {
                itemText += item.icon + ' ';
            }

            itemText += item.text;

            const isHovered = this.hoveredItemId === item.id;
            if (isHovered) {
                itemText = this.theme.applyColor(itemText, 'hover');
            } else if (item.color) {
                itemText = this.theme.applyColor(itemText, item.color);
            } else {
                itemText = this.theme.applyColor(itemText, 'textSecondary');
            }

            parts.push(itemText);
        }

        return parts.join('  ');
    }

    private stripAnsiCodes(text: string): string {
        return text.replace(/\x1b\[[0-9;]*m/g, '');
    }

    render(): string {
        const theme = this.theme.getCurrentTheme();
        const borderChars = this.theme.getBorderChars();

        if (this.config.autoHide && Date.now() - this.lastInteraction > this.config.hideDelay) {
            return borderChars.horizontal.repeat(this.size.width);
        }

        const [leftSection, centerSection, rightSection] = this.renderSections();
        const leftWidth = this.stripAnsiCodes(leftSection).length;
        const rightWidth = this.stripAnsiCodes(rightSection).length;
        const centerMaxWidth = this.size.width - leftWidth - rightWidth - 4;

        let centerText = centerSection;
        if (this.stripAnsiCodes(centerText).length > centerMaxWidth) {
            centerText = this.truncateText(centerText, centerMaxWidth);
        }

        const padding = Math.max(1, (centerMaxWidth - this.stripAnsiCodes(centerText).length) / 2);
        const centerPadded = ' '.repeat(Math.floor(padding)) + centerText + ' '.repeat(Math.ceil(padding));

        let statusBarLine = leftSection + centerPadded + rightSection;

        if (this.config.showProgressBar) {
            const progressBarLine = this.renderProgressBar();
            return statusBarLine + '\n' + progressBarLine;
        }

        return statusBarLine;
    }

    private renderProgressBar(): string {
        const theme = this.theme.getCurrentTheme();
        const barWidth = this.size.width - 4;
        const filledWidth = Math.floor((this.progress / 100) * barWidth);
        const emptyWidth = barWidth - filledWidth;

        const filledChar = this.config.progressBar.color === 'success' ? '█' :
                          this.config.progressBar.color === 'warning' ? '▓' :
                          this.config.progressBar.color === 'error' ? '▓' : '█';

        const emptyChar = '░';

        let bar = '[';
        bar += this.theme.applyColor(filledChar.repeat(filledWidth), this.config.progressBar.color);
        bar += this.theme.applyColor(emptyChar.repeat(emptyWidth), 'muted');
        bar += ']';

        if (this.config.progressBar.showPercentage) {
            const percentage = `${Math.round(this.progress)}%`;
            bar += ` ${percentage}`;
        }

        if (this.config.progressBar.showLabel && this.config.progressBar.label) {
            bar += ` ${this.config.progressBar.label}`;
        }

        return bar;
    }

    private truncateText(text: string, maxLength: number): string {
        if (this.stripAnsiCodes(text).length <= maxLength) return text;

        const ansiRegex = /\x1b\[[0-9;]*m/g;
        const parts: string[] = [];
        let currentPlain = '';
        let result = '';

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            if (char === '\x1b') {
                const endOfAnsi = text.indexOf('m', i);
                if (endOfAnsi !== -1) {
                    parts.push({ plain: currentPlain, ansi: text.substring(i, endOfAnsi + 1) });
                    currentPlain = '';
                    i = endOfAnsi;
                    continue;
                }
            }
            currentPlain += char;

            if (currentPlain.length >= maxLength - 3) {
                parts.push({ plain: currentPlain.substring(0, maxLength - 3), ansi: '' });
                break;
            }
        }

        for (const part of parts) {
            if (part.ansi) {
                result += part.ansi;
            }
            result += part.plain;
        }

        return result + this.theme.applyColor('...', 'textSecondary');
    }
}