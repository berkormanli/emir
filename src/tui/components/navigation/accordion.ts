import { BaseComponent } from '../../base-component';
import { InputEvent, Position, Size } from '../../types';
import { ThemeManager } from '../../theme';
import { AnsiUtils } from '../../utils/ansi-utils';

export interface AccordionItem {
    id: string;
    title: string;
    content?: string;
    icon?: string;
    disabled?: boolean;
    expanded?: boolean;
    children?: AccordionItem[];
}

export interface AccordionConfig {
    multiple?: boolean;
    animated?: boolean;
    showIcons?: boolean;
    indentSize?: number;
    maxDepth?: number;
    collapsible?: boolean;
    wrapContent?: boolean;
    showBorders?: boolean;
}

export class Accordion extends BaseComponent {
    private items: AccordionItem[] = [];
    private expandedIds: Set<string> = new Set();
    private selectedIndex = 0;
    private config: Required<AccordionConfig>;
    private theme: ThemeManager;
    private animationFrames: Map<string, number> = new Map();

    constructor(
        id: string,
        position: Position,
        size: Size,
        config: AccordionConfig = {}
    ) {
        super(id, position, size);
        this.config = {
            multiple: config.multiple ?? false,
            animated: config.animated ?? true,
            showIcons: config.showIcons ?? true,
            indentSize: config.indentSize ?? 2,
            maxDepth: config.maxDepth ?? 3,
            collapsible: config.collapsible ?? true,
            wrapContent: config.wrapContent ?? true,
            showBorders: config.showBorders ?? true
        };
        this.theme = ThemeManager.getInstance();
    }

    addItem(item: AccordionItem, parentId?: string): void {
        if (parentId) {
            const parent = this.findItem(parentId);
            if (parent) {
                if (!parent.children) parent.children = [];
                parent.children.push(item);
            }
        } else {
            this.items.push(item);
        }

        if (item.expanded) {
            this.expandedIds.add(item.id);
        }

        this.markDirty();
    }

    removeItem(itemId: string): void {
        const removeRecursive = (items: AccordionItem[]): boolean => {
            for (let i = 0; i < items.length; i++) {
                if (items[i].id === itemId) {
                    items.splice(i, 1);
                    return true;
                }
                if (items[i].children && removeRecursive(items[i].children)) {
                    return true;
                }
            }
            return false;
        };

        removeRecursive(this.items);
        this.expandedIds.delete(itemId);
        this.markDirty();
    }

    expandItem(itemId: string): void {
        const item = this.findItem(itemId);
        if (item && !item.disabled) {
            if (!this.config.multiple) {
                this.expandedIds.clear();
            }
            this.expandedIds.add(itemId);
            this.markDirty();
        }
    }

    collapseItem(itemId: string): void {
        if (this.config.collapsible) {
            this.expandedIds.delete(itemId);
            this.markDirty();
        }
    }

    toggleItem(itemId: string): void {
        if (this.isExpanded(itemId)) {
            this.collapseItem(itemId);
        } else {
            this.expandItem(itemId);
        }
    }

    isExpanded(itemId: string): boolean {
        return this.expandedIds.has(itemId);
    }

    expandAll(): void {
        const allIds = this.getAllItemIds(this.items);
        this.expandedIds = new Set(allIds);
        this.markDirty();
    }

    collapseAll(): void {
        if (this.config.collapsible) {
            this.expandedIds.clear();
            this.markDirty();
        }
    }

    private getAllItemIds(items: AccordionItem[]): string[] {
        const ids: string[] = [];
        for (const item of items) {
            ids.push(item.id);
            if (item.children) {
                ids.push(...this.getAllItemIds(item.children));
            }
        }
        return ids;
    }

    private findItem(itemId: string, items: AccordionItem[] = this.items): AccordionItem | null {
        for (const item of items) {
            if (item.id === itemId) return item;
            if (item.children) {
                const found = this.findItem(itemId, item.children);
                if (found) return found;
            }
        }
        return null;
    }

