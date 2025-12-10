import { BaseComponent } from '../../base-component';
import { InputEvent, Position, Size } from '../../types';
import { ThemeManager } from '../../theme';

export interface SidebarItem {
    id: string;
    label: string;
    icon?: string;
    badge?: string | number;
    disabled?: boolean;
    active?: boolean;
    children?: SidebarItem[];
    action?: () => void;
    tooltip?: string;
    separator?: boolean;
}

export interface SidebarConfig {
    position?: 'left' | 'right';
    width?: number;
    resizable?: boolean;
    collapsible?: boolean;
    defaultCollapsed?: boolean;
    showIcons?: boolean;
    showBadges?: boolean;
    expanded?: boolean;
    minWidth?: number;
    maxWidth?: number;
    animationDuration?: number;
}

export class Sidebar extends BaseComponent {
    private items: SidebarItem[] = [];
    private selectedIndex = 0;
    private config: Required<SidebarConfig>;
    private theme: ThemeManager;
    private expandedIds: Set<string> = new Set();
    private isResizing = false;
    private isCollapsed = false;
    private currentWidth: number;
    private resizeStartX = 0;
    private resizeStartWidth = 0;

    constructor(
        id: string,
        position: Position,
        size: Size,
        config: SidebarConfig = {}
    ) {
        super(id, position, size);
        this.config = {
            position: config.position ?? 'left',
            width: config.width ?? 20,
            resizable: config.resizable ?? true,
            collapsible: config.collapsible ?? true,
            defaultCollapsed: config.defaultCollapsed ?? false,
            showIcons: config.showIcons ?? true,
            showBadges: config.showBadges ?? true,
            expanded: config.expanded ?? true,
            minWidth: config.minWidth ?? 10,
            maxWidth: config.maxWidth ?? 50,
            animationDuration: config.animationDuration ?? 200
        };
        this.theme = ThemeManager.getInstance();
        this.currentWidth = this.config.width;
        this.isCollapsed = this.config.defaultCollapsed;
    }

    addItem(item: SidebarItem, parentId?: string): void {
        if (parentId) {
            const parent = this.findItem(parentId);
            if (parent) {
                if (!parent.children) parent.children = [];
                parent.children.push(item);
            }
        } else {
            this.items.push(item);
        }
        this.markDirty();
    }