    handleInput(input: InputEvent): boolean {
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
                case 'left':
                case 'ArrowLeft':
                    this.navigateLeft();
                    return true;
                case 'right':
                case 'ArrowRight':
                    this.navigateRight();
                    return true;
                case 'enter':
                case 'Return':
                case ' ':
                    this.toggleSelectedItem();
                    return true;
                case 'escape':
                    this.blur();
                    return true;
            }
        } else if (input.type === 'mouse') {
            return this.handleMouseInput(input);
        }

        return false;
    }

    private navigateUp(): void {
        const flatItems = this.getFlatItems();
        if (this.selectedIndex > 0) {
            this.selectedIndex--;
            this.markDirty();
        }
    }

    private navigateDown(): void {
        const flatItems = this.getFlatItems();
        if (this.selectedIndex < flatItems.length - 1) {
            this.selectedIndex++;
            this.markDirty();
        }
    }

    private navigateLeft(): void {
        const selectedItem = this.getSelectedItem();
        if (selectedItem && this.isExpanded(selectedItem.id)) {
            this.collapseItem(selectedItem.id);
        }
    }

    private navigateRight(): void {
        const selectedItem = this.getSelectedItem();
        if (selectedItem && !this.isExpanded(selectedItem.id)) {
            this.expandItem(selectedItem.id);
        }
    }

    private toggleSelectedItem(): void {
        const selectedItem = this.getSelectedItem();
        if (selectedItem && !selectedItem.disabled) {
            this.toggleItem(selectedItem.id);
        }
    }

    private getSelectedItem(): AccordionItem | null {
        const flatItems = this.getFlatItems();
        if (this.selectedIndex >= 0 && this.selectedIndex < flatItems.length) {
            return flatItems[this.selectedIndex];
        }
        return null;
    }

    private getFlatItems(): AccordionItem[] {
        const flat: AccordionItem[] = [];

        const flatten = (items: AccordionItem[], depth: number = 0) => {
            for (const item of items) {
                flat.push({ ...item, _depth: depth });
                if (this.isExpanded(item.id) && item.children) {
                    flatten(item.children, depth + 1);
                }
            }
        };

        flatten(this.items);
        return flat as any;
    }

    private handleMouseInput(input: InputEvent): boolean {
        if (!input.mouse) return false;

        const x = input.mouse.x - this.position.x;
        const y = input.mouse.y - this.position.y;

        const lines = this.renderToLines();
        if (y >= 0 && y < lines.length) {
            const line = lines[y];
            const itemMatch = line.match(/\[([^\]]+)\]/);
            if (itemMatch) {
                const itemId = itemMatch[1];
                const item = this.findItem(itemId);
                if (item && !item.disabled) {
                    this.toggleItem(itemId);
                    return true;
                }
            }
        }

        return false;
    }

    render(): string {
        const lines = this.renderToLines();
        return lines.slice(0, this.size.height).join('\n');
    }

    private renderToLines(): string[] {
        const lines: string[] = [];
        const theme = this.theme.getCurrentTheme();
        const flatItems = this.getFlatItems();

        for (let i = 0; i < flatItems.length; i++) {
            const item = flatItems[i];
            const depth = (item as any)._depth || 0;
            const isExpanded = this.isExpanded(item.id);
            const isSelected = this.state.focused && i === this.selectedIndex;

            let line = ' '.repeat(depth * this.config.indentSize);

            if (this.config.showIcons) {
                const icon = item.icon || (item.children && item.children.length > 0 ? '📁' : '📄');
                line += icon + ' ';
            }

            const expandedChar = isExpanded ? '▼' : '▶';
            const hasChildren = item.children && item.children.length > 0;
            const toggleChar = hasChildren ? expandedChar : ' ';

            line += '[' + toggleChar + '] ';

            let title = item.title;
            if (isSelected) {
                title = this.theme.applyTypography(title, 'button');
                title = this.theme.applyColor(title, 'primary');
            } else if (item.disabled) {
                title = this.theme.applyColor(title, 'textDisabled');
            } else {
                title = this.theme.applyColor(title, 'textPrimary');
            }

            line += title;

            if (this.config.showBorders && depth === 0) {
                line = this.theme.applyBorderColor('├─ ') + line;
            }

            lines.push(line);

            if (isExpanded && item.content) {
                const contentLines = this.renderContent(item.content, depth + 1);
                lines.push(...contentLines);
            }
        }

        return lines;
    }

    private renderContent(content: string, depth: number): string[] {
        const lines: string[] = [];
        const theme = this.theme.getCurrentTheme();
        const indent = ' '.repeat((depth + 1) * this.config.indentSize);
        const maxWidth = this.size.width - indent.length;

        if (this.config.wrapContent) {
            const words = content.split(' ');
            let currentLine = '';

            for (const word of words) {
                const testLine = currentLine ? currentLine + ' ' + word : word;
                if (testLine.length <= maxWidth) {
                    currentLine = testLine;
                } else {
                    if (currentLine) {
                        lines.push(indent + this.theme.applyColor(currentLine, 'textSecondary'));
                        currentLine = word;
                    } else {
                        lines.push(indent + this.theme.applyColor(word.substring(0, maxWidth), 'textSecondary'));
                        currentLine = word.substring(maxWidth);
                    }
                }
            }

            if (currentLine) {
                lines.push(indent + this.theme.applyColor(currentLine, 'textSecondary'));
            }
        } else {
            const contentLines = content.split('\n');
            for (const line of contentLines) {
                const truncated = line.length > maxWidth ? line.substring(0, maxWidth - 3) + '...' : line;
                lines.push(indent + this.theme.applyColor(truncated, 'textSecondary'));
            }
        }

        return lines;
    }
}