    removeItem(itemId: string): void {
        const removeRecursive = (items: SidebarItem[]): boolean => {
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
        this.markDirty();
    }

    toggleCollapse(): void {
        if (this.config.collapsible) {
            this.isCollapsed = !this.isCollapsed;
            this.markDirty();
        }
    }

    setWidth(width: number): void {
        this.currentWidth = Math.max(this.config.minWidth, Math.min(this.config.maxWidth, width));
        this.size.width = this.currentWidth;
        this.markDirty();
    }

    getWidth(): number {
        return this.isCollapsed ? 1 : this.currentWidth;
    }

    expandItem(itemId: string): void {
        this.expandedIds.add(itemId);
        this.markDirty();
    }

    collapseItem(itemId: string): void {
        this.expandedIds.delete(itemId);
        this.markDirty();
    }

    toggleItem(itemId: string): void {
        if (this.expandedIds.has(itemId)) {
            this.collapseItem(itemId);
        } else {
            this.expandItem(itemId);
        }
    }

    selectItem(itemId: string): void {
        const index = this.findItemIndex(itemId);
        if (index !== -1) {
            this.selectedIndex = index;
            this.markDirty();
        }
    }

    getSelectedItem(): SidebarItem | null {
        const flatItems = this.getFlatItems();
        if (this.selectedIndex >= 0 && this.selectedIndex < flatItems.length) {
            return flatItems[this.selectedIndex];
        }
        return null;
    }

    private findItem(itemId: string, items: SidebarItem[] = this.items): SidebarItem | null {
        for (const item of items) {
            if (item.id === itemId) return item;
            if (item.children) {
                const found = this.findItem(itemId, item.children);
                if (found) return found;
            }
        }
        return null;
    }

    private findItemIndex(itemId: string): number {
        const flatItems = this.getFlatItems();
        return flatItems.findIndex(item => item.id === itemId);
    }

    private getFlatItems(): SidebarItem[] {
        const flat: SidebarItem[] = [];

        const flatten = (items: SidebarItem[], depth: number = 0) => {
            for (const item of items) {
                if (!item.separator) {
                    flat.push({ ...item, _depth: depth });
                    if (this.expandedIds.has(item.id) && item.children) {
                        flatten(item.children, depth + 1);
                    }
                }
            }
        };

        flatten(this.items);
        return flat as any;
    }

    handleInput(input: InputEvent): boolean {
        if (this.isCollapsed) {
            if (input.type === 'mouse') {
                return this.handleCollapsedMouseInput(input);
            }
            return false;
        }

        if (input.type === 'key') {
            return this.handleKeyInput(input);
        } else if (input.type === 'mouse') {
            return this.handleMouseInput(input);
        }

        return false;
    }

    private handleKeyInput(input: InputEvent): boolean {
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
                this.activateSelectedItem();
                return true;
            case 'escape':
                this.blur();
                return true;
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
        const flatItems = this.getFlatItems();
        if (this.selectedIndex < flatItems.length - 1) {
            this.selectedIndex++;
            this.markDirty();
        }
    }

    private navigateLeft(): void {
        const selectedItem = this.getSelectedItem();
        if (selectedItem && this.expandedIds.has(selectedItem.id)) {
            this.collapseItem(selectedItem.id);
        }
    }

    private navigateRight(): void {
        const selectedItem = this.getSelectedItem();
        if (selectedItem && selectedItem.children && selectedItem.children.length > 0) {
            this.expandItem(selectedItem.id);
        }
    }

    private activateSelectedItem(): void {
        const selectedItem = this.getSelectedItem();
        if (selectedItem && !selectedItem.disabled && selectedItem.action) {
            selectedItem.action();
        }
    }

    private handleMouseInput(input: InputEvent): boolean {
        if (!input.mouse) return false;

        const x = input.mouse.x - this.position.x;
        const y = input.mouse.y - this.position.y;

        if (this.config.resizable && x === this.currentWidth - 1) {
            return this.handleResize(input);
        }

        const flatItems = this.getFlatItems();
        if (y >= 0 && y < flatItems.length) {
            const item = flatItems[y];
            if (!item.disabled) {
                if (item.children && item.children.length > 0) {
                    this.toggleItem(item.id);
                } else if (item.action) {
                    item.action();
                }
                this.selectedIndex = y;
                this.markDirty();
                return true;
            }
        }

        return false;
    }

    private handleCollapsedMouseInput(input: InputEvent): boolean {
        if (!input.mouse) return false;

        if (input.mouse.action === 'press') {
            this.toggleCollapse();
            return true;
        }

        return false;
    }

    private handleResize(input: InputEvent): boolean {
        if (!input.mouse) return false;

        if (input.mouse.action === 'press') {
            this.isResizing = true;
            this.resizeStartX = input.mouse.x;
            this.resizeStartWidth = this.currentWidth;
            return true;
        } else if (input.mouse.action === 'release' && this.isResizing) {
            this.isResizing = false;
            return true;
        } else if (input.mouse.action === 'move' && this.isResizing) {
            const deltaX = input.mouse.x - this.resizeStartX;
            const newWidth = this.config.position === 'left' ?
                this.resizeStartWidth + deltaX :
                this.resizeStartWidth - deltaX;
            this.setWidth(newWidth);
            return true;
        }

        return false;
    }

    render(): string {
        if (this.isCollapsed) {
            return this.renderCollapsed();
        }

        const lines: string[] = [];
        const theme = this.theme.getCurrentTheme();
        const flatItems = this.getFlatItems();

        for (let i = 0; i < Math.min(flatItems.length, this.size.height); i++) {
            const item = flatItems[i];
            const depth = (item as any)._depth || 0;
            const isExpanded = this.expandedIds.has(item.id);
            const isSelected = this.state.focused && i === this.selectedIndex;

            if (item.separator) {
                const separator = this.theme.applyBorderColor('─'.repeat(this.currentWidth));
                lines.push(separator);
                continue;
            }

            let line = ' '.repeat(depth * 2);

            if (item.children && item.children.length > 0) {
                const arrow = isExpanded ? '▼' : '▶';
                line += arrow + ' ';
            } else if (depth > 0) {
                line += '  ';
            }

            if (this.config.showIcons && item.icon) {
                line += item.icon + ' ';
            }

            line += item.label;

            if (this.config.showBadges && item.badge !== undefined) {
                const badge = String(item.badge);
                const badgeColor = parseInt(badge) > 0 ? 'error' : 'muted';
                const badgeText = ` [${badge}]`;
                line += this.theme.applyColor(badgeText, badgeColor);
            }

            if (isSelected) {
                line = this.theme.applyColor(line, 'primary');
                line = this.theme.applyTypography(line, 'button');
            } else if (item.active) {
                line = this.theme.applyColor(line, 'primary');
            } else if (item.disabled) {
                line = this.theme.applyColor(line, 'textDisabled');
            } else {
                line = this.theme.applyColor(line, 'textPrimary');
            }

            line = this.padText(line, this.currentWidth);
            lines.push(line);
        }

        if (this.config.resizable) {
            const borderChar = this.config.position === 'left' ? '│' : '│';
            const borderLine = this.theme.applyBorderColor(borderChar) + '\n' +
                lines.map(line => line.slice(0, -1) + this.theme.applyBorderColor(borderChar)).join('\n');
            return borderLine;
        }

        return lines.join('\n');
    }

    private renderCollapsed(): string {
        const theme = this.theme.getCurrentTheme();
        const icon = this.config.position === 'left' ? '▶' : '◀';
        const line = this.padText(icon, 1);
        return this.theme.applyColor(line, 'textSecondary');
    }

    private padText(text: string, width: number): string {
        const ansiRegex = /\x1b\[[0-9;]*m/g;
        const plainText = text.replace(ansiRegex, '');
        const padding = width - plainText.length;

        if (padding > 0) {
            return text + ' '.repeat(padding);
        }

        return text;
    }
